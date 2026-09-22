import officialLogo from '@/assets/cbtis61-official.png'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  markClassName?: string
  mode?: 'light' | 'dark'
  showWordmark?: boolean
}

export function BrandLogo({
  className,
  markClassName,
  mode = 'light',
  showWordmark = true,
}: BrandLogoProps) {
  const dark = mode === 'dark'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm',
          dark ? 'ring-1 ring-white/20' : 'border border-[#721422]/10',
          markClassName,
        )}
      >
        <img
          src={officialLogo}
          alt="Logotipo oficial CBTIS 61"
          className="h-full w-full object-contain"
        />
      </span>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className={cn('font-black tracking-tight', dark ? 'text-white' : 'text-[#4d0e18]')}>
            SITE
          </span>
          <span
            className={cn(
              'mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]',
              dark ? 'text-[#f4d78e]' : 'text-[#8b5c67]',
            )}
          >
            CBTIS 61
          </span>
        </span>
      )}
    </div>
  )
}
