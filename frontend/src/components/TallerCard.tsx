import * as React from 'react';
import { useRef, useMemo } from 'react';
import { Taller, Horario, fmtHora } from '../lib/talleres';
import { cn } from '../lib/utils';
import { imagenDeTaller } from '../lib/tallerImages';
import { Clock } from '@/components/AnimatedIcons';
import { MapPin, User as UserIcon, Users, Award } from '@/components/icons';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface TallerCardProps {
  taller: Taller & { horarios: Horario[] };
  inscrito: boolean;
  onInscribir?: () => void;
  onBaja?: () => void;
  colisionaCon?: string | null;
  loading?: boolean;
}

const categoriaConfig: Record<string, { accent: string; gradient: string; emoji: string; label: string }> = {
  'DIFUSIÓN CULTURAL': { accent: '#8B5CF6', gradient: 'from-violet-900/80 via-violet-800/40 to-[#0F0A0D]', emoji: '🎭', label: 'Cultural' },
  'ACTIVIDADES CÍVICAS': { accent: '#F59E0B', gradient: 'from-amber-900/80 via-amber-800/40 to-[#0F0A0D]', emoji: '🇲🇽', label: 'Cívica' },
  'PROMOCIÓN DEPORTIVA — MATUTINO': { accent: '#22C55E', gradient: 'from-emerald-900/80 via-emerald-800/40 to-[#0F0A0D]', emoji: '⚽', label: 'Deportiva' },
  'PROMOCIÓN DEPORTIVA — VESPERTINO': { accent: '#3B82F6', gradient: 'from-blue-900/80 via-blue-800/40 to-[#0F0A0D]', emoji: '🏀', label: 'Deportiva' },
};

const tallerEmojis: Record<string, string> = {
  teatro: '🎭', danza: '💃', ajedrez: '♟️', oratoria: '🎤', rondalla: '🎸', canción: '🎵',
  dibujo: '🎨', fotografía: '📷', artesanías: '🧵',
  'banda de guerra': '🥁', escolta: '🎖️', banderas: '🏳️',
  futbol: '⚽', 'futbol varonil': '⚽', 'futbol femenil': '⚽',
  basquetbol: '🏀', 'basquetbol vesp.': '🏀', voleibol: '🏐',
  handball: '🤾', atletismo: '🏃', taekwondo: '🥋', baile: '🕺',
};

