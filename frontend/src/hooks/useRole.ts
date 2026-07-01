import * as React from 'react';
import { supabase } from '../integrations/supabase/client';
import type { AppRole } from '../lib/types';

interface UseRoleResult {
  role: AppRole | null;
  isAdmin: boolean;
  isInstructor: boolean;
  isStudent: boolean;
  loading: boolean;
}

export function useRole(userId: string | undefined | null): UseRoleResult {
  const [role, setRole] = React.useState<AppRole | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }
    const uid = userId;
    async function fetchRole() {
      const { data } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', uid)
        .maybeSingle();
      if (data?.role) {
        setRole(data.role as AppRole);
      } else {
        setRole('student');
      }
      setLoading(false);
    }
    fetchRole();
  }, [userId]);

  return {
    role,
    isAdmin: role === 'admin',
    isInstructor: role === 'instructor',
    isStudent: role === 'student',
    loading,
  };
}
