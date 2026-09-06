import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from '../../src/ai/ai.service';

describe('AiService', () => {
  let service: AiService;
  let configService: ConfigService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GEMINI_API_KEY') return 'test-gemini-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('generateWorkshopDescription con Gemini API exitosa', () => {
    it('debe llamar a la API de Gemini y retornar la descripción generada', async () => {
      const mockDescription =
        'Taller de fútbol enfocado en el desarrollo motriz y trabajo en equipo.';
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: `  ${mockDescription}  ` }],
              },
            },
          ],
        }),
      });

      const result = await service.generateWorkshopDescription(
        'Fútbol Varonil',
        'PROMOCIÓN DEPORTIVA — VESPERTINO',
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('models/gemini-1.5-flash:generateContent'),
        expect.objectContaining({
          method: 'POST',
        }),
      );
      expect(result).toBe(mockDescription);
    });
  });

  describe('generateWorkshopDescription con fallbacks locales', () => {
    it('debe usar plantilla local si GEMINI_API_KEY no está configurada', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);
      global.fetch = jest.fn();

      const result = await service.generateWorkshopDescription(
        'Futbol',
        'PROMOCIÓN DEPORTIVA — MATUTINO',
      );

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toContain('¡Súmate al taller de Futbol!');
      expect(result).toContain('promoción deportiva — matutino');
    });

    it('debe usar plantilla local si fetch lanza una excepción (timeout o error de red)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch timeout'));

      const result = await service.generateWorkshopDescription(
        'Teatro Comunitario',
        'DIFUSIÓN CULTURAL',
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toContain(
        'Explora tu lado creativo en nuestro taller de Teatro Comunitario',
      );
      expect(result).toContain('difusión cultural');
    });

    it('debe usar plantilla local si la API de Gemini responde con status de error HTTP', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      const result = await service.generateWorkshopDescription(
        'Robótica Educativa',
        'ACTIVIDADES ACADÉMICAS',
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toContain(
        'Potencia tus conocimientos en el taller de Robótica Educativa',
      );
    });

    it('debe usar plantilla local si la API de Gemini responde con candidatos vacíos', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          candidates: [],
        }),
      });

      const result = await service.generateWorkshopDescription(
        'Taller Especial',
        'ACTIVIDADES CÍVICAS',
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result).toContain(
        'El taller de Taller Especial es una excelente oportunidad',
      );
    });
  });

  describe('Categorización de plantillas locales', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockReturnValue(null);
    });

    it('debe seleccionar plantilla de deportes por palabra clave en el nombre', async () => {
      const result = await service.generateWorkshopDescription(
        'Ajedrez Avanzado',
        'GENERAL',
      );
      expect(result).toContain(
        'disciplina, el esfuerzo físico y el compañerismo',
      );
    });

    it('debe seleccionar plantilla de arte por categoría CULTURAL cuando el nombre no coincide', async () => {
      const result = await service.generateWorkshopDescription(
        'Expresiones',
        'DIFUSIÓN CULTURAL',
      );
      expect(result).toContain('Explora tu lado creativo');
    });

    it('debe seleccionar plantilla de deportes por categoría DEPORTIVA cuando el nombre no coincide', async () => {
      const result = await service.generateWorkshopDescription(
        'Acondicionamiento',
        'PROMOCIÓN DEPORTIVA',
      );
      expect(result).toContain(
        'disciplina, el esfuerzo físico y el compañerismo',
      );
    });

    it('debe seleccionar plantilla académica por palabra clave', async () => {
      const result = await service.generateWorkshopDescription(
        'Club de Debate',
        'GENERAL',
      );
      expect(result).toContain('Potencia tus conocimientos');
    });

    it('debe usar plantilla default si no coincide ninguna regla temática', async () => {
      const result = await service.generateWorkshopDescription(
        'Liderazgo Juvenil',
        'ACTIVIDADES CÍVICAS',
      );
      expect(result).toContain(
        'CBTis No. 61 exploren nuevas áreas de conocimiento',
      );
    });
  });
});
