import { describe, it, expect } from 'vitest'
import { colisiona, tieneColision, fmtHora, type Horario } from '../lib/talleres'

function h(id: string, dia: string, inicio: string, fin: string): Horario {
  return { id, taller_id: 't1', dia, hora_inicio: inicio, hora_fin: fin }
}

describe('fmtHora', () => {
  it('formats time string to HH:MM', () => {
    expect(fmtHora('15:30:00')).toBe('15:30')
    expect(fmtHora('09:00:00')).toBe('09:00')
  })
})

describe('colisiona', () => {
  it('returns true when two schedules overlap on the same day', () => {
    const a = h('1', 'lunes', '15:00', '16:00')
    const b = h('2', 'lunes', '15:30', '16:30')
    expect(colisiona(a, b)).toBe(true)
  })

  it('returns false when schedules are on different days', () => {
    const a = h('1', 'lunes', '15:00', '16:00')
    const b = h('2', 'martes', '15:30', '16:30')
    expect(colisiona(a, b)).toBe(false)
  })

  it('returns false when schedules do not overlap', () => {
    const a = h('1', 'lunes', '15:00', '16:00')
    const b = h('2', 'lunes', '16:00', '17:00')
    expect(colisiona(a, b)).toBe(false)
  })

  it('is case-insensitive for day names', () => {
    const a = h('1', 'LUNES', '15:00', '16:00')
    const b = h('2', 'lunes', '15:30', '16:30')
    expect(colisiona(a, b)).toBe(true)
  })
})

describe('tieneColision', () => {
  it('returns null when no collision exists', () => {
    const target = [h('1', 'lunes', '15:00', '16:00')]
    const inscritos = [h('2', 'martes', '15:00', '16:00')]
    expect(tieneColision(target, inscritos)).toBeNull()
  })

  it('returns the conflicting schedule when collision exists', () => {
    const conflicto = h('2', 'lunes', '15:30', '16:30')
    const target = [h('1', 'lunes', '15:00', '16:00')]
    const inscritos = [conflicto]
    expect(tieneColision(target, inscritos)).toEqual(conflicto)
  })
})
