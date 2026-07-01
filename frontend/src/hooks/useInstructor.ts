import * as React from 'react';
import { supabase } from '../integrations/supabase/client';
import type { TallerConInstructor, Horario } from '../lib/types';

/**
 * Hook para obtener los talleres asignados al instructor actual.
 * Filtra por instructor_id = auth.uid().
 */
export function useInstructorTalleres(instructorId: string | undefined | null) {
  const [talleres, setTalleres] = React.useState<TallerConInstructor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  React.useEffect(() => {
    if (!instructorId) {
      setTalleres([]);
      setLoading(false);
      return;
    }

    const uid = instructorId;
    async function fetchTalleres() {
      setLoading(true);
      console.log('[useInstructorTalleres] Buscando talleres para:', uid);
      
      const [talleresRes, horariosRes] = await Promise.all([
        supabase
          .from('talleres')
          .select('*')
          .eq('instructor_id', uid),
        supabase.from('horarios').select('*'),
      ]);

      if (talleresRes.error) {
        console.error('[useInstructorTalleres] Error:', talleresRes.error);
        setLoading(false);
        return;
      }

      const talleresList = talleresRes.data ?? [];
      console.log('[useInstructorTalleres] Encontrados:', talleresList.length);
      
      const horariosList = (horariosRes.data ?? []) as Horario[];

      // Obtener conteo de alumnos por taller
      const conteos = await Promise.all(
        talleresList.map(async (t: any) => {
          const { count } = await supabase
            .from('inscripciones')
            .select('*', { count: 'exact', head: true })
            .eq('taller_id', t.id);
          return { id: t.id, count: count ?? 0 };
        })
      );

      const conteoMap = new Map(conteos.map(c => [c.id, c.count]));

      const joined = talleresList.map((t: any) => ({
        ...t,
        cupo: t.cupo ?? 0,
        horarios: horariosList.filter(h => h.taller_id === t.id),
        alumnos_count: conteoMap.get(t.id) ?? 0,
      }));

      setTalleres(joined);
      setLoading(false);
    }

    fetchTalleres();
  }, [instructorId, refreshKey]);

  return { talleres, loading, refresh };
}

/**
 * Hook para obtener todos los talleres (para el admin, con información de instructor).
 */
export function useAllTalleresAdmin() {
  const [talleres, setTalleres] = React.useState<(TallerConInstructor & { alumnos_count: number })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  React.useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const [talleresRes, horariosRes] = await Promise.all([
        supabase.from('talleres').select('*'),
        supabase.from('horarios').select('*'),
      ]);

      if (!talleresRes.data) { setLoading(false); return; }

      const horariosList = (horariosRes.data ?? []) as Horario[];
      const talleresList = talleresRes.data;

      const conteos = await Promise.all(
        talleresList.map(async (t: any) => {
          const { count } = await supabase
            .from('inscripciones')
            .select('*', { count: 'exact', head: true })
            .eq('taller_id', t.id);
          return { id: t.id, count: count ?? 0 };
        })
      );

      const conteoMap = new Map(conteos.map(c => [c.id, c.count]));

      const joined = talleresList.map((t: any) => ({
        ...t,
        horarios: horariosList.filter(h => h.taller_id === t.id),
        alumnos_count: conteoMap.get(t.id) ?? 0,
      }));

      setTalleres(joined);
      setLoading(false);
    }

    fetchAll();
  }, [refreshKey]);

  return { talleres, loading, refresh };
}
