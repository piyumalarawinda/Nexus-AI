"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ToolRegistry_js_1 = require("../domain/ToolRegistry.js");
(0, vitest_1.describe)('ToolRegistry Unit Tests', () => {
    (0, vitest_1.beforeAll)(() => {
        ToolRegistry_js_1.ToolRegistry.initializeDefaults();
    });
    (0, vitest_1.it)('should list all registered default agentic tools', () => {
        const tools = ToolRegistry_js_1.ToolRegistry.getToolDefinitions();
        (0, vitest_1.expect)(tools.length).toBeGreaterThanOrEqual(4);
        const names = tools.map(t => t.name);
        (0, vitest_1.expect)(names).toContain('math_evaluator');
        (0, vitest_1.expect)(names).toContain('system_info');
        (0, vitest_1.expect)(names).toContain('web_search');
    });
    (0, vitest_1.it)('should execute math_evaluator tool correctly', async () => {
        const res = await ToolRegistry_js_1.ToolRegistry.executeTool('math_evaluator', { expression: '458 * 927' });
        (0, vitest_1.expect)(res.success).toBe(true);
        (0, vitest_1.expect)(res.result.answer).toBe(424566);
    });
    (0, vitest_1.it)('should execute system_info tool safely', async () => {
        const res = await ToolRegistry_js_1.ToolRegistry.executeTool('system_info', { includeMemory: true });
        (0, vitest_1.expect)(res.success).toBe(true);
        (0, vitest_1.expect)(res.result.platform).toBeDefined();
        (0, vitest_1.expect)(res.result.memory).toBeDefined();
    });
    (0, vitest_1.it)('should handle non-existent tool gracefully', async () => {
        const res = await ToolRegistry_js_1.ToolRegistry.executeTool('unknown_tool', {});
        (0, vitest_1.expect)(res.success).toBe(false);
        (0, vitest_1.expect)(res.error).toContain('not found');
    });
});
