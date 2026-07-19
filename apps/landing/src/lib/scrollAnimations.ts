/**
 * scrollAnimations.ts — GSAP-driven motion layer for the landing page.
 *
 * Base layer: scroll reveals (.reveal), staggered group reveals
 * (.reveal-stagger), and scrub-linked parallax ([data-parallax]).
 *
 * Advanced layer: an orchestrated SplitText hero intro, char-split section
 * headings (.reveal-heading), a terminal scramble-text effect
 * ([data-scramble]), count-up stat numbers (.count-up), a scrub-drawn
 * timeline connector ([data-timeline-line] / .timeline-node), and magnetic
 * CTA buttons (.magnetic).
 *
 * Called once from BaseLayout.astro after the DOM is ready.
 */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

export function initScrollAnimations(): void {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin);

  // Structural, not motion — runs regardless of prefers-reduced-motion, same
  // as a sticky nav would.
  initFooterReveal();
  initScrollSpy();

  gsap.matchMedia().add(
    {
      reduceMotion: '(prefers-reduced-motion: reduce)',
      noPreference: '(prefers-reduced-motion: no-preference)',
    },
    (context) => {
      const { reduceMotion } = context.conditions as { reduceMotion: boolean };

      // Reduced motion: do nothing — elements are visible by default in the DOM.
      if (reduceMotion) return;

      // Single-element scroll reveals
      document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.65,
            ease: 'expo.out',
            scrollTrigger: { trigger: scrollTriggerFor(el), start: 'top 88%', once: true },
          }
        );
      });

      // Staggered group reveals — animate direct children in sequence
      document.querySelectorAll<HTMLElement>('.reveal-stagger').forEach((group) => {
        const items = group.children;
        if (!items.length) return;
        gsap.fromTo(
          items,
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            ease: 'expo.out',
            stagger: 0.09,
            scrollTrigger: { trigger: scrollTriggerFor(group), start: 'top 85%', once: true },
          }
        );
      });

      // Parallax layers — data-parallax="<speed>" (fraction of container scroll distance)
      document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
        const speed = parseFloat(el.dataset.parallax ?? '0.15');
        const root = el.closest<HTMLElement>('[data-parallax-root]') ?? el.parentElement;
        if (!root) return;
        gsap.to(el, {
          yPercent: speed * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      });

      initHeroIntro();
      initHeadingSplits();
      initTerminalScramble();
      initCountUp();
      initTimelineDraw();
      initMagneticButtons();
      initMascotPeek();
    }
  );

  // Late-loading fonts/lazy images can shift layout after triggers are set up.
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

/** Orchestrated on-load hero entrance: badge -> H1 char-split -> tagline -> CTA row. */
function initHeroIntro(): void {
  const root = document.querySelector<HTMLElement>('[data-hero-intro]');
  if (!root) return;

  const heading = root.querySelector<HTMLElement>('h1');
  const rest = Array.from(root.children).filter((el) => el.tagName !== 'H1') as HTMLElement[];

  const tl = gsap.timeline({ defaults: { duration: 0.5, ease: 'expo.out' } });

  if (rest[0]) {
    tl.fromTo(rest[0], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0 });
  }

  if (heading) {
    const split = new SplitText(heading, { type: 'chars' });
    tl.fromTo(
      split.chars,
      { autoAlpha: 0, yPercent: 60 },
      { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.02, ease: 'back.out(1.7)' },
      '-=0.2'
    );
  }

  if (rest.length > 1) {
    tl.fromTo(rest.slice(1), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.12 }, '-=0.15');
  }
}

/** Char-split reveal for .reveal-heading groups (a .pixel-heading + surrounding text). */
function initHeadingSplits(): void {
  document.querySelectorAll<HTMLElement>('.reveal-heading').forEach((group) => {
    const heading = group.querySelector<HTMLElement>('.pixel-heading, .pixel-heading--sm');
    const others = Array.from(group.children).filter((el) => el !== heading) as HTMLElement[];

    const tl = gsap.timeline({
      scrollTrigger: { trigger: group, start: 'top 85%', once: true },
    });

    if (heading) {
      // .pixel-heading is inline-flex (reserved for a diamond-accent sibling).
      // SplitText's char <div>s become direct flex children, and flex's row
      // algorithm doesn't word-wrap free text the way block/inline flow does
      // — it collapses the inter-word space and can stack items vertically.
      // None of the current headings use the flex alignment for anything (no
      // diamond siblings yet), so switching to block for the split is safe.
      gsap.set(heading, { display: 'block' });
      const split = new SplitText(heading, { type: 'chars' });
      tl.fromTo(
        split.chars,
        { autoAlpha: 0, yPercent: 60 },
        { autoAlpha: 1, yPercent: 0, duration: 0.5, stagger: 0.018, ease: 'back.out(1.6)' }
      );
    }

    if (others.length) {
      tl.fromTo(
        others,
        { autoAlpha: 0, y: 18 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: 'expo.out', stagger: 0.08 },
        heading ? '-=0.25' : 0
      );
    }
  });
}