export function TallerCard({ taller, inscrito, onInscribir, onBaja, colisionaCon, loading }: TallerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const cat = useMemo(() => categoriaConfig[taller.categoria] || { accent: '#8B1A32', gradient: 'from-[#5C1020]/90 via-[#5C1020]/40 to-[#0F0A0D]', emoji: '📚', label: 'Taller' }, [taller.categoria]);
  const emoji = useMemo(() => {
    const key = taller.nombre.toLowerCase().trim();
    for (const [k, v] of Object.entries(tallerEmojis)) {
      if (key.includes(k)) return v;
    }
    return cat.emoji;
  }, [taller.nombre, cat.emoji]);

  const imageUrl = useMemo(() => {
    const raw = taller.imagen_url || imagenDeTaller(taller.nombre);
    if (raw.includes('supabase') && raw.includes('/storage/v1/object/public/')) {
      return `${raw}?width=800&height=600&resize=cover`;
    }
    return raw;
  }, [taller.imagen_url, taller.nombre]);

  useGSAP(() => {
    const card = cardRef.current;
    if (!card) return;

    const onEnter = () => {
      gsap.to(imageRef.current, { scale: 1.08, duration: 0.8, ease: 'power3.out' });
      gsap.to(overlayRef.current, { opacity: 0.6, duration: 0.5 });
      gsap.to(card, { y: -8, duration: 0.5, ease: 'back.out(1.7)', boxShadow: `0 25px 50px -12px rgba(0,0,0,0.6), 0 0 40px ${cat.accent}20` });
    };
    const onLeave = () => {
      gsap.to(imageRef.current, { scale: 1, duration: 0.8, ease: 'power3.out' });
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.5 });
      gsap.to(card, { y: 0, duration: 0.5, ease: 'power2.out', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' });
    };

    card.addEventListener('mouseenter', onEnter);
    card.addEventListener('mouseleave', onLeave);

    return () => {
      card.removeEventListener('mouseenter', onEnter);
      card.removeEventListener('mouseleave', onLeave);
    };
  }, { scope: cardRef });

  const isBlocked = !!colisionaCon && !inscrito;

  return (
    <div
      ref={cardRef}
      className="group relative rounded-[2rem] bg-white/[0.02] border border-white/[0.04] overflow-hidden flex flex-col transition-colors duration-500 hover:border-white/[0.08]"
      style={{ boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
    >
      <div ref={imageRef} className="relative h-72 overflow-hidden will-change-transform">
        <img
          src={imageUrl}
          alt={`Taller de ${taller.nombre}`}
          loading="lazy"
          className="w-full h-full object-cover transition-all duration-700 group-hover:saturate-[1.1]"
        />
        
        <div
          ref={overlayRef}
          className={`absolute inset-0 bg-gradient-to-b ${cat.gradient}`}
        />

        <div className="absolute top-5 left-5 flex items-center gap-2.5">
          <span className="text-lg drop-shadow-lg">{emoji}</span>
          <span
            className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-full backdrop-blur-md border text-white/90 shadow-lg"
            style={{ backgroundColor: `${cat.accent}25`, borderColor: `${cat.accent}40` }}
          >
            {cat.label}
          </span>
        </div>

        {inscrito && (
          <div className="absolute top-5 right-5">
            <span className="px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-full bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 backdrop-blur-sm">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Inscrito
            </span>
          </div>
        )}

        <div className="absolute bottom-5 left-5 right-5">
          <h3 className="text-2xl font-extrabold text-white leading-tight drop-shadow-xl tracking-tight">
            {taller.nombre}
          </h3>
          <p className="text-white/50 text-[11px] font-medium mt-1 line-clamp-2">
            {taller.descripcion || 'Descubre y desarrolla tu talento en este taller.'}
          </p>
        </div>

        <div className="absolute bottom-5 right-5">
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
            <Users size={12} className="text-white/50" />
            <span className="text-[11px] font-semibold text-white/70">{taller.cupo} lugares</span>
          </div>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 relative">
        <div className="space-y-3 mb-6 flex-1">
          <div className="flex items-center gap-3 group/info">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.accent}15` }}>
              <UserIcon size={13} style={{ color: cat.accent }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">Instructor</p>
              <p className="text-[13px] text-white/70 font-medium truncate">{taller.instructor}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 group/info">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.accent}15` }}>
              <MapPin size={13} style={{ color: cat.accent }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">Lugar</p>
              <p className="text-[13px] text-white/70 font-medium truncate">{taller.lugar}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${cat.accent}15` }}>
              <Clock size={13} style={{ color: cat.accent }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-1.5">Horarios</p>
              <div className="flex flex-wrap gap-1.5">
                {taller.horarios.slice(0, 3).map(h => (
                  <span key={h.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.03] border border-white/[0.05] text-white/50">
                    <span className="capitalize">{h.dia.slice(0, 3)}</span>
                    <span className="text-white/20">·</span>
                    {fmtHora(h.hora_inicio)}-{fmtHora(h.hora_fin)}
                  </span>
                ))}
                {taller.horarios.length > 3 && (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-semibold text-white/30 bg-white/[0.02]">
                    +{taller.horarios.length - 3} más
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative">
          {inscrito ? (
            <button
              type="button"
              onClick={onBaja}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl font-semibold text-[13px] bg-transparent border border-white/[0.08] text-white/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/[0.06] transition-all duration-300 disabled:opacity-40 group/btn"
            >
              <span className="group-hover/btn:hidden">Darse de baja</span>
              <span className="hidden group-hover/btn:inline">Confirmar baja</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onInscribir}
              disabled={isBlocked || loading}
              className={cn(
                "w-full py-3.5 rounded-2xl font-bold text-[13px] transition-all duration-300 flex items-center justify-center gap-2 overflow-hidden relative group/btn",
                isBlocked
                  ? "bg-white/[0.02] text-white/20 border border-white/[0.04] cursor-not-allowed"
                  : "text-white border-0 hover:scale-[1.02] hover:shadow-xl"
              )}
              style={isBlocked ? {} : { background: `linear-gradient(135deg, ${cat.accent}cc, ${cat.accent})` }}
            >
              {!isBlocked && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
              )}
              {!isBlocked && <Award size={15} className="relative z-10" />}
              <span className="relative z-10">
                {isBlocked ? `Choca con ${colisionaCon}` : loading ? 'Inscribiendo...' : 'Inscribirme'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
