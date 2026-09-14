import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TallerCard } from '../components/TallerCard'
import type { Taller, Horario } from '../lib/talleres'

vi.mock('@gsap/react', () => ({ useGSAP: vi.fn() }))

const horarios: Horario[] = [
  { id: 'h-1', taller_id: 't-1', dia: 'lunes', hora_inicio: '14:00:00', hora_fin: '15:00:00' },
  { id: 'h-2', taller_id: 't-1', dia: 'miercoles', hora_inicio: '16:00:00', hora_fin: '17:30:00' },
]

const baseTaller: Taller & { horarios: Horario[] } = {
  id: 't-1',
  nombre: 'Teatro',
  categoria: 'DIFUSIÓN CULTURAL',
  lugar: 'Auditorio',
  instructor: 'Prof. Nora',
  descripcion: 'Taller de teatro escolar',
  cupo: 25,
  imagen_url: null,
  horarios,
}

describe('TallerCard', () => {
  it('muestra nombre, instructor, lugar y cupo', () => {
    render(<TallerCard taller={baseTaller} inscrito={false} />)
    expect(screen.getByText('Teatro')).toBeInTheDocument()
    expect(screen.getByText('Prof. Nora')).toBeInTheDocument()
    expect(screen.getByText('Auditorio')).toBeInTheDocument()
    expect(screen.getByText('25 lugares')).toBeInTheDocument()
    expect(screen.getByText('Taller de teatro escolar')).toBeInTheDocument()
  })

  it('formatea y muestra los horarios (máximo 3 visibles)', () => {
    render(<TallerCard taller={baseTaller} inscrito={false} />)
    expect(screen.getByText('lun')).toBeInTheDocument()
    expect(screen.getByText('14:00-15:00')).toBeInTheDocument()
    expect(screen.getByText('16:00-17:30')).toBeInTheDocument()
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('indica "+N más" cuando hay más de 3 horarios', () => {
    const extra: Horario[] = [
      ...horarios,
      { id: 'h-3', taller_id: 't-1', dia: 'viernes', hora_inicio: '10:00:00', hora_fin: '11:00:00' },
      { id: 'h-4', taller_id: 't-1', dia: 'sabado', hora_inicio: '09:00:00', hora_fin: '10:00:00' },
    ]
    render(<TallerCard taller={{ ...baseTaller, horarios: extra }} inscrito={false} />)
    expect(screen.getByText('+1 más')).toBeInTheDocument()
  })

  it('muestra botón "Inscribirme" y llama onInscribir sin propagar el click', async () => {
    const onInscribir = vi.fn()
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<TallerCard taller={baseTaller} inscrito={false} onInscribir={onInscribir} onClick={onClick} />)

    await user.click(screen.getByRole('button', { name: /inscribirme/i }))
    expect(onInscribir).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('un click en la tarjeta llama onClick', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<TallerCard taller={baseTaller} inscrito={false} onClick={onClick} />)

    await user.click(screen.getByText('Teatro'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('muestra insignia y botón de baja cuando el alumno está inscrito', async () => {
    const onBaja = vi.fn()
    const user = userEvent.setup()
    render(<TallerCard taller={baseTaller} inscrito={true} onBaja={onBaja} />)

    expect(screen.getByText('Inscrito')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /darse de baja/i }))
    expect(onBaja).toHaveBeenCalledTimes(1)
  })

  it('deshabilita la inscripción si hay colisión de horarios', () => {
    render(<TallerCard taller={baseTaller} inscrito={false} colisionaCon="Futbol" />)
    const button = screen.getByRole('button', { name: /choca con futbol/i })
    expect(button).toBeDisabled()
  })

  it('muestra estado de carga y deshabilita el botón', () => {
    render(<TallerCard taller={baseTaller} inscrito={false} loading={true} />)
    const button = screen.getByRole('button', { name: /inscribiendo/i })
    expect(button).toBeDisabled()
  })

  it('usa descripción por defecto si el taller no tiene', () => {
    render(<TallerCard taller={{ ...baseTaller, descripcion: null }} inscrito={false} />)
    expect(
      screen.getByText('Descubre y desarrolla tu talento en este taller.'),
    ).toBeInTheDocument()
  })
})