/** Terminal-style scramble-in for [data-scramble] text (e.g. Footer's SYS.TERMINAL.OFFLINE). */
function initTerminalScramble(): void {
  document.querySelectorAll<HTMLElement>('[data-scramble]').forEach((el) => {
    gsap.to(el, {
      duration: 1,
      scrambleText: { text: el.textContent ?? '', chars: 'upperCase', speed: 0.35 },
      scrollTrigger: { trigger: scrollTriggerFor(el), start: 'top 92%', once: true },
    });
  });
}

/** Count-up for .count-up stat values — parses "1.21" / "2+" / "4" style text. */
function initCountUp(): void {
  document.querySelectorAll<HTMLElement>('.count-up').forEach((el) => {
    const raw = el.textContent?.trim() ?? '';
    const match = raw.match(/^([\d.]+)(.*)$/);
    if (!match) return;

    const [, numStr, suffix] = match;
    const target = parseFloat(numStr);
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
    const proxy = { val: 0 };

    gsap.to(proxy, {
      val: target,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = proxy.val.toFixed(decimals) + suffix;
      },
      scrollTrigger: { trigger: scrollTriggerFor(el), start: 'top 90%', once: true },
    });
  });
}

/**
 * Deployment Sequence (Timeline): connector line draws in as you scroll
 * (scrub), then each phase "activates" in order — node spins/pops in with an
 * expanding sonar-style ping ring, its card materializes from a blur with a
 * directional drop/rise matching its row, and its phase label decodes via
 * scramble-text — like a HUD bringing a deployment sequence online one step
 * at a time.
 */
function initTimelineDraw(): void {
  const line = document.querySelector<HTMLElement>('[data-timeline-line]');
  const container = line?.parentElement;
  if (!line || !container) return;

  gsap.fromTo(
    line,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: container, start: 'top 75%', end: 'bottom 55%', scrub: true },
    }
  );

  const sequence = container.querySelector<HTMLElement>('[data-timeline-sequence]');
  if (!sequence) return;

  const phases = Array.from(sequence.querySelectorAll<HTMLElement>('[data-timeline-phase]')).sort(
    (a, b) => Number(a.dataset.timelinePhase) - Number(b.dataset.timelinePhase)
  );
  const nodes = Array.from(sequence.querySelectorAll<HTMLElement>('[data-timeline-node]')).sort(
    (a, b) => Number(a.dataset.timelineNode) - Number(b.dataset.timelineNode)
  );
  if (!phases.length || phases.length !== nodes.length) return;

  const tl = gsap.timeline({
    scrollTrigger: { trigger: container, start: 'top 70%', once: true },
  });

  phases.forEach((card, i) => {
    const node = nodes[i];
    const ring = node.parentElement?.querySelector<HTMLElement>('.timeline-node-ring');
    const label = card.querySelector<HTMLElement>('.timeline-phase-label');
    const isTopRow = i % 2 === 0;
    const step = i * 0.22;

    tl.fromTo(
      node,
      { scale: 0, rotate: 0 },
      { scale: 1, rotate: 45, duration: 0.4, ease: 'back.out(2.6)' },
      step
    );

    if (ring) {
      // Two legs, not one fromTo: the ring must render fully invisible the
      // instant the timeline is created (same as every other reveal in this
      // file) or it'd sit on the node at rest, pre-scroll. Leg 1 pops it to
      // visible in place; leg 2 is the actual sonar expand-and-fade.
      tl.fromTo(
        ring,
        { scale: 0.5, autoAlpha: 0 },
        { autoAlpha: 0.9, duration: 0.15, ease: 'power1.out' },
        step
      ).to(ring, { scale: 2.6, autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, step + 0.15);
    }

    tl.fromTo(
      card,
      { autoAlpha: 0, y: isTopRow ? -32 : 32, scale: 0.92, filter: 'blur(6px)' },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.55,
        ease: 'power3.out',
        clearProps: 'transform,filter,opacity,visibility',
      },
      step + 0.1
    );

    if (label) {
      tl.to(
        label,
        { duration: 0.4, scrambleText: { text: label.textContent ?? '', chars: 'upperCase', speed: 0.4 } },
        step + 0.15
      );
    }
  });
}

