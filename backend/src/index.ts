import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { handleChatStream } from './controllers/ChatStreamController';
import { listDocuments, uploadDocument, deleteDocument } from './controllers/DocumentController';
import { listSessions, createSession, getSession, deleteSession } from './controllers/SessionController';
import { ToolRegistry } from './domain/ToolRegistry';
import { RAGService } from './services/RAGService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Config Multer for in-memory file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Initialize Tool Registry
ToolRegistry.initializeDefaults();

// --- API ROUTES ---

// Health Check & Tool List
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Nexus AI Engine',
    registeredTools: ToolRegistry.getToolDefinitions().map(t => t.name),
    time: new Date().toISOString()
  });
});

// Chat SSE Stream Endpoint
app.post('/api/v1/chat/stream', handleChatStream);

// Session Management Routes
app.get('/api/v1/sessions', listSessions);
app.post('/api/v1/sessions', createSession);
app.get('/api/v1/sessions/:id', getSession);
app.delete('/api/v1/sessions/:id', deleteSession);

// Document & RAG Knowledge Base Routes
app.get('/api/v1/documents', listDocuments);
app.post('/api/v1/documents', upload.single('file'), uploadDocument);
app.delete('/api/v1/documents/:id', deleteDocument);

// Tool Registry Endpoint
app.get('/api/v1/tools', (req, res) => {
  res.json(ToolRegistry.getToolDefinitions());
});

// Auto-seed initial sample Knowledge Base documents if database is empty
async function seedDefaultKnowledgeBase() {
  try {
    const docs = await RAGService.listDocuments();
    if (docs.length === 0) {
      console.log('Seeding initial Knowledge Base sample documents...');
      
      await RAGService.ingestDocument(
        'Nexus_Architecture_Guide.md',
        'text/markdown',
        `# Nexus AI Assistant Architecture & RAG Protocol

Nexus AI is an enterprise-grade agentic assistant system built with TypeScript, Node.js, and SQLite.
Key features include:
1. **Agentic Tool Execution**: Autonomously calls math evaluators, web search, system telemetry, and database queries.
2. **Vector Similarity Engine**: Calculates 128-dimensional embedding vectors using term frequency and character n-gram feature hashing. Performs Top-K Cosine Similarity search over chunked markdown and text documents.
3. **Server-Sent Events (SSE)**: Streams AI thoughts, tool execution results, and token-by-token output in real time via HTTP text/event-stream.
4. **Adapter Strategy Pattern**: Abstracted LLM provider layer supporting Mock AI, Google Gemini 1.5 Flash, and OpenAI GPT-4o.`
      );

      await RAGService.ingestDocument(
        'Engineering_Code_Standards.md',
        'text/markdown',
        `# Engineering Principles & Code Guidelines

- All REST API endpoints must strictly validate inputs and handle exceptions gracefully.
- Prefer Server-Sent Events (SSE) over WebSockets when data flow is predominantly server-to-client streaming.
- Vector search indices should be kept in memory or updated incrementally upon new document ingestion.
- Always implement zero-dependency fallback providers for local development and offline testing.`
      );

      console.log('Sample documents successfully seeded!');
    }
  } catch (err) {
    console.error('Seeding warning:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Nexus AI Backend Server listening on http://localhost:${PORT}`);
  await seedDefaultKnowledgeBase();
});
