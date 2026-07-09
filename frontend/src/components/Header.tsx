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
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B1A32]/10 to-[#5C1020]/10 border border-[#8B1A32]/15 flex items-center justify-center text-white transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(255,0,85,0.2)] group-hover:scale-105">
          <GraduationCap size={18} />
        </div>
        <div>
          <h1 className="font-bold text-[15px] tracking-wide text-white leading-none">SITE</h1>
          <p className="text-[10px] text-white/40 font-semibold tracking-wider">CBTIS 61</p>
        </div>
      </Link>

      <nav className="flex items-center gap-1.5 md:gap-3 overflow-x-auto max-w-[50%] no-scrollbar">
        <Link
          to="/catalogo"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 text-white/60 whitespace-nowrap",
            "[&.active]:text-white [&.active]:bg-white/10 [&.active]:shadow-[0_0_15px_rgba(255,255,255,0.05)]",
            "hover:text-white hover:bg-white/5"
          )}
        >
          <Search size={16} />
          <span className="hidden md:inline">Catálogo</span>
        </Link>

        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 text-[#8B1A32]/60 whitespace-nowrap",
              "[&.active]:text-[#8B1A32] [&.active]:bg-[#8B1A32]/10 [&.active]:shadow-[0_0_15px_rgba(255,0,85,0.1)]",
              "hover:text-[#8B1A32] hover:bg-[#8B1A32]/5"
            )}
          >
            <ShieldCheck size={16} />
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
            <LayoutDashboard size={16} />
            <span className="hidden md:inline">Vista Alumno</span>
          </Link>
        )}
      </nav>

      <div className="flex items-center">
        {session ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-transparent border border-white/10 text-white/60 hover:text-white hover:border-red-500/30 hover:bg-red-500/5 transition-all duration-300 flex items-center gap-2"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-gradient-to-r from-[#8B1A32] to-[#B8354D] text-white hover:shadow-[0_8px_20px_rgba(255,0,85,0.3)] transition-all duration-300"
          >
            Entrar
          </Link>
        )}
      </div>
    </div>
  );
}