/**
 * Mascot peek-in/hide: visible whenever the hero section occupies the
 * viewport, hidden as soon as it's scrolled past. Plays its entrance
 * immediately on load rather than through ScrollTrigger's onEnter — onEnter
 * is an *event* fired by crossing the start point, so it does not reliably
 * fire for a trigger (the hero) that's already active the moment the
 * ScrollTrigger is created, i.e. on every fresh page load. onLeave /
 * onEnterBack don't have that problem since they only ever fire from a real
 * scroll crossing after setup.
 */
function initMascotPeek(): void {
  const mascot = document.querySelector<HTMLElement>('[data-mascot-peek]');
  const hero = document.getElementById('home');
  if (!mascot || !hero) return;

  const tween = gsap.fromTo(
    mascot,
    { xPercent: 12, yPercent: 35, autoAlpha: 0 },
    { xPercent: 0, yPercent: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out', paused: true }
  );
  tween.play();

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom top',
    onLeave: () => tween.reverse(),
    onEnterBack: () => tween.play(),
  });
}

/** Cursor-following pull on .magnetic CTAs — pointer:fine devices only. */
function initMagneticButtons(): void {
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const maxOffset = 10;
  const strength = 0.3;

  document.querySelectorAll<HTMLElement>('.magnetic').forEach((btn) => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });

    btn.addEventListener('pointermove', (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);
      xTo(gsap.utils.clamp(-maxOffset, maxOffset, relX * strength));
      yTo(gsap.utils.clamp(-maxOffset, maxOffset, relY * strength));
    });

    btn.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/**
 * Pins the footer behind .page-content and reserves exactly its height as a
 * margin-bottom gap, so scrolling to the end of the page "uncovers" it
 * instead of just scrolling it into view. Re-syncs on resize (badge wrapping
 * changes footer height) and once more after full page load (web fonts).
 */
function initFooterReveal(): void {
  const wrapper = document.querySelector<HTMLElement>('[data-page-content]');
  const footer = document.querySelector<HTMLElement>('.reveal-footer');
  if (!wrapper || !footer) return;

  const sync = () => {
    wrapper.style.marginBottom = `${footer.offsetHeight}px`;
    ScrollTrigger.refresh();
  };
  sync();
  new ResizeObserver(sync).observe(footer);
  window.addEventListener('load', sync, { once: true });
}

/**
 * Scroll-spy: highlights the Navbar link for whichever section is currently
 * in view, instead of always showing "Home" active. Reads [data-nav-key] on
 * each nav link and matches it against a same-id section on the page (e.g.
 * data-nav-key="about" -> #about). No-ops entirely on pages without those
 * section ids (e.g. /commands), leaving the server-rendered active state
 * (Commands) untouched.
 */
function initScrollSpy(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-nav-key]');
  if (!links.length) return;

  const ACTIVE_CLASSES = ['text-primary', 'border-b-2', 'border-primary', 'pb-1'];
  const INACTIVE_CLASSES = [
    'text-on-surface-variant',
    'hover:text-on-surface',
    'hover:bg-surface-bright/10',
    'px-2',
    'py-1',
  ];

  const sections: { key: string; el: HTMLElement }[] = [];
  links.forEach((link) => {
    const key = link.dataset.navKey;
    const section = key ? document.getElementById(key) : null;
    if (key && section) sections.push({ key, el: section });
  });
  if (!sections.length) return;

  const setActive = (key: string) => {
    links.forEach((link) => {
      const isActive = link.dataset.navKey === key;
      link.classList.remove(...ACTIVE_CLASSES, ...INACTIVE_CLASSES);
      link.classList.add(...(isActive ? ACTIVE_CLASSES : INACTIVE_CLASSES));
    });
  };

  const visible = new Set<string>();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const key = (entry.target as HTMLElement).id;
        if (entry.isIntersecting) visible.add(key);
        else visible.delete(key);
      });

      // Sections are in document order, so the first visible one is the
      // one the fixed navbar's lower edge is currently sitting closest to.
      const current = sections.find((s) => visible.has(s.key));
      if (current) setActive(current.key);
    },
    // Top offset clears the fixed navbar; bottom offset means a section only
    // counts as "current" while it occupies the upper part of the viewport.
    { rootMargin: '-72px 0px -70% 0px', threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s.el));
}

/**
 * Elements inside the (now fixed) footer never move with scroll, so
 * ScrollTrigger can't use them directly as a trigger. Swap in the sentinel
 * that sits in normal document flow right where the reveal gap begins.
 */
function scrollTriggerFor(el: HTMLElement): HTMLElement {
  if (el.closest('footer')) {
    const sentinel = document.querySelector<HTMLElement>('[data-footer-sentinel]');
    if (sentinel) return sentinel;
  }
  return el;
}
