<template>
  <div
    class="design-card"
    :class="{ selected, dragging }"
    :style="cardStyle"
    @pointerdown.stop="onCardPointerDown"
  >
    <div class="design-card-header">
      {{ object.title }}
    </div>
    <div
      class="design-card-body"
      v-html="object.content"
    ></div>
    <template v-if="selected">
      <div
        v-for="dir in resizeDirections"
        :key="dir"
        class="resize-handle"
        :class="`handle-${dir}`"
        @pointerdown.stop="(e: PointerEvent) => onResizeDown(e, dir)"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { DesignObject } from '@/composables/useCanvas';

type ResizeDirection = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const props = defineProps<{
  object: DesignObject;
  selected: boolean;
  zoom: number;
}>();

const emit = defineEmits<{
  select: [];
  move: [dx: number, dy: number];
  resize: [dw: number, dh: number, dx: number, dy: number];
}>();

const resizeDirections: ResizeDirection[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

const dragging = ref(false);
const resizing = ref(false);
const resizeDir = ref<ResizeDirection>('se');
const lastX = ref(0);
const lastY = ref(0);

const cardStyle = computed(() => ({
  left: `${props.object.x}px`,
  top: `${props.object.y}px`,
  width: `${props.object.width}px`,
  height: `${props.object.height}px`,
  zIndex: props.object.zIndex,
}));

function onCardPointerDown(e: PointerEvent): void {
  emit('select');
  dragging.value = true;
  lastX.value = e.clientX;
  lastY.value = e.clientY;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
}

function onResizeDown(e: PointerEvent, direction: ResizeDirection): void {
  resizing.value = true;
  resizeDir.value = direction;
  lastX.value = e.clientX;
  lastY.value = e.clientY;
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
}

function onPointerMove(e: PointerEvent): void {
  const dx = (e.clientX - lastX.value) / props.zoom;
  const dy = (e.clientY - lastY.value) / props.zoom;
  lastX.value = e.clientX;
  lastY.value = e.clientY;

  if (dragging.value) {
    emit('move', dx, dy);
  } else if (resizing.value) {
    const dir = resizeDir.value;
    let dw = 0;
    let dh = 0;
    let mx = 0;
    let my = 0;

    if (dir.includes('e')) dw = dx;
    if (dir.includes('w')) {
      dw = -dx;
      mx = dx;
    }
    if (dir.includes('s')) dh = dy;
    if (dir.includes('n')) {
      dh = -dy;
      my = dy;
    }

    emit('resize', dw, dh, mx, my);
  }
}

function onPointerUp(): void {
  dragging.value = false;
  resizing.value = false;
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('pointerup', onPointerUp);
}
</script>

<style scoped>
.design-card {
  display: flex;
  position: absolute;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 8px 8px 0 0;
  background: #fff;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
  user-select: none;
}

.design-card.selected {
  border-color: #007aff;
  box-shadow: 0 0 0 2px #007aff;
}

.design-card.dragging {
  cursor: grabbing;
}

.design-card-header {
  padding: 6px 10px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  color: #666;
  font-size: 11px;
  font-weight: 500;
}

.design-card-body {
  flex: 1;
  background: #fff;
  overflow: hidden;
}

.design-card-body :deep(> *:first-child) {
  width: 100%;
  height: 100%;
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  border: 1px solid #007aff;
  background: #fff;
}

.handle-nw {
  top: -4px;
  left: -4px;
  cursor: nwse-resize;
}

.handle-n {
  top: -4px;
  left: calc(50% - 4px);
  cursor: ns-resize;
}

.handle-ne {
  top: -4px;
  right: -4px;
  cursor: nesw-resize;
}

.handle-e {
  top: calc(50% - 4px);
  right: -4px;
  cursor: ew-resize;
}

.handle-se {
  right: -4px;
  bottom: -4px;
  cursor: nwse-resize;
}

.handle-s {
  bottom: -4px;
  left: calc(50% - 4px);
  cursor: ns-resize;
}

.handle-sw {
  bottom: -4px;
  left: -4px;
  cursor: nesw-resize;
}

.handle-w {
  top: calc(50% - 4px);
  left: -4px;
  cursor: ew-resize;
}
</style>
