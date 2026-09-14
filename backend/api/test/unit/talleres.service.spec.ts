import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TalleresService } from '../../../src/talleres/talleres.service';
import {
  FakeDb,
  createFakeSupabase as mockCreateFakeSupabase,
} from '../../helpers/fake-supabase';

let mockDb: FakeDb;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockCreateFakeSupabase(mockDb)),
}));

const CATEGORIA = 'DIFUSIÓN CULTURAL';

describe('TalleresService', () => {
  let service: TalleresService;
  let module: TestingModule;

  const seedTalleres = () => {
    mockDb.seed('talleres', [
      {
        id: 't-1',
        nombre: 'Ajedrez',
        categoria: CATEGORIA,
        lugar: 'Aula 1',
        instructor: 'Prof. A',
        instructor_id: 'ins-1',
        cupo: 2,
      },
      {
        id: 't-2',
        nombre: 'Futbol',
        categoria: 'PROMOCIÓN DEPORTIVA — MATUTINO',
        lugar: 'Cancha',
        instructor: 'Prof. B',
        instructor_id: 'ins-2',
        cupo: 30,
      },
    ]);
    mockDb.seed('horarios', [
      {
        id: 'h-1',
        taller_id: 't-1',
        dia: 'lunes',
        hora_inicio: '14:00',
        hora_fin: '15:00',
      },
    ]);
    mockDb.seed('inscripciones', [
      { alumno_id: 'a-1', taller_id: 't-1' },
      { alumno_id: 'a-2', taller_id: 't-1' },
      { alumno_id: 'a-3', taller_id: 't-2' },
    ]);
  };

  beforeEach(async () => {
    mockDb = new FakeDb();
    module = await Test.createTestingModule({
      providers: [
        TalleresService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'SUPABASE_URL' ? 'https://fake.supabase.co' : 'fake-key',
            ),
          },
        },
      ],
    }).compile();
    service = module.get(TalleresService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('findAll', () => {
    it('calcula inscritos y disponibilidad', async () => {
      seedTalleres();
      const res = await service.findAll({});
      expect(res).toHaveLength(2);

      const ajedrez = res.find((t) => t.id === 't-1')!;
      expect(ajedrez.inscritos).toBe(2);
      expect(ajedrez.disponible).toBe(false);
      expect(ajedrez.horarios).toHaveLength(1);

      const futbol = res.find((t) => t.id === 't-2')!;
      expect(futbol.inscritos).toBe(1);
      expect(futbol.disponible).toBe(true);
    });

    it('filtra por categoría', async () => {
      seedTalleres();
      const res = await service.findAll({ categoria: CATEGORIA });
      expect(res).toHaveLength(1);
      expect(res[0].nombre).toBe('Ajedrez');
    });

    it('filtra por instructor_id y búsqueda por nombre', async () => {
      seedTalleres();
      const porInstructor = await service.findAll({ instructor_id: 'ins-2' });
      expect(porInstructor.map((t) => t.id)).toEqual(['t-2']);

      const porNombre = await service.findAll({ q: 'fut' });
      expect(porNombre.map((t) => t.id)).toEqual(['t-2']);
    });

    it('filtra por disponibilidad en memoria', async () => {
      seedTalleres();
      const disponibles = await service.findAll({ disponible: true });
      expect(disponibles.map((t) => t.id)).toEqual(['t-2']);

      const llenos = await service.findAll({ disponible: false });
      expect(llenos.map((t) => t.id)).toEqual(['t-1']);
    });
  });

  describe('findOne', () => {
    it('devuelve el taller con horarios e inscritos', async () => {
      seedTalleres();
      const res = await service.findOne('t-1');
      expect(res.nombre).toBe('Ajedrez');
      expect(res.horarios).toHaveLength(1);
      expect(res.inscritos).toBe(2);
    });

    it('lanza NotFoundException si no existe', async () => {
      await expect(service.findOne('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto: any = {
      nombre: 'Robótica',
      categoria: CATEGORIA,
      lugar: 'Lab 2',
      instructor: 'Prof. C',
      cupo: 20,
    };

    it('crea taller sin horarios', async () => {
      const res = await service.create(dto);
      expect(res.id).toBeDefined();
      expect(res.nombre).toBe('Robótica');
      expect(res.horarios).toEqual([]);
      expect(res.inscritos).toBe(0);
      expect(res.disponible).toBe(true);
    });

    it('crea taller con horarios', async () => {
      const res = await service.create({
        ...dto,
        horarios: [{ dia: 'martes', hora_inicio: '16:00', hora_fin: '17:00' }],
      });
      expect(res.horarios).toHaveLength(1);
      expect(res.horarios[0].dia).toBe('martes');
      expect(res.horarios[0].taller_id).toBe(res.id);
    });

    it('violación de unicidad se traduce en ConflictException', async () => {
      mockDb.injectError('talleres', 'insert', {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
      });
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    beforeEach(seedTalleres);

    it('rechaza cupo menor que inscritos actuales', async () => {
      await expect(service.update('t-1', { cupo: 1 } as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('actualiza campos parciales', async () => {
      const res = await service.update('t-2', { lugar: 'Cancha norte' });
      expect(res.lugar).toBe('Cancha norte');
      expect(res.nombre).toBe('Futbol');
    });

    it('reemplaza horarios completos', async () => {
      const res = await service.update('t-1', {
        horarios: [{ dia: 'viernes', hora_inicio: '10:00', hora_fin: '11:00' }],
      } as any);
      expect(res.horarios).toHaveLength(1);
      expect(res.horarios[0].dia).toBe('viernes');
      expect(mockDb.table('horarios')).toHaveLength(1);
    });

    it('horarios vacíos limpia la agenda', async () => {
      const res = await service.update('t-1', { horarios: [] });
      expect(res.horarios).toEqual([]);
    });

    it('lanza NotFoundException para taller inexistente', async () => {
      await expect(
        service.update('no-existe', { cupo: 5 } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    beforeEach(seedTalleres);

    it('rechaza eliminar taller con inscritos', async () => {
      await expect(service.remove('t-1')).rejects.toThrow(ConflictException);
    });

    it('elimina taller sin inscritos', async () => {
      mockDb.tables.set(
        'inscripciones',
        mockDb.table('inscripciones').filter((i) => i.taller_id !== 't-2'),
      );
      const res = await service.remove('t-2');
      expect(res).toEqual({ id: 't-2', deleted: true });
      expect(
        mockDb.table('talleres').find((t) => t.id === 't-2'),
      ).toBeUndefined();
    });
  });
});
