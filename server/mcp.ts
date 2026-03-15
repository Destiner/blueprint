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

const instructions = `Blueprint is an AI-driven design tool where you generate HTML-based designs on an infinite canvas.

## Review Checkpoints

After creating or updating a design, self-review against these criteria before responding:

- **Spacing**: Uneven gaps, cramped groups, or areas that feel unintentionally empty. Is there clear visual rhythm?
- **Typography**: Text too small to read, poor line-height, weak hierarchy between heading/body/caption.
- **Contrast**: Low contrast text, elements that blend into their background, or overly uniform color use.
- **Alignment**: Elements that should share a vertical or horizontal lane but don't. Icons or actions misaligned across repeated rows.
- **Clipping**: Content cut off at container edges. Ensure dimensions accommodate all content.
- **Repetition**: Overly grid-like sameness — vary scale, weight, or spacing to create visual interest.

## Design Quality

- **Minimalism**: Use fewer elements, highly refined visual ideas. When choosing between adding and removing, default to removal. Restraint, purpose, clarity, function.
- **Content density**: Prefer fewer, more refined elements over more content. White space is a feature, not wasted space.
- **Warmth**: Add a warm human touch to make even the most minimal design feel inviting and alive.
- **Spacing**: Vary spacing deliberately — tighter to group related elements, generous to let hero content breathe.
- **Asymmetry**: Favor layout asymmetry and scale contrast (e.g. a very large headline next to small muted text) over grid-like sameness.
- **Typography**: Invest in text hierarchy, spacing, and contrast to create impressive, timeless designs. Designs should feel like they were made by an authoritative designer with a strong point of view, not assembled from a component library.
- **Context awareness**: Consider whether the current goal is to impress with style or to present information with clarity. Portfolio design and product design have different goals.
- **Variation**: When requested to provide multiple design directions, they should be tangibly different with distinct visual personalities.
- **Surfaces over cards**: Prefer information living directly on surfaces over boxing everything in cards.
- **Avoid dated trends**: Avoid outdated design trends from the late 2010s like excessive gradients and shadows. If requested, apply tastefully — elements should not compete with each other.

## Before Creating New Designs

Before writing any HTML, generate a short design brief:
- Color palette (5–6 hex values with roles)
- Type choices (font, weight, and size scale)
- Spacing rhythm (section, group, and element gaps)
- One sentence describing the visual direction

## Open-Ended Prompts

When the prompt is vague and open-ended, the user is likely evaluating capabilities. Aim to create an impressive design that captures their imagination. Keep scope limited during the initial phase so the user doesn't wait too long. Think: what is a simple, single deliverable that can be executed exceptionally well?

## Placeholder Content

- Use realistic placeholder content for text and images.
- If including placeholder content related to design software, use Blueprint as the example.

## Workflow

1. Call get_canvas first to understand the current state.
2. Call get_design_guide("visual-design") before creating your first design.
3. After creating or updating designs, self-review using the Review Checkpoints above.
4. Respond briefly describing what you did.`;

const server = new McpServer(
  { name: 'blueprint', version: '1.0.0' },
  { instructions },
);

