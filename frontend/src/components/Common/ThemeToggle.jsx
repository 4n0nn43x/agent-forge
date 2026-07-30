import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import useTheme from '../../hooks/useTheme';

const OPTIONS = [
  { value: 'system', label: 'Match system', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

const ThemeToggle = () => {
  const { preference, cycle } = useTheme();
  const current = OPTIONS.find((option) => option.value === preference) ?? OPTIONS[0];
  const { Icon, label } = current;

  return (
    <button
      type="button"
      onClick={cycle}
      // The control names what it does now, and the tooltip names what comes next.
      aria-label={`Theme: ${label}. Click to change.`}
      title={`Theme: ${label}`}
      className="btn btn-ghost w-9 px-0"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};

export default ThemeToggle;
