import { createRootRoute, Outlet, ScrollRestoration, useNavigate, useLocation } from '@tanstack/react-router';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { Toaster } from 'sonner';
import { useEffect, useRef } from 'react';
import { Loader2 } from '@/components/AnimatedIcons';

export const Route = createRootRoute({
  component: RootComponent,
});

const PUBLIC_ROUTES = ['/', '/auth', '/verify-otp'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (redirected.current) return;

    const isPublic = PUBLIC_ROUTES.includes(location.pathname);
    const isVerifyOtp = location.pathname === '/verify-otp';
    const hasPendingToken = !!localStorage.getItem('pending_token');

    if (!user && !isPublic && !(isVerifyOtp && hasPendingToken)) {
      redirected.current = true;
      navigate({ to: '/auth' });
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary-glow" size={32} />
      </div>
    );
  }

  return <>{children}</>;
}

function RootComponent() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  return (
    <AuthProvider>
      <AuthGuard>
        <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary-glow selection:text-white">
          <main className={
            isAuthPage 
              ? "flex-1 flex flex-col relative w-full h-full z-10" 
              : "flex-1 flex flex-col relative w-full h-full p-4 md:p-6 mx-auto z-10 max-w-[1600px]"
          }>
            <Outlet />
          </main>
          
          <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-background">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[150px] opacity-50" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[150px] opacity-50" />
          </div>
          
          <ScrollRestoration />
          <Toaster theme="dark" toastOptions={{ className: 'glass text-white border-primary/20 bg-background/90' }} position="bottom-right" />
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
