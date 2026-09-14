import * as React from 'react';
import { supabase } from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';
import { Taller, Horario } from '../lib/talleres';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type TallerRow = Database['public']['Tables']['talleres']['Row'];
type HorarioRow = Database['public']['Tables']['horarios']['Row'];

export function useTalleres() {
  const [talleres, setTalleres] = React.useState<(Taller & { horarios: Horario[] })[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [refreshKey, setRefreshKey] = React.useState(0);
  const refreshTalleres = () => setRefreshKey(k => k + 1);

  React.useEffect(() => {
    async function fetchTalleres() {
      const [talleresRes, horariosRes] = await Promise.all([
        supabase.from('talleres').select('*'),
        supabase.from('horarios').select('*'),
      ]);

      if (talleresRes.error || horariosRes.error) {
        // errors handled silently
      } else {
        const talleresData = (talleresRes.data ?? []) as TallerRow[];
        const horariosData = (horariosRes.data ?? []) as HorarioRow[];
        const joined = talleresData.map((t) => ({
          ...t,
          cupo: t.cupo ?? 0,
          horarios: horariosData.filter((h) => h.taller_id === t.id) as Horario[],
        }));
        setTalleres(joined);
      }
      setLoading(false);
    }
    fetchTalleres();
  }, [refreshKey]);

  return { talleres, loading, refreshTalleres };
}

export function useInscripciones(userId: string | undefined | null) {
  const [inscritosIds, setInscritosIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  React.useEffect(() => {
    if (!userId) {
      setInscritosIds(new Set());
      setLoading(false);
      return;
    }
    const uid = userId;
    async function fetchInscripciones() {
      const res = await supabase.from('inscripciones').select('taller_id').eq('alumno_id', uid);
      const data = (res.data ?? []) as { taller_id: string }[];
      if (data.length > 0 || !res.error) {
        setInscritosIds(new Set(data.map((i) => i.taller_id)));
      }
      setLoading(false);
    }
    fetchInscripciones();
  }, [userId, refreshKey]);

  return { inscritosIds, loading, refresh };
}

export function useProfile(userId: string | undefined | null) {
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refreshProfile = () => setRefreshKey(k => k + 1);

  const setCambios = (nuevoValor: number) => {
    setProfile((prev) => prev ? { ...prev, cambios_restantes: nuevoValor } : prev);
  };

  React.useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const uid = userId;
    async function fetchProfile() {
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (data) {
        setProfile(data as ProfileRow);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [userId, refreshKey]);

  return { profile, loading, refreshProfile, setCambios };
}

