import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { ensureDir, get, save } from './storage';
import type { DesignObject } from './types';

ensureDir();

const canvasId = process.env['CANVAS_ID'];
if (!canvasId) {
  process.exit(1);
}

const server = new McpServer({ name: 'blueprint', version: '1.0.0' });

server.tool(
  'get_canvas',
  'Get all objects currently on the canvas',
  {},
  async () => {
    const canvas = get(canvasId);
    if (!canvas) {
      return {
        content: [{ type: 'text' as const, text: 'Canvas not found' }],
        isError: true,
      };
    }

    const summary = canvas.objects.map((o) => ({
      id: o.id,
      title: o.title,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
    }));

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(summary) }],
    };
  },
);

server.tool(
  'get_object',
  'Get full details of a specific object including its HTML content',
  {
    object_id: z.string().describe('ID of the object to retrieve'),
  },
  async ({ object_id }) => {
    const canvas = get(canvasId);
    if (!canvas) {
      return {
        content: [{ type: 'text' as const, text: 'Canvas not found' }],
        isError: true,
      };
    }

    const obj = canvas.objects.find((o) => o.id === object_id);
    if (!obj) {
      return {
        content: [{ type: 'text' as const, text: 'Object not found' }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            id: obj.id,
            title: obj.title,
            content: obj.content,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
          }),
        },
      ],
    };
  },
);

server.tool(
  'create_object',
  'Create an HTML design object on the canvas',
  {
    title: z.string().describe('Title for the design object'),
    content: z.string().describe('HTML content with inline styles'),
    width: z.number().default(400).describe('Width in pixels'),
    height: z.number().default(300).describe('Height in pixels'),
    x: z.number().default(100).describe('X position on canvas'),
    y: z.number().default(100).describe('Y position on canvas'),
  },
  async ({ title, content, width, height, x, y }) => {
    const canvas = get(canvasId);
    if (!canvas) {
      return {
        content: [{ type: 'text' as const, text: 'Canvas not found' }],
        isError: true,
      };
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const zIndex = canvas.objects.length + 1;

    const obj: DesignObject = {
      id,
      title,
      content,
      x,
      y,
      width,
      height,
      zIndex,
      createdAt: now,
      updatedAt: now,
    };

    canvas.objects.push(obj);
    canvas.updatedAt = now;
    save(canvas);

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ id, title }) }],
    };
  },
);

server.tool(
  'update_object',
  'Update an existing design object on the canvas',
  {
    object_id: z.string().describe('ID of the object to update'),
    title: z.string().optional().describe('New title'),
    content: z
      .string()
      .optional()
      .describe('New HTML content with inline styles'),
    width: z.number().optional().describe('New width in pixels'),
    height: z.number().optional().describe('New height in pixels'),
    x: z.number().optional().describe('New X position'),
    y: z.number().optional().describe('New Y position'),
  },
  async ({ object_id, title, content, width, height, x, y }) => {
    const canvas = get(canvasId);
    if (!canvas) {
      return {
        content: [{ type: 'text' as const, text: 'Canvas not found' }],
        isError: true,
      };
    }

    const obj = canvas.objects.find((o) => o.id === object_id);
    if (!obj) {
      return {
        content: [{ type: 'text' as const, text: 'Object not found' }],
        isError: true,
      };
    }

    if (title !== undefined) obj.title = title;
    if (content !== undefined) obj.content = content;
    if (width !== undefined) obj.width = width;
    if (height !== undefined) obj.height = height;
    if (x !== undefined) obj.x = x;
    if (y !== undefined) obj.y = y;
    obj.updatedAt = new Date().toISOString();
    canvas.updatedAt = obj.updatedAt;
    save(canvas);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ id: object_id, title: obj.title }),
        },
      ],
    };
  },
);

server.tool(
  'delete_object',
  'Delete a design object from the canvas',
  {
    object_id: z.string().describe('ID of the object to delete'),
  },
  async ({ object_id }) => {
    const canvas = get(canvasId);
    if (!canvas) {
      return {
        content: [{ type: 'text' as const, text: 'Canvas not found' }],
        isError: true,
      };
    }

    const idx = canvas.objects.findIndex((o) => o.id === object_id);
    if (idx === -1) {
      return {
        content: [{ type: 'text' as const, text: 'Object not found' }],
        isError: true,
      };
    }

    const removed = canvas.objects.splice(idx, 1)[0]!;
    canvas.updatedAt = new Date().toISOString();
    save(canvas);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            id: object_id,
            title: removed.title,
            deleted: true,
          }),
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
