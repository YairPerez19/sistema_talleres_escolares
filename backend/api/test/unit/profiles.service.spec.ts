import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { ProfilesService } from '../../../src/profiles/profiles.service';
import {
  FakeDb,
  createFakeSupabase as mockCreateFakeSupabase,
} from '../../helpers/fake-supabase';

let mockDb: FakeDb;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockCreateFakeSupabase(mockDb)),
}));

describe('ProfilesService', () => {
  let service: ProfilesService;
  let module: TestingModule;

  beforeEach(async () => {
    mockDb = new FakeDb();
    module = await Test.createTestingModule({
      providers: [
        ProfilesService,
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
    service = module.get(ProfilesService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('getProfile', () => {
    it('devuelve el perfil existente', async () => {
      mockDb.seed('profiles', [
        { id: 'u-1', nombre: 'Ana', matricula: 'A1', turno: 'matutino' },
      ]);
      const res = await service.getProfile('u-1');
      expect(res.nombre).toBe('Ana');
    });

    it('falla si el perfil no existe', async () => {
      await expect(service.getProfile('no-existe')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateProfile', () => {
    beforeEach(() => {
      mockDb.seed('profiles', [
        { id: 'u-1', nombre: 'Ana', matricula: 'A1', turno: 'matutino' },
      ]);
    });

    it('con dto vacío devuelve el perfil sin modificar', async () => {
      const res = await service.updateProfile('u-1', {});
      expect(res.nombre).toBe('Ana');
    });

    it('actualiza sólo los campos enviados', async () => {
      const res = await service.updateProfile('u-1', { nombre: 'Ana María' });
      expect(res.nombre).toBe('Ana María');
      expect(res.matricula).toBe('A1');
    });
  });

  describe('settings', () => {
    it('getSettings devuelve todas las configuraciones', async () => {
      mockDb.seed('settings', [
        { key: 'periodo', value: '2026-2' },
        { key: 'inscripciones_abiertas', value: 'true' },
      ]);
      const res = await service.getSettings();
      expect(res).toHaveLength(2);
    });

    it('updateSetting actualiza una clave existente', async () => {
      mockDb.seed('settings', [{ key: 'periodo', value: '2026-1' }]);
      const res = await service.updateSetting('periodo', '2026-2');
      expect(res.value).toBe('2026-2');
      expect(mockDb.table('settings')).toHaveLength(1);
    });

    it('updateSetting crea la clave si no existe (upsert por PGRST116)', async () => {
      const res = await service.updateSetting('nueva_clave', 'valor');
      expect(res).toMatchObject({ key: 'nueva_clave', value: 'valor' });
      expect(mockDb.table('settings')).toHaveLength(1);
    });
  });
});
