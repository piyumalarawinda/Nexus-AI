"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentLoopService = void 0;
const MockProvider_1 = require("../providers/MockProvider");
const GeminiProvider_1 = require("../providers/GeminiProvider");
const OpenAIProvider_1 = require("../providers/OpenAIProvider");
const RAGService_1 = require("./RAGService");
const ToolRegistry_1 = require("../domain/ToolRegistry");
const MemoryService_1 = require("./MemoryService");
class AgentLoopService {
    static providers = new Map([
        ['mock', new MockProvider_1.MockProvider()],
        ['gemini', new GeminiProvider_1.GeminiProvider()],
        ['openai', new OpenAIProvider_1.OpenAIProvider()]
    ]);
    static getProvider(id) {
        return this.providers.get(id) || this.providers.get('mock');
    }
    static async executeStream(sessionId, userPrompt, providerId, onSSE, apiKey) {
        // 1. Store User Message
        await MemoryService_1.MemoryService.appendMessage(sessionId, 'user', userPrompt);
        // 2. Fetch Chat History Context (last 10 messages)
        const session = await MemoryService_1.MemoryService.getSession(sessionId);
        const history = (session?.messages || []).slice(-10).map(m => ({
            role: m.role,
            content: m.content
        }));
        // 3. RAG Knowledge Base Retrieval
        const ragContext = await RAGService_1.RAGService.searchKnowledgeBase(userPrompt, 3);
        // 4. Select LLM Provider
        const provider = this.getProvider(providerId);
        // 5. Fetch Active Tools
        const tools = ToolRegistry_1.ToolRegistry.getToolDefinitions();
        // 6. Run LLM Streaming Loop
        const collectedToolExecutions = [];
        const finalAnswer = await provider.generateStream(history, ragContext, tools, (event) => {
            if (event.type === 'tool_result') {
                collectedToolExecutions.push(event.data);
            }
            onSSE(event);
        }, apiKey);
        // 7. Store Assistant Message in Memory DB
        await MemoryService_1.MemoryService.appendMessage(sessionId, 'assistant', finalAnswer, collectedToolExecutions.length > 0 ? collectedToolExecutions : undefined);
        return finalAnswer;
    }
}
exports.AgentLoopService = AgentLoopService;
