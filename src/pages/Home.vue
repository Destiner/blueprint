<template>
  <div class="layout">
    <InfiniteCanvas
      class="canvas"
      :initial-camera="canvas?.camera"
      @camera-change="onCameraChange"
      @deselect="onDeselect"
    >
      <DesignCard
        v-for="obj in canvas?.objects ?? []"
        :key="obj.id"
        :object="obj"
        :selected="selectedObjectId === obj.id"
        :selected-element-selector="
          selectedObjectId === obj.id ? selectedElementSelector : null
        "
        :zoom="currentZoom"
        @select="() => selectObject(obj.id)"
        @select-element="selectElement"
        @move="(dx, dy) => onMoveObject(obj.id, dx, dy)"
        @resize="(dw, dh, dx, dy) => onResizeObject(obj.id, dw, dh, dx, dy)"
      />
    </InfiniteCanvas>
    <ChatSidebar class="chat" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

import ChatSidebar from '@/components/ChatSidebar.vue';
import DesignCard from '@/components/DesignCard.vue';
import InfiniteCanvas from '@/components/InfiniteCanvas.vue';
import useCanvas from '@/composables/useCanvas';
import type { Camera } from '@/composables/useCanvas';

const {
  canvas,
  selectedObjectId,
  selectedElementSelector,
  createCanvas,
  fetchCanvas,
  getLastOpenedId,
  selectObject,
  selectElement,
  deleteSelectedObject,
  updateObject,
  updateCamera,
} = useCanvas();

const currentZoom = ref(1);

function onDeselect(): void {
  selectElement(null);
  selectObject(null);
}

function onCameraChange(camera: Camera): void {
  currentZoom.value = camera.zoom;
  updateCamera(camera);
}

function onMoveObject(id: string, dx: number, dy: number): void {
  const obj = canvas.value?.objects.find((o) => o.id === id);
  if (!obj) return;
  updateObject(id, { x: obj.x + dx, y: obj.y + dy });
}

function onResizeObject(
  id: string,
  dw: number,
  dh: number,
  dx: number,
  dy: number,
): void {
  const obj = canvas.value?.objects.find((o) => o.id === id);
  if (!obj) return;
  const newWidth = Math.max(obj.width + dw, 100);
  const newHeight = Math.max(obj.height + dh, 60);
  const actualDw = newWidth - obj.width;
  const actualDh = newHeight - obj.height;
  updateObject(id, {
    width: newWidth,
    height: newHeight,
    x: obj.x + (actualDw === 0 ? 0 : dx),
    y: obj.y + (actualDh === 0 ? 0 : dy),
  });
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if (selectedElementSelector.value) {
      selectElement(null);
    } else if (selectedObjectId.value) {
      selectObject(null);
    }
    return;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    deleteSelectedObject();
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onKeyDown);
  const lastId = await getLastOpenedId();
  if (lastId) {
    const existing = await fetchCanvas(lastId);
    if (existing) return;
  }
  await createCanvas('Untitled');
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<style scoped>
.layout {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.canvas {
  width: 100%;
  height: 100%;
}

.chat {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 360px;
  height: calc(100% - 32px);
}
</style>
