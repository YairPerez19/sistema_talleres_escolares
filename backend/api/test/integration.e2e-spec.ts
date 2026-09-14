import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module';
import { EmailService } from './../src/email/email.service';
import {
  FakeDb,
  createFakeSupabase as mockCreateFakeSupabase,
  Row,
} from './helpers/fake-supabase';

const JWT_SECRET = 'test-e2e-secret';

process.env.SUPABASE_URL = 'https://fake.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key';
process.env.SUPABASE_ANON_KEY = 'fake-anon-key';
process.env.JWT_SECRET = JWT_SECRET;

const mockDb = new FakeDb();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockCreateFakeSupabase(mockDb)),
}));

interface SeededUser {
  user: Row;
  token: string;
}

describe('Integración de la API (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  let emailSpy: jest.SpyInstance;

  const seedUser = (
    role: 'admin' | 'instructor' | 'student',
    extras: Partial<Row> = {},
  ): SeededUser => {
    const user = mockDb.addAuthUser({
      email: `${role}-${randomUUID().slice(0, 8)}@cbtis61.edu.mx`,
      password: 'password123',
      ...extras,
    });
    mockDb.seed('user_roles', [{ user_id: user.id, role }]);
    mockDb.seed('profiles', [
      {
        id: user.id,
        nombre: `Usuario ${role}`,
        matricula: role === 'admin' ? 'ADM001' : `MAT-${user.id.slice(0, 4)}`,
        turno: 'matutino',
      },
    ]);
    return { user, token: mockDb.issueToken(user.id) };
  };

  const seedTaller = (fields: Partial<Row> = {}): Row => {
    const taller: Row = {
      id: randomUUID(),
      nombre: 'Taller seed',
      categoria: 'DIFUSIÓN CULTURAL',
      lugar: 'Aula 1',
      instructor: null,
      instructor_id: null,
      cupo: 30,
      ...fields,
    };
    mockDb.seed('talleres', [taller]);
    return taller;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    server = app.getHttpServer();
    emailSpy = jest.spyOn(app.get(EmailService), 'sendOtpEmail');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockDb.reset();
    emailSpy.mockClear();
  });

  describe('salud', () => {
    it('GET /api responde', async () => {
      await request(server).get('/api').expect(200, 'Hello World!');
    });

    it('GET /api/health responde ok', async () => {
      const res = await request(server).get('/api/health').expect(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('registro de estudiantes', () => {
    const validBody = {
      nombre: 'Luis Pérez',
      email: 'luis.e2e@cbtis61.edu.mx',
      password: 'password123',
      matricula: 'A2002',
      turno: 'matutino',
    };

    it('rechaza datos inválidos con 400', async () => {
      const res = await request(server)
        .post('/api/auth/register-student')
        .send({ ...validBody, email: 'no-es-correo', turno: 'nocturno' })
        .expect(400);
      expect(res.body.message).toContain('Datos de registro inválidos');
    });

    it('registra y devuelve pending_token', async () => {
      const res = await request(server)
        .post('/api/auth/register-student')
        .send(validBody)
        .expect(201);
      expect(res.body.pending_token).toBeDefined();
      expect(res.body.nombre).toBe('Luis Pérez');
      expect(res.body.email_masked).toContain('*');

      const user = mockDb.authUsers.find((u) => u.email === validBody.email)!;
      expect(user.email_confirmed).toBe(false);
      expect(
        mockDb
          .table('user_roles')
          .some((r) => r.user_id === user.id && r.role === 'student'),
      ).toBe(true);
    });

    it('rechaza correo duplicado', async () => {
      await request(server).post('/api/auth/register-student').send(validBody);
      const res = await request(server)
        .post('/api/auth/register-student')
        .send(validBody)
        .expect(400);
      expect(res.body.message).toBe('El correo ya está registrado.');
    });
  });

  describe('flujo completo OTP (registro → código → sesión)', () => {
    const body = {
      nombre: 'Marta Solís',
      email: 'marta.e2e@cbtis61.edu.mx',
      password: 'password123',
      matricula: 'A3003',
      turno: 'vespertino',
    };

    it('recorre registro, envío y verificación de OTP hasta usar la API', async () => {
      const register = await request(server)
        .post('/api/auth/register-student')
        .send(body)
        .expect(201);
      const pendingToken = register.body.pending_token;

      await request(server)
        .post('/api/auth/send-otp')
        .send({ pending_token: pendingToken })
        .expect(200)
        .expect((res) => expect(res.body.sent).toBe(true));

      expect(emailSpy).toHaveBeenCalledTimes(1);
      const otpCode = emailSpy.mock.calls[0][1] as string;
      expect(otpCode).toMatch(/^\d{6}$/);

      const enfriado = await request(server)
        .post('/api/auth/send-otp')
        .send({ pending_token: pendingToken })
        .expect(200);
      expect(enfriado.body.sent).toBe(false);

      await request(server)
        .post('/api/auth/verify-otp')
        .send({ pending_token: pendingToken, code: '000000' })
        .expect(400);

      const verify = await request(server)
        .post('/api/auth/verify-otp')
        .send({ pending_token: pendingToken, code: otpCode })
        .expect(200);
      expect(verify.body.verified).toBe(true);
      expect(verify.body.access_token).toBeDefined();

      const user = mockDb.authUsers.find((u) => u.email === body.email)!;
      expect(user.email_confirmed).toBe(true);

      await request(server)
        .get('/api/talleres')
        .set('Authorization', `Bearer ${verify.body.access_token}`)
        .expect(200);
    });

    it('rechaza pending_token inválido en send-otp', async () => {
      await request(server)
        .post('/api/auth/send-otp')
        .send({ pending_token: 'token-falso' })
        .expect(401);
    });

    it('rechaza código mal formado en verify-otp', async () => {
      await request(server)
        .post('/api/auth/verify-otp')
        .send({ pending_token: 'x', code: '12ab' })
        .expect(400);
    });
  });

  describe('verify-identity', () => {
    it('rechaza credenciales inválidas', async () => {
      seedUser('student');
      await request(server)
        .post('/api/auth/verify-identity')
        .send({
          role: 'student',
          email: 'nadie@cbtis61.edu.mx',
          password: 'incorrecto',
          matricula: 'X',
        })
        .expect(401);
    });

    it('inicia sesión de estudiante confirmado', async () => {
      const { user } = seedUser('student');
      const profile = mockDb.table('profiles').find((p) => p.id === user.id)!;

      const res = await request(server)
        .post('/api/auth/verify-identity')
        .send({
          role: 'student',
          email: user.email,
          password: 'password123',
          matricula: profile.matricula,
        })
        .expect(200);
      expect(res.body.verified).toBe(true);
      expect(res.body.needs_otp).toBe(false);
      expect(res.body.access_token).toBeDefined();
    });

    it('usuario no confirmado recibe needs_otp', async () => {
      const { user } = seedUser('student', { email_confirmed: false });
      const profile = mockDb.table('profiles').find((p) => p.id === user.id)!;

      const res = await request(server)
        .post('/api/auth/verify-identity')
        .send({
          role: 'student',
          email: user.email,
          password: 'password123',
          matricula: profile.matricula,
        })
        .expect(200);
      expect(res.body.needs_otp).toBe(true);
      expect(res.body.pending_token).toBeDefined();
    });

    it('rechaza body inválido', async () => {
      await request(server)
        .post('/api/auth/verify-identity')
        .send({ role: 'student' })
        .expect(400);
    });
  });

  describe('registro de instructores (sólo admin)', () => {
    const instructorBody = (tallerId: string) => ({
      nombre: 'Prof. Nueva',
      email: `prof-${randomUUID().slice(0, 8)}@cbtis61.edu.mx`,
      password: 'password123',
      matricula: 'DOC100',
      taller_id: tallerId,
    });

    it('requiere autenticación', async () => {
      await request(server)
        .post('/api/auth/register-instructor')
        .send(instructorBody(randomUUID()))
        .expect(401);
    });

    it('rechaza a usuarios sin rol admin', async () => {
      const { token } = seedUser('student');
      await request(server)
        .post('/api/auth/register-instructor')
        .set('Authorization', `Bearer ${token}`)
        .send(instructorBody(randomUUID()))
        .expect(403);
    });

    it('crea instructor y lo asigna al taller libre', async () => {
      const { token } = seedUser('admin');
      const taller = seedTaller();

      const body = instructorBody(taller.id);
      const res = await request(server)
        .post('/api/auth/register-instructor')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(201);
      expect(res.body.taller_id).toBe(taller.id);

      const updated = mockDb.table('talleres').find((t) => t.id === taller.id)!;
      expect(updated.instructor).toBe('Prof. Nueva');
      expect(updated.instructor_id).toBe(res.body.user_id);
    });

    it('conflicto si el taller ya tiene instructor', async () => {
      const { token } = seedUser('admin');
      const taller = seedTaller({ instructor_id: randomUUID() });

      await request(server)
        .post('/api/auth/register-instructor')
        .set('Authorization', `Bearer ${token}`)
        .send(instructorBody(taller.id))
        .expect(409);
    });

    it('rechaza taller inexistente', async () => {
      const { token } = seedUser('admin');
      await request(server)
        .post('/api/auth/register-instructor')
        .set('Authorization', `Bearer ${token}`)
        .send(instructorBody(randomUUID()))
        .expect(400);
    });
  });

  describe('talleres', () => {
    let student: SeededUser;
    let admin: SeededUser;

    beforeEach(() => {
      student = seedUser('student');
      admin = seedUser('admin');
    });

    it('requiere token', async () => {
      await request(server).get('/api/talleres').expect(401);
    });

    it('lista con inscritos y disponibilidad calculados', async () => {
      const lleno = seedTaller({ nombre: 'Lleno', cupo: 1 });
      const libre = seedTaller({ nombre: 'Libre', cupo: 10 });
      mockDb.seed('inscripciones', [
        { alumno_id: randomUUID(), taller_id: lleno.id },
      ]);

      const res = await request(server)
        .get('/api/talleres')
        .set('Authorization', `Bearer ${student.token}`)
        .expect(200);
      expect(res.body).toHaveLength(2);

      const tLleno = res.body.find((t: Row) => t.id === lleno.id);
      expect(tLleno.inscritos).toBe(1);
      expect(tLleno.disponible).toBe(false);
      const tLibre = res.body.find((t: Row) => t.id === libre.id);
      expect(tLibre.disponible).toBe(true);
    });

    it('filtra por categoría', async () => {
      seedTaller({ categoria: 'DIFUSIÓN CULTURAL' });
      seedTaller({ categoria: 'PROMOCIÓN DEPORTIVA — MATUTINO' });

      const res = await request(server)
        .get('/api/talleres')
        .query({ categoria: 'DIFUSIÓN CULTURAL' })
        .set('Authorization', `Bearer ${student.token}`)
        .expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('obtiene un taller por id y 404 si no existe', async () => {
      const taller = seedTaller();
      await request(server)
        .get(`/api/talleres/${taller.id}`)
        .set('Authorization', `Bearer ${student.token}`)
        .expect(200)
        .expect((res) => expect(res.body.id).toBe(taller.id));

      await request(server)
        .get(`/api/talleres/${randomUUID()}`)
        .set('Authorization', `Bearer ${student.token}`)
        .expect(404);
    });

    it('rechaza id que no es UUID', async () => {
      await request(server)
        .get('/api/talleres/no-uuid')
        .set('Authorization', `Bearer ${student.token}`)
        .expect(400);
    });

    it('crear taller es exclusivo de admin', async () => {
      const body = {
        nombre: 'Robótica',
        categoria: 'DIFUSIÓN CULTURAL',
        lugar: 'Lab 2',
        instructor: 'Prof. C',
        cupo: 20,
        horarios: [{ dia: 'lunes', hora_inicio: '14:00', hora_fin: '15:00' }],
      };

      await request(server)
        .post('/api/talleres')
        .set('Authorization', `Bearer ${student.token}`)
        .send(body)
        .expect(403);

      const res = await request(server)
        .post('/api/talleres')
        .set('Authorization', `Bearer ${admin.token}`)
        .send(body)
        .expect(201);
      expect(res.body.horarios).toHaveLength(1);
    });

    it('rechaza creación con datos inválidos', async () => {
      await request(server)
        .post('/api/talleres')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ nombre: 'X', categoria: 'INEXISTENTE' })
        .expect(400);
    });

    it('rechaza horario con rango invertido', async () => {
      await request(server)
        .post('/api/talleres')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          nombre: 'Taller Mal',
          categoria: 'DIFUSIÓN CULTURAL',
          lugar: 'Aula',
          instructor: 'Prof',
          horarios: [{ dia: 'lunes', hora_inicio: '15:00', hora_fin: '14:00' }],
        })
        .expect(400);
    });

    it('no permite bajar el cupo por debajo de inscritos', async () => {
      const taller = seedTaller({ cupo: 10 });
      mockDb.seed('inscripciones', [
        { alumno_id: randomUUID(), taller_id: taller.id },
        { alumno_id: randomUUID(), taller_id: taller.id },
      ]);

      const res = await request(server)
        .put(`/api/talleres/${taller.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ cupo: 1 })
        .expect(400);
      expect(res.body.message).toContain('no puede ser menor');
    });

    it('actualiza taller y reemplaza horarios', async () => {
      const taller = seedTaller();
      mockDb.seed('horarios', [
        {
          taller_id: taller.id,
          dia: 'lunes',
          hora_inicio: '10:00',
          hora_fin: '11:00',
        },
      ]);

      const res = await request(server)
        .put(`/api/talleres/${taller.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          lugar: 'Cancha norte',
          horarios: [
            { dia: 'viernes', hora_inicio: '12:00', hora_fin: '13:00' },
          ],
        })
        .expect(200);
      expect(res.body.lugar).toBe('Cancha norte');
      expect(res.body.horarios).toHaveLength(1);
      expect(res.body.horarios[0].dia).toBe('viernes');
    });

    it('no permite eliminar taller con inscritos', async () => {
      const taller = seedTaller();
      mockDb.seed('inscripciones', [
        { alumno_id: randomUUID(), taller_id: taller.id },
      ]);
      await request(server)
        .delete(`/api/talleres/${taller.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(409);
    });

    it('elimina taller sin inscritos', async () => {
      const taller = seedTaller();
      await request(server)
        .delete(`/api/talleres/${taller.id}`)
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200);
      expect(mockDb.table('talleres')).toHaveLength(0);
    });
  });

  describe('asistencias', () => {
    let instructor: SeededUser;
    let student: SeededUser;
    let admin: SeededUser;
    let taller: Row;

    beforeEach(() => {
      instructor = seedUser('instructor');
      student = seedUser('student');
      admin = seedUser('admin');
      taller = seedTaller({ instructor_id: instructor.user.id });
      mockDb.registerRpc('get_asistencia_taller', (p: any) => [
        {
          alumno_id: student.user.id,
          taller_id: p.p_taller_id,
          estado: 'presente',
        },
      ]);
      mockDb.registerRpc('get_admin_stats', () => ({ total: 1 }));
      mockDb.registerRpc('get_mi_asistencia', () => [{ fecha: '2026-08-19' }]);
    });

    it('requiere fecha al consultar por taller', async () => {
      await request(server)
        .get(`/api/asistencias/taller/${taller.id}`)
        .set('Authorization', `Bearer ${instructor.token}`)
        .expect(400);
    });

    it('consulta por taller: instructor sí, estudiante no', async () => {
      await request(server)
        .get(`/api/asistencias/taller/${taller.id}`)
        .query({ fecha: '2026-08-19' })
        .set('Authorization', `Bearer ${instructor.token}`)
        .expect(200)
        .expect((res) => expect(res.body).toHaveLength(1));

      await request(server)
        .get(`/api/asistencias/taller/${taller.id}`)
        .query({ fecha: '2026-08-19' })
        .set('Authorization', `Bearer ${student.token}`)
        .expect(403);
    });

    it('guarda asistencia y hace upsert por (alumno, taller, fecha)', async () => {
      const body = {
        alumno_id: student.user.id,
        taller_id: taller.id,
        fecha: '2026-08-19',
        estado: 'presente',
      };

      await request(server)
        .post('/api/asistencias')
        .set('Authorization', `Bearer ${instructor.token}`)
        .send(body)
        .expect(201);

      await request(server)
        .post('/api/asistencias')
        .set('Authorization', `Bearer ${instructor.token}`)
        .send({ ...body, estado: 'retardo' })
        .expect(201);

      expect(mockDb.table('asistencias')).toHaveLength(1);
      expect(mockDb.table('asistencias')[0].estado).toBe('retardo');
    });

    it('rechaza estado inválido al guardar', async () => {
      await request(server)
        .post('/api/asistencias')
        .set('Authorization', `Bearer ${instructor.token}`)
        .send({
          alumno_id: student.user.id,
          taller_id: taller.id,
          fecha: '2026-08-19',
          estado: 'dormido',
        })
        .expect(400);
    });

    it('estadísticas globales sólo para admin', async () => {
      await request(server)
        .get('/api/asistencias/stats')
        .set('Authorization', `Bearer ${instructor.token}`)
        .expect(403);

      await request(server)
        .get('/api/asistencias/stats')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(200)
        .expect((res) => expect(res.body.total).toBe(1));
    });

    it('estudiante consulta su propia asistencia', async () => {
      await request(server)
        .get('/api/asistencias/mis')
        .set('Authorization', `Bearer ${student.token}`)
        .expect(200)
        .expect((res) => expect(res.body).toHaveLength(1));

      await request(server)
        .get('/api/asistencias/mis')
        .set('Authorization', `Bearer ${admin.token}`)
        .expect(403);
    });
  });

  describe('perfiles y configuración', () => {
    it('GET /api/profiles/me devuelve el perfil del token', async () => {
      const { user, token } = seedUser('student');
      const res = await request(server)
        .get('/api/profiles/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body.id).toBe(user.id);
      expect(res.body.nombre).toBe('Usuario student');
    });

    it('PUT /api/profiles/me actualiza el perfil propio', async () => {
      const { token } = seedUser('student');
      const res = await request(server)
        .put('/api/profiles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Nombre Actualizado' })
        .expect(200);
      expect(res.body.nombre).toBe('Nombre Actualizado');
    });

    it('rechaza actualización de perfil inválida', async () => {
      const { token } = seedUser('student');
      await request(server)
        .put('/api/profiles/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ turno: 'nocturno' })
        .expect(400);
    });

    it('GET /api/profiles/settings es público autenticado', async () => {
      const { token } = seedUser('student');
      mockDb.seed('settings', [{ key: 'periodo', value: '2026-2' }]);
      const res = await request(server)
        .get('/api/profiles/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('PUT settings crea clave nueva y actualiza existente (sólo admin)', async () => {
      const admin = seedUser('admin');
      const student = seedUser('student');

      await request(server)
        .put('/api/profiles/settings/periodo')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ value: '2026-2' })
        .expect(403);

      await request(server)
        .put('/api/profiles/settings/periodo')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ value: '2026-2' })
        .expect(200);

      const res = await request(server)
        .put('/api/profiles/settings/periodo')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ value: '2027-1' })
        .expect(200);
      expect(res.body.value).toBe('2027-1');
      expect(mockDb.table('settings')).toHaveLength(1);
    });

    it('PUT settings requiere campo value', async () => {
      const { token } = seedUser('admin');
      await request(server)
        .put('/api/profiles/settings/periodo')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });
  });
});
