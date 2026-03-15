import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import type { Canvas, Meta } from './types';

const STORAGE_DIR = join(homedir(), '.blueprint', 'canvases');

function ensureDir(): void {
  if (!existsSync(STORAGE_DIR)) {
    mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function list(): {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}[] {
  const files = readdirSync(STORAGE_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const data = JSON.parse(
      readFileSync(join(STORAGE_DIR, f), 'utf-8'),
    ) as Canvas;
    return {
      id: data.id,
      title: data.title,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

function get(id: string): Canvas | null {
  const filePath = join(STORAGE_DIR, `${id}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Canvas;
}

function save(canvas: Canvas): void {
  writeFileSync(
    join(STORAGE_DIR, `${canvas.id}.json`),
    JSON.stringify(canvas, null, 2),
  );
}

function remove(id: string): boolean {
  const filePath = join(STORAGE_DIR, `${id}.json`);
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  return true;
}

const META_PATH = join(homedir(), '.blueprint', '_meta.json');

function getMeta(): Meta {
  if (!existsSync(META_PATH)) return { lastOpenedCanvasId: null };
  return JSON.parse(readFileSync(META_PATH, 'utf-8')) as Meta;
}

function saveMeta(meta: Meta): void {
  writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
}

export { ensureDir, get, getMeta, list, remove, save, saveMeta };
