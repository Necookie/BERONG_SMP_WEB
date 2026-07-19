// MobileMenu.tsx — React island for the hamburger mobile navigation
// hydrate with client:visible on the Navbar

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

interface Props {
  links: Array<{ href: string; label: string }>;
}

export default function MobileMenu({ links }: Props) {
  const [open, setOpen] = useState(false);

  // The panel must be portalled to <body>. The Navbar it's nested in carries
  // .glass-panel -> backdrop-filter, and a non-none backdrop-filter makes an
  // element the containing block for its position:fixed descendants (same rule
  // as transform/filter/perspective). Left in place, the panel's `bottom: 0`
  // resolves against the ~57px navbar instead of the viewport and collapses to
  // zero height. Portalling to <body> restores the viewport as its reference.
  // Needs `document`, so it can only render post-mount, never during SSR.
  const [portalReady, setPortalReady] = useState(false);

  const panelRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPortalReady(true), []);

  // A fresh timeline per toggle, rather than one paused timeline that gets
  // play()/reverse()'d — no persistent playhead, no reliance on fromTo's
  // immediateRender for rest state, nothing stale surviving a hot reload.
  useEffect(() => {
    if (!portalReady) return;
    const panel = panelRef.current;
    const list = listRef.current;
    const cta = ctaRef.current;
    if (!panel || !list || !cta) return;

    const items = Array.from(list.querySelectorAll<HTMLElement>('.mobile-nav-item'));
    gsap.killTweensOf([panel, cta, ...items]);

    if (open) {
      gsap.timeline()
        .to(panel, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' }, 0)
        .fromTo(
          items,
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06, ease: 'power3.out' },
          0.1
        )
        .fromTo(cta, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, '-=0.2');
    } else {
      // Also the mount-time path: the panel's rest state already matches this
      // (set inline in JSX), so first render is a no-op, not a visible flash.
      gsap.timeline()
        .to([...items, cta], { autoAlpha: 0, y: 16, duration: 0.2, ease: 'power2.in' }, 0)
        .to(panel, { autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, 0.05);
    }
  }, [open, portalReady]);

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

  const panel = (
    // Full-width solid panel below the navbar — no blur, no translucency.
    // autoAlpha drives opacity+visibility together, so while closed it never
    // intercepts clicks meant for the page underneath.
    <nav
      id="mobile-nav"
      ref={panelRef}
      aria-label="Mobile navigation"
      className="fixed top-[65px] bottom-0 inset-x-0 z-[70] bg-surface-deep md:hidden flex flex-col overflow-y-auto"
      style={{ opacity: 0, visibility: 'hidden' }}
    >
      <ul
        ref={listRef}
        className="flex-1 flex flex-col items-center justify-center gap-1 px-6 py-8 w-full"
        role="list"
      >
        {links.map(({ href, label }, i) => (
          <li key={href} className="mobile-nav-item w-full max-w-xs">
            <a
              href={href}
              className="flex items-center justify-center gap-3 py-4 font-mono text-base font-medium tracking-widest uppercase text-on-surface-variant hover:text-primary border-b border-border-stone transition-colors"
              onClick={() => setOpen(false)}
            >
              <span className="text-primary text-[10px] tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              {label}
            </a>
          </li>
        ))}
      </ul>

      <div ref={ctaRef} className="px-6 pb-10 w-full flex justify-center">
        <a
          href="#instructions"
          className="mc-button block w-full max-w-xs text-center px-6 py-3 font-mono text-xs font-medium uppercase tracking-widest"
          onClick={() => setOpen(false)}
        >
          Join Server
        </a>
      </div>
    </nav>
  );

  return (
    <>
      {/* Hamburger / close toggle */}
      <button
        id="mobile-menu-btn"
        // Fixed 36x36 flex-centred box, matching ThemeToggle's dimensions
        // exactly. Baseline-aligning an inline-block glyph inside padding
        // leaves descender space under it and lets the button's width shift
        // as the menu/close glyphs swap — centring in a fixed box avoids both.
        className="md:hidden flex items-center justify-center w-9 h-9 shrink-0 text-on-surface hover:text-primary transition-colors"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={[
            'material-symbols-outlined transition-transform duration-300',
            open ? 'rotate-90' : 'rotate-0',
          ].join(' ')}
          aria-hidden="true"
          style={{ fontSize: '24px' }}
        >
          {open ? 'close' : 'menu'}
        </span>
      </button>

      {portalReady && createPortal(panel, document.body)}
    </>
  );
}
