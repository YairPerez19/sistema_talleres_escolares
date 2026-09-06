import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { InstructoresService } from '../../../src/instructores/instructores.service';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from '../../mocks/supabase.mock';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('InstructoresService', () => {
  let service: InstructoresService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstructoresService,
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

    service = module.get<InstructoresService>(InstructoresService);
  });

  describe('findAll', () => {
    it('debe retornar lista de instructores vinculando perfil, email y talleres', async () => {
      const mockInstructores = [
        {
          id: 'inst-1',
          user_id: 'user-inst-1',
          especialidad: 'Danza Folklórica',
          telefono: '2461234567',
          activo: true,
          created_at: '2026-09-01T00:00:00Z',
        },
      ];

      const mockProfiles = [
        {
          id: 'user-inst-1',
          nombre: 'Diego Guevara',
          matricula: 'INST-001',
        },
      ];

      const mockTalleres = [
        {
          id: 'taller-1',
          nombre: 'Danza',
          instructor_id: 'user-inst-1',
        },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'instructores') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (
              resolve: (value: {
                data: typeof mockInstructores;
                error: null;
              }) => unknown,
            ) =>
              Promise.resolve({ data: mockInstructores, error: null }).then(
                resolve,
              ),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: mockProfiles,
              error: null,
            }),
          };
        }
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: mockTalleres,
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      mockSupabaseClient.schema.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [{ id: 'user-inst-1', email: 'diego@cbtis61.edu.mx' }],
            error: null,
          }),
        }),
      });

      const res = await service.findAll({});
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('inst-1');
      expect(res[0].nombre).toBe('Diego Guevara');
      expect(res[0].email).toBe('diego@cbtis61.edu.mx');
      expect(res[0].especialidad).toBe('Danza Folklórica');
      expect(res[0].talleres).toHaveLength(1);
      expect(res[0].talleres[0].nombre).toBe('Danza');
    });
  });

  describe('getMyTalleres', () => {
    it('debe retornar talleres del instructor autenticado con conteo de inscritos y horarios', async () => {
      const mockTalleres = [
        {
          id: 'taller-1',
          nombre: 'Danza',
          categoria: 'DIFUSIÓN CULTURAL',
          lugar: 'Salón 1',
          cupo: 30,
          horarios: [
            {
              id: 'h-1',
              dia: 'martes',
              hora_inicio: '15:30',
              hora_fin: '16:30',
            },
          ],
        },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockTalleres,
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [{ taller_id: 'taller-1' }, { taller_id: 'taller-1' }],
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.getMyTalleres('user-inst-1');
      expect(res).toHaveLength(1);
      expect(res[0].nombre).toBe('Danza');
      expect(res[0].alumnos_count).toBe(2);
      expect(res[0].horarios).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('debe retornar detalle de instructor con talleres asignados', async () => {
      const mockInstructor = {
        id: 'inst-1',
        user_id: 'user-inst-1',
        especialidad: 'Música',
        telefono: '2469998877',
        activo: true,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'instructores') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: mockInstructor, error: null }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { nombre: 'María Lopez', matricula: 'INST-002' },
              error: null,
            }),
          };
        }
        if (table === 'talleres') {
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

      const res = await service.findOne('inst-1');
      expect(res.id).toBe('inst-1');
      expect(res.nombre).toBe('María Lopez');
      expect(res.especialidad).toBe('Música');
    });

    it('debe lanzar NotFoundException si el instructor no existe', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'instructores') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(service.findOne('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('debe actualizar instructor y reasignar taller', async () => {
      const mockExisting = {
        id: 'inst-1',
        user_id: 'user-inst-1',
        especialidad: 'Pintura',
        telefono: '111',
        activo: true,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'instructores') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: mockExisting, error: null }),
            update: jest.fn().mockReturnThis(),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { nombre: 'Pintor Pro', matricula: 'INST-003' },
              error: null,
            }),
          };
        }
        if (table === 'talleres') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
            update: jest.fn().mockReturnThis(),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.update('inst-1', {
        especialidad: 'Arte Digital',
        telefono: '222',
        taller_id: 'taller-nuevo-1',
      });

      expect(res.id).toBe('inst-1');
      expect(res.nombre).toBe('Pintor Pro');
    });

    it('debe lanzar NotFoundException si el instructor a actualizar no existe', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'instructores') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.update('no-existe', { especialidad: 'Nueva' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('debe desactivar instructor y desasignar talleres', async () => {
      const mockExisting = {
        id: 'inst-1',
        user_id: 'user-inst-1',
        activo: true,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'instructores') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: mockExisting, error: null }),
            update: jest.fn().mockReturnThis(),
          };
        }
        if (table === 'talleres') {
          return {
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.remove('inst-1');
      expect(res.id).toBe('inst-1');
      expect(res.deactivated).toBe(true);
    });

    it('debe lanzar NotFoundException si el instructor a eliminar no existe', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'instructores') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(service.remove('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
