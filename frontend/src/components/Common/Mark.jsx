import React from 'react';

/**
 * The AgentForge mark.
 *
 * Replaces the unmodified Lucide `bot` glyph the project shipped with. An anvil
 * reduced to geometry: wide face, waisted stem, splayed foot. One shape, so it
 * still reads at 16px — an earlier version added a diagonal for the hammer
 * strike, which detached into a speck at nav size. It inherits currentColor, so
 * both themes come from the token layer.
 */
const Mark = ({ className = 'w-6 h-6', title }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    role={title ? 'img' : 'presentation'}
    aria-hidden={title ? undefined : 'true'}
    aria-label={title}
    fill="none"
  >
    {title ? <title>{title}</title> : null}
    <path
      d="M3.4 10.2h17.2a1.6 1.6 0 0 1 0 3.2h-5.05v2.15c0 1.42.82 2.71 2.1 3.32a.9.9 0 0 1-.39 1.71H6.74a.9.9 0 0 1-.39-1.71c1.28-.61 2.1-1.9 2.1-3.32V13.4H3.4a1.6 1.6 0 0 1 0-3.2Z"
      fill="currentColor"
    />
  </svg>
);

export default Mark;
