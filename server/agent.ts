import { unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

function buildSystemPrompt(selectedObjectId: string | null): string {
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

  return prompt;
}

function buildUserPrompt(messages: ChatMessage[]): string {
  return messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');
}

interface AgentResult {
  reply: string;
}

async function runAgent(
  canvasId: string,
  messages: ChatMessage[],
  selectedObjectId: string | null = null,
): Promise<AgentResult> {
  const systemPrompt = buildSystemPrompt(selectedObjectId);
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
        '--output-format',
        'json',
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

    const exitCode = await proc.exited;
    clearTimeout(timeout);

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();

    if (exitCode !== 0) {
      console.error('Agent stderr:', stderr);
      if (exitCode === null) {
        throw new Error('Agent timed out');
      }
      throw new Error(`Agent exited with code ${exitCode}`);
    }

    const parsed = JSON.parse(stdout) as { result: string };
    return { reply: parsed.result };
  } finally {
    try {
      unlinkSync(configPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

export { runAgent };
export type { ChatMessage };
