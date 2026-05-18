import { useState, useCallback } from 'react';

export function useBeeNav() {
  const [activePage,   setActivePage]   = useState('dashboard');
  const [selectedHive, setSelectedHive] = useState(null);

  const openHive = useCallback((hive) => setSelectedHive(hive), []);

  const closeHive = useCallback(() => setSelectedHive(null), []);

  return {
    activePage, setActivePage,
    selectedHive, setSelectedHive,
    openHive, closeHive,
  };
}
