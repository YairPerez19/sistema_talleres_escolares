import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InscripcionesService } from './inscripciones.service';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from '../../test/mocks/supabase.mock';
import type { AuthUser } from '../common/roles.guard';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

type SelectOptions = { count?: string; head?: boolean };

describe('InscripcionesService', () => {
  let service: InscripcionesService;

  const studentUser: AuthUser = {
    id: 'student-uuid-1',
    email: 'student@example.com',
    role: 'student',
  };

  const adminUser: AuthUser = {
    id: 'admin-uuid-1',
    email: 'admin@example.com',
    role: 'admin',
  };

  const instructorUser: AuthUser = {
    id: 'instructor-uuid-1',
    email: 'instructor@example.com',
    role: 'instructor',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InscripcionesService,
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

    service = module.get<InscripcionesService>(InscripcionesService);
  });

  describe('timesOverlap helper', () => {
    it('debe detectar empalme cuando los rangos se cruzan', () => {
      expect(service.timesOverlap('16:00', '17:00', '16:30', '17:30')).toBe(
        true,
      );
      expect(service.timesOverlap('16:00', '18:00', '16:30', '17:00')).toBe(
        true,
      );
      expect(service.timesOverlap('16:30', '17:30', '16:00', '17:00')).toBe(
        true,
      );
    });

    it('no debe detectar empalme cuando los horarios son consecutivos o disjuntos', () => {
      expect(service.timesOverlap('16:00', '17:00', '17:00', '18:00')).toBe(
        false,
      );
      expect(service.timesOverlap('08:00', '09:00', '10:00', '11:00')).toBe(
        false,
      );
      expect(service.timesOverlap('11:00', '12:00', '09:00', '10:00')).toBe(
        false,
      );
    });
  });

  describe('create (inscripción y validaciones de negocio)', () => {
    const tallerId = 'taller-uuid-1';

    it('1. debe rechazar si el alumno tiene adeudo pendiente (> 0)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: studentUser.id, deuda_total: 50 },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.create(studentUser, { taller_id: tallerId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('1b. admin debe poder hacer bypass del chequeo de adeudo', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'student-target-id',
                nombre: 'Alumno',
                inscripcion_limite: '2099-01-01T00:00:00Z',
                cambios_restantes: 3,
              },
              error: null,
            }),
          };
        }
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: tallerId, nombre: 'Ajedrez', cupo: 20 },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest
              .fn()
              .mockImplementation((_fields?: string, opts?: SelectOptions) => {
                if (opts?.count === 'exact') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: [],
                      count: 0,
                      error: null,
                    }),
                  };
                }
                return {
                  eq: jest.fn().mockImplementation((col: string) => {
                    if (col === 'alumno_id') {
                      return {
                        eq: jest.fn().mockReturnValue({
                          maybeSingle: jest
                            .fn()
                            .mockResolvedValue({ data: null, error: null }),
                        }),
                        // for active enrollments query:
                        then: (
                          resolve: (val: {
                            data: unknown[];
                            error: unknown;
                          }) => unknown,
                        ) =>
                          Promise.resolve({ data: [], error: null }).then(
                            resolve,
                          ),
                      };
                    }
                    return {
                      maybeSingle: jest
                        .fn()
                        .mockResolvedValue({ data: null, error: null }),
                    };
                  }),
                };
              }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'ins-new',
                    alumno_id: 'student-target-id',
                    taller_id: tallerId,
                    created_at: '2026-09-06T00:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.create(adminUser, {
        taller_id: tallerId,
        alumno_id: 'student-target-id',
      });

      expect(res.alumno_id).toBe('student-target-id');
      expect(res.taller_nombre).toBe('Ajedrez');
    });

    it('2. debe rechazar si la fecha límite de inscripción ha expirado', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: studentUser.id, deuda_total: 0 },
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
                id: studentUser.id,
                inscripcion_limite: '2020-01-01T00:00:00Z',
                cambios_restantes: 3,
              },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.create(studentUser, { taller_id: tallerId }),
      ).rejects.toThrow(
        new BadRequestException('El periodo de inscripciones ha finalizado.'),
      );
    });

    it('3. debe rechazar si el alumno tiene 0 cambios restantes', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: studentUser.id, deuda_total: 0 },
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
                id: studentUser.id,
                inscripcion_limite: '2099-01-01T00:00:00Z',
                cambios_restantes: 0,
              },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.create(studentUser, { taller_id: tallerId }),
      ).rejects.toThrow(
        new BadRequestException(
          'Has agotado tus 3 oportunidades de cambio de taller.',
        ),
      );
    });

    it('4. debe rechazar si el alumno ya está inscrito en el taller (duplicidad)', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: studentUser.id, deuda_total: 0 },
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
                id: studentUser.id,
                inscripcion_limite: '2099-01-01T00:00:00Z',
                cambios_restantes: 2,
              },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'existing-ins-id' },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.create(studentUser, { taller_id: tallerId }),
      ).rejects.toThrow(
        new ConflictException('Ya estás inscrito en este taller.'),
      );
    });

    it('5. debe rechazar si el taller no tiene cupo disponible', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
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
                id: studentUser.id,
                inscripcion_limite: '2099-01-01T00:00:00Z',
                cambios_restantes: 2,
              },
              error: null,
            }),
          };
        }
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: tallerId, nombre: 'Robótica', cupo: 15 },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest
              .fn()
              .mockImplementation((_fields?: string, opts?: SelectOptions) => {
                if (opts?.count === 'exact') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: new Array(15).fill({ id: 'any' }),
                      count: 15,
                      error: null,
                    }),
                  };
                }
                return {
                  eq: jest.fn().mockReturnThis(),
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
        service.create(studentUser, { taller_id: tallerId }),
      ).rejects.toThrow(
        new ConflictException('El taller no tiene cupo disponible.'),
      );
    });

    it('6. debe rechazar si hay colisión de horario con otro taller inscrito', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
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
                id: studentUser.id,
                inscripcion_limite: '2099-01-01T00:00:00Z',
                cambios_restantes: 2,
              },
              error: null,
            }),
          };
        }
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: tallerId, nombre: 'Danza', cupo: 25 },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest
              .fn()
              .mockImplementation((fields?: string, opts?: SelectOptions) => {
                if (opts?.count === 'exact') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: [],
                      count: 5,
                      error: null,
                    }),
                  };
                }
                if (fields === 'taller_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: [{ taller_id: 'enrolled-taller-1' }],
                      error: null,
                    }),
                  };
                }
                return {
                  eq: jest.fn().mockReturnThis(),
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                };
              }),
          };
        }
        if (table === 'horarios') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'h-target',
                  taller_id: tallerId,
                  dia: 'lunes',
                  hora_inicio: '16:00',
                  hora_fin: '17:00',
                },
              ],
              error: null,
            }),
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'h-enrolled',
                  taller_id: 'enrolled-taller-1',
                  dia: 'Lunes',
                  hora_inicio: '16:30',
                  hora_fin: '17:30',
                },
              ],
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.create(studentUser, { taller_id: tallerId }),
      ).rejects.toThrow(
        new ConflictException(
          'Conflicto de horario con otro taller ya inscrito en ese mismo día y bloque horario.',
        ),
      );
    });

    it('7. debe inscribir exitosamente cuando se cumplen todas las condiciones', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { alumno_id: studentUser.id, deuda_total: 0 },
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
                id: studentUser.id,
                inscripcion_limite: '2099-01-01T00:00:00Z',
                cambios_restantes: 3,
              },
              error: null,
            }),
          };
        }
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: tallerId, nombre: 'Pintura', cupo: 20 },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest
              .fn()
              .mockImplementation((fields?: string, opts?: SelectOptions) => {
                if (opts?.count === 'exact') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: [],
                      count: 3,
                      error: null,
                    }),
                  };
                }
                if (fields === 'taller_id') {
                  return {
                    eq: jest.fn().mockResolvedValue({
                      data: [{ taller_id: 'enrolled-taller-1' }],
                      error: null,
                    }),
                  };
                }
                return {
                  eq: jest.fn().mockReturnThis(),
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                };
              }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'ins-success',
                    alumno_id: studentUser.id,
                    taller_id: tallerId,
                    created_at: '2026-09-06T12:00:00Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'horarios') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'h-target',
                  taller_id: tallerId,
                  dia: 'martes',
                  hora_inicio: '16:00',
                  hora_fin: '17:00',
                },
              ],
              error: null,
            }),
            in: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'h-enrolled',
                  taller_id: 'enrolled-taller-1',
                  dia: 'jueves',
                  hora_inicio: '16:00',
                  hora_fin: '17:00',
                },
              ],
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.create(studentUser, { taller_id: tallerId });

      expect(res.id).toBe('ins-success');
      expect(res.alumno_id).toBe(studentUser.id);
      expect(res.taller_id).toBe(tallerId);
      expect(res.taller_nombre).toBe('Pintura');
    });
  });

  describe('baja (dar de baja de taller)', () => {
    const tallerId = 'taller-uuid-1';

    it('debe rechazar con NotFoundException si la inscripción no existe', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inscripciones') {
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
        service.baja(studentUser, { taller_id: tallerId }),
      ).rejects.toThrow(
        new NotFoundException(
          'No se encontró una inscripción activa en este taller.',
        ),
      );
    });

    it('debe dar de baja exitosamente y decrementar exactamente 1 cambio restante', async () => {
      const updateProfileMock = jest.fn().mockResolvedValue({ error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'ins-to-drop',
                alumno_id: studentUser.id,
                taller_id: tallerId,
                talleres: { id: tallerId, nombre: 'Banda de Guerra' },
              },
              error: null,
            }),
            delete: jest.fn().mockReturnThis(),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { cambios_restantes: 3 },
              error: null,
            }),
            update: jest.fn().mockReturnValue({
              eq: updateProfileMock,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.baja(studentUser, { taller_id: tallerId });

      expect(res.success).toBe(true);
      expect(res.cambios_restantes).toBe(2);
      expect(res.taller_nombre).toBe('Banda de Guerra');
      expect(updateProfileMock).toHaveBeenCalledWith('id', studentUser.id);
    });
  });

  describe('getMisTalleres', () => {
    it('debe retornar lista de talleres en los que el alumno está inscrito', async () => {
      const mockRows = [
        {
          id: 'ins-1',
          taller_id: 'taller-1',
          created_at: '2026-09-01T10:00:00Z',
          talleres: {
            id: 'taller-1',
            nombre: 'Ajedrez',
            categoria: 'DIFUSIÓN CULTURAL',
            lugar: 'Biblioteca',
            instructor: 'Prof. Gomez',
            instructor_id: 'inst-1',
            cupo: 20,
            horarios: [
              {
                id: 'h-1',
                taller_id: 'taller-1',
                dia: 'lunes',
                hora_inicio: '14:00',
                hora_fin: '15:00',
              },
            ],
          },
        },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: mockRows,
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.getMisTalleres(studentUser.id);

      expect(res).toHaveLength(1);
      expect(res[0].taller_nombre).toBe('Ajedrez');
      expect(res[0].horarios).toHaveLength(1);
    });
  });

  describe('getRosterByTaller', () => {
    const tallerId = 'taller-roster-id';

    it('debe permitir a un admin ver el roster completo de un taller', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Voleibol',
                cupo: 24,
                instructor_id: 'other-instructor-id',
              },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'ins-1',
                  alumno_id: 'alum-1',
                  created_at: '2026-09-01T08:00:00Z',
                  profiles: {
                    id: 'alum-1',
                    nombre: 'Carlos Díaz',
                    matricula: '2231105010',
                    turno: 'matutino',
                  },
                },
              ],
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.getRosterByTaller(adminUser, tallerId);

      expect(res.taller_id).toBe(tallerId);
      expect(res.taller_nombre).toBe('Voleibol');
      expect(res.total).toBe(1);
      expect(res.inscritos[0].nombre).toBe('Carlos Díaz');
    });

    it('debe rechazar con ForbiddenException si un instructor no asignado intenta ver el roster', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Voleibol',
                cupo: 24,
                instructor_id: 'another-instructor',
              },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.getRosterByTaller(instructorUser, tallerId),
      ).rejects.toThrow(
        new ForbiddenException(
          'No tienes permisos para consultar los inscritos de este taller.',
        ),
      );
    });

    it('debe permitir a un instructor asignado ver el roster', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: tallerId,
                nombre: 'Voleibol',
                cupo: 24,
                instructor_id: instructorUser.id,
              },
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.getRosterByTaller(instructorUser, tallerId);
      expect(res.total).toBe(0);
      expect(res.taller_nombre).toBe('Voleibol');
    });
  });

  describe('findAllAdmin', () => {
    it('debe retornar lista paginada de inscripciones con filtros para admin', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'ins-adm-1',
                  alumno_id: 'alum-1',
                  taller_id: 'taller-1',
                  created_at: '2026-09-02T10:00:00Z',
                  profiles: {
                    id: 'alum-1',
                    nombre: 'Mariana Ríos',
                    matricula: '2231105099',
                  },
                  talleres: {
                    id: 'taller-1',
                    nombre: 'Música',
                    categoria: 'DIFUSIÓN CULTURAL',
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
        limit: 10,
        taller_id: 'taller-1',
      });

      expect(res.total).toBe(1);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].alumno_nombre).toBe('Mariana Ríos');
      expect(res.data[0].taller_nombre).toBe('Música');
    });
  });
});
