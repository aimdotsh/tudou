import React, { createContext, useContext } from 'react';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';

interface PrivacyModeContextType {
  isPrivacyMode: boolean;
  setIsPrivacyMode: (value: boolean) => void;
}

export const PrivacyModeContext = createContext<PrivacyModeContextType | undefined>(undefined);

export const PrivacyModeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { isPrivacyMode, setIsPrivacyMode } = usePrivacyMode();

  return (
    <PrivacyModeContext.Provider value={{ isPrivacyMode, setIsPrivacyMode }}>
      {children}
    </PrivacyModeContext.Provider>
  );
};

export const usePrivacyModeContext = () => {
  const context = useContext(PrivacyModeContext);
  if (context === undefined) {
    throw new Error('usePrivacyModeContext must be used within a PrivacyModeProvider');
  }
  return context;
};