import * as React from 'react';
import { Taller, Horario, DIA_LABEL, fmtHora } from '../lib/talleres';
import { Link } from '@tanstack/react-router';
import { Plus } from '@/components/AnimatedIcons';

interface WeekCalendarProps {
  talleres: (Taller & { horarios: Horario[] })[];
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7:00 to 18:00

export function WeekCalendar({ talleres }: WeekCalendarProps) {
  const allInscritosHorarios = talleres.flatMap(t => 
    t.horarios.map(h => ({ ...h, taller: t }))
  );

  const renderBlock = (h: Horario & { taller: Taller }) => {
    const [startH, startM] = h.hora_inicio.split(':').map(Number);
    const [endH, endM] = h.hora_fin.split(':').map(Number);

    const startMinutes = (startH - 7) * 60 + startM;
    const endMinutes = (endH - 7) * 60 + endM;
    const duration = endMinutes - startMinutes;

    const rowHeight = 64; // h-16 = 4rem = 64px
    const top = `${(startMinutes / 60) * rowHeight}px`;
    const height = `${(duration / 60) * rowHeight}px`;

    return (
      <div 
        key={`${h.id}-${h.dia}`}
        className="absolute left-1 right-1 rounded-xl p-2.5 shadow-2xl flex flex-col justify-center bg-primary border border-white/10 z-10 transition-all hover:scale-[1.03] hover:z-20 group cursor-default"
        style={{ top, height }}
      >
        <span className="text-white font-black text-[10px] leading-tight mb-0.5 group-hover:text-primary-glow transition-colors truncate">{h.taller.nombre}</span>
        <div className="flex flex-col text-[8px] font-bold text-white/50 uppercase tracking-tighter leading-none">
          <span>{fmtHora(h.hora_inicio)} - {fmtHora(h.hora_fin)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-2 leading-none">Horario semanal</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-glow animate-pulse" />
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{talleres.length} {talleres.length === 1 ? 'taller activo' : 'talleres activos'}</p>
          </div>
        </div>
        <Link to="/" className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all group shadow-lg">
          <Plus size={16} className="text-primary-glow transition-transform group-hover:rotate-90" /> Inscribirme a otro taller
        </Link>
      </div>

      {/* Responsive Calendar Container */}
      <div className="glass-card rounded-[3rem] overflow-hidden p-2 md:p-8">
        <div className="overflow-x-auto custom-scrollbar rounded-2xl">
          <div className="min-w-[950px] grid grid-cols-[90px_repeat(6,1fr)] bg-white/[0.02] rounded-2xl overflow-hidden border border-white/[0.05] relative mb-4">
            
            {/* Header */}
            <div className="border-b border-r border-white/5 bg-white/[0.03]" />
            {Object.entries(DIA_LABEL).map(([dia, label]) => (
              <div key={dia} className="border-b border-r border-white/5 p-5 text-center bg-white/[0.03]">
                <span className="block text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">{dia.slice(0,3)}</span>
                <span className="block text-sm font-black text-white">{label}</span>
              </div>
            ))}

            {/* Body Grid */}
            {HOURS.map(hour => (
              <React.Fragment key={hour}>
                <div className="border-b border-r border-white/5 p-4 text-center text-[11px] font-black text-white/20 relative h-16 flex items-center justify-center">
                  <span>{hour}:00</span>
                </div>
                {Object.keys(DIA_LABEL).map(dia => (
                  <div key={`${dia}-${hour}`} className="border-b border-r border-white/5 h-16 relative" />
                ))}
              </React.Fragment>
            ))}

            {/* Absolute Blocks Overlay */}
            {Object.keys(DIA_LABEL).map((dia, colIndex) => {
              const blocksForDay = allInscritosHorarios.filter(h => h.dia.toLowerCase() === dia);
              return (
                <div 
                  key={`col-${dia}`} 
                  className="absolute top-[81px] bottom-0 pointer-events-none"
                  style={{ 
                    left: `calc(90px + ${colIndex} * (100% - 90px) / 6)`,
                    width: `calc((100% - 90px) / 6)`,
                    pointerEvents: 'auto'
                  }}
                >
                  {blocksForDay.map(renderBlock)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