server.tool(
  'get_canvas',
  'Get all objects currently on the canvas. Call this first to understand canvas state before making any changes.',
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
  'Get full details of a specific object including its HTML content. Call this before updating an object to understand its current state.',
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
  `Create an HTML design object on the canvas.

HTML/CSS rules:
- Always use inline styles (style="...")
- All Google Fonts are available — use @import url('https://fonts.googleapis.com/css2?family=...') in a <style> tag at the top of content
- All CSS color formats supported: hex, rgb, rgba, hsl, hsla, oklch, oklab
- Use display: flex as the primary layout mode. Flexbox, padding, and gap are the core layout tools.
- display: grid is also supported for grid layouts
- Absolute positioning supported for decorative elements
- Assume border-box sizing for all elements
- Use <pre> or white-space: pre for code blocks
- No emojis as icons — use inline SVG icons or omit
- Use semantic HTML with accessible markup
- Use realistic placeholder content
- The root element of your HTML fills the entire object container. Make it a full-size wrapper (e.g. a div with display:flex, appropriate alignment, and background color) so the design fills the object without gaps. Always set an opaque background color on the root element — default to white (#ffffff) or an appropriate light neutral for the design. Never use transparent or semi-transparent backgrounds on the root element (e.g. no rgba overlays for modal backdrops). Designs live on canvas cards, not full screens.`,
  {
    title: z.string().describe('Title for the design object'),
    content: z
      .string()
      .describe(
        'Self-contained HTML with inline styles. Include Google Fonts @import in a <style> tag if using custom fonts.',
      ),
    width: z
      .number()
      .default(800)
      .describe(
        'Width in pixels. Defaults: desktop 800, mobile 390, tablet 768, small component 400',
      ),
    height: z
      .number()
      .default(600)
      .describe(
        'Height in pixels. Defaults: desktop 600, mobile 844, tablet 1024, small component 300',
      ),
    x: z
      .number()
      .default(100)
      .describe(
        'X position on canvas. Leave 80px spacing between objects. Check existing positions via get_canvas to avoid overlaps.',
      ),
    y: z
      .number()
      .default(100)
      .describe(
        'Y position on canvas. Place variations horizontally in rows at similar Y values.',
      ),
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
  'Update an existing design object on the canvas. Call get_object first to understand its current state, then make targeted changes.',
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
  'Delete a design object from the canvas. Use only when the user explicitly requests removal.',
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

const designGuides: Record<string, string> = {
  'visual-design': `## Typography
- Use expressive, punchy typography inspired by Swiss editorial print as the base for visual hierarchy and contrast.
- Maximize contrast between display and label weights — pair heavy display type with light or regular labels.
- Use slightly tighter tracking on large type and no or open tracking on small caps and very small labels.
- Default to light mode color schemes unless otherwise requested.

## Color
- Color should be used deliberately. One intense, beautiful color moment is stronger than five.
- Prefer classy, timeless color palettes over generic palettes that read as "app-y" or associated with temporary trends.
- Timelessness test: if the accent color could plausibly appear in a physical artifact — a poster, a book cover, a piece of clothing, an interior, a street sign — it's probably timeless. If it only exists on screens, be skeptical.
- Build palettes from neutrals first — an off-white, a near-black, one or two muted mid-tones, either slightly cool or slightly warm. The palette should feel complete before any accent is introduced.
- Avoid bright accents such as purple or lime paired with dark navy backgrounds — that's the default "modern SaaS" vibe, 2019–2024.
- Default body text color should never be pure black or pure gray. Calibrate it to the palette's warmth or coolness.

## Contrast and Legibility
- Text contrast is non-negotiable. Reduced opacity and muted text colors are useful tools for hierarchy but should be used sparingly.
- Always ask: can this be read at a glance, without squinting?
- Pay extra attention to small text below 16px — use higher contrast when in doubt.
- Style and legibility should never be in conflict.
- Avoid tiny text (12px or smaller) unless absolutely necessary. Acceptable only for high-density productivity interfaces or all-caps stylistic effects.

## Vertical Lane Alignment
When building repeated rows (lists, tables, nav items), elements must form consistent vertical lanes. Use fixed-width slots (with width and flex-shrink: 0) for icons, indicators, and actions — even when a slot is empty in some rows. Never rely on gap alone to align columns across rows with varying content.

## Typographic Units
- Font sizes: use px units.
- Letter spacing: use em units.
- Line height: use px units. Relative units are acceptable if they don't result in subpixel sizes.`,

  'html-css': `## HTML and CSS Rules
- Always use inline styles (style="...")
- All Google Fonts are available — add @import url('https://fonts.googleapis.com/css2?family=Font+Name:wght@400;700&display=swap') in a <style> tag at the top of your HTML content
- All CSS color formats supported: hex, rgb, rgba, hsl, hsla, oklch, oklab
- Use display: flex as the primary layout mode. Flexbox, padding, and gap are the core layout tools.
- display: grid is supported for grid-based layouts (e.g. image galleries, dashboard grids)
- Absolute positioning supported for decorative elements or dramatic layout breaks
- Assume border-box sizing for all elements
- Use <pre> or white-space: pre for code blocks (whitespace preserved)
- No emojis as icons — use inline SVG icons or omit
- Use semantic HTML elements (<header>, <nav>, <main>, <section>, <article>, <footer>) for document structure
- Use appropriate heading levels (h1–h6) for content hierarchy
- Include alt attributes on images for accessibility
- Use realistic placeholder content — not lorem ipsum
- The root element fills the entire object container automatically. Structure your HTML with a single root wrapper (e.g. a div with display:flex, flex-direction:column, background color, and padding) so the design fills the full object area. Center content within this wrapper as needed.
- Always set an opaque background color on the root element. Default to white (#ffffff) or an appropriate light neutral. The canvas behind the object is gray, so an unset or semi-transparent background will look broken.
- Designs live on canvas cards, not full screens. Do not simulate full-screen overlays (e.g. semi-transparent modal backdrops). Instead, design the component itself directly — for modals, show just the dialog box with its content.`,

  'canvas-layout': `## Device Sizing Defaults
| Device    | Width | Height |
|-----------|-------|--------|
| Desktop   | 800   | 600    |
| Mobile    | 390   | 844    |
| Tablet    | 768   | 1024   |
| Small     | 400   | 300    |

## Placement Strategy
- Leave 80px spacing between objects on the canvas to keep designs visually separated.
- Place design variations horizontally in rows at similar Y values for easy comparison.
- Before placing a new object, check existing positions via get_canvas to avoid overlaps.
- For a series of related designs, start at y=100 and increment x by (object width + 80) for each variation.`,
};

server.tool(
  'get_design_guide',
  'Get detailed design guidance by topic. Available topics: "visual-design" (typography, color, contrast, alignment), "html-css" (HTML/CSS rules and patterns), "canvas-layout" (sizing defaults and placement strategy). Call get_design_guide("visual-design") before creating your first design.',
  {
    topic: z
      .enum(['visual-design', 'html-css', 'canvas-layout'])
      .describe('The guide topic to retrieve'),
  },
  async ({ topic }) => {
    const guide = designGuides[topic];
    if (!guide) {
      return {
        content: [{ type: 'text' as const, text: `Unknown topic: ${topic}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text' as const, text: guide }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
