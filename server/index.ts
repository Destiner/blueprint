import { ensureDir, get, getMeta, list, remove, save, saveMeta } from './storage';
import type { Canvas, Meta } from './types';

ensureDir();

const PORT = process.env['PORT'] || 39485;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;
    const method = req.method;

    try {
      if (pathname === '/api/meta' && method === 'GET') {
        return json(getMeta());
      }

      if (pathname === '/api/meta' && method === 'PUT') {
        const body = (await req.json()) as Partial<Meta>;
        const meta = { ...getMeta(), ...body };
        saveMeta(meta);
        return json(meta);
      }

      if (pathname === '/api/canvases' && method === 'GET') {
        return json(list());
      }

      if (pathname === '/api/canvases' && method === 'POST') {
        const body = (await req.json()) as { title?: string };
        const now = new Date().toISOString();
        const canvas: Canvas = {
          id: crypto.randomUUID(),
          title: body.title || 'Untitled',
          objects: [],
          camera: { x: 0, y: 0, zoom: 1 },
          createdAt: now,
          updatedAt: now,
        };
        save(canvas);
        return json(canvas, 201);
      }

      const match = pathname.match(/^\/api\/canvases\/([^/]+)$/);
      if (match) {
        const id = match[1]!;

        if (method === 'GET') {
          const canvas = get(id);
          if (!canvas) return json({ error: 'Not found' }, 404);
          return json(canvas);
        }

        if (method === 'PUT') {
          const existing = get(id);
          if (!existing) return json({ error: 'Not found' }, 404);
          const body = (await req.json()) as Partial<Canvas>;
          const updated: Canvas = {
            ...existing,
            ...body,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString(),
          };
          save(updated);
          return json(updated);
        }

        if (method === 'DELETE') {
          const removed = remove(id);
          if (!removed) return json({ error: 'Not found' }, 404);
          return new Response(null, { status: 204 });
        }
      }

      return json({ error: 'Not found' }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: 'Internal server error' }, 500);
    }
  },
});

console.log(`Server running on port ${PORT}`);
