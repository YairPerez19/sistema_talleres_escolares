import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { AlumnosService } from './alumnos.service';
import {
  createMockSupabaseClient,
  MockSupabaseClient,
} from '../../test/mocks/supabase.mock';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('AlumnosService', () => {
  let service: AlumnosService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlumnosService,
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

    service = module.get<AlumnosService>(AlumnosService);
  });

  describe('getProfileMe / findOne', () => {
    it('debe retornar el detalle completo del alumno con adeudo e inscripciones', async () => {
      const mockProfile = {
        id: 'alumno-1',
        nombre: 'Juan Pérez',
        matricula: '2231105001',
        turno: 'matutino',
        cambios_restantes: 2,
        inscripcion_limite: '2026-09-30T00:00:00Z',
      };

      const mockDebt = {
        alumno_id: 'alumno-1',
        deuda_total: 50,
      };

      const mockInscripciones = [
        {
          id: 'ins-1',
          taller_id: 'taller-1',
          created_at: '2026-09-01T10:00:00Z',
          talleres: {
            id: 'taller-1',
            nombre: 'Fútbol',
            categoria: 'DEPORTES',
            lugar: 'Cancha 1',
            instructor: 'Prof. Gomez',
            cupo: 25,
            horarios: [
              {
                id: 'h-1',
                taller_id: 'taller-1',
                dia: 'lunes',
                hora_inicio: '16:00',
                hora_fin: '17:00',
              },
            ],
          },
        },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: mockProfile, error: null }),
          };
        }
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: mockDebt, error: null }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest
              .fn()
              .mockResolvedValue({ data: mockInscripciones, error: null }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.getProfileMe('alumno-1');
      expect(res.id).toBe('alumno-1');
      expect(res.nombre).toBe('Juan Pérez');
      expect(res.deuda_total).toBe(50);
      expect(res.inscripciones).toHaveLength(1);
      expect(res.inscripciones[0].taller_nombre).toBe('Fútbol');
    });

    it('debe lanzar NotFoundException si el perfil no existe', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
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

  describe('findAll', () => {
    it('debe retornar lista paginada de alumnos con sus conteos de talleres y deudas', async () => {
      const mockProfiles = [
        {
          id: 'alumno-1',
          nombre: 'Ana López',
          matricula: '2231105002',
          turno: 'vespertino',
          cambios_restantes: 3,
          inscripcion_limite: '2026-09-30T00:00:00Z',
        },
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: mockProfiles,
              count: 1,
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [{ alumno_id: 'alumno-1' }],
              error: null,
            }),
          };
        }
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [{ alumno_id: 'alumno-1', deuda_total: 25 }],
              error: null,
            }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.findAll({
        q: 'Ana',
        turno: 'vespertino',
        page: 1,
        limit: 10,
      });

      expect(res.data).toHaveLength(1);
      expect(res.data[0].nombre).toBe('Ana López');
      expect(res.data[0].talleres_count).toBe(1);
      expect(res.data[0].deuda_total).toBe(25);
      expect(res.total).toBe(1);
    });
  });

  describe('update', () => {
    it('debe actualizar el perfil del alumno exitosamente', async () => {
      const existing = {
        id: 'alumno-1',
        nombre: 'Juan',
        turno: 'matutino',
        cambios_restantes: 3,
      };

      const updated = {
        id: 'alumno-1',
        nombre: 'Juan Carlos',
        turno: 'vespertino',
        cambios_restantes: 2,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: existing, error: null }),
            update: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: updated, error: null }),
          };
        }
        return mockSupabaseClient;
      });

      const res = await service.update('alumno-1', {
        nombre: 'Juan Carlos',
        turno: 'vespertino',
        cambios_restantes: 2,
      });

      expect(res.nombre).toBe('Juan Carlos');
      expect(res.turno).toBe('vespertino');
      expect(res.cambios_restantes).toBe(2);
    });

    it('debe lanzar NotFoundException si el alumno a actualizar no existe', async () => {
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
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
        service.update('no-existe', { nombre: 'Nuevo Nombre' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
