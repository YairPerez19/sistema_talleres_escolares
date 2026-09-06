import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReportesService } from '../../src/reportes/reportes.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  MockSupabaseClient,
} from '../mocks/supabase.mock';

let mockSupabaseClient: MockSupabaseClient;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

describe('ReportesService', () => {
  let service: ReportesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
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

    service = module.get<ReportesService>(ReportesService);
  });

  describe('getDashboardStats', () => {
    it('debe calcular métricas completas de AdminStats', async () => {
      const todayStr = new Date().toISOString().split('T')[0];

      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'asistencias') {
          return {
            select: jest.fn((_fields: string, opts?: { count?: string }) => {
              // Count exact queries
              if (opts?.count === 'exact') {
                return {
                  count: 42,
                  eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
                  then: (resolve: (val: unknown) => void) => {
                    resolve({ count: 42, error: null });
                  },
                };
              }
              // Consulta ultimos 7 días
              return {
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({
                      data: [
                        {
                          taller_id: 'taller-1',
                          estado: 'presente',
                          talleres: {
                            nombre: 'Teatro',
                            categoria: 'DIFUSIÓN CULTURAL',
                          },
                        },
                      ],
                      error: null,
                    }),
                    then: (resolve: (val: unknown) => void) => {
                      resolve({
                        data: [
                          { fecha: todayStr, estado: 'presente' },
                          { fecha: todayStr, estado: 'retardo' },
                          { fecha: todayStr, estado: 'ausente' },
                        ],
                        error: null,
                      });
                    },
                  }),
                  lt: jest.fn().mockResolvedValue({
                    data: [{ estado: 'presente' }],
                    error: null,
                  }),
                }),
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'asist-1',
                        fecha: todayStr,
                        hora: '14:30:00',
                        estado: 'presente',
                        profiles: {
                          nombre: 'Juan Pérez',
                          matricula: '2231105001',
                        },
                        talleres: { nombre: 'Teatro' },
                      },
                    ],
                    error: null,
                  }),
                }),
              };
            }),
          };
        }
        if (table === 'talleres') {
          return {
            select: jest.fn((_fields: string, opts?: { count?: string }) => {
              if (opts?.count === 'exact') {
                return Promise.resolve({ count: 12, error: null });
              }
              return Promise.resolve({
                data: [
                  {
                    id: 'taller-1',
                    nombre: 'Teatro',
                    categoria: 'DIFUSIÓN CULTURAL',
                  },
                ],
                error: null,
              });
            }),
          };
        }
        if (table === 'deuda_alumnos') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [{ alumno_id: 'alumno-1', faltas_injustificadas: 4 }],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'alumno-1',
                    nombre: 'Carlos López',
                    matricula: '2231105080',
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const stats = await service.getDashboardStats({ dias: 7 });

      expect(stats.totalSesiones).toBe(42);
      expect(stats.talleresActivos).toBe(12);
      expect(stats.distribucionEstados.presente).toBe(1);
      expect(stats.distribucionEstados.retardo).toBe(1);
      expect(stats.distribucionEstados.ausente).toBe(1);
      // Promedio: 2 presentes de 3 = 67%
      expect(stats.promedioAsistencia).toBe(67);
      expect(stats.promedioSemanaPasada).toBe(100);
      expect(stats.asistenciaPorDia.length).toBe(7);
      expect(stats.alumnosConMasFaltas.length).toBe(1);
      expect(stats.alumnosConMasFaltas[0].nombre).toBe('Carlos López');
      expect(stats.alumnosConMasFaltas[0].faltas).toBe(4);
      expect(stats.actividadReciente.length).toBe(1);
      expect(stats.actividadReciente[0].alumno).toBe('Juan Pérez');
    });
  });

  describe('getAsistenciasReport', () => {
    const mockAsistencias = [
      {
        id: 'asist-1',
        fecha: '2026-09-06',
        hora: '15:30:00',
        estado: 'presente',
        observaciones: null,
        alumno_id: 'alumno-1',
        taller_id: 'taller-1',
        profiles: {
          id: 'alumno-1',
          nombre: 'Juan Pérez',
          matricula: '2231105001',
        },
        talleres: {
          id: 'taller-1',
          nombre: 'Futbol, Varonil',
          categoria: 'DEPORTES',
        },
      },
    ];

    it('debe retornar JSON con registros de asistencia', async () => {
      mockSupabaseClient.from = jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockAsistencias,
              error: null,
            }),
          }),
        }),
      }));

      const res = await service.getAsistenciasReport({ formato: 'json' });

      expect(res.data).toBeDefined();
      expect(res.data!.length).toBe(1);
      expect(res.data![0].profiles?.nombre).toBe('Juan Pérez');
    });

    it('debe retornar CSV formateado y con escape de caracteres especiales', async () => {
      mockSupabaseClient.from = jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockAsistencias,
              error: null,
            }),
          }),
        }),
      }));

      const res = await service.getAsistenciasReport({ formato: 'csv' });

      expect(res.csv).toBeDefined();
      const lines = res.csv!.split('\n');
      expect(lines[0]).toBe('Fecha,Alumno,Matrícula,Taller,Estado,Hora');
      // Nombre de taller con coma debe estar entrecomillado
      expect(lines[1]).toContain('"Futbol, Varonil"');
      expect(lines[1]).toContain('Juan Pérez');
      expect(lines[1]).toContain('presente');
    });

    it('debe aplicar filtros por fecha y taller_id', async () => {
      const gteMock = jest.fn().mockReturnThis();
      const lteMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();

      mockSupabaseClient.from = jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          gte: gteMock,
          lte: lteMock,
          eq: eqMock,
          order: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }));

      await service.getAsistenciasReport({
        fecha_inicio: '2026-09-01',
        fecha_fin: '2026-09-06',
        taller_id: '11111111-1111-1111-1111-111111111111',
        formato: 'json',
      });

      expect(gteMock).toHaveBeenCalledWith('fecha', '2026-09-01');
      expect(lteMock).toHaveBeenCalledWith('fecha', '2026-09-06');
      expect(eqMock).toHaveBeenCalledWith(
        'taller_id',
        '11111111-1111-1111-1111-111111111111',
      );
    });
  });

  describe('getTalleresStats', () => {
    it('debe consultar la vista estadisticas_talleres exitosamente', async () => {
      const mockTalleresStats = [
        {
          taller_id: 'taller-1',
          taller_nombre: 'Danza',
          categoria: 'DIFUSIÓN CULTURAL',
          instructor: 'Diego Guevara',
          alumnos_registrados: 22,
          asistencias_totales: 80,
          faltas_totales: 5,
          sesiones_tomadas: 4,
          porcentaje_asistencia_global: 94.1,
        },
      ];

      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'estadisticas_talleres') {
          return {
            select: jest.fn().mockResolvedValue({
              data: mockTalleresStats,
              error: null,
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const res = await service.getTalleresStats();

      expect(res.length).toBe(1);
      expect(res[0].taller_nombre).toBe('Danza');
      expect(res[0].alumnos_registrados).toBe(22);
      expect(res[0].porcentaje_asistencia_global).toBe(94.1);
    });

    it('debe calcular estadísticas como fallback si falla la vista estadisticas_talleres', async () => {
      mockSupabaseClient.from = jest.fn((table: string) => {
        if (table === 'estadisticas_talleres') {
          return {
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'View not found' },
            }),
          };
        }
        if (table === 'talleres') {
          return {
            select: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'taller-1',
                  nombre: 'Pintura',
                  categoria: 'ARTE',
                  instructor: 'María',
                },
              ],
              error: null,
            }),
          };
        }
        if (table === 'inscripciones') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  { taller_id: 'taller-1', alumno_id: 'alumno-1' },
                  { taller_id: 'taller-1', alumno_id: 'alumno-2' },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'asistencias') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    taller_id: 'taller-1',
                    fecha: '2026-09-01',
                    estado: 'presente',
                  },
                  {
                    taller_id: 'taller-1',
                    fecha: '2026-09-01',
                    estado: 'ausente',
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return createMockQueryBuilder();
      });

      const res = await service.getTalleresStats();

      expect(res.length).toBe(1);
      expect(res[0].taller_nombre).toBe('Pintura');
      expect(res[0].alumnos_registrados).toBe(2);
      expect(res[0].asistencias_totales).toBe(1);
      expect(res[0].faltas_totales).toBe(1);
      expect(res[0].sesiones_tomadas).toBe(1);
      expect(res[0].porcentaje_asistencia_global).toBe(50);
    });
  });
});
