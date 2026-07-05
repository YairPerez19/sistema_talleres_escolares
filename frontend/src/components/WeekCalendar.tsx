import * as React from 'react';
import { Taller, Horario, DIA_LABEL, fmtHora } from '../lib/talleres';
import { Link } from '@tanstack/react-router';
import { Plus } from '@/components/AnimatedIcons';

interface WeekCalendarProps {
  talleres: (Taller & { horarios: Horario[] })[];
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

function renderBlock(h: Horario & { taller: Taller }) {
  const [startH, startM] = h.hora_inicio.split(':').map(Number);
  const [endH, endM] = h.hora_fin.split(':').map(Number);

  const startMinutes = (startH - 7) * 60 + startM;
  const endMinutes = (endH - 7) * 60 + endM;
  const duration = endMinutes - startMinutes;

  const rowHeight = 64;
  const top = `${(startMinutes / 60) * rowHeight}px`;
  const height = `${(duration / 60) * rowHeight}px`;

  return (
    <div 
      key={`${h.id}-${h.dia}`}
      className="absolute left-1 right-1 rounded-xl p-2.5 shadow-2xl flex flex-col justify-center bg-gradient-to-r from-[#ff0055]/90 to-[#ff3377]/90 border border-white/10 z-10 transition-all hover:scale-[1.03] hover:z-20 group cursor-default"
      style={{ top, height }}
    >
      <span className="text-white font-black text-[10px] leading-tight mb-0.5 truncate">{h.taller.nombre}</span>
      <div className="flex flex-col text-[8px] font-bold text-white/50 uppercase tracking-tighter leading-none">
        <span>{fmtHora(h.hora_inicio)} - {fmtHora(h.hora_fin)}</span>
      </div>
    </div>
  );
}

export function WeekCalendar({ talleres }: WeekCalendarProps) {
  const allInscritosHorarios = talleres.flatMap(t => 
    t.horarios.map(h => ({ ...h, taller: t }))
  );

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white mb-2 leading-none">Horario semanal</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ff0055] animate-pulse shadow-[0_0_8px_rgba(255,0,85,0.5)]" />
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em]">{talleres.length} {talleres.length === 1 ? 'taller activo' : 'talleres activos'}</p>
          </div>
        </div>
        <Link to="/catalogo" className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-semibold text-white/60 uppercase tracking-wider hover:text-white hover:bg-white/[0.06] hover:border-[#ff0055]/20 transition-all duration-300 group">
          <Plus size={16} className="text-[#ff0055] transition-transform group-hover:rotate-90 duration-300" /> Inscribirme a otro taller
        </Link>
      </div>

      <div className="bg-[#0a0205]/60 border border-white/[0.04] rounded-[3rem] overflow-hidden p-2 md:p-8 shadow-lg shadow-black/10">
        <div className="overflow-x-auto custom-scrollbar rounded-2xl">
          <div className="min-w-[950px] grid grid-cols-[90px_repeat(6,1fr)] bg-white/[0.01] rounded-2xl overflow-hidden border border-white/[0.03] relative mb-4">
            
            <div className="border-b border-r border-white/[0.03] bg-white/[0.02]" />
            {Object.entries(DIA_LABEL).map(([dia, label]) => (
              <div key={dia} className="border-b border-r border-white/[0.03] p-5 text-center bg-white/[0.02]">
                <span className="block text-[10px] font-bold text-white/15 uppercase tracking-widest mb-1">{dia.slice(0,3)}</span>
                <span className="block text-sm font-bold text-white/60">{label}</span>
              </div>
            ))}

            {HOURS.map(hour => (
              <React.Fragment key={hour}>
                <div className="border-b border-r border-white/[0.03] p-4 text-center text-[11px] font-bold text-white/15 relative h-16 flex items-center justify-center">
                  <span>{hour}:00</span>
                </div>
                {Object.keys(DIA_LABEL).map(dia => (
                  <div key={`${dia}-${hour}`} className="border-b border-r border-white/[0.03] h-16 relative" />
                ))}
              </React.Fragment>
            ))}

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
