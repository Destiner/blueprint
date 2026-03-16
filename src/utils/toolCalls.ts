function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '\u2026' : str;
}

interface ToolCallDescription {
  label: string;
  detail: string;
}

const MCP_BLUEPRINT_TOOLS: Record<
  string,
  (params: Record<string, unknown>) => ToolCallDescription
> = {
  get_canvas: () => ({ label: 'View canvas', detail: '' }),
  get_object: (params) => ({
    label: 'View object',
    detail: params.object_id ? truncate(String(params.object_id), 40) : '',
  }),
  create_object: (params) => ({
    label: 'Create design',
    detail: params.title ? truncate(String(params.title), 60) : '',
  }),
  update_object: (params) => ({
    label: 'Update design',
    detail: params.title ? truncate(String(params.title), 60) : '',
  }),
  delete_object: (params) => ({
    label: 'Delete design',
    detail: params.object_id ? truncate(String(params.object_id), 40) : '',
  }),
  get_design_guide: (params) => ({
    label: 'Read design guide',
    detail: params.topic ? String(params.topic) : '',
  }),
};

function describeMcpTool(
  server: string,
  tool: string,
  params: Record<string, unknown>,
): ToolCallDescription {
  if (server === 'blueprint') {
    const handler = MCP_BLUEPRINT_TOOLS[tool];
    if (handler) return handler(params);
  }
  const label = tool.replace(/_/g, ' ');
  return {
    label: label.charAt(0).toUpperCase() + label.slice(1),
    detail: server !== 'blueprint' ? `(${server})` : '',
  };
}

function describeBuiltinTool(
  name: string,
  params: Record<string, unknown>,
): ToolCallDescription {
  switch (name) {
    case 'Read':
      return {
        label: 'Read',
        detail: params.file_path ? truncate(String(params.file_path), 60) : '',
      };
    case 'Edit':
      return {
        label: 'Edit',
        detail: params.file_path ? truncate(String(params.file_path), 60) : '',
      };
    case 'Write':
      return {
        label: 'Write',
        detail: params.file_path ? truncate(String(params.file_path), 60) : '',
      };
    case 'Bash':
      return {
        label: 'Bash',
        detail: params.command ? truncate(String(params.command), 60) : '',
      };
    case 'Glob':
      return {
        label: 'Glob',
        detail: params.pattern ? truncate(String(params.pattern), 60) : '',
      };
    case 'Grep':
      return {
        label: 'Grep',
        detail: params.pattern ? truncate(String(params.pattern), 40) : '',
      };
    case 'WebFetch':
      return {
        label: 'Fetch',
        detail: params.url ? truncate(String(params.url), 60) : '',
      };
    case 'WebSearch':
      return {
        label: 'Search online',
        detail: params.query ? truncate(String(params.query), 60) : '',
      };
    case 'Agent':
    case 'Task':
      return {
        label: 'Run agent',
        detail: params.description
          ? truncate(String(params.description), 60)
          : '',
      };
    default:
      return { label: name, detail: '' };
  }
}

function describeToolCall(
  name: string,
  params: Record<string, unknown>,
): ToolCallDescription {
  const mcpMatch = name.match(/^mcp__([^_]+)__(.+)$/);
  if (mcpMatch) {
    return describeMcpTool(mcpMatch[1]!, mcpMatch[2]!, params);
  }
  return describeBuiltinTool(name, params);
}

export { describeToolCall };
export type { ToolCallDescription };
