import { describe, it, expect, beforeAll } from 'vitest';
import { ToolRegistry } from '../domain/ToolRegistry.js';

describe('ToolRegistry Unit Tests', () => {
  beforeAll(() => {
    ToolRegistry.initializeDefaults();
  });

  it('should list all registered default agentic tools', () => {
    const tools = ToolRegistry.getToolDefinitions();
    expect(tools.length).toBeGreaterThanOrEqual(4);
    const names = tools.map(t => t.name);
    expect(names).toContain('math_evaluator');
    expect(names).toContain('system_info');
    expect(names).toContain('web_search');
  });

  it('should execute math_evaluator tool correctly', async () => {
    const res = await ToolRegistry.executeTool('math_evaluator', { expression: '458 * 927' });
    expect(res.success).toBe(true);
    expect(res.result.answer).toBe(424566);
  });

  it('should execute system_info tool safely', async () => {
    const res = await ToolRegistry.executeTool('system_info', { includeMemory: true });
    expect(res.success).toBe(true);
    expect(res.result.platform).toBeDefined();
    expect(res.result.memory).toBeDefined();
  });

  it('should handle non-existent tool gracefully', async () => {
    const res = await ToolRegistry.executeTool('unknown_tool', {});
    expect(res.success).toBe(false);
    expect(res.error).toContain('not found');
  });
});
