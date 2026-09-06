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
  InscripcionCreatedResponse,
  MiTallerInscrito,
} from '../src/inscripciones/inscripciones.service';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('Inscripciones & Reglas de Negocio (e2e)', () => {
  let app: INestApplication<App>;

  const TALLER_AVAILABLE_ID = '44444444-4444-4444-4444-444444444401';
  const TALLER_FULL_ID = '44444444-4444-4444-4444-444444444402';
  const TALLER_COLLIDE_ID = '44444444-4444-4444-4444-444444444403';
  const TALLER_ENROLLED_ID = '44444444-4444-4444-4444-444444444405';

  const defaultProfile = {
    id: TEST_USERS.student.id,
    nombre: 'Juan Pérez',
    matricula: '2231105001',
    inscripcion_limite: '2026-12-31T23:59:59Z',
    cambios_restantes: 3,
  };

  const defaultTallerAvailable = {
    id: TALLER_AVAILABLE_ID,
    nombre: 'Taller de Pintura y Dibujo',
    categoria: 'ARTE',
    cupo: 20,
  };

  const defaultTallerFull = {
    id: TALLER_FULL_ID,
    nombre: 'Taller de Fútbol Avanzado',
    categoria: 'DEPORTES',
    cupo: 10,
  };

  const defaultTallerCollide = {
    id: TALLER_COLLIDE_ID,
    nombre: 'Taller de Baloncesto',
    categoria: 'DEPORTES',
    cupo: 25,
  };

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

  describe('1. POST /api/inscripciones — Éxito e inscripciones válidas', () => {
    it('debe inscribir con éxito al alumno si cumple todas las reglas de negocio (201 Created)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: TEST_USERS.student.id, deuda_total: 0 },
              error: null,
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: defaultProfile,
              error: null,
            }),
          };
        }

        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: defaultTallerAvailable,
              error: null,
            }),
          };
        }

        if (table === 'inscripciones') {
          return {
            select: jest
              .fn()
              .mockImplementation(
                (fields?: string, opts?: { count?: string }) => {
                  if (opts?.count === 'exact') {
                    return {
                      eq: jest.fn().mockResolvedValue({
                        data: [],
                        count: 5,
                        error: null,
                      }),
                    };
                  }
                  return {
                    eq: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        maybeSingle: jest
                          .fn()
                          .mockResolvedValue({ data: null, error: null }),
                      }),
                      then: (resolve: (v: unknown) => unknown) =>
                        Promise.resolve({ data: [], error: null }).then(
                          resolve,
                        ),
                    }),
                  };
                },
              ),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'ins-new-1111-1111-111111111111',
                    alumno_id: TEST_USERS.student.id,
                    taller_id: TALLER_AVAILABLE_ID,
                    created_at: '2026-09-06T10:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/inscripciones')
        .set('Authorization', TEST_TOKENS.student)
        .send({ taller_id: TALLER_AVAILABLE_ID })
        .expect(201);

      const body = response.body as unknown as InscripcionCreatedResponse;
      expect(body.id).toBe('ins-new-1111-1111-111111111111');
      expect(body.alumno_id).toBe(TEST_USERS.student.id);
      expect(body.taller_id).toBe(TALLER_AVAILABLE_ID);
      expect(body.taller_nombre).toBe(defaultTallerAvailable.nombre);
    });
  });

  describe('2. Regla de Negocio: Rechazo por Cupo Lleno (409 Conflict)', () => {
    it('debe rechazar la inscripción si inscritos >= cupo con 409 Conflict', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: TEST_USERS.student.id, deuda_total: 0 },
              error: null,
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: defaultProfile,
              error: null,
            }),
          };
        }

        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: defaultTallerFull,
              error: null,
            }),
          };
        }

        if (table === 'inscripciones') {
          return {
            select: jest
              .fn()
              .mockImplementation(
                (fields?: string, opts?: { count?: string }) => {
                  if (opts?.count === 'exact') {
                    return {
                      eq: jest.fn().mockResolvedValue({
                        data: new Array(10).fill({ id: 'some-ins' }),
                        count: 10,
                        error: null,
                      }),
                    };
                  }
                  return {
                    eq: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        maybeSingle: jest
                          .fn()
                          .mockResolvedValue({ data: null, error: null }),
                      }),
                    }),
                  };
                },
              ),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/inscripciones')
        .set('Authorization', TEST_TOKENS.student)
        .send({ taller_id: TALLER_FULL_ID })
        .expect(409);

      const errorBody = response.body as unknown as { message: string };
      expect(errorBody.message).toContain('El taller no tiene cupo disponible');
    });
  });

  describe('3. Regla de Negocio: Rechazo por Empalme de Horario (409 Conflict)', () => {
    it('debe rechazar la inscripción si los horarios se cruzan en el mismo día (409 Conflict)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: TEST_USERS.student.id, deuda_total: 0 },
              error: null,
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: defaultProfile,
              error: null,
            }),
          };
        }

        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: defaultTallerCollide,
              error: null,
            }),
          };
        }

        if (table === 'inscripciones') {
          return {
            select: jest
              .fn()
              .mockImplementation(
                (fields?: string, opts?: { count?: string }) => {
                  if (opts?.count === 'exact') {
                    return {
                      eq: jest.fn().mockResolvedValue({
                        data: [],
                        count: 2,
                        error: null,
                      }),
                    };
                  }
                  return {
                    eq: jest.fn().mockImplementation((field: string) => {
                      if (field === 'alumno_id') {
                        return {
                          eq: jest.fn().mockReturnValue({
                            maybeSingle: jest
                              .fn()
                              .mockResolvedValue({ data: null, error: null }),
                          }),
                          then: (resolve: (v: unknown) => unknown) =>
                            Promise.resolve({
                              data: [{ taller_id: TALLER_ENROLLED_ID }],
                              error: null,
                            }).then(resolve),
                        };
                      }
                      return {
                        then: (resolve: (v: unknown) => unknown) =>
                          Promise.resolve({ data: [], error: null }).then(
                            resolve,
                          ),
                      };
                    }),
                  };
                },
              ),
          };
        }

        if (table === 'horarios') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'h-dest',
                  taller_id: TALLER_COLLIDE_ID,
                  dia: 'lunes',
                  hora_inicio: '15:00',
                  hora_fin: '17:00',
                },
              ],
              error: null,
            }),
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'h-enr',
                  taller_id: TALLER_ENROLLED_ID,
                  dia: 'lunes',
                  hora_inicio: '14:00',
                  hora_fin: '16:00',
                },
              ],
              error: null,
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/inscripciones')
        .set('Authorization', TEST_TOKENS.student)
        .send({ taller_id: TALLER_COLLIDE_ID })
        .expect(409);

      const errorBody = response.body as unknown as { message: string };
      expect(errorBody.message).toContain('Conflicto de horario');
    });
  });

  describe('4. Regla de Negocio: Rechazo por Cambios Agotados (400 Bad Request)', () => {
    it('debe rechazar la inscripción si cambios_restantes <= 0 (400 Bad Request)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: TEST_USERS.student.id, deuda_total: 0 },
              error: null,
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                ...defaultProfile,
                cambios_restantes: 0,
              },
              error: null,
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/inscripciones')
        .set('Authorization', TEST_TOKENS.student)
        .send({ taller_id: TALLER_AVAILABLE_ID })
        .expect(400);

      const errorBody = response.body as unknown as { message: string };
      expect(errorBody.message).toContain(
        'Has agotado tus 3 oportunidades de cambio',
      );
    });
  });

  describe('5. Regla de Negocio: Rechazo por Adeudo Pendiente (400 Bad Request)', () => {
    it('debe bloquear la inscripción del estudiante si tiene deuda_total > 0 (400 Bad Request)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: TEST_USERS.student.id, deuda_total: 75.0 },
              error: null,
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/inscripciones')
        .set('Authorization', TEST_TOKENS.student)
        .send({ taller_id: TALLER_AVAILABLE_ID })
        .expect(400);

      const errorBody = response.body as unknown as { message: string };
      expect(errorBody.message).toContain(
        'Inscripción bloqueada: el alumno presenta un adeudo pendiente',
      );
    });

    it('debe permitir a un administrador inscribir a un alumno aun cuando tenga adeudo (bypass admin)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: defaultProfile,
              error: null,
            }),
          };
        }

        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: defaultTallerAvailable,
              error: null,
            }),
          };
        }

        if (table === 'inscripciones') {
          return {
            select: jest
              .fn()
              .mockImplementation(
                (fields?: string, opts?: { count?: string }) => {
                  if (opts?.count === 'exact') {
                    return {
                      eq: jest.fn().mockResolvedValue({
                        data: [],
                        count: 1,
                        error: null,
                      }),
                    };
                  }
                  return {
                    eq: jest.fn().mockReturnValue({
                      eq: jest.fn().mockReturnValue({
                        maybeSingle: jest
                          .fn()
                          .mockResolvedValue({ data: null, error: null }),
                      }),
                      then: (resolve: (v: unknown) => unknown) =>
                        Promise.resolve({ data: [], error: null }).then(
                          resolve,
                        ),
                    }),
                  };
                },
              ),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'ins-admin-bypass-1',
                    alumno_id: TEST_USERS.student.id,
                    taller_id: TALLER_AVAILABLE_ID,
                    created_at: '2026-09-06T10:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/inscripciones')
        .set('Authorization', TEST_TOKENS.admin)
        .send({
          taller_id: TALLER_AVAILABLE_ID,
          alumno_id: TEST_USERS.student.id,
        })
        .expect(201);

      const body = response.body as unknown as InscripcionCreatedResponse;
      expect(body.id).toBe('ins-admin-bypass-1');
    });
  });

  describe('6. Regla de Negocio: Rechazo por Periodo Vencido (400 Bad Request)', () => {
    it('debe rechazar la inscripción si inscripcion_limite está en el pasado (400 Bad Request)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: TEST_USERS.student.id, deuda_total: 0 },
              error: null,
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                ...defaultProfile,
                inscripcion_limite: '2025-01-01T00:00:00Z',
              },
              error: null,
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/inscripciones')
        .set('Authorization', TEST_TOKENS.student)
        .send({ taller_id: TALLER_AVAILABLE_ID })
        .expect(400);

      const errorBody = response.body as unknown as { message: string };
      expect(errorBody.message).toContain(
        'El periodo de inscripciones ha finalizado',
      );
    });
  });

  describe('7. POST /api/inscripciones/baja — Baja de taller con decremento', () => {
    it('debe dar de baja la inscripción y decrementar cambios_restantes en 1 (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'ins-to-drop',
                      alumno_id: TEST_USERS.student.id,
                      taller_id: TALLER_AVAILABLE_ID,
                      talleres: {
                        id: TALLER_AVAILABLE_ID,
                        nombre: 'Taller de Pintura y Dibujo',
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            delete: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { cambios_restantes: 3 },
                  error: null,
                }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/inscripciones/baja')
        .set('Authorization', TEST_TOKENS.student)
        .send({ taller_id: TALLER_AVAILABLE_ID })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        cambios_restantes: 2,
        taller_nombre: 'Taller de Pintura y Dibujo',
      });
    });

    it('debe retornar 404 si el alumno no está inscrito en el taller a dar de baja', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return mockSupabaseClient;
      });

      await request(app.getHttpServer())
        .post('/api/inscripciones/baja')
        .set('Authorization', TEST_TOKENS.student)
        .send({ taller_id: TALLER_AVAILABLE_ID })
        .expect(404);
    });
  });

  describe('8. GET /api/inscripciones/mis-talleres', () => {
    it('debe retornar la lista de talleres inscritos del alumno autenticado (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'ins-1',
                    taller_id: TALLER_AVAILABLE_ID,
                    created_at: '2026-09-01T10:00:00Z',
                    talleres: {
                      id: TALLER_AVAILABLE_ID,
                      nombre: 'Taller de Pintura y Dibujo',
                      categoria: 'ARTE',
                      lugar: 'Aula 4',
                      instructor: 'Prof. Ana',
                      instructor_id: TEST_USERS.instructor.id,
                      cupo: 20,
                      horarios: [
                        {
                          id: 'h-1',
                          taller_id: TALLER_AVAILABLE_ID,
                          dia: 'viernes',
                          hora_inicio: '16:00',
                          hora_fin: '18:00',
                        },
                      ],
                    },
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
        .get('/api/inscripciones/mis-talleres')
        .set('Authorization', TEST_TOKENS.student)
        .expect(200);

      const body = response.body as unknown as MiTallerInscrito[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]?.taller_id).toBe(TALLER_AVAILABLE_ID);
      expect(body[0]?.taller_nombre).toBe('Taller de Pintura y Dibujo');
      expect(body[0]?.horarios).toBeDefined();
      expect(body[0]?.horarios).toHaveLength(1);
    });
  });
});
