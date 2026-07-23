import type { EstadoAsistencia } from '../../lib/types';
import { ESTADO_CONFIG } from '../../lib/types';
import { cn } from '../../lib/utils';

interface EstadoBadgeProps {
  estado: EstadoAsistencia;
  size?: 'sm' | 'md';
}

export function EstadoBadge({ estado, size = 'md' }: EstadoBadgeProps) {
  const config = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG['sin_registro'];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-bold rounded-full border',
        config.color,
        config.bg,
        config.border,
        size === 'sm' ? 'text-[10px] px-2.5 py-0.5' : 'text-xs px-3 py-1'
      )}
    >
      <span className="leading-none">{config.emoji}</span>
      {config.label}
    </span>
  );
}
