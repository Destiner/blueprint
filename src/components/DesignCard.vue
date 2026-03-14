<template>
  <div
    class="design-card"
    :style="cardStyle"
  >
    <div class="design-card-header">
      {{ object.title }}
    </div>
    <div
      class="design-card-body"
      v-html="object.content"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { DesignObject } from '@/composables/useCanvas';

const props = defineProps<{
  object: DesignObject;
}>();

const cardStyle = computed(() => ({
  left: `${props.object.x}px`,
  top: `${props.object.y}px`,
  width: `${props.object.width}px`,
  height: `${props.object.height}px`,
  zIndex: props.object.zIndex,
}));
</script>

<style scoped>
.design-card {
  position: absolute;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 8px 8px 0 0;
  background: #fff;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
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
  padding: 8px;
}
</style>
