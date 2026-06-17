// MobileMenu.tsx — React island for the hamburger mobile navigation
// hydrate with client:visible on the Navbar

import { useState, useEffect } from 'react';

interface Props {
  links: Array<{ href: string; label: string }>;
}

export default function MobileMenu({ links }: Props) {
  const [open, setOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Hamburger / close toggle */}
      <button
        id="mobile-menu-btn"
        className="md:hidden text-on-surface p-2 hover:text-primary transition-colors"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="material-symbols-outlined"
          aria-hidden="true"
          style={{ fontSize: '24px' }}
        >
          {open ? 'close' : 'menu'}
        </span>
      </button>

      {/* Slide-down overlay */}
      <nav
        id="mobile-nav"
        aria-label="Mobile navigation"
        className={[
          'fixed inset-x-0 top-[65px] z-40 glass-panel border-b border-border-stone',
          'flex flex-col gap-2 px-margin-mobile py-6',
          'transition-all duration-300 ease-in-out',
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none',
          'md:hidden',
        ].join(' ')}
      >
        {links.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="font-mono text-xs font-medium tracking-widest uppercase text-on-surface-variant hover:text-primary transition-colors py-3 border-b border-border-stone last:border-0"
            onClick={() => setOpen(false)}
          >
            {label}
          </a>
        ))}

        <a
          href="#enroll"
          className="mc-button px-6 py-3 font-mono text-xs font-medium uppercase tracking-widest text-center mt-4 block"
          onClick={() => setOpen(false)}
        >
          Join Server
        </a>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 top-[65px] z-30 bg-surface-deep/60 md:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
