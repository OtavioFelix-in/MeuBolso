// Estado que várias telas precisam: o mês em foco, um contador de "recarregue
// os dados" e o atalho pra abrir o formulário de lançamento de qualquer lugar.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getSetting, setSetting } from './db/core';
import { currentMonth } from './utils/date';

const AppContext = createContext(null);

export function AppProvider({ children, openTransaction, navigate, back }) {
  const [month, setMonth] = useState(currentMonth);
  const [version, setVersion] = useState(0);
  // "Modo cochilo": esconde os valores pra poder abrir o app perto dos outros.
  const [hidden, setHidden] = useState(() => getSetting('hide_values', '0') === '1');

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  const toggleHidden = useCallback(() => {
    setHidden((current) => {
      setSetting('hide_values', current ? '0' : '1');
      return !current;
    });
  }, []);

  const value = useMemo(
    () => ({ month, setMonth, version, refresh, openTransaction, navigate, back, hidden, toggleHidden }),
    [month, version, refresh, openTransaction, navigate, back, hidden, toggleHidden]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
