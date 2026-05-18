import { useState, useCallback } from 'react';
import { beeApi } from '../../services/beeApi';

export function useHiveRefresh(hive, toast) {
  const [currentHive, setCurrentHive] = useState(hive);

  const refreshHive = useCallback(async () => {
    const r = await beeApi.getHive(hive.id);
    if (r.ok) setCurrentHive(await r.json());
  }, [hive.id]);

  const adjustQueenCount = useCallback(async (delta) => {
    const newCount = Math.max(0, (currentHive.queen_count || 0) + delta);
    const body = {
      apiary_id: currentHive.apiary_id, identifier: currentHive.identifier,
      is_active: currentHive.is_active, health_score: currentHive.health_score,
      honey_level: currentHive.honey_level, force_level: currentHive.force_level,
      hive_type: currentHive.hive_type, queen_year: currentHive.queen_year,
      has_queen: currentHive.has_queen, queen_count: newCount, notes: currentHive.notes,
    };
    const r = await beeApi.updateHive(currentHive.id, body);
    if (r.ok) setCurrentHive(await r.json());
    else toast('Erreur mise à jour stock reines', 'error');
  }, [currentHive, toast]);

  return { currentHive, refreshHive, adjustQueenCount };
}
