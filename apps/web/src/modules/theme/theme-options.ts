import { Monitor, Moon, Sun } from 'lucide-react';

/** The theme choices, in menu order, shared by every theme picker. */
export const themeOptions = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const;
