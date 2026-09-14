import { describe, it, expect } from 'vitest';
import { colisiona, tieneColision, fmtHora } from '../lib/talleres';
import type { Horario } from '../lib/talleres';

describe('fmtHora', () => {
  it('trims seconds from time string', () => {
    expect(fmtHora('15:30:00')).toBe('15:30');
    expect(fmtHora('08:00:00')).toBe('08:00');
  });
});

describe('colisiona', () => {
  it('returns false for different days', () => {
    const a: Horario = { id: '1', taller_id: 't1', dia: 'lunes', hora_inicio: '10:00', hora_fin: '11:00' };
    const b: Horario = { id: '2', taller_id: 't2', dia: 'martes', hora_inicio: '10:00', hora_fin: '11:00' };
    expect(colisiona(a, b)).toBe(false);
  });

  it('returns true for overlapping times on same day', () => {
    const a: Horario = { id: '1', taller_id: 't1', dia: 'lunes', hora_inicio: '10:00', hora_fin: '11:00' };
    const b: Horario = { id: '2', taller_id: 't2', dia: 'lunes', hora_inicio: '10:30', hora_fin: '11:30' };
    expect(colisiona(a, b)).toBe(true);
  });

  it('returns false for non-overlapping times on same day', () => {
    const a: Horario = { id: '1', taller_id: 't1', dia: 'lunes', hora_inicio: '10:00', hora_fin: '11:00' };
    const b: Horario = { id: '2', taller_id: 't2', dia: 'lunes', hora_inicio: '11:00', hora_fin: '12:00' };
    expect(colisiona(a, b)).toBe(false);
  });
});

describe('tieneColision', () => {
  it('returns null when no collision', () => {
    const target: Horario[] = [{ id: '1', taller_id: 't1', dia: 'lunes', hora_inicio: '10:00', hora_fin: '11:00' }];
    const inscritos: Horario[] = [{ id: '2', taller_id: 't2', dia: 'martes', hora_inicio: '10:00', hora_fin: '11:00' }];
    expect(tieneColision(target, inscritos)).toBeNull();
  });

  it('returns conflicting horario when collision exists', () => {
    const target: Horario[] = [{ id: '1', taller_id: 't1', dia: 'lunes', hora_inicio: '10:00', hora_fin: '11:00' }];
    const inscritos: Horario[] = [{ id: '2', taller_id: 't2', dia: 'lunes', hora_inicio: '10:30', hora_fin: '11:30' }];
    expect(tieneColision(target, inscritos)).toEqual(inscritos[0]);
  });
});
