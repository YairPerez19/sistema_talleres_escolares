import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../hooks/useAuth';
import { useRole } from '../hooks/useRole';
import { LogOut, LayoutDashboard, Search, ShieldCheck } from '@/components/AnimatedIcons';
import { GraduationCap } from '@/components/icons';
import { cn } from '../lib/utils';

export function Header() {
  const { user, session, signOut } = useAuth();
  const { isAdmin } = useRole(user?.id);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: '/auth' });
  };

  return (
    <div className="flex items-center justify-between pb-4 border-b border-white/[0.04]">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="relative size-9 rounded-xl bg-gradient-to-br from-[#721422]/20 to-[#4d0e18]/30 border border-[#721422]/30 flex items-center justify-center text-white transition-all duration-300 group-hover:shadow-[0_0_18px_rgba(114,20,34,0.45)] group-hover:scale-105">
          <GraduationCap className="size-4" />
          <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/[0.04]" />
        </div>
        <div>
          <h1 className="font-bold text-[15px] tracking-wide text-white leading-none">SITE</h1>
          <p className="text-[10px] text-white/40 font-semibold tracking-wider mt-0.5">CBTIS 61</p>
        </div>
      </Link>

      <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto max-w-[55%] no-scrollbar">
        <Link
          to="/catalogo"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 text-white/60 whitespace-nowrap",
            "[&.active]:text-white [&.active]:bg-white/10 [&.active]:shadow-[0_0_15px_rgba(255,255,255,0.05)]",
            "hover:text-white hover:bg-white/5"
          )}
        >
          <Search className="size-4" />
          <span className="hidden md:inline">Catálogo</span>
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 text-[#d24a6b]/70 whitespace-nowrap",
              "[&.active]:text-white [&.active]:bg-gradient-to-br [&.active]:from-[#721422] [&.active]:to-[#4d0e18] [&.active]:shadow-[0_4px_14px_rgba(114,20,34,0.4),0_0_20px_rgba(114,20,34,0.2)]",
              "hover:text-[#d24a6b] hover:bg-[#721422]/10"
            )}
          >
            <ShieldCheck className="size-4" />
            <span className="hidden md:inline">Panel Admin</span>
          </Link>
        )}

        {session && (
          <Link
            to="/dashboard"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 text-white/60 whitespace-nowrap",
              "[&.active]:text-white [&.active]:bg-white/10 [&.active]:shadow-[0_0_15px_rgba(255,255,255,0.05)]",
              "hover:text-white hover:bg-white/5"
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
            className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-transparent border border-white/10 text-white/60 hover:text-red-300 hover:border-red-400/30 hover:bg-red-500/5 transition-all duration-300 flex items-center gap-2"
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
