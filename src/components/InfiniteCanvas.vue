<template>
  <div
    ref="viewport"
    class="canvas-viewport"
  >
    <div
      class="canvas-world"
      :style="worldStyle"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

const viewport = ref<HTMLElement | null>(null);

const camera = reactive({ x: 0, y: 0, zoom: 1 });

const worldStyle = computed(() => ({
  transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
  transformOrigin: '0 0',
}));

function onWheel(e: WheelEvent): void {
  e.preventDefault();

  if (e.ctrlKey) {
    const rect = viewport.value!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomDelta = -e.deltaY * 0.01;
    const newZoom = Math.min(Math.max(camera.zoom * (1 + zoomDelta), 0.1), 5);

    camera.x = mouseX - ((mouseX - camera.x) / camera.zoom) * newZoom;
    camera.y = mouseY - ((mouseY - camera.y) / camera.zoom) * newZoom;
    camera.zoom = newZoom;
  } else {
    camera.x -= e.deltaX;
    camera.y -= e.deltaY;
  }
}

onMounted(() => {
  viewport.value!.addEventListener('wheel', onWheel, { passive: false });
});

onUnmounted(() => {
  viewport.value?.removeEventListener('wheel', onWheel);
});
</script>

<style scoped>
.canvas-viewport {
  position: relative;
  overflow: hidden;
  background-color: #f2f3f5;
  background-image: radial-gradient(circle, #c0c8d4 1px, transparent 1px);
  background-size: 20px 20px;
}

.canvas-world {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}
</style>
