import { useState } from 'react';
import type { EstadoAsistencia } from '../../lib/types';
import { AlumnoRow } from './AlumnoRow';
import { useAsistencias, exportarCSVInstructor } from '../../hooks/useAsistencias';
import { cn } from '../../lib/utils';
import { CheckSquare, Save, Clock, RefreshCw } from '@/components/AnimatedIcons';
import { Users, Zap } from '@/components/icons';
import { DownloadAttendanceButton } from './DownloadAttendanceButton';
import { toast } from 'sonner';

interface ListaAsistenciaProps {
  tallerId: string;
  tallerNombre: string;
  soloLectura?: boolean;
}

export function ListaAsistencia({ tallerId, tallerNombre, soloLectura = false }: ListaAsistenciaProps) {
  const hoy = new Date().toISOString().split('T')[0];
  const [fecha, setFecha] = useState(hoy);
  const [filtroEstado, setFiltroEstado] = useState<EstadoAsistencia | 'todos'>('todos');

  const { alumnos, loading, isSaving, lastSaved, registrarAsistencia, saving, refresh } =
    useAsistencias(tallerId, fecha);

  const esHoy = fecha === hoy;

  // Estadísticas rápidas
  const stats = {
    total: alumnos.length,
    presentes: alumnos.filter(a => a.estado === 'presente').length,
    ausentes: alumnos.filter(a => a.estado === 'ausente').length,
    retardos: alumnos.filter(a => a.estado === 'retardo').length,
    justificados: alumnos.filter(a => a.estado === 'justificado').length,
    sinRegistro: alumnos.filter(a => a.estado === 'sin_registro').length,
  };

  const porcAsistencia = stats.total > 0
    ? Math.round(((stats.presentes + stats.retardos) / stats.total) * 100)
    : 0;

  const alumnosFiltrados = filtroEstado === 'todos'
    ? alumnos
    : alumnos.filter(a => a.estado === filtroEstado);

  // Marcar todos como presente
  const marcarTodosPresente = async () => {
    if (soloLectura || !esHoy) return;
    const sinRegistro = alumnos.filter(a => a.estado === 'sin_registro');
    if (sinRegistro.length === 0) {
      toast.info('Todos los alumnos ya tienen registro.');
      return;
    }
    await Promise.all(sinRegistro.map(a => registrarAsistencia(a.alumno_id, 'presente')));
    toast.success(`${sinRegistro.length} alumnos marcados como Presentes.`);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header y controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">{tallerNombre}</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">Lista de Asistencia</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de fecha */}
          <div className="relative">
            <input
              type="date"
              value={fecha}
              max={hoy}
              onChange={e => setFecha(e.target.value)}
              aria-label="Seleccionar fecha"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/40 [color-scheme:dark]"
            />
          </div>

          <button
            type="button"
            onClick={refresh}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
          >
            <RefreshCw size={14} />
          </button>

          <DownloadAttendanceButton
            onDownload={() => exportarCSVInstructor(alumnos, tallerNombre, fecha)}
            disabled={alumnos.length === 0}
          />

          {!soloLectura && esHoy && (
            <button
              type="button"
              onClick={marcarTodosPresente}
              className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            >
              <Zap size={14} />
              Todos Presente
            </button>
          )}
        </div>
      </div>

      {/* Advertencia si no es hoy */}
      {!esHoy && !soloLectura && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-400 text-xs font-bold flex items-center gap-2">
          <Clock size={16} />
          Modo consulta — Solo puedes editar la asistencia del día actual.
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: <Users size={14} />, color: 'text-white/70' },
          { label: 'Presentes', value: stats.presentes, icon: '✅', color: 'text-emerald-400', estado: 'presente' as EstadoAsistencia },
          { label: 'Ausentes', value: stats.ausentes, icon: '❌', color: 'text-red-400', estado: 'ausente' as EstadoAsistencia },
          { label: 'Retardos', value: stats.retardos, icon: '⏰', color: 'text-amber-400', estado: 'retardo' as EstadoAsistencia },
          { label: 'Justif.', value: stats.justificados, icon: '📄', color: 'text-blue-400', estado: 'justificado' as EstadoAsistencia },
        ].map(({ label, value, icon, color, estado }) => (
          <button
            type="button"
            key={label}
            onClick={() => setFiltroEstado(
              estado ? (filtroEstado === estado ? 'todos' : estado) : 'todos'
            )}
            className={cn(
              'glass-card rounded-2xl p-3 text-center border transition-all',
              estado && filtroEstado === estado
                ? 'border-primary/40 bg-primary/10'
                : 'border-white/5 hover:border-white/10'
            )}
          >
            <div className={cn('text-xl font-black', color)}>{value}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold mt-0.5 flex items-center justify-center gap-1">
              <span>{typeof icon === 'string' ? icon : icon}</span>
              {label}
            </div>
          </button>
        ))}
      </div>

      {/* Barra de asistencia */}
      <div className="glass-card rounded-2xl p-4 space-y-2 border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} className="text-primary-glow" />
            <span className="text-sm font-bold text-white">Asistencia global</span>
          </div>
          <span className="text-2xl font-black text-white">{porcAsistencia}%</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-glow rounded-full transition-all duration-500"
            style={{ width: `${porcAsistencia}%` }}
          />
        </div>
        {/* Estado de guardado */}
        <div className="flex items-center justify-between text-[10px] text-white/30">
          <span>{stats.sinRegistro > 0 ? `${stats.sinRegistro} alumno(s) sin registrar` : 'Todos registrados ✓'}</span>
          <span className="flex items-center gap-1.5">
            {isSaving
              ? <><Save size={10} className="animate-pulse text-amber-400" /><span className="text-amber-400">Guardando...</span></>
              : lastSaved
                ? <><Save size={10} className="text-emerald-400" /><span className="text-emerald-400">Guardado {lastSaved.toLocaleTimeString()}</span></>
                : null
            }
          </span>
        </div>
      </div>

      {/* Lista de alumnos */}
      {alumnos.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center border border-dashed border-white/10">
          <Users size={32} className="mx-auto mb-3 text-white/20" />
          <p className="text-white/30 font-bold uppercase tracking-widest text-sm">Sin alumnos inscritos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alumnosFiltrados.map(alumno => (
            <AlumnoRow
              key={alumno.alumno_id}
              alumno={alumno}
              isSaving={saving.has(alumno.alumno_id)}
              soloLectura={soloLectura || !esHoy}
              onMarcar={(estado, obs) => registrarAsistencia(alumno.alumno_id, estado, obs)}
            />
          ))}
          {alumnosFiltrados.length === 0 && (
            <div className="text-center py-8 text-white/30 text-sm">
              No hay alumnos con estado "{filtroEstado}" en este filtro.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
