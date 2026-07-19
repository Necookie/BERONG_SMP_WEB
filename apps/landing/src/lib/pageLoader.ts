/**
 * pageLoader.ts — GSAP boot-screen sequence for Loader.astro.
 *
 * Intro: HUD corners pop in -> logo frame materializes -> brand fades up ->
 * status line scrambles through boot messages while a segmented progress bar
 * fills, timed to a minimum on-screen duration so the sequence never feels
 * like a flash even on a fast connection.
 *
 * Exit: status reports ready -> bar flashes -> HUD corners shoot outward ->
 * logo/brand/bar group scales up and blurs away -> the two background
 * panels split apart (top up, bottom down) to reveal the page underneath.
 *
 * Since this is a full-page MPA (no client router), the loader mounts on
 * every navigation. The full sequence only plays once per tab session —
 * repeat internal navigations get a compressed version so clicking around
 * the site doesn't feel like it reboots every time.
 */
import gsap from 'gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';

const SESSION_KEY = 'berong-loader-played';
const BOOT_MESSAGES = ['INITIALIZING SIMULATION...', 'LOADING WORLD ASSETS...', 'CALIBRATING SENSORS...'];
const MAX_LOAD_WAIT_MS = 4000;

export function initPageLoader(): void {
  const root = document.querySelector<HTMLElement>('[data-page-loader]');
  if (!root) return;

  gsap.registerPlugin(ScrambleTextPlugin);
  document.documentElement.classList.add('loading-lock');

  const release = () => {
    document.documentElement.classList.remove('loading-lock');
    root.remove();
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    release();
    return;
  }

  const repeatVisit = sessionStorage.getItem(SESSION_KEY) === '1';
  sessionStorage.setItem(SESSION_KEY, '1');
  const d = (full: number) => (repeatVisit ? full * 0.4 : full);

  const logo = root.querySelector<HTMLElement>('[data-loader-logo]');
  const brand = root.querySelector<HTMLElement>('[data-loader-brand]');
  const status = root.querySelector<HTMLElement>('[data-loader-status]');
  const barFill = root.querySelector<HTMLElement>('[data-loader-bar-fill]');
  const percent = root.querySelector<HTMLElement>('[data-loader-percent]');
  const seam = root.querySelector<HTMLElement>('[data-loader-seam]');
  const corners = Array.from(root.querySelectorAll<HTMLElement>('[data-loader-corner]'));
  const content = root.querySelector<HTMLElement>('[data-loader-content]');
  const topPanel = root.querySelector<HTMLElement>('[data-loader-top]');
  const bottomPanel = root.querySelector<HTMLElement>('[data-loader-bottom]');

  const barDuration = d(1.4);
  const progress = { val: 0 };

  const intro = gsap.timeline();

  intro
    .fromTo(seam, { scaleX: 0 }, { scaleX: 1, duration: d(0.5), ease: 'power2.inOut' })
    .fromTo(
      corners,
      { autoAlpha: 0, scale: 0.6 },
      { autoAlpha: 1, scale: 1, duration: d(0.4), stagger: d(0.06), ease: 'back.out(2)' },
      '<'
    )
    .fromTo(
      logo,
      { autoAlpha: 0, scale: 0.75, filter: 'blur(8px)' },
      { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: d(0.6), ease: 'power3.out' },
      '-=0.2'
    )
    .fromTo(brand, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: d(0.4), ease: 'power2.out' }, '-=0.3')
    .to(
      progress,
      {
        val: 100,
        duration: barDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
          const v = Math.round(progress.val);
          if (barFill) barFill.style.width = `${v}%`;
          if (percent) percent.textContent = `${v}%`;
        },
      },
      '-=0.1'
    );

  if (!repeatVisit && status) {
    const barStart = `-=${barDuration}`;
    intro.to(
      status,
      { duration: 0.4, scrambleText: { text: BOOT_MESSAGES[0], chars: 'upperCase', speed: 0.4 } },
      barStart
    );
    BOOT_MESSAGES.slice(1).forEach((msg, i) => {
      intro.to(
        status,
        { duration: 0.4, scrambleText: { text: msg, chars: 'upperCase', speed: 0.4 } },
        `${barStart}+=${(barDuration * (i + 1)) / BOOT_MESSAGES.length}`
      );
    });
  } else if (status) {
    intro.to(status, { duration: 0.3, scrambleText: { text: 'LOADING...', chars: 'upperCase', speed: 0.5 } }, '<');
  }

  const realLoad = new Promise<void>((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
      return;
    }
    const timeout = window.setTimeout(resolve, MAX_LOAD_WAIT_MS);
    window.addEventListener(
      'load',
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );
  });

  Promise.all([
    new Promise<void>((resolve) => {
      intro.eventCallback('onComplete', () => resolve());
    }),
    realLoad,
  ]).then(playExit);

  function playExit() {
    const exit = gsap.timeline({ onComplete: release });

    if (status) {
      exit.to(status, {
        duration: 0.35,
        scrambleText: { text: 'ACCESS GRANTED', chars: 'upperCase', speed: 0.5 },
      });
    }
    if (barFill) {
      exit.to(barFill, { filter: 'brightness(1.6)', duration: 0.15, yoyo: true, repeat: 1 }, '<');
    }
    if (percent) {
      exit.to(percent, { scale: 1.3, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.out' }, '<');
    }

    exit.to({}, { duration: d(0.15) });

    corners.forEach((corner) => {
      const rect = corner.getBoundingClientRect();
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = rect.left + rect.width / 2 < cx ? -1 : 1;
      const dy = rect.top + rect.height / 2 < cy ? -1 : 1;
      exit.to(corner, { x: dx * 60, y: dy * 60, autoAlpha: 0, duration: d(0.5), ease: 'power3.in' }, '<+=0.03');
    });

    if (content) {
      exit.to(
        content,
        { autoAlpha: 0, scale: 1.08, filter: 'blur(10px)', duration: d(0.45), ease: 'power2.in' },
        '<'
      );
    }

    if (seam) {
      exit.to(seam, { autoAlpha: 0, duration: d(0.2) }, '<');
    }

    if (topPanel && bottomPanel) {
      exit.to(
        topPanel,
        { yPercent: -100, duration: d(0.7), ease: 'power4.inOut' },
        '-=0.15'
      ).to(
        bottomPanel,
        { yPercent: 100, duration: d(0.7), ease: 'power4.inOut' },
        '<+=0.05'
      );
    }
  }
}
