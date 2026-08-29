"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const VectorSearch_js_1 = require("../domain/VectorSearch.js");
(0, vitest_1.describe)('VectorSearchEngine Unit Tests', () => {
    (0, vitest_1.it)('should calculate identical vector cosine similarity as 1.0', () => {
        const vec = [0.5, 0.5, 0.5, 0.5];
        const sim = VectorSearch_js_1.VectorSearchEngine.cosineSimilarity(vec, vec);
        (0, vitest_1.expect)(sim).toBeCloseTo(1.0, 4);
    });
    (0, vitest_1.it)('should calculate orthogonal vector cosine similarity as 0.0', () => {
        const vecA = [1, 0, 0];
        const vecB = [0, 1, 0];
        const sim = VectorSearch_js_1.VectorSearchEngine.cosineSimilarity(vecA, vecB);
        (0, vitest_1.expect)(sim).toBe(0);
    });
    (0, vitest_1.it)('should generate normalized 128D embedding vector', () => {
        const text = 'Nexus AI RAG Vector Similarity Search';
        const embedding = VectorSearch_js_1.VectorSearchEngine.generateEmbedding(text);
        (0, vitest_1.expect)(embedding.length).toBe(128);
        // Verify L2 Norm is approximately 1.0
        let norm = 0;
        for (const val of embedding) {
            norm += val * val;
        }
        (0, vitest_1.expect)(Math.sqrt(norm)).toBeCloseTo(1.0, 2);
    });
    (0, vitest_1.it)('should compute higher similarity for semantically matching queries', () => {
        const textA = 'Vector database cosine similarity search engine';
        const textB = 'Vector search engine for document retrieval';
        const textC = 'Baking chocolate chip cookies in the oven';
        const embA = VectorSearch_js_1.VectorSearchEngine.generateEmbedding(textA);
        const embB = VectorSearch_js_1.VectorSearchEngine.generateEmbedding(textB);
        const embC = VectorSearch_js_1.VectorSearchEngine.generateEmbedding(textC);
        const simAB = VectorSearch_js_1.VectorSearchEngine.cosineSimilarity(embA, embB);
        const simAC = VectorSearch_js_1.VectorSearchEngine.cosineSimilarity(embA, embC);
        (0, vitest_1.expect)(simAB).toBeGreaterThan(simAC);
    });
    (0, vitest_1.it)('should correctly chunk text documents into semantic passages', () => {
        const content = `Paragraph 1: Introduction to Agentic Tool execution.

Paragraph 2: Detailed calculation parameters and arithmetic handling.

Paragraph 3: Server-Sent Events (SSE) streaming token output.`;
        const chunks = VectorSearch_js_1.VectorSearchEngine.chunkText(content, 100, 20);
        (0, vitest_1.expect)(chunks.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(chunks[0]).toContain('Paragraph 1');
    });
});
