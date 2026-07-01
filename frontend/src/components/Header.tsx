import { Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../hooks/useAuth';
import { useRole } from '../hooks/useRole';
import { LogOut, GraduationCap, LayoutDashboard, Search, ShieldCheck } from '@/components/AnimatedIcons';
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
    <div className="flex items-center justify-between pb-4 border-b border-white/5">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white transition-transform group-hover:scale-110">
          <GraduationCap size={18} />
        </div>
        <div>
          <h1 className="font-bold text-[15px] tracking-wide text-white leading-none">SITE</h1>
          <p className="text-[10px] text-white/40 font-semibold tracking-wider">CBTIS 61</p>
        </div>
      </Link>
      
      {/* Navigation */}
      <nav className="flex items-center gap-2 md:gap-4 overflow-x-auto max-w-[50%] no-scrollbar">
        <Link 
          to="/catalogo"
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all hover:bg-white/5 text-white/70 whitespace-nowrap",
            "[&.active]:text-white [&.active]:bg-white/10"
          )}
        >
          <Search size={16} />
          <span className="hidden md:inline">Catálogo</span>
        </Link>
        
        {isAdmin && (
          <Link 
            to="/admin"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all hover:bg-white/5 text-primary-glow/70 whitespace-nowrap",
              "[&.active]:text-primary-glow [&.active]:bg-primary/10"
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
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all hover:bg-white/5 text-white/70 whitespace-nowrap",
              "[&.active]:text-white [&.active]:bg-white/10"
            )}
          >
            <LayoutDashboard size={16} />
            <span className="hidden md:inline">Vista Alumno</span>
          </Link>
        )}
      </nav>

      {/* User Actions */}
      <div className="flex items-center">
        {session ? (
          <button
            onClick={handleSignOut}
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold bg-transparent border border-white/20 text-white/80 hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        ) : (
          <Link 
            to="/auth"
            className="px-4 py-1.5 rounded-full text-[12px] font-semibold bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            Entrar
          </Link>
        )}
      </div>
    </div>
  );
}
