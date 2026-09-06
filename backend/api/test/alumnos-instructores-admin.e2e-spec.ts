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
import type { AlumnoDetail } from '../src/alumnos/alumnos.service';
import type {
  InstructorSummary,
  TallerInstructorView,
} from '../src/instructores/instructores.service';
import type { TallerConCupo } from '../src/talleres/taller.entity';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('Alumnos, Instructores & Administradores (e2e)', () => {
  let app: INestApplication<App>;

  const mockStudentProfile = {
    id: TEST_USERS.student.id,
    nombre: 'Juan Pérez',
    matricula: '2231105001',
    turno: 'matutino',
    cambios_restantes: 2,
    inscripcion_limite: '2026-09-30T00:00:00Z',
  };

  const mockTaller = {
    id: '44444444-4444-4444-4444-444444444444',
    nombre: 'Robótica y Automatización',
    categoria: 'CIENCIA',
    lugar: 'Laboratorio de Cómputo',
    instructor: 'Prof. Carlos Ramírez',
    instructor_id: TEST_USERS.instructor.id,
    cupo: 25,
    inscritos: 1,
    disponible: true,
    horarios: [
      {
        id: 'h-1',
        taller_id: '44444444-4444-4444-4444-444444444444',
        dia: 'lunes',
        hora_inicio: '14:00',
        hora_fin: '16:00',
      },
    ],
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

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              mockStudentProfile,
              {
                id: TEST_USERS.instructor.id,
                nombre: 'Prof. Carlos Ramírez',
                matricula: 'INST-001',
              },
              {
                id: TEST_USERS.admin.id,
                nombre: 'Admin General',
                matricula: 'ADM-001',
              },
            ],
            error: null,
          }),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [mockStudentProfile],
            count: 1,
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockStudentProfile,
            error: null,
          }),
        };
      }

      if (table === 'deuda_alumnos') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [{ alumno_id: TEST_USERS.student.id, deuda_total: 0 }],
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { alumno_id: TEST_USERS.student.id, deuda_total: 0 },
            error: null,
          }),
        };
      }

      if (table === 'inscripciones') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              { alumno_id: TEST_USERS.student.id, taller_id: mockTaller.id },
            ],
            error: null,
          }),
          order: jest.fn().mockReturnThis(),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({
              data: [
                {
                  id: 'ins-1111-1111-1111-111111111111',
                  alumno_id: TEST_USERS.student.id,
                  taller_id: mockTaller.id,
                  created_at: '2026-09-01T10:00:00Z',
                  profiles: mockStudentProfile,
                  talleres: mockTaller,
                },
              ],
              count: 1,
              error: null,
            }).then(resolve),
        };
      }

      if (table === 'instructores') {
        const instRow = {
          id: 'instructor-row-1',
          user_id: TEST_USERS.instructor.id,
          especialidad: 'Robótica y Mecatrónica',
          telefono: '555-0199',
          activo: true,
          created_at: '2026-08-15T00:00:00Z',
        };

        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [instRow],
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({
            data: instRow,
            error: null,
          }),
        };
      }

      if (table === 'user_roles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({
              data: [{ user_id: TEST_USERS.admin.id, role: 'admin' }],
              error: null,
            }).then(resolve),
        };
      }

      if (table === 'talleres') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [
              {
                id: mockTaller.id,
                nombre: mockTaller.nombre,
                instructor_id: TEST_USERS.instructor.id,
              },
            ],
            error: null,
          }),
          order: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockTaller,
            error: null,
          }),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({
              data: [mockTaller],
              error: null,
            }).then(resolve),
        };
      }

      return mockSupabaseClient;
    });

    mockSupabaseClient.rpc.mockImplementation((fn: string) => {
      if (fn === 'count_inscripciones') {
        return Promise.resolve({
          data: [{ taller_id: mockTaller.id, total: 1 }],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    mockSupabaseClient.schema.mockImplementation((s: string) => {
      if (s === 'auth') {
        return {
          from: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: TEST_USERS.instructor.id,
                  email: TEST_USERS.instructor.email,
                },
                { id: TEST_USERS.admin.id, email: TEST_USERS.admin.email },
              ],
              error: null,
            }),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: TEST_USERS.student2.id,
                email: TEST_USERS.student2.email,
              },
              error: null,
            }),
          }),
        };
      }
      return mockSupabaseClient;
    });
  });

  describe('1. GET /api/alumnos/me', () => {
    it('debe retornar 200 con el perfil, adeudo e inscripciones del alumno autenticado', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/alumnos/me')
        .set('Authorization', TEST_TOKENS.student)
        .expect(200);

      const body = response.body as unknown as AlumnoDetail;
      expect(body.id).toBe(TEST_USERS.student.id);
      expect(body.nombre).toBe('Juan Pérez');
      expect(body.matricula).toBe('2231105001');
      expect(body.cambios_restantes).toBe(2);
      expect(body.deuda_total).toBe(0);
      expect(Array.isArray(body.inscripciones)).toBe(true);
      expect(body.inscripciones).toHaveLength(1);
      expect(body.inscripciones[0]?.taller_nombre).toBe(mockTaller.nombre);
    });

    it('debe retornar 401 si no se envía header de autorización', async () => {
      await request(app.getHttpServer()).get('/api/alumnos/me').expect(401);
    });

    it('debe retornar 403 si un instructor intenta acceder al perfil de alumno', async () => {
      await request(app.getHttpServer())
        .get('/api/alumnos/me')
        .set('Authorization', TEST_TOKENS.instructor)
        .expect(403);
    });
  });

  describe('2. GET /api/alumnos', () => {
    it('debe permitir a un admin listar alumnos con paginación y filtros', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/alumnos?q=Juan&turno=matutino&page=1&limit=10')
        .set('Authorization', TEST_TOKENS.admin)
        .expect(200);

      const body = response.body as unknown as {
        data: { nombre: string }[];
        total: number;
      };
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]?.nombre).toBe('Juan Pérez');
      expect(body.total).toBe(1);
    });

    it('debe retornar 403 si un estudiante intenta listar los alumnos', async () => {
      await request(app.getHttpServer())
        .get('/api/alumnos')
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });

  describe('3. GET /api/instructores', () => {
    it('debe permitir a un admin listar instructores con sus talleres y contacto', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/instructores')
        .set('Authorization', TEST_TOKENS.admin)
        .expect(200);

      const body = response.body as unknown as InstructorSummary[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]?.user_id).toBe(TEST_USERS.instructor.id);
      expect(body[0]?.nombre).toBe('Prof. Carlos Ramírez');
      expect(body[0]?.especialidad).toBe('Robótica y Mecatrónica');
      expect(body[0]?.talleres).toHaveLength(1);
    });

    it('debe retornar 403 si un alumno intenta consultar la lista de instructores', async () => {
      await request(app.getHttpServer())
        .get('/api/instructores')
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });

  describe('4. GET /api/instructores/me/talleres', () => {
    it('debe permitir a un instructor consultar sus talleres asignados con conteo de inscritos', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/instructores/me/talleres')
        .set('Authorization', TEST_TOKENS.instructor)
        .expect(200);

      const body = response.body as unknown as TallerInstructorView[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]?.id).toBe(mockTaller.id);
      expect(body[0]?.nombre).toBe(mockTaller.nombre);
      expect(body[0]?.alumnos_count).toBe(1);
      expect(body[0]?.horarios).toBeDefined();
    });

    it('debe retornar 403 si un alumno intenta consultar los talleres de instructor', async () => {
      await request(app.getHttpServer())
        .get('/api/instructores/me/talleres')
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });

  describe('5. GET /api/administradores', () => {
    it('debe permitir a un admin listar todos los usuarios administradores', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/administradores')
        .set('Authorization', TEST_TOKENS.admin)
        .expect(200);

      const body = response.body as unknown as {
        user_id: string;
        nombre: string;
      }[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]?.user_id).toBe(TEST_USERS.admin.id);
      expect(body[0]?.nombre).toBe('Admin General');
    });

    it('debe retornar 403 si un alumno intenta listar administradores', async () => {
      await request(app.getHttpServer())
        .get('/api/administradores')
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });

  describe('6. POST /api/administradores', () => {
    it('debe permitir a un admin asignar el rol de administrador a un usuario existente', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/administradores')
        .set('Authorization', TEST_TOKENS.admin)
        .send({ user_id: TEST_USERS.student2.id })
        .expect(201);

      expect(response.body).toEqual({
        user_id: TEST_USERS.student2.id,
        role: 'admin',
      });
    });

    it('debe retornar 400 si el cuerpo no contiene un UUID válido', async () => {
      await request(app.getHttpServer())
        .post('/api/administradores')
        .set('Authorization', TEST_TOKENS.admin)
        .send({ user_id: 'uuid-invalido' })
        .expect(400);
    });

    it('debe retornar 403 si un estudiante intenta asignar rol de admin', async () => {
      await request(app.getHttpServer())
        .post('/api/administradores')
        .set('Authorization', TEST_TOKENS.student)
        .send({ user_id: TEST_USERS.student2.id })
        .expect(403);
    });
  });

  describe('7. GET /api/talleres/public', () => {
    it('debe permitir acceso público sin token al catálogo de talleres', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/talleres/public')
        .expect(200);

      const body = response.body as unknown as TallerConCupo[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]?.id).toBe(mockTaller.id);
      expect(body[0]?.nombre).toBe(mockTaller.nombre);
      expect(body[0]?.cupo).toBe(25);
      expect(body[0]?.inscritos).toBe(1);
      expect(body[0]?.disponible).toBe(true);
    });
  });

  describe('8. GET /api/talleres/:id/alumnos', () => {
    it('debe permitir a un admin consultar los alumnos inscritos en un taller', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/talleres/${mockTaller.id}/alumnos`)
        .set('Authorization', TEST_TOKENS.admin)
        .expect(200);

      const body = response.body as unknown as {
        alumno_id: string;
        nombre: string;
        matricula: string;
      }[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]?.alumno_id).toBe(TEST_USERS.student.id);
      expect(body[0]?.nombre).toBe('Juan Pérez');
      expect(body[0]?.matricula).toBe('2231105001');
    });

    it('debe permitir al instructor asignado consultar los alumnos inscritos', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/talleres/${mockTaller.id}/alumnos`)
        .set('Authorization', TEST_TOKENS.instructor)
        .expect(200);

      const body = response.body as unknown as { alumno_id: string }[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(1);
      expect(body[0]?.alumno_id).toBe(TEST_USERS.student.id);
    });

    it('debe rechazar con 403 a un alumno que intente consultar los inscritos de un taller', async () => {
      await request(app.getHttpServer())
        .get(`/api/talleres/${mockTaller.id}/alumnos`)
        .set('Authorization', TEST_TOKENS.student)
        .expect(403);
    });
  });
});
