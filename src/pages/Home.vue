<template>
  <div class="layout">
    <InfiniteCanvas class="canvas" />
    <ChatSidebar class="chat" />
  </div>
</template>

<script setup lang="ts">
import ChatSidebar from '@/components/ChatSidebar.vue';
import InfiniteCanvas from '@/components/InfiniteCanvas.vue';
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
