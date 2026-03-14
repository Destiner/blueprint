<template>
  <aside class="sidebar">
    <div class="messages">
      <div
        v-for="(msg, i) in messages"
        :key="i"
        class="message"
        :class="msg.role"
      >
        <div :class="msg.role === 'user' ? 'bubble' : 'plain'">
          {{ msg.text }}
        </div>
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
import { ref } from 'vue';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const messages = ref<Message[]>([]);
const input = ref('');
const loading = ref(false);

const MOCK_RESPONSES = [
  "Here's a hero section with a large heading and a call-to-action button.",
  "I've created a card grid layout with three feature cards.",
  'Done! Added a navigation bar with logo and links.',
  "I've updated the design with a footer section.",
  "Here's a testimonial carousel layout.",
];

function mockResponse(): string {
  const index = Math.floor(Math.random() * MOCK_RESPONSES.length);
  return MOCK_RESPONSES[index]!;
}

async function send(): Promise<void> {
  const text = input.value.trim();
  if (!text) return;

  messages.value.push({ role: 'user', text });
  input.value = '';
  loading.value = true;

  await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

  messages.value.push({ role: 'assistant', text: mockResponse() });
  loading.value = false;
}
</script>

<style scoped>
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
</style>
