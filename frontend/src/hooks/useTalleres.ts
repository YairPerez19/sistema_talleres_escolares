import * as React from 'react';
import { supabase } from '../integrations/supabase/client';
import { Taller, Horario } from '../lib/talleres';

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
        console.error('Error fetching talleres/horarios', talleresRes.error, horariosRes.error);
      } else {
        const joined = talleresRes.data?.map((t: any) => ({
          ...t,
          cupo: t.cupo ?? 0,
          horarios: horariosRes.data?.filter((h: any) => h.taller_id === t.id) as Horario[]
        }));
        setTalleres(joined as any);
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
      if (res.data) {
        setInscritosIds(new Set(res.data.map((i: any) => i.taller_id)));
      }
      setLoading(false);
    }
    fetchInscripciones();
  }, [userId, refreshKey]);

  return { inscritosIds, loading, refresh };
}
export function useProfile(userId: string | undefined | null) {
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refreshProfile = () => setRefreshKey(k => k + 1);

  // Actualización optimista: cambia el valor local INMEDIATAMENTE
  const setCambios = (nuevoValor: number) => {
    setProfile((prev: any) => prev ? { ...prev, cambios_restantes: nuevoValor } : prev);
  };

  React.useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const uid = userId;
    async function fetchProfile() {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
      console.log('[useProfile] data:', data, 'error:', error);
      if (data) {
        let cambios = data.cambios_restantes;
        let limite = data.inscripcion_limite;

        if (cambios == null) {
          cambios = 3;
          limite = limite ?? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
          supabase.from('profiles')
            .update({ cambios_restantes: 3, inscripcion_limite: limite })
            .eq('id', uid)
            .then(({ error: errInit }) => {
              if (errInit) console.error('Error al inicializar cambios_restantes:', errInit);
            });
        }

        setProfile((prev: any) => ({
          ...data,
          cambios_restantes: cambios,
          inscripcion_limite: limite ?? prev?.inscripcion_limite ?? new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        }));
      }
      setLoading(false);
    }
    fetchProfile();
  }, [userId, refreshKey]);

  return { profile, loading, refreshProfile, setCambios };
}

