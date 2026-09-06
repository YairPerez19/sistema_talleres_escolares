import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AdeudosService } from '../../src/adeudos/adeudos.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  MockSupabaseClient,
} from '../mocks/supabase.mock';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('AdeudosService', () => {
  let service: AdeudosService;

  const mockAlumnoId = '11111111-1111-1111-1111-111111111111';
  const mockAlumnoId2 = '22222222-2222-2222-2222-222222222222';

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdeudosService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'SUPABASE_URL') return 'http://localhost:54321';
              if (key === 'SUPABASE_SERVICE_ROLE_KEY')
                return 'test-service-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AdeudosService>(AdeudosService);
  });

  describe('getDebtForStudent', () => {
    it('debe calcular el adeudo y porcentaje correctamente con fórmula (asistencias + retardos + ausentes) * 25', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: mockAlumnoId, nombre: 'Juan Pérez' },
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                { estado: 'presente' },
                { estado: 'presente' },
                { estado: 'presente' },
                { estado: 'presente' },
                { estado: 'retardo' },
                { estado: 'ausente' },
                { estado: 'justificado' },
              ],
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const result = await service.getDebtForStudent(mockAlumnoId);

      expect(result.alumno_id).toBe(mockAlumnoId);
      expect(result.sesiones_asistidas).toBe(4);
      expect(result.retardos).toBe(1);
      expect(result.faltas_injustificadas).toBe(1);
      expect(result.faltas_justificadas).toBe(1);
      expect(result.total_sesiones).toBe(7);
      // Asistencia = (4 + 1) / 7 * 100 = 71.4%
      expect(result.porcentaje_asistencia).toBe(71.4);
      // Deuda = (4 + 1 + 1) * 25 = 150
      expect(result.deuda_total).toBe(150);
      expect(result.tarifa_por_sesion).toBe(25.0);
    });

    it('debe retornar adeudo 0 y porcentaje 0 cuando el alumno no tiene asistencias', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: mockAlumnoId, nombre: 'María Soto' },
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const result = await service.getDebtForStudent(mockAlumnoId);

      expect(result.total_sesiones).toBe(0);
      expect(result.porcentaje_asistencia).toBe(0);
      expect(result.deuda_total).toBe(0);
    });

    it('debe lanzar NotFoundException si el alumno no existe en profiles', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
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
        return createMockQueryBuilder();
      });

      await expect(service.getDebtForStudent(mockAlumnoId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar InternalServerErrorException si falla la consulta a asistencias', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: mockAlumnoId, nombre: 'Juan' },
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'DB connection error' },
            }),
          };
        }
        return createMockQueryBuilder();
      });

      await expect(service.getDebtForStudent(mockAlumnoId)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    const mockProfiles = [
      {
        id: mockAlumnoId,
        nombre: 'Carlos López',
        matricula: '2231105080',
        turno: 'vespertino',
      },
      {
        id: mockAlumnoId2,
        nombre: 'Ana Gómez',
        matricula: '2231105081',
        turno: 'matutino',
      },
    ];

    it('debe listar alumnos con resumen de adeudos y paginación', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockProfiles,
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [
                { alumno_id: mockAlumnoId, estado: 'presente' },
                { alumno_id: mockAlumnoId, estado: 'ausente' },
                // Carlos: 1 presente + 1 ausente -> deuda = 50
                // Ana: sin registros -> deuda = 0
              ],
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const res = await service.findAll({ page: 1, limit: 10 });

      expect(res.total).toBe(2);
      expect(res.data.length).toBe(2);
      expect(res.data[0].alumno_id).toBe(mockAlumnoId);
      expect(res.data[0].deuda_total).toBe(50);
      expect(res.data[1].alumno_id).toBe(mockAlumnoId2);
      expect(res.data[1].deuda_total).toBe(0);
    });

    it('debe filtrar sólo alumnos con deuda cuando con_deuda_only es true', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({
              data: mockProfiles,
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [{ alumno_id: mockAlumnoId, estado: 'presente' }],
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const res = await service.findAll({
        con_deuda_only: true,
        page: 1,
        limit: 10,
      });

      expect(res.total).toBe(1);
      expect(res.data.length).toBe(1);
      expect(res.data[0].alumno_id).toBe(mockAlumnoId);
    });

    it('debe aplicar filtro de búsqueda q en profiles', async () => {
      const orMock = jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockProfiles[0]],
          error: null,
        }),
      });

      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              or: orMock,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const res = await service.findAll({ q: 'Carlos' });

      expect(orMock).toHaveBeenCalledWith(
        'nombre.ilike.%Carlos%,matricula.ilike.%Carlos%',
      );
      expect(res.total).toBe(1);
    });
  });

  describe('liquidar', () => {
    it('debe liquidar adeudo completo cuando no se envía monto', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: mockAlumnoId, nombre: 'Juan Pérez' },
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [{ estado: 'presente' }, { estado: 'presente' }],
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const res = await service.liquidar(mockAlumnoId, {
        referencia: 'REC-001',
        nota: 'Pago en caja escolar',
      });

      expect(res.alumno_id).toBe(mockAlumnoId);
      expect(res.monto_pagado).toBe(50);
      expect(res.saldo_restante).toBe(0);
      expect(res.liquidado).toBe(true);
      expect(res.fecha_pago).toBeDefined();
    });

    it('debe liquidar parcialmente cuando se especifica un monto menor al total', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: mockAlumnoId, nombre: 'Juan Pérez' },
              error: null,
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [
                { estado: 'presente' },
                { estado: 'presente' },
                { estado: 'ausente' },
                { estado: 'retardo' },
              ],
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      // Total = 4 * 25 = 100
      const res = await service.liquidar(mockAlumnoId, { monto: 40 });

      expect(res.alumno_id).toBe(mockAlumnoId);
      expect(res.monto_pagado).toBe(40);
      expect(res.saldo_restante).toBe(60);
      expect(res.liquidado).toBe(false);
    });

    it('debe lanzar NotFoundException si el alumno a liquidar no existe', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
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
        return createMockQueryBuilder();
      });

      await expect(
        service.liquidar(mockAlumnoId, { monto: 50 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
