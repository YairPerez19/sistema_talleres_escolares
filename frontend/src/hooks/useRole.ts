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
      // 1. Try local storage first (set during login)
      const cachedRole = localStorage.getItem(`role_${uid}`);
      if (cachedRole) {
        setRole(cachedRole as AppRole);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', uid)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching role:', error);
      }
      
      const roleData = data as { role: string } | null;
      if (roleData?.role) {
        setRole(roleData.role as AppRole);
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
