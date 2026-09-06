import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { RolesGuard } from '../src/common/roles.guard';
import { ThrottlerBehindProxyGuard } from '../src/common/throttler-behind-proxy.guard';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from './mocks/supabase.mock';
import { TestRolesGuard, TEST_TOKENS, TEST_USERS } from './mocks/test-harness';
import type {
  DeudaDetalleResponse,
  PaginatedAdeudosResponse,
  LiquidarAdeudoResponse,
} from '../src/adeudos/adeudos.service';
import type {
  AdminStats,
  AsistenciaReportRecord,
} from '../src/reportes/reportes.service';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('Reportes, Adeudos & AI (e2e)', () => {
  let app: INestApplication<App>;

  const ALUMNO_ID = TEST_USERS.student.id;
  const TALLER_ID = '44444444-4444-4444-4444-444444444420';

  beforeAll(async () => {
    mockSupabaseClient = createMockSupabaseClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(RolesGuard)
      .useClass(TestRolesGuard)
      .overrideGuard(ThrottlerBehindProxyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. GET /api/adeudos/me — Resumen de adeudo del estudiante', () => {
    it('debe retornar 200 con desglose de sesiones, faltas y adeudo total calculado ($25 por sesión)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { estado: 'presente' },
                  { estado: 'presente' },
                  { estado: 'retardo' },
                  { estado: 'ausente' },
                  { estado: 'justificado' },
                ],
                error: null,
              }),
            }),
          };
        }
        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .get('/api/adeudos/me')
        .set('Authorization', TEST_TOKENS.student)
        .expect(200);

      const body = response.body as unknown as DeudaDetalleResponse;
      expect(body.alumno_id).toBe(ALUMNO_ID);
      expect(body.sesiones_asistidas).toBe(2);
      expect(body.retardos).toBe(1);
      expect(body.faltas_injustificadas).toBe(1);
      expect(body.faltas_justificadas).toBe(1);
      expect(body.total_sesiones).toBe(5);
      expect(body.tarifa_por_sesion).toBe(25.0);
      expect(body.deuda_total).toBe(100.0);
    });

    it('debe retornar 403 si un instructor intenta consultar /api/adeudos/me', async () => {
      await request(app.getHttpServer())
        .get('/api/adeudos/me')
        .set('Authorization', TEST_TOKENS.instructor)
        .expect(403);
    });
  });

  describe('2. GET /api/adeudos — Listado de adeudos de alumnos (solo admin)', () => {
    it('debe retornar la lista paginada de adeudos de alumnos para el administrador (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: ALUMNO_ID,
                    nombre: 'Juan Pérez',
                    matricula: '2231105001',
                    turno: 'matutino',
                  },
                ],
                error: null,
              }),
            }),
          };
        }

        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  { alumno_id: ALUMNO_ID, estado: 'presente' },
                  { alumno_id: ALUMNO_ID, estado: 'ausente' },
                ],
                error: null,
              }),
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .get('/api/adeudos?page=1&limit=20')
        .set('Authorization', TEST_TOKENS.admin)
        .expect(200);

      const body = response.body as unknown as PaginatedAdeudosResponse;
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.alumno_id).toBe(ALUMNO_ID);
      expect(body.data[0]?.nombre).toBe('Juan Pérez');
      expect(body.data[0]?.deuda_total).toBe(50.0);
    });

    it('debe retornar 403 si un estudiante intenta listar los adeudos de todos los alumnos', async () => {
      await request(app.getHttpServer())
        .get('/api/adeudos')
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });

  describe('3. POST /api/adeudos/:id/liquidar — Liquidación de adeudo', () => {
    it('debe permitir a un administrador liquidar el adeudo total de un alumno (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: ALUMNO_ID, nombre: 'Juan Pérez' },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ estado: 'presente' }, { estado: 'ausente' }],
                error: null,
              }),
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post(`/api/adeudos/${ALUMNO_ID}/liquidar`)
        .set('Authorization', TEST_TOKENS.admin)
        .send({ nota: 'Pago completo en ventanilla' })
        .expect(200);

      const body = response.body as unknown as LiquidarAdeudoResponse;
      expect(body.alumno_id).toBe(ALUMNO_ID);
      expect(body.liquidado).toBe(true);
      expect(body.monto_pagado).toBe(50.0);
      expect(body.saldo_restante).toBe(0);
      expect(body.fecha_pago).toBeDefined();
    });

    it('debe soportar abonos parciales con cálculo de saldo restante', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: ALUMNO_ID, nombre: 'Juan Pérez' },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ estado: 'presente' }, { estado: 'ausente' }],
                error: null,
              }),
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post(`/api/adeudos/${ALUMNO_ID}/liquidar`)
        .set('Authorization', TEST_TOKENS.admin)
        .send({ monto: 30.0, referencia: 'ABONO-001' })
        .expect(200);

      const body = response.body as unknown as LiquidarAdeudoResponse;
      expect(body.alumno_id).toBe(ALUMNO_ID);
      expect(body.liquidado).toBe(false);
      expect(body.monto_pagado).toBe(30.0);
      expect(body.saldo_restante).toBe(20.0);
    });

    it('debe rechazar con 403 si un alumno intenta liquidar un adeudo', async () => {
      await request(app.getHttpServer())
        .post(`/api/adeudos/${ALUMNO_ID}/liquidar`)
        .set('Authorization', TEST_TOKENS.student)
        .send({ monto: 50.0 })
        .expect(403);
    });
  });

  describe('4. GET /api/reportes/dashboard — Métricas de administración (AdminStats)', () => {
    it('debe retornar el payload consolidado de métricas para el dashboard de administración (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'asistencias') {
          return {
            select: jest
              .fn()
              .mockImplementation(
                (fields?: string, opts?: { count?: string }) => {
                  if (opts?.count === 'exact') {
                    return {
                      eq: jest
                        .fn()
                        .mockResolvedValue({ data: [], count: 4, error: null }),
                      then: (resolve: (v: unknown) => unknown) =>
                        Promise.resolve({
                          data: [],
                          count: 120,
                          error: null,
                        }).then(resolve),
                    };
                  }

                  return {
                    gte: jest.fn().mockReturnValue({
                      lte: jest.fn().mockReturnValue({
                        limit: jest.fn().mockResolvedValue({
                          data: [
                            {
                              taller_id: TALLER_ID,
                              estado: 'presente',
                              talleres: {
                                nombre: 'Ajedrez',
                                categoria: 'ACADEMICO',
                              },
                            },
                          ],
                          error: null,
                        }),
                        then: (resolve: (v: unknown) => unknown) =>
                          Promise.resolve({
                            data: [
                              { fecha: '2026-09-05', estado: 'presente' },
                              { fecha: '2026-09-06', estado: 'presente' },
                            ],
                            error: null,
                          }).then(resolve),
                      }),
                      lt: jest.fn().mockResolvedValue({
                        data: [{ estado: 'presente' }],
                        error: null,
                      }),
                    }),
                    order: jest.fn().mockReturnValue({
                      limit: jest.fn().mockResolvedValue({
                        data: [
                          {
                            id: 'act-1',
                            fecha: '2026-09-06',
                            hora: '14:00:00',
                            estado: 'presente',
                            profiles: {
                              nombre: 'Juan Pérez',
                              matricula: '2231105001',
                            },
                            talleres: { nombre: 'Ajedrez' },
                          },
                        ],
                        error: null,
                      }),
                    }),
                  };
                },
              ),
          };
        }

        if (table === 'talleres') {
          return {
            select: jest
              .fn()
              .mockImplementation(
                (fields?: string, opts?: { count?: string }) => {
                  if (opts?.count === 'exact') {
                    return Promise.resolve({ data: [], count: 8, error: null });
                  }
                  return Promise.resolve({
                    data: [
                      {
                        id: TALLER_ID,
                        nombre: 'Ajedrez',
                        categoria: 'ACADEMICO',
                      },
                    ],
                    error: null,
                  });
                },
              ),
          };
        }

        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ alumno_id: ALUMNO_ID, faltas_injustificadas: 3 }],
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: ALUMNO_ID,
                    nombre: 'Juan Pérez',
                    matricula: '2231105001',
                  },
                ],
                error: null,
              }),
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .get('/api/reportes/dashboard?dias=7')
        .set('Authorization', TEST_TOKENS.admin)
        .expect(200);

      const body = response.body as unknown as AdminStats;
      expect(body).toHaveProperty('totalSesiones');
      expect(body).toHaveProperty('talleresActivos');
      expect(body).toHaveProperty('distribucionEstados');
      expect(body).toHaveProperty('asistenciaPorDia');
      expect(body).toHaveProperty('topTalleres');
      expect(body).toHaveProperty('actividadReciente');
    });

    it('debe rechazar con 403 si un estudiante intenta acceder a /api/reportes/dashboard', async () => {
      await request(app.getHttpServer())
        .get('/api/reportes/dashboard')
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });

  describe('5. GET /api/reportes/asistencia — Exportación en JSON y CSV', () => {
    it('debe exportar registros de asistencia en formato JSON por defecto (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'asis-exp-1',
                      fecha: '2026-09-06',
                      hora: '14:00:00',
                      estado: 'presente',
                      observaciones: null,
                      alumno_id: ALUMNO_ID,
                      taller_id: TALLER_ID,
                      profiles: {
                        id: ALUMNO_ID,
                        nombre: 'Juan Pérez',
                        matricula: '2231105001',
                      },
                      talleres: {
                        id: TALLER_ID,
                        nombre: 'Ajedrez',
                        categoria: 'ACADEMICO',
                      },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .get('/api/reportes/asistencia?formato=json')
        .set('Authorization', TEST_TOKENS.admin)
        .expect(200);

      const body = response.body as unknown as AsistenciaReportRecord[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]?.id).toBe('asis-exp-1');
      expect(body[0]?.estado).toBe('presente');
    });

    it('debe exportar registros de asistencia en formato CSV con header adecuado cuando formato=csv (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'asis-exp-1',
                      fecha: '2026-09-06',
                      hora: '14:00:00',
                      estado: 'presente',
                      observaciones: null,
                      alumno_id: ALUMNO_ID,
                      taller_id: TALLER_ID,
                      profiles: {
                        id: ALUMNO_ID,
                        nombre: 'Juan Pérez',
                        matricula: '2231105001',
                      },
                      talleres: {
                        id: TALLER_ID,
                        nombre: 'Ajedrez',
                        categoria: 'ACADEMICO',
                      },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .get('/api/reportes/asistencia?formato=csv')
        .set('Authorization', TEST_TOKENS.instructor)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain(
        'Fecha,Alumno,Matrícula,Taller,Estado,Hora',
      );
      expect(response.text).toContain('Juan Pérez');
    });

    it('debe rechazar con 403 si un estudiante intenta exportar asistencias', async () => {
      await request(app.getHttpServer())
        .get('/api/reportes/asistencia')
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });

  describe('6. POST /api/ai/generate-description — Generación de descripciones IA', () => {
    it('debe generar una descripción para un taller con nombre y categoría válidos (201 Created)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ai/generate-description')
        .set('Authorization', TEST_TOKENS.instructor)
        .send({
          nombre: 'Fútbol Rápido',
          categoria: 'ACTIVIDADES DEPORTIVAS',
        })
        .expect(201);

      const body = response.body as unknown as { description: string };
      expect(body).toHaveProperty('description');
      expect(typeof body.description).toBe('string');
      expect(body.description.length).toBeGreaterThan(10);
      expect(body.description).toContain('Fútbol Rápido');
    });

    it('debe rechazar con 400 Bad Request si faltan campos obligatorios', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/generate-description')
        .set('Authorization', TEST_TOKENS.admin)
        .send({
          nombre: '',
        })
        .expect(400);
    });

    it('debe rechazar con 403 si un estudiante intenta generar descripciones de taller', async () => {
      await request(app.getHttpServer())
        .post('/api/ai/generate-description')
        .set('Authorization', TEST_TOKENS.student)
        .send({
          nombre: 'Ajedrez',
          categoria: 'ACADEMICO',
        })
        .expect(403);
    });
  });
});
