<template>
  <div class="layout">
    <InfiniteCanvas
      class="canvas"
      :initial-camera="canvas?.camera"
      @camera-change="onCameraChange"
    >
      <DesignCard
        v-for="obj in canvas?.objects ?? []"
        :key="obj.id"
        :object="obj"
      />
    </InfiniteCanvas>
    <ChatSidebar class="chat" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import ChatSidebar from '@/components/ChatSidebar.vue';
import DesignCard from '@/components/DesignCard.vue';
import InfiniteCanvas from '@/components/InfiniteCanvas.vue';
import useCanvas from '@/composables/useCanvas';
import type { Camera } from '@/composables/useCanvas';

const { canvas, createCanvas, fetchCanvas, getLastOpenedId, updateCamera } =
  useCanvas();

function onCameraChange(camera: Camera): void {
  updateCamera(camera);
}

onMounted(async () => {
  const lastId = await getLastOpenedId();
  if (lastId) {
    const existing = await fetchCanvas(lastId);
    if (existing) return;
  }
  await createCanvas('Untitled');
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
