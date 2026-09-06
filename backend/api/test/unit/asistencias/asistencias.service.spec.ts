import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AsistenciasService } from '../../../src/asistencias/asistencias.service';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from '../../mocks/supabase.mock';
import type { AuthUser } from '../../../src/common/roles.guard';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('AsistenciasService', () => {
  let service: AsistenciasService;

  const instructorUser: AuthUser = {
    id: 'instructor-uuid-1',
    email: 'instructor@example.com',
    role: 'instructor',
  };

  const otherInstructorUser: AuthUser = {
    id: 'instructor-uuid-2',
    email: 'other.instructor@example.com',
    role: 'instructor',
  };

  const adminUser: AuthUser = {
    id: 'admin-uuid-1',
    email: 'admin@example.com',
    role: 'admin',
  };

  const studentUser: AuthUser = {
    id: 'student-uuid-1',
    email: 'student@example.com',
    role: 'student',
  };

  const tallerId = 'taller-uuid-1';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsistenciasService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SUPABASE_URL') return 'http://localhost:54321';
              if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'mock-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AsistenciasService>(AsistenciasService);
  });

  describe('recordAsistencia', () => {
    it('1. instructor recording attendance for today on assigned workshop succeeds', async () => {
      const today = service.getTodayString();

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Ajedrez',
                instructor_id: instructorUser.id,
              },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation((col: string) => {
              if (col === 'alumno_id') {
                return {
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: { id: 'ins-1' },
                      error: null,
                    }),
                  }),
                };
              }
              return {
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'ins-1' },
                  error: null,
                }),
              };
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
                    alumno_id: studentUser.id,
                    taller_id: tallerId,
                    instructor_id: instructorUser.id,
                    fecha: today,
                    hora: '10:00:00',
                    estado: 'presente',
                    observaciones: 'Llegó puntual',
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

      const res = await service.recordAsistencia(instructorUser, {
        alumno_id: studentUser.id,
        taller_id: tallerId,
        fecha: today,
        estado: 'presente',
        observaciones: 'Llegó puntual',
      });

      expect(res.id).toBe('asis-1');
      expect(res.estado).toBe('presente');
      expect(res.alumno_id).toBe(studentUser.id);
      expect(res.instructor_id).toBe(instructorUser.id);
    });

    it('2. instructor recording attendance on unassigned workshop throws ForbiddenException', async () => {
      const today = service.getTodayString();

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Ajedrez',
                instructor_id: 'different-instructor-id',
              },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.recordAsistencia(instructorUser, {
          alumno_id: studentUser.id,
          taller_id: tallerId,
          fecha: today,
          estado: 'presente',
        }),
      ).rejects.toThrow(
        new ForbiddenException(
          'No estás asignado como instructor de este taller.',
        ),
      );
    });

    it('3. instructor recording attendance on yesterday throws ForbiddenException', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Ajedrez',
                instructor_id: instructorUser.id,
              },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.recordAsistencia(instructorUser, {
          alumno_id: studentUser.id,
          taller_id: tallerId,
          fecha: '2020-01-01',
          estado: 'presente',
        }),
      ).rejects.toThrow(
        new ForbiddenException(
          'Solo puedes registrar o editar asistencia para la fecha actual.',
        ),
      );
    });

    it('4. admin recording attendance on past date succeeds', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Ajedrez',
                instructor_id: 'some-instructor',
              },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation((col: string) => {
              if (col === 'alumno_id') {
                return {
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: { id: 'ins-1' },
                      error: null,
                    }),
                  }),
                };
              }
              return {
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: 'ins-1' },
                  error: null,
                }),
              };
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
                    alumno_id: studentUser.id,
                    taller_id: tallerId,
                    instructor_id: adminUser.id,
                    fecha: '2026-01-15',
                    hora: '09:30:00',
                    estado: 'justificado',
                    observaciones: 'Permiso médico extemporáneo',
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

      const res = await service.recordAsistencia(adminUser, {
        alumno_id: studentUser.id,
        taller_id: tallerId,
        fecha: '2026-01-15',
        estado: 'justificado',
        observaciones: 'Permiso médico extemporáneo',
      });

      expect(res.id).toBe('asis-admin-past');
      expect(res.fecha).toBe('2026-01-15');
      expect(res.estado).toBe('justificado');
    });

    it('5. recording attendance for non-enrolled student throws BadRequestException', async () => {
      const today = service.getTodayString();

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Ajedrez',
                instructor_id: instructorUser.id,
              },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation((col: string) => {
              if (col === 'alumno_id') {
                return {
                  eq: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: null,
                      error: null,
                    }),
                  }),
                };
              }
              return {
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              };
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.recordAsistencia(instructorUser, {
          alumno_id: 'non-enrolled-student',
          taller_id: tallerId,
          fecha: today,
          estado: 'presente',
        }),
      ).rejects.toThrow(
        new BadRequestException('El alumno no está inscrito en este taller.'),
      );
    });

    it('throws NotFoundException if workshop does not exist', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.recordAsistencia(adminUser, {
          alumno_id: studentUser.id,
          taller_id: 'non-existent-taller',
          fecha: '2026-09-06',
          estado: 'presente',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordBulkAsistencia', () => {
    it('6. bulk marking attendance updates enrolled students without records', async () => {
      const today = service.getTodayString();
      const upsertMock = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Voleibol',
                instructor_id: instructorUser.id,
              },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                { alumno_id: 'student-1' },
                { alumno_id: 'student-2' },
                { alumno_id: 'student-3' },
              ],
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation((col: string) => {
              if (col === 'taller_id') {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: [{ alumno_id: 'student-1' }],
                    error: null,
                  }),
                };
              }
              return {
                eq: jest.fn().mockResolvedValue({
                  data: [{ alumno_id: 'student-1' }],
                  error: null,
                }),
              };
            }),
            upsert: upsertMock,
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.recordBulkAsistencia(instructorUser, {
        taller_id: tallerId,
        fecha: today,
        estado: 'presente',
      });

      expect(res.updated_count).toBe(2);
      expect(upsertMock).toHaveBeenCalledTimes(1);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ alumno_id: 'student-2' }),
          expect.objectContaining({ alumno_id: 'student-3' }),
        ]),
        { onConflict: 'alumno_id,taller_id,fecha' },
      );
    });

    it('bulk marking with specific alumno_ids filters to enrolled students', async () => {
      const today = service.getTodayString();
      const upsertMock = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Voleibol',
                instructor_id: instructorUser.id,
              },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [{ alumno_id: 'student-1' }, { alumno_id: 'student-2' }],
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            upsert: upsertMock,
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.recordBulkAsistencia(instructorUser, {
        taller_id: tallerId,
        fecha: today,
        estado: 'presente',
        alumno_ids: ['student-1', 'not-enrolled-student'],
      });

      expect(res.updated_count).toBe(1);
      expect(upsertMock).toHaveBeenCalledTimes(1);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ alumno_id: 'student-1' }),
        ]),
        { onConflict: 'alumno_id,taller_id,fecha' },
      );
    });

    it('bulk marking on unassigned workshop throws ForbiddenException for instructor', async () => {
      const today = service.getTodayString();

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Voleibol',
                instructor_id: otherInstructorUser.id,
              },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.recordBulkAsistencia(instructorUser, {
          taller_id: tallerId,
          fecha: today,
          estado: 'presente',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('bulk marking on past date throws ForbiddenException for instructor', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Voleibol',
                instructor_id: instructorUser.id,
              },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.recordBulkAsistencia(instructorUser, {
          taller_id: tallerId,
          fecha: '2026-01-01',
          estado: 'presente',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getRosterByTaller', () => {
    it('7. workshop roster returns all enrolled students with attendance status (including sin_registro)', async () => {
      const today = service.getTodayString();

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Danza',
                instructor_id: instructorUser.id,
              },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  alumno_id: 'student-1',
                  profiles: {
                    id: 'student-1',
                    nombre: 'Bernardo Torres',
                    matricula: '2231105001',
                    turno: 'matutino',
                  },
                },
                {
                  alumno_id: 'student-2',
                  profiles: {
                    id: 'student-2',
                    nombre: 'Ana Gómez',
                    matricula: '2231105002',
                    turno: 'vespertino',
                  },
                },
                {
                  alumno_id: 'student-3',
                  profiles: {
                    id: 'student-3',
                    nombre: 'Carlos Díaz',
                    matricula: '2231105003',
                    turno: 'matutino',
                  },
                },
              ],
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockImplementation((col: string) => {
              if (col === 'taller_id') {
                return {
                  eq: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'asis-1',
                        alumno_id: 'student-1',
                        estado: 'presente',
                        observaciones: 'Puntual',
                        hora: '15:30:00',
                      },
                      {
                        id: 'asis-2',
                        alumno_id: 'student-2',
                        estado: 'retardo',
                        observaciones: 'Llegó 10 min tarde',
                        hora: '15:40:00',
                      },
                    ],
                    error: null,
                  }),
                };
              }
              return {
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              };
            }),
          };
        }
        return mockSupabaseClient;
      });

      const roster = await service.getRosterByTaller(
        instructorUser,
        tallerId,
        today,
      );

      expect(roster).toHaveLength(3);
      // Alphabetical order: Ana Gómez, Bernardo Torres, Carlos Díaz
      expect(roster[0].nombre).toBe('Ana Gómez');
      expect(roster[0].estado).toBe('retardo');
      expect(roster[0].asistencia_id).toBe('asis-2');

      expect(roster[1].nombre).toBe('Bernardo Torres');
      expect(roster[1].estado).toBe('presente');
      expect(roster[1].asistencia_id).toBe('asis-1');

      expect(roster[2].nombre).toBe('Carlos Díaz');
      expect(roster[2].estado).toBe('sin_registro');
      expect(roster[2].asistencia_id).toBeNull();
      expect(roster[2].hora).toBeNull();
      expect(roster[2].observaciones).toBeNull();
    });

    it('roster query throws ForbiddenException if instructor is not assigned', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Danza',
                instructor_id: otherInstructorUser.id,
              },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.getRosterByTaller(instructorUser, tallerId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMisAsistencias', () => {
    it('8. student viewing own attendance history returns records', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockImplementation((col: string) => {
              if (col === 'fecha') {
                return {
                  order: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'asis-student-1',
                        taller_id: tallerId,
                        fecha: '2026-09-05',
                        hora: '16:05:00',
                        estado: 'presente',
                        observaciones: null,
                        created_at: '2026-09-05T16:05:00Z',
                        talleres: {
                          id: tallerId,
                          nombre: 'Pintura',
                          categoria: 'DIFUSIÓN CULTURAL',
                          instructor: 'Mtra. López',
                        },
                      },
                    ],
                    error: null,
                  }),
                };
              }
              return {
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              };
            }),
          };
        }
        return mockSupabaseClient;
      });

      const records = await service.getMisAsistencias(studentUser.id);

      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('asis-student-1');
      expect(records[0].taller_nombre).toBe('Pintura');
      expect(records[0].categoria).toBe('DIFUSIÓN CULTURAL');
      expect(records[0].instructor).toBe('Mtra. López');
      expect(records[0].estado).toBe('presente');
    });
  });

  describe('findAllAdmin', () => {
    it('returns paginated attendance logs for admin', async () => {
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
                  alumno_id: studentUser.id,
                  taller_id: tallerId,
                  instructor_id: instructorUser.id,
                  fecha: '2026-09-06',
                  hora: '15:30:00',
                  estado: 'presente',
                  observaciones: null,
                  created_at: '2026-09-06T15:30:00Z',
                  profiles: {
                    id: studentUser.id,
                    nombre: 'Pedro Ramírez',
                    matricula: '2231105099',
                    turno: 'matutino',
                  },
                  talleres: {
                    id: tallerId,
                    nombre: 'Música',
                    categoria: 'DIFUSIÓN CULTURAL',
                    instructor: 'Prof. Soto',
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

      const res = await service.findAllAdmin({
        page: 1,
        limit: 20,
        taller_id: tallerId,
      });

      expect(res.total).toBe(1);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe('asis-log-1');
      expect(res.data[0].profiles?.nombre).toBe('Pedro Ramírez');
      expect(res.data[0].talleres?.nombre).toBe('Música');
    });
  });
});
