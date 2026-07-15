# BERONG SMP — Landing Page User Guide

This covers using the **public landing page** to get set up and join the
BerongSMP server. For instructor/admin use of the analytics dashboard, see
[`adminmanual.md`](adminmanual.md).

## What you'll find on the landing page

- A live **server status badge** (online/offline + player count), always
  visible near the top.
- The server address, shown in a copy-to-clipboard widget in the hero
  section, the footer, and the setup instructions.
- A **"How to Join the Server"** section walking through installation in
  three steps.
- A **Download Installer** button.

## Getting set up

1. Scroll to **"How to Join the Server."**
2. **Step 01 — Download Installer:** make sure Minecraft Java Edition is
   already installed and you've opened the launcher at least once, then click
   **Download Installer** and save the zip it gives you.
3. **Step 02 — Run the Installer:** extract the zip and double-click
   `Install-BerongSMP.exe` inside. Windows will likely show a blue "protected
   your PC" warning first — this is expected for a small installer like this;
   click **More info** → **Run anyway**. The installer handles the rest on
   its own.
4. **Step 03 — Launch & Connect:** open the Minecraft Launcher, pick the
   NeoForge profile the installer created, click Play, then go to
   **Multiplayer → Add Server** and paste the address shown on the page (use
   the copy button next to it rather than retyping).

The full step-by-step (including troubleshooting) lives in the mod project's
own player manual — see `usermanual.md` in the
`berongsmp-template-26.1.2` repo, which the installer itself also links back
to if anything goes wrong.

## Checking if the server is up before you try to join

The status badge at the top of the page updates automatically — if it shows
offline, the server may be restarting or between maintenance windows; no
need to try installing/joining until it flips back to online.

## After installing

You don't need the landing page again once you're set up — from here on,
everything happens inside Minecraft itself (registering an account with
`/register`, logging back in later with `/login`, and playing through the
Academy tutorial and the live simulation). See the mod repo's
`usermanual.md` for that walkthrough.
