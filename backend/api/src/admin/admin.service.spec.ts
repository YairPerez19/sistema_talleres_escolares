import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from '../../test/mocks/supabase.mock';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
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

    service = module.get<AdminService>(AdminService);
  });

  describe('listAdmins', () => {
    it('debe listar administradores con sus perfiles y correos', async () => {
      const mockRoles = [{ user_id: 'user-admin-1' }];
      const mockProfiles = [{ id: 'user-admin-1', nombre: 'Admin Principal' }];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: mockRoles,
              error: null,
            }),
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
        return mockSupabaseClient;
      });

      mockSupabaseClient.schema.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [{ id: 'user-admin-1', email: 'admin@cbtis61.edu.mx' }],
            error: null,
          }),
        }),
      });

      const res = await service.listAdmins();
      expect(res).toHaveLength(1);
      expect(res[0].user_id).toBe('user-admin-1');
      expect(res[0].nombre).toBe('Admin Principal');
      expect(res[0].email).toBe('admin@cbtis61.edu.mx');
    });
  });

  describe('assignAdmin', () => {
    it('debe asignar rol de administrador a un usuario existente', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'user-2' },
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
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.assignAdmin({ user_id: 'user-2' });
      expect(res.user_id).toBe('user-2');
      expect(res.role).toBe('admin');
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
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

      mockSupabaseClient.schema.mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await expect(
        service.assignAdmin({ user_id: 'user-inexistente' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ConflictException si el usuario ya es administrador', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'user-ya-admin' },
              error: null,
            }),
          };
        }
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { user_id: 'user-ya-admin', role: 'admin' },
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      await expect(
        service.assignAdmin({ user_id: 'user-ya-admin' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('revokeAdmin', () => {
    it('debe revocar rol de administrador a otro usuario', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { user_id: 'user-target', role: 'admin' },
              error: null,
            }),
            delete: jest.fn().mockReturnThis(),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.revokeAdmin('user-target', 'current-admin');
      expect(res.user_id).toBe('user-target');
      expect(res.revoked).toBe(true);
    });

    it('debe lanzar BadRequestException al intentar autorevocarse', async () => {
      await expect(
        service.revokeAdmin('mismo-user', 'mismo-user'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el usuario no tiene rol admin', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'user_roles') {
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
        service.revokeAdmin('user-no-admin', 'current-admin'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
