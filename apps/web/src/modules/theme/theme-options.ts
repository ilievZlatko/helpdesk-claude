import { MonitorIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';

/** The theme choices, in menu order, shared by every theme picker. */
export const themeOptions = [
  { value: 'light', label: 'Light', Icon: SunIcon },
  { value: 'dark', label: 'Dark', Icon: MoonIcon },
  { value: 'system', label: 'System', Icon: MonitorIcon },
] as const;
