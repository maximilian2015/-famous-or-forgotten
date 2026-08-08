import { createContext, useContext } from 'react';
import { theme } from './theme.js';

// Inside a phone app, "the accent colour" means that app's colour. Everywhere else it
// is the game's purple. Components read it from here instead of importing theme.accent
// directly, so a single Provider in Phone.jsx recolours a whole app screen.
export const AppTheme = createContext(null);
export function useAccent() { return useContext(AppTheme) || theme.accent; }
