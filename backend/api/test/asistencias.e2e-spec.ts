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
  AsistenciaRecord,
  AlumnoAsistenciaRosterItem,
  PaginatedAsistenciasAdmin,
} from '../src/asistencias/asistencias.service';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('Asistencias & Monitoreo (e2e)', () => {
  let app: INestApplication<App>;

  const TALLER_ID = '44444444-4444-4444-4444-444444444410';
  const ALUMNO_ID = TEST_USERS.student.id;
  const INSTRUCTOR_ID = TEST_USERS.instructor.id;

  const getToday = (): string => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getToday();
  const pastDateStr = '2025-01-15';

  const mockTaller = {
    id: TALLER_ID,
    nombre: 'Ajedrez Estratégico',
    instructor_id: INSTRUCTOR_ID,
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

  describe('1. POST /api/asistencias — Pase de lista individual', () => {
    it('debe permitir al instructor asignado registrar asistencia para la fecha de hoy (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockTaller,
              error: null,
            }),
          };
        }

        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'ins-1' },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'asistencias') {
          return {
            upsert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'asis-1',
                    alumno_id: ALUMNO_ID,
                    taller_id: TALLER_ID,
                    instructor_id: INSTRUCTOR_ID,
                    fecha: todayStr,
                    hora: '14:30:00',
                    estado: 'presente',
                    observaciones: 'Puntual',
                    created_at: '2026-09-06T14:30:00Z',
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
        .post('/api/asistencias')
        .set('Authorization', TEST_TOKENS.instructor)
        .send({
          alumno_id: ALUMNO_ID,
          taller_id: TALLER_ID,
          fecha: todayStr,
          estado: 'presente',
          observaciones: 'Puntual',
        })
        .expect(200);

      const body = response.body as unknown as AsistenciaRecord;
      expect(body.id).toBe('asis-1');
      expect(body.estado).toBe('presente');
      expect(body.fecha).toBe(todayStr);
    });

    it('debe rechazar con 403 si un instructor intenta registrar asistencia para una fecha pasada', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockTaller,
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/asistencias')
        .set('Authorization', TEST_TOKENS.instructor)
        .send({
          alumno_id: ALUMNO_ID,
          taller_id: TALLER_ID,
          fecha: pastDateStr,
          estado: 'presente',
        })
        .expect(403);

      const errorBody = response.body as unknown as { message: string };
      expect(errorBody.message).toContain(
        'Solo puedes registrar o editar asistencia para la fecha actual',
      );
    });

    it('debe rechazar con 400 si el alumno no está inscrito en el taller', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockTaller,
              error: null,
            }),
          };
        }

        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/asistencias')
        .set('Authorization', TEST_TOKENS.instructor)
        .send({
          alumno_id: ALUMNO_ID,
          taller_id: TALLER_ID,
          fecha: todayStr,
          estado: 'presente',
        })
        .expect(400);

      const errorBody = response.body as unknown as { message: string };
      expect(errorBody.message).toContain(
        'El alumno no está inscrito en este taller',
      );
    });

    it('debe permitir a un administrador registrar asistencia incluso en fechas pasadas', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockTaller,
              error: null,
            }),
          };
        }

        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'ins-1' },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'asistencias') {
          return {
            upsert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'asis-admin-past',
                    alumno_id: ALUMNO_ID,
                    taller_id: TALLER_ID,
                    instructor_id: TEST_USERS.admin.id,
                    fecha: pastDateStr,
                    hora: '10:00:00',
                    estado: 'justificado',
                    observaciones: 'Corrección admin',
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
        .post('/api/asistencias')
        .set('Authorization', TEST_TOKENS.admin)
        .send({
          alumno_id: ALUMNO_ID,
          taller_id: TALLER_ID,
          fecha: pastDateStr,
          estado: 'justificado',
          observaciones: 'Corrección admin',
        })
        .expect(200);

      const body = response.body as unknown as AsistenciaRecord;
      expect(body.id).toBe('asis-admin-past');
      expect(body.estado).toBe('justificado');
    });

    it('debe retornar 403 si un alumno intenta registrar asistencia', async () => {
      await request(app.getHttpServer())
        .post('/api/asistencias')
        .set('Authorization', TEST_TOKENS.student)
        .send({
          alumno_id: ALUMNO_ID,
          taller_id: TALLER_ID,
          fecha: todayStr,
          estado: 'presente',
        })
        .expect(403);
    });
  });

  describe('2. POST /api/asistencias/bulk — Pase de lista masivo', () => {
    it('debe registrar asistencia masiva para todos los alumnos inscritos (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockTaller,
              error: null,
            }),
          };
        }

        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  { alumno_id: TEST_USERS.student.id },
                  { alumno_id: TEST_USERS.student2.id },
                ],
                error: null,
              }),
            }),
          };
        }

        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
            upsert: jest.fn().mockResolvedValue({
              error: null,
            }),
          };
        }

        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .post('/api/asistencias/bulk')
        .set('Authorization', TEST_TOKENS.instructor)
        .send({
          taller_id: TALLER_ID,
          fecha: todayStr,
          estado: 'presente',
        })
        .expect(200);

      expect(response.body).toEqual({ updated_count: 2 });
    });

    it('debe rechazar con 403 si un estudiante intenta registrar asistencia masiva', async () => {
      await request(app.getHttpServer())
        .post('/api/asistencias/bulk')
        .set('Authorization', TEST_TOKENS.student)
        .send({
          taller_id: TALLER_ID,
          fecha: todayStr,
          estado: 'presente',
        })
        .expect(403);
    });
  });

  describe('3. GET /api/asistencias/taller/:id — Roster del taller con estado de asistencia', () => {
    it('debe retornar la lista de alumnos inscritos con su estado de asistencia para una fecha (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockTaller,
              error: null,
            }),
          };
        }

        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    alumno_id: ALUMNO_ID,
                    profiles: {
                      id: ALUMNO_ID,
                      nombre: 'Juan Pérez',
                      matricula: '2231105001',
                      turno: 'matutino',
                    },
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
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'asis-100',
                      alumno_id: ALUMNO_ID,
                      estado: 'presente',
                      observaciones: null,
                      hora: '14:05:00',
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
        .get(`/api/asistencias/taller/${TALLER_ID}?fecha=${todayStr}`)
        .set('Authorization', TEST_TOKENS.instructor)
        .expect(200);

      const body = response.body as unknown as AlumnoAsistenciaRosterItem[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]?.alumno_id).toBe(ALUMNO_ID);
      expect(body[0]?.nombre).toBe('Juan Pérez');
      expect(body[0]?.estado).toBe('presente');
    });

    it('debe retornar 403 si un alumno intenta consultar el roster de asistencias', async () => {
      await request(app.getHttpServer())
        .get(`/api/asistencias/taller/${TALLER_ID}`)
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });

  describe('4. GET /api/asistencias — Monitoreo de asistencias (solo admin)', () => {
    it('debe permitir a un administrador consultar la bitácora de asistencias con filtros (200 OK)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'asis-log-1',
                  alumno_id: ALUMNO_ID,
                  taller_id: TALLER_ID,
                  instructor_id: INSTRUCTOR_ID,
                  fecha: todayStr,
                  hora: '14:00:00',
                  estado: 'presente',
                  observaciones: null,
                  created_at: '2026-09-06T14:00:00Z',
                  profiles: {
                    id: ALUMNO_ID,
                    nombre: 'Juan Pérez',
                    matricula: '2231105001',
                    turno: 'matutino',
                  },
                  talleres: {
                    id: TALLER_ID,
                    nombre: 'Ajedrez Estratégico',
                    categoria: 'ACADEMICO',
                  },
                },
              ],
              count: 1,
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const response = await request(app.getHttpServer())
        .get(
          `/api/asistencias?fecha=${todayStr}&estado=presente&page=1&limit=20`,
        )
        .set('Authorization', TEST_TOKENS.admin)
        .expect(200);

      const body = response.body as unknown as PaginatedAsistenciasAdmin;
      expect(body).toHaveProperty('data');
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.estado).toBe('presente');
      expect(body.total).toBe(1);
    });

    it('debe retornar 403 si un alumno intenta consultar la bitácora de asistencias', async () => {
      await request(app.getHttpServer())
        .get('/api/asistencias')
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });
});
