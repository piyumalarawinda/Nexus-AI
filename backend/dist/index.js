"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
const ChatStreamController_1 = require("./controllers/ChatStreamController");
const DocumentController_1 = require("./controllers/DocumentController");
const SessionController_1 = require("./controllers/SessionController");
const ToolRegistry_1 = require("./domain/ToolRegistry");
const RAGService_1 = require("./services/RAGService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Config Multer for in-memory file uploads
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Middleware
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json({ limit: '10mb' }));
// Initialize Tool Registry
ToolRegistry_1.ToolRegistry.initializeDefaults();
// --- API ROUTES ---
// Health Check & Tool List
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'online',
        system: 'Nexus AI Engine',
        registeredTools: ToolRegistry_1.ToolRegistry.getToolDefinitions().map(t => t.name),
        time: new Date().toISOString()
    });
});
// Chat SSE Stream Endpoint
app.post('/api/v1/chat/stream', ChatStreamController_1.handleChatStream);
// Session Management Routes
app.get('/api/v1/sessions', SessionController_1.listSessions);
app.post('/api/v1/sessions', SessionController_1.createSession);
app.get('/api/v1/sessions/:id', SessionController_1.getSession);
app.delete('/api/v1/sessions/:id', SessionController_1.deleteSession);
// Document & RAG Knowledge Base Routes
app.get('/api/v1/documents', DocumentController_1.listDocuments);
app.post('/api/v1/documents', upload.single('file'), DocumentController_1.uploadDocument);
app.delete('/api/v1/documents/:id', DocumentController_1.deleteDocument);
// Tool Registry Endpoint
app.get('/api/v1/tools', (req, res) => {
    res.json(ToolRegistry_1.ToolRegistry.getToolDefinitions());
});
// Auto-seed initial sample Knowledge Base documents if database is empty
async function seedDefaultKnowledgeBase() {
    try {
        const docs = await RAGService_1.RAGService.listDocuments();
        if (docs.length === 0) {
            console.log('Seeding initial Knowledge Base sample documents...');
            await RAGService_1.RAGService.ingestDocument('Nexus_Architecture_Guide.md', 'text/markdown', `# Nexus AI Assistant Architecture & RAG Protocol

Nexus AI is an enterprise-grade agentic assistant system built with TypeScript, Node.js, and SQLite.
Key features include:
1. **Agentic Tool Execution**: Autonomously calls math evaluators, web search, system telemetry, and database queries.
2. **Vector Similarity Engine**: Calculates 128-dimensional embedding vectors using term frequency and character n-gram feature hashing. Performs Top-K Cosine Similarity search over chunked markdown and text documents.
3. **Server-Sent Events (SSE)**: Streams AI thoughts, tool execution results, and token-by-token output in real time via HTTP text/event-stream.
4. **Adapter Strategy Pattern**: Abstracted LLM provider layer supporting Mock AI, Google Gemini 1.5 Flash, and OpenAI GPT-4o.`);
            await RAGService_1.RAGService.ingestDocument('Engineering_Code_Standards.md', 'text/markdown', `# Engineering Principles & Code Guidelines

- All REST API endpoints must strictly validate inputs and handle exceptions gracefully.
- Prefer Server-Sent Events (SSE) over WebSockets when data flow is predominantly server-to-client streaming.
- Vector search indices should be kept in memory or updated incrementally upon new document ingestion.
- Always implement zero-dependency fallback providers for local development and offline testing.`);
            console.log('Sample documents successfully seeded!');
        }
    }
    catch (err) {
        console.error('Seeding warning:', err);
    }
}
app.listen(PORT, async () => {
    console.log(`🚀 Nexus AI Backend Server listening on http://localhost:${PORT}`);
    await seedDefaultKnowledgeBase();
});
