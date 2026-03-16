import { unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

interface ToolCallEvent {
  type: 'tool_call';
  name: string;
  input: Record<string, unknown>;
}

interface ResultEvent {
  type: 'result';
  reply: string;
}

interface ErrorEvent {
  type: 'error';
  message: string;
}

type AgentEvent = ToolCallEvent | ResultEvent | ErrorEvent;

function buildSystemPrompt(
  selectedObjectId: string | null,
  selectedElementSelector: string | null,
): string {
  let prompt = `You are a talented design assistant for Blueprint, a visual design tool with an infinite canvas.

## Workflow
1. Call get_canvas first to understand the current state.
2. Call get_design_guide("visual-design") before creating your first design.
3. Use get_design_guide("html-css") or get_design_guide("canvas-layout") as needed.

## Available Actions
- get_canvas — view all objects on the canvas
- get_object — retrieve full HTML content of a specific object
- create_object — add a new design to the canvas
- update_object — modify an existing design
- delete_object — remove a design
- get_design_guide — get detailed design guidance by topic

Respond briefly describing what you did.`;

  if (selectedObjectId) {
    prompt += `\n\nThe user currently has object "${selectedObjectId}" selected. When they say "this", "it", "the selected one", etc., they are referring to this object.`;
  }

  if (selectedObjectId && selectedElementSelector) {
    prompt += `\n\nThe user has selected a specific element inside object "${selectedObjectId}".
CSS selector (relative to the object's root HTML element): ${selectedElementSelector}
When the user says "this", "this element", etc., they mean the element at this selector.
Use get_object to retrieve the HTML, locate the element matching the selector, and modify only that element.`;
  }

  return prompt;
}

function buildUserPrompt(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');
}

async function* runAgentStream(
  canvasId: string,
  messages: ChatMessage[],
  selectedObjectId: string | null = null,
  selectedElementSelector: string | null = null,
): AsyncGenerator<AgentEvent> {
  const systemPrompt = buildSystemPrompt(
    selectedObjectId,
    selectedElementSelector,
  );
  const userPrompt = buildUserPrompt(messages);

  const configId = crypto.randomUUID();
  const configPath = join(tmpdir(), `blueprint-mcp-${configId}.json`);

  const mcpConfig = {
    mcpServers: {
      blueprint: {
        type: 'stdio',
        command: 'bun',
        args: ['run', join(import.meta.dir, 'mcp.ts')],
        env: { CANVAS_ID: canvasId },
      },
    },
  };

  writeFileSync(configPath, JSON.stringify(mcpConfig));

  const TIMEOUT_MS = 120_000;

  try {
    const proc = Bun.spawn(
      [
        'claude',
        '-p',
        '--verbose',
        '--output-format',
        'stream-json',
        '--mcp-config',
        configPath,
        '--allowedTools',
        'mcp__blueprint__get_canvas,mcp__blueprint__get_object,mcp__blueprint__create_object,mcp__blueprint__update_object,mcp__blueprint__delete_object,mcp__blueprint__get_design_guide',
        '--system-prompt',
        systemPrompt,
        userPrompt,
      ],
      { stdout: 'pipe', stderr: 'pipe' },
    );

    const timeout = setTimeout(() => {
      proc.kill();
    }, TIMEOUT_MS);

    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let resultText = '';
    const seenToolIds = new Set<string>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
          continue;
        }

        if (event.type === 'assistant') {
          const message = event.message as {
            content?: Array<{
              type: string;
              id?: string;
              name?: string;
              input?: Record<string, unknown>;
            }>;
          } | null;
          if (message?.content) {
            for (const block of message.content) {
              if (block.type === 'tool_use' && block.name && block.id) {
                if (seenToolIds.has(block.id)) continue;
                seenToolIds.add(block.id);
                yield {
                  type: 'tool_call',
                  name: block.name,
                  input: block.input || {},
                };
              }
            }
          }
        } else if (event.type === 'result') {
          resultText = (event.result as string) || '';
        }
      }
    }

    if (buffer.trim()) {
      try {
        const event = JSON.parse(buffer.trim()) as Record<string, unknown>;
        if (event.type === 'result') {
          resultText = (event.result as string) || '';
        }
      } catch {
        // ignore
      }
    }

    clearTimeout(timeout);

    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      console.error('Agent stderr:', stderr);
      if (exitCode === null) {
        yield { type: 'error', message: 'Agent timed out' };
        return;
      }
      yield { type: 'error', message: `Agent exited with code ${exitCode}` };
      return;
    }

    yield { type: 'result', reply: resultText };
  } finally {
    try {
      unlinkSync(configPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

export { runAgentStream };
export type { AgentEvent, ChatMessage };
