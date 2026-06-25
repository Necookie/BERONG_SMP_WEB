import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const res = await fetch('https://api.mcsrvstat.us/2/berongsmpdev.mcsh.io');
    if (!res.ok) {
      return new Response(JSON.stringify({ online: false, players: { online: 0, max: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }

    const data = await res.json() as any;
    const online = !!data.online;
    const players = {
      online: data.players?.online ?? 0,
      max: data.players?.max ?? 0
    };

    return new Response(JSON.stringify({ online, players }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  } catch (err) {
    console.error('Error pinging Minecraft server:', err);
    return new Response(JSON.stringify({ online: false, players: { online: 0, max: 0 } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
    });
  }
};
