import { createContext, useContext } from 'react';

interface SettingsContextValue {
  openSettings: () => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  openSettings: () => {},
});

export function useSettingsContext() {
  return useContext(SettingsContext);
}
