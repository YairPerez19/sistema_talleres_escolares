import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRole } from '../hooks/useRole';
import { LogOut, LayoutDashboard, Search, ShieldCheck, UserCheck } from '@/components/AnimatedIcons';
import { BrandLogo } from '@/components/BrandLogo';
import { COLOR_MODE_CHANGE_EVENT, getColorMode } from '@/lib/colorMode';
import { cn } from '../lib/utils';

export function Header({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { user, session, signOut } = useAuth();
  const { isAdmin, isInstructor } = useRole(user?.id);
  const navigate = useNavigate();
  const [colorMode, setColorMode] = useState(getColorMode);
  const dark = tone === 'dark' && colorMode === 'wine';

  useEffect(() => {
    const syncColorMode = () => setColorMode(getColorMode());
    window.addEventListener(COLOR_MODE_CHANGE_EVENT, syncColorMode);
    return () => window.removeEventListener(COLOR_MODE_CHANGE_EVENT, syncColorMode);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/auth' });
  };

  return (
    <div className={cn(
      'flex items-center justify-between pb-4 border-b',
      dark ? 'border-white/10' : 'border-[#721422]/10',
    )}>
      <Link to="/" className="flex items-center gap-3 group">
        <BrandLogo
          mode={dark ? 'dark' : 'light'}
          markClassName="size-10 rounded-2xl transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto max-w-[55%] no-scrollbar">
        <Link
          to="/catalogo"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 whitespace-nowrap',
            dark
              ? 'text-white/60 [&.active]:text-white [&.active]:bg-white/10 [&.active]:shadow-[0_6px_16px_rgba(0,0,0,0.18)] hover:text-white hover:bg-white/10'
              : 'text-[#765c64] [&.active]:text-[#721422] [&.active]:bg-[#f7e5e9] [&.active]:shadow-[0_6px_16px_rgba(114,20,34,0.10)] hover:text-[#721422] hover:bg-[#fbf0f3]',
          )}
        >
          <Search className="size-4" />
          <span className="hidden md:inline">Catálogo</span>
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 whitespace-nowrap',
              dark
                ? 'text-[#f4d78e]/80 [&.active]:text-white [&.active]:bg-[#721422] [&.active]:shadow-[0_4px_14px_rgba(114,20,34,0.4)] hover:text-[#f4d78e] hover:bg-white/10'
                : 'text-[#d24a6b]/70 [&.active]:text-white [&.active]:bg-gradient-to-br [&.active]:from-[#721422] [&.active]:to-[#4d0e18] [&.active]:shadow-[0_4px_14px_rgba(114,20,34,0.4),0_0_20px_rgba(114,20,34,0.2)] hover:text-[#d24a6b] hover:bg-[#721422]/10',
            )}
          >
            <ShieldCheck className="size-4" />
            <span className="hidden md:inline">Panel Admin</span>
          </Link>
        )}

        {isInstructor && (
          <Link
            to="/instructor"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 whitespace-nowrap',
              dark
                ? 'text-amber-300/80 [&.active]:text-white [&.active]:bg-amber-600/30 [&.active]:shadow-[0_4px_14px_rgba(217,119,6,0.3)] hover:text-amber-200 hover:bg-amber-500/10'
                : 'text-amber-400/80 [&.active]:text-white [&.active]:bg-gradient-to-br [&.active]:from-amber-600/40 [&.active]:to-orange-700/40 [&.active]:shadow-[0_4px_14px_rgba(217,119,6,0.3)] hover:text-amber-300 hover:bg-amber-500/10',
            )}
          >
            <UserCheck className="size-4" />
            <span className="hidden md:inline">Panel Instructor</span>
          </Link>
        )}

        {session && (
          <Link
            to="/dashboard"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 whitespace-nowrap',
              dark
                ? 'text-white/60 [&.active]:text-white [&.active]:bg-white/10 [&.active]:shadow-[0_6px_16px_rgba(0,0,0,0.18)] hover:text-white hover:bg-white/10'
                : 'text-[#765c64] [&.active]:text-[#721422] [&.active]:bg-[#f7e5e9] [&.active]:shadow-[0_6px_16px_rgba(114,20,34,0.10)] hover:text-[#721422] hover:bg-[#fbf0f3]',
            )}
          >
            <LayoutDashboard className="size-4" />
            <span className="hidden md:inline">Vista Alumno</span>
          </Link>
        )}
      </nav>

      <div className="flex items-center">
        {session ? (
          <button
            type="button"
            onClick={handleSignOut}
            className={cn(
              'px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-300 flex items-center gap-2',
              dark
                ? 'bg-white/10 border border-white/15 text-white hover:text-white hover:border-white/30 hover:bg-white/15'
                : 'bg-white border border-[#721422]/15 text-[#765c64] hover:text-red-700 hover:border-red-400/40 hover:bg-red-50',
            )}
          >
            <LogOut className="size-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="btn-wine-glow px-4 py-2 text-[12px]"
          >
            Entrar
          </Link>
        )}
      </div>
    </div>
  );
}
