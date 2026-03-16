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
    <div class="header">
      <span class="header-title">Chat</span>
      <button
        class="header-btn"
        @click="resetChat"
      >
        <PhPlus :size="16" />
      </button>
    </div>
    <div class="messages">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="message"
        :class="msg.role"
      >
        <template v-if="msg.role === 'user'">
          <div class="bubble">
            {{ msg.text }}
          </div>
        </template>
        <template v-else>
          <div
            v-for="(seg, j) in msg.segments"
            :key="j"
          >
            <div
              v-if="seg.type === 'text'"
              class="plain"
            >
              {{ seg.content }}
              <button
                v-if="msg.error && i === messages.length - 1"
                class="retry-btn"
                @click="retry"
              >
                Retry
              </button>
            </div>
            <div
              v-else-if="seg.type === 'toolCalls'"
              class="tool-calls-wrapper"
            >
              <div
                v-for="(call, k) in seg.calls"
                :key="k"
                class="tool-call"
              >
                <strong>{{ call.label }}</strong>
                {{ call.detail ? ` ${call.detail}` : '' }}
              </div>
            </div>
          </div>
        </template>
      </div>
      <div
        v-if="loading"
        class="message assistant"
      >
        <div
          v-if="pendingToolCalls.length > 0"
          class="tool-calls-wrapper"
        >
          <div
            v-for="(call, k) in pendingToolCalls"
            :key="k"
            class="tool-call"
          >
            <strong>{{ call.label }}</strong>
            {{ call.detail ? ` ${call.detail}` : '' }}
          </div>
        </div>
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
import { PhPaperPlaneTilt, PhPlus } from '@phosphor-icons/vue';
import { computed, ref } from 'vue';

import useCanvas from '@/composables/useCanvas';
import { describeToolCall } from '@/utils/toolCalls';

interface ToolCall {
  label: string;
  detail: string;
  name: string;
}

interface TextSegment {
  type: 'text';
  content: string;
}

interface ToolCallsSegment {
  type: 'toolCalls';
  calls: ToolCall[];
}

type MessageSegment = TextSegment | ToolCallsSegment;

interface UserMessage {
  role: 'user';
  text: string;
  segments?: never;
  error?: never;
}

interface AssistantMessage {
  role: 'assistant';
  text?: never;
  segments: MessageSegment[];
  error?: boolean;
}

type Message = UserMessage | AssistantMessage;

const emit = defineEmits<{
  'new-chat': [];
}>();

const { canvas, selectedObjectId, selectedElementSelector, fetchCanvas } =
  useCanvas();

const messages = ref<Message[]>([]);
const input = ref('');
const loading = ref(false);
const chatActive = ref(false);
const pendingToolCalls = ref<ToolCall[]>([]);
const isEmpty = computed(
  (): boolean =>
    messages.value.length === 0 && !loading.value && !chatActive.value,
);

defineExpose({ isEmpty });

function resetChat(): void {
  messages.value = [];
  input.value = '';
  loading.value = false;
  pendingToolCalls.value = [];
  emit('new-chat');
}

function messagesForApi(): Array<{ role: string; text: string }> {
  return messages.value
    .filter((m) => {
      if (m.role === 'assistant' && m.error) return false;
      return true;
    })
    .map((m) => {
      if (m.role === 'user') {
        return { role: 'user', text: m.text };
      }
      const textParts = m.segments
        .filter((s): s is TextSegment => s.type === 'text')
        .map((s) => s.content);
      return { role: 'assistant', text: textParts.join('\n') };
    });
}

async function send(): Promise<void> {
  const text = input.value.trim();
  if (!text) return;

  chatActive.value = true;

  const canvasId = canvas.value?.id;
  if (!canvasId) return;

  messages.value.push({ role: 'user', text });
  input.value = '';
  loading.value = true;
  pendingToolCalls.value = [];

  try {
    const res = await fetch(`/api/canvases/${canvasId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messagesForApi(),
        selectedObjectId: selectedObjectId.value,
        selectedElementSelector: selectedElementSelector.value,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    const toolCalls: ToolCall[] = [];
    let replyText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const dataLine = part.trim();
        if (!dataLine.startsWith('data: ')) continue;
        const json = dataLine.slice(6);

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(json) as Record<string, unknown>;
        } catch {
          continue;
        }

        if (event.type === 'tool_call') {
          const name = event.name as string;
          if (
            name === 'ToolSearch' ||
            name === 'mcp__blueprint__get_design_guide'
          )
            continue;
          const params = (event.input as Record<string, unknown>) || {};
          const desc = describeToolCall(name, params);
          const call: ToolCall = { ...desc, name };
          toolCalls.push(call);
          pendingToolCalls.value = [...toolCalls];
        } else if (event.type === 'result') {
          replyText = event.reply as string;
        } else if (event.type === 'error') {
          throw new Error(event.message as string);
        }
      }
    }

    const segments: MessageSegment[] = [];

    if (toolCalls.length > 0) {
      segments.push({
        type: 'toolCalls',
        calls: toolCalls,
      });
    }

    if (replyText) {
      segments.push({ type: 'text', content: replyText });
    }

    if (segments.length === 0) {
      segments.push({ type: 'text', content: 'Done.' });
    }

    messages.value.push({ role: 'assistant', segments });
    await fetchCanvas(canvasId);
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Something went wrong';
    messages.value.push({
      role: 'assistant',
      segments: [{ type: 'text', content: `Error: ${errorMsg}` }],
      error: true,
    });
  } finally {
    loading.value = false;
    pendingToolCalls.value = [];
  }
}

function retry(): void {
  while (
    messages.value.length > 0 &&
    messages.value[messages.value.length - 1]!.role === 'assistant' &&
    (messages.value[messages.value.length - 1] as AssistantMessage).error
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
  const lastUserMsg = (messages.value[lastUserIdx] as UserMessage).text;
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
  transform: scale(0.98);
  transition: transform 0.2s ease;
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

.header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.header-title {
  color: #999;
  font-size: 13px;
  font-weight: 500;
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #666;
  cursor: pointer;
}

.header-btn:hover {
  background: #f0f0f0;
  color: #333;
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
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 4px;
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

.tool-calls-wrapper {
  margin: 4px 0;
}

.tool-call {
  padding: 1px 0;
  color: #9a9a9a;
  font-size: 12px;
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
