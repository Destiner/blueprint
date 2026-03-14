import { ref, watch } from 'vue';
import type { Ref } from 'vue';

interface DesignObject {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface Canvas {
  id: string;
  title: string;
  objects: DesignObject[];
  camera: Camera;
  createdAt: string;
  updatedAt: string;
}

const canvas: Ref<Canvas | null> = ref(null);

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    void saveCanvas();
  }, 500);
}

watch(
  canvas,
  () => {
    if (canvas.value) {
      debouncedSave();
    }
  },
  { deep: true },
);

async function setLastOpened(id: string): Promise<void> {
  await fetch('/api/meta', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastOpenedCanvasId: id }),
  });
}

async function getLastOpenedId(): Promise<string | null> {
  const res = await fetch('/api/meta');
  const meta = (await res.json()) as { lastOpenedCanvasId: string | null };
  return meta.lastOpenedCanvasId;
}

async function createCanvas(title: string): Promise<Canvas> {
  const res = await fetch('/api/canvases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  const data = (await res.json()) as Canvas;
  canvas.value = data;
  await setLastOpened(data.id);
  return data;
}

async function fetchCanvas(id: string): Promise<Canvas | null> {
  const res = await fetch(`/api/canvases/${id}`);
  if (!res.ok) return null;
  const data = (await res.json()) as Canvas;
  canvas.value = data;
  await setLastOpened(data.id);
  return data;
}

async function saveCanvas(): Promise<void> {
  if (!canvas.value) return;
  await fetch(`/api/canvases/${canvas.value.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(canvas.value),
  });
}

function addObject(
  data: Omit<DesignObject, 'id' | 'createdAt' | 'updatedAt'>,
): void {
  if (!canvas.value) return;
  const now = new Date().toISOString();
  canvas.value.objects.push({
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  });
}

function updateObject(
  id: string,
  data: Partial<Omit<DesignObject, 'id' | 'createdAt'>>,
): void {
  if (!canvas.value) return;
  const obj = canvas.value.objects.find((o) => o.id === id);
  if (!obj) return;
  Object.assign(obj, { ...data, updatedAt: new Date().toISOString() });
}

function removeObject(id: string): void {
  if (!canvas.value) return;
  canvas.value.objects = canvas.value.objects.filter((o) => o.id !== id);
}

function updateCamera(camera_: Camera): void {
  if (!canvas.value) return;
  canvas.value.camera = camera_;
}

function useCanvas(): {
  canvas: Ref<Canvas | null>;
  createCanvas: (title: string) => Promise<Canvas>;
  fetchCanvas: (id: string) => Promise<Canvas | null>;
  getLastOpenedId: () => Promise<string | null>;
  saveCanvas: () => Promise<void>;
  addObject: (
    data: Omit<DesignObject, 'id' | 'createdAt' | 'updatedAt'>,
  ) => void;
  updateObject: (
    id: string,
    data: Partial<Omit<DesignObject, 'id' | 'createdAt'>>,
  ) => void;
  removeObject: (id: string) => void;
  updateCamera: (camera: Camera) => void;
} {
  return {
    canvas,
    createCanvas,
    fetchCanvas,
    getLastOpenedId,
    saveCanvas,
    addObject,
    updateObject,
    removeObject,
    updateCamera,
  };
}

export default useCanvas;

export type { Camera, Canvas, DesignObject };
