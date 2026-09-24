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

  const calendarMinutes = 12 * 60;
  const rawStart = (startH - 7) * 60 + startM;
  const rawEnd = (endH - 7) * 60 + endM;
  // Keep blocks inside the visible 07:00–19:00 grid even when a schedule
  // comes from an older record outside the current calendar range.
  const startMinutes = Math.max(0, Math.min(rawStart, calendarMinutes));
  const endMinutes = Math.max(startMinutes + 8, Math.min(rawEnd, calendarMinutes));
  const duration = endMinutes - startMinutes;

  const rowHeight = 64;
  const top = `${(startMinutes / 60) * rowHeight}px`;
  const height = `${(duration / 60) * rowHeight}px`;

  return (
    <div 
      key={`${h.id}-${h.dia}`}
      className="weekly-calendar-event absolute left-1 right-1 rounded-xl p-2.5 shadow-[0_10px_22px_rgba(114,20,34,0.22)] flex flex-col justify-center bg-gradient-to-r from-[#721422] to-[#B8354D] border border-white/40 z-10 transition-all hover:scale-[1.03] hover:z-20 group cursor-default"
      style={{ top, height }}
    >
      <span className="text-white font-black text-[10px] leading-tight mb-0.5 truncate">{h.taller.nombre}</span>
      <div className="weekly-calendar-event-time flex flex-col text-[8px] font-bold uppercase tracking-tighter leading-none">
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
          <h2 className="text-3xl font-extrabold text-[#4d0e18] mb-2 leading-none">Horario semanal</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#8B1A32] animate-pulse shadow-[0_0_8px_rgba(139,26,50,0.5)]" />
            <p className="text-[10px] font-bold text-[#9b7881] uppercase tracking-[0.2em]">{talleres.length} {talleres.length === 1 ? 'taller activo' : 'talleres activos'}</p>
          </div>
        </div>
        <Link to="/catalogo" className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#721422] border border-[#d85c77]/40 text-[11px] font-semibold text-white uppercase tracking-wider shadow-[0_10px_24px_rgba(114,20,34,0.28)] hover:bg-[#8B1A32] hover:border-[#f0a2b4]/60 transition-all duration-300 group">
          <Plus size={16} className="text-[#f0a2b4] transition-transform group-hover:rotate-90 duration-300" /> Inscribirme a otro taller
        </Link>
      </div>

      <div className="weekly-calendar-shell rounded-[2rem] overflow-hidden p-2 md:p-8">
        <div className="overflow-x-auto custom-scrollbar rounded-2xl">
          <div className="weekly-calendar-grid min-w-[950px] grid grid-cols-[90px_repeat(6,1fr)] rounded-2xl overflow-hidden relative mb-4">
            
            <div className="weekly-calendar-header border-b border-r border-[#721422]/10" />
            {Object.entries(DIA_LABEL).map(([dia, label]) => (
              <div key={dia} className="weekly-calendar-header border-b border-r border-[#721422]/10 p-5 text-center">
                <span className="weekly-calendar-day-short block text-[10px] font-bold uppercase tracking-widest mb-1">{dia.slice(0,3)}</span>
                <span className="weekly-calendar-day-label block text-sm font-bold">{label}</span>
              </div>
            ))}

            {HOURS.map(hour => (
              <React.Fragment key={hour}>
                <div className="weekly-calendar-time border-b border-r border-[#721422]/10 p-4 text-center text-[11px] font-bold relative h-16 flex items-center justify-center">
                  <span>{hour}:00</span>
                </div>
                {Object.keys(DIA_LABEL).map(dia => (
                  <div key={`${dia}-${hour}`} className="weekly-calendar-slot border-b border-r border-[#721422]/10 h-16 relative" />
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
