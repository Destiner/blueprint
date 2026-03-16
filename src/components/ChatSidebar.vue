<template>
  <form
    v-if="isEmpty"
    class="empty-composer"
    @submit.prevent="send"
  >
    <textarea
      v-model="input"
      class="empty-input"
      placeholder="Describe a design…"
      rows="1"
      @keydown.enter.exact.prevent="send"
    />
    <button
      class="empty-send"
      :disabled="!input.trim()"
    >
      <PhPaperPlaneTilt :size="14" />
    </button>
  </form>
  <aside
    v-else
    class="sidebar"
  >
    <div class="messages">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="message"
        :class="msg.role"
      >
        <div :class="msg.role === 'user' ? 'bubble' : 'plain'">
          {{ msg.text }}
          <button
            v-if="msg.error && i === messages.length - 1"
            class="retry-btn"
            @click="retry"
          >
            Retry
          </button>
        </div>
      </div>
      <div
        v-if="loading"
        class="message assistant"
      >
        <div class="plain loading-indicator">Thinking…</div>
      </div>
    </div>
    <form
      class="composer"
      @submit.prevent="send"
    >
      <input
        v-model="input"
        placeholder="Describe a design…"
        :disabled="loading"
      />
      <button :disabled="!input.trim() || loading">
        <PhPaperPlaneTilt :size="18" />
      </button>
    </form>
  </aside>
</template>

<script setup lang="ts">
import { PhPaperPlaneTilt } from '@phosphor-icons/vue';
import { computed, ref } from 'vue';

import useCanvas from '@/composables/useCanvas';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  error?: boolean;
}

const { canvas, selectedObjectId, selectedElementSelector, fetchCanvas } =
  useCanvas();

const messages = ref<Message[]>([]);
const input = ref('');
const loading = ref(false);
const isEmpty = computed(
  (): boolean => messages.value.length === 0 && !loading.value,
);

defineExpose({ isEmpty });

async function send(): Promise<void> {
  const text = input.value.trim();
  if (!text) return;

  const canvasId = canvas.value?.id;
  if (!canvasId) return;

  messages.value.push({ role: 'user', text });
  input.value = '';
  loading.value = true;

  try {
    const res = await fetch(`/api/canvases/${canvasId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.value.filter((m) => !m.error),
        selectedObjectId: selectedObjectId.value,
        selectedElementSelector: selectedElementSelector.value,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = (await res.json()) as { reply: string };
    messages.value.push({ role: 'assistant', text: data.reply });
    await fetchCanvas(canvasId);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Something went wrong';
    messages.value.push({
      role: 'assistant',
      text: `Error: ${errorMsg}`,
      error: true,
    });
  } finally {
    loading.value = false;
  }
}

function retry(): void {
  // Remove the last error message and resend
  while (
    messages.value.length > 0 &&
    messages.value[messages.value.length - 1]!.error
  ) {
    messages.value.pop();
  }
  if (messages.value.length === 0) return;
  let lastUserIdx = -1;
  for (let i = messages.value.length - 1; i >= 0; i--) {
    if (messages.value[i]!.role === 'user') {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx === -1) return;
  const lastUserMsg = messages.value[lastUserIdx]!.text;
  // Remove the last user message — send() will re-add it
  messages.value.splice(lastUserIdx, 1);
  input.value = lastUserMsg;
  void send();
}
</script>

<style scoped>
.empty-composer {
  display: flex;
  align-items: flex-end;
  width: 100%;
  transition: transform 0.2s ease;
  transform: scale(0.98);
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 16px rgb(0 0 0 / 10%);
}

.empty-composer:hover,
.empty-composer:focus-within {
  transform: scale(1);
}

.empty-input {
  flex: 1;
  max-height: calc(1.4em * 5 + 20px);
  padding: 10px 12px;
  border: none;
  border-radius: 14px 0 0 14px;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  resize: none;
  field-sizing: content;
}

.empty-send {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #666;
  cursor: pointer;
}

.empty-send:disabled {
  opacity: 0.3;
  cursor: default;
}

.empty-send:not(:disabled):hover {
  background: #f0f0f0;
  color: #333;
}

.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 8px 32px rgb(0 0 0 / 12%);
}

.messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
  gap: 12px;
}

.message {
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.user .bubble {
  border-bottom-right-radius: 4px;
  background: #f0f0f0;
  color: #333;
}

.plain {
  color: #333;
  font-size: 14px;
  line-height: 1.4;
}

.composer {
  display: flex;
  align-items: center;
  margin: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
}

.composer:focus-within {
  border-color: #007aff;
}

.composer input {
  flex: 1;
  padding: 10px 12px;
  border: none;
  border-radius: 12px 0 0 12px;
  outline: none;
  background: transparent;
  font-size: 14px;
}

.composer button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-right: 4px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #666;
}

.composer button:disabled {
  opacity: 0.3;
}

.composer button:not(:disabled):hover {
  background: #f0f0f0;
  color: #333;
}

.retry-btn {
  display: block;
  margin-top: 6px;
  padding: 4px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-size: 12px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #f0f0f0;
}

.loading-indicator {
  color: #999;
  font-style: italic;
}
</style>
