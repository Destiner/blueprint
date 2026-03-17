<template>
  <div
    class="inline-feedback"
    :class="{ focused, loading }"
    :style="positionStyle"
    @pointerdown.stop
    @click.stop
  >
    <textarea
      ref="inputRef"
      v-model="text"
      class="feedback-input"
      :disabled="loading"
      placeholder="Edit"
      rows="1"
      @keydown.enter.prevent="onSubmit"
      @focus="onFocus"
      @blur="onBlur"
    />
    <div
      v-if="loading"
      class="loading-line"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import useCanvas from '@/composables/useCanvas';

const props = defineProps<{
  x: number;
  y: number;
}>();

const { canvas, selectedObjectId, selectedElementSelector, fetchCanvas } =
  useCanvas();

const inputRef = ref<HTMLTextAreaElement | null>(null);
const text = ref('');
const focused = ref(false);
const loading = ref(false);

const positionStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y - 8}px`,
}));

function onFocus(): void {
  focused.value = true;
}

function onBlur(): void {
  focused.value = false;
}

async function onSubmit(): Promise<void> {
  const trimmed = text.value.trim();
  if (!trimmed || loading.value) return;

  const canvasId = canvas.value?.id;
  if (!canvasId) return;

  loading.value = true;

  try {
    const res = await fetch(`/api/canvases/${canvasId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', text: trimmed }],
        selectedObjectId: selectedObjectId.value,
        selectedElementSelector: selectedElementSelector.value,
      }),
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }

    await fetchCanvas(canvasId);
    text.value = '';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.inline-feedback {
  position: absolute;
  z-index: 9999;
  width: 100px;
  overflow: hidden;
  transform: translateY(-100%);
  transition:
    width 0.15s ease,
    border-color 0.15s ease;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
  pointer-events: auto;
}

.inline-feedback.focused,
.inline-feedback.loading {
  width: 200px;
  border-color: #c0c0c0;
}

.feedback-input {
  display: block;
  width: 100%;
  max-height: calc(1.4em * 2 + 16px);
  padding: 8px 10px;
  overflow: hidden;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.4;
  resize: none;
  field-sizing: content;
}

.feedback-input:disabled {
  opacity: 0.6;
}

.feedback-input::placeholder {
  color: #bbb;
}

.loading-line {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 2px;
  animation: slide 1.2s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    transparent,
    rgb(0 0 0 / 20%),
    transparent
  );
  background-size: 200% 100%;
}

@keyframes slide {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: -100% 0;
  }
}
</style>
