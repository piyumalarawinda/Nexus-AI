import { describe, it, expect } from 'vitest';
import { VectorSearchEngine } from '../domain/VectorSearch.js';

describe('VectorSearchEngine Unit Tests', () => {
  it('should calculate identical vector cosine similarity as 1.0', () => {
    const vec = [0.5, 0.5, 0.5, 0.5];
    const sim = VectorSearchEngine.cosineSimilarity(vec, vec);
    expect(sim).toBeCloseTo(1.0, 4);
  });

  it('should calculate orthogonal vector cosine similarity as 0.0', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    const sim = VectorSearchEngine.cosineSimilarity(vecA, vecB);
    expect(sim).toBe(0);
  });

  it('should generate normalized 128D embedding vector', () => {
    const text = 'Nexus AI RAG Vector Similarity Search';
    const embedding = VectorSearchEngine.generateEmbedding(text);
    expect(embedding.length).toBe(128);

    // Verify L2 Norm is approximately 1.0
    let norm = 0;
    for (const val of embedding) {
      norm += val * val;
    }
    expect(Math.sqrt(norm)).toBeCloseTo(1.0, 2);
  });

  it('should compute higher similarity for semantically matching queries', () => {
    const textA = 'Vector database cosine similarity search engine';
    const textB = 'Vector search engine for document retrieval';
    const textC = 'Baking chocolate chip cookies in the oven';

    const embA = VectorSearchEngine.generateEmbedding(textA);
    const embB = VectorSearchEngine.generateEmbedding(textB);
    const embC = VectorSearchEngine.generateEmbedding(textC);

    const simAB = VectorSearchEngine.cosineSimilarity(embA, embB);
    const simAC = VectorSearchEngine.cosineSimilarity(embA, embC);

    expect(simAB).toBeGreaterThan(simAC);
  });

  it('should correctly chunk text documents into semantic passages', () => {
    const content = `Paragraph 1: Introduction to Agentic Tool execution.

Paragraph 2: Detailed calculation parameters and arithmetic handling.

Paragraph 3: Server-Sent Events (SSE) streaming token output.`;

    const chunks = VectorSearchEngine.chunkText(content, 100, 20);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toContain('Paragraph 1');
  });
});
