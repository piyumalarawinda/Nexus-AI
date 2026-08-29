"use strict";
/**
 * Vector Search & Embeddings Engine
 * Implements TF-IDF / Feature-hash 128D embedding generator and cosine similarity search.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorSearchEngine = void 0;
class VectorSearchEngine {
    static VECTOR_DIM = 128;
    /**
     * Calculates Cosine Similarity between two N-dimensional vectors.
     * CosSim(A, B) = (A . B) / (||A|| * ||B||)
     */
    static cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error(`Vector dimension mismatch: ${vecA.length} vs ${vecB.length}`);
        }
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0)
            return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    /**
     * Generates a normalized 128-D vector embedding using a deterministic
     * feature-hashing TF-IDF algorithm. Works standalone out-of-the-box!
     */
    static generateEmbedding(text) {
        const vector = new Array(this.VECTOR_DIM).fill(0);
        const cleaned = text.toLowerCase().replace(/[^\w\s]/g, '');
        const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);
        if (tokens.length === 0)
            return vector;
        // Feature hashing (Murmur-like hash)
        tokens.forEach((token, index) => {
            let hash = 0;
            for (let i = 0; i < token.length; i++) {
                hash = (hash << 5) - hash + token.charCodeAt(i);
                hash |= 0;
            }
            const dim = Math.abs(hash) % this.VECTOR_DIM;
            // Positional & frequency weight
            const weight = 1.0 + (1.0 / (index + 1));
            vector[dim] += (hash > 0 ? 1 : -1) * weight;
        });
        // Sub-word character n-grams (3-grams) for semantic similarity (e.g. matching "python" & "pythons")
        for (let i = 0; i < cleaned.length - 2; i++) {
            const ngram = cleaned.substring(i, i + 3);
            let hash = 0;
            for (let j = 0; j < ngram.length; j++) {
                hash = (hash << 5) - hash + ngram.charCodeAt(j);
                hash |= 0;
            }
            const dim = Math.abs(hash) % this.VECTOR_DIM;
            vector[dim] += 0.25;
        }
        // L2 Normalize
        let norm = 0;
        for (let i = 0; i < vector.length; i++) {
            norm += vector[i] * vector[i];
        }
        norm = Math.sqrt(norm);
        if (norm > 0) {
            for (let i = 0; i < vector.length; i++) {
                vector[i] = vector[i] / norm;
            }
        }
        return vector;
    }
    /**
     * Splits text into semantic chunks with overlap.
     */
    static chunkText(text, chunkSize = 350, chunkOverlap = 50) {
        if (!text || text.trim().length === 0)
            return [];
        const paragraphs = text.split(/\n\s*\n/);
        const chunks = [];
        let currentChunk = '';
        for (const para of paragraphs) {
            if ((currentChunk + '\n' + para).length <= chunkSize) {
                currentChunk = currentChunk ? `${currentChunk}\n${para}` : para;
            }
            else {
                if (currentChunk)
                    chunks.push(currentChunk.trim());
                if (para.length > chunkSize) {
                    // Sub-split large paragraphs by sentences or spaces
                    const sentences = para.split(/(?<=[.?!])\s+/);
                    let subChunk = '';
                    for (const sent of sentences) {
                        if ((subChunk + ' ' + sent).length <= chunkSize) {
                            subChunk = subChunk ? `${subChunk} ${sent}` : sent;
                        }
                        else {
                            if (subChunk)
                                chunks.push(subChunk.trim());
                            subChunk = sent;
                        }
                    }
                    if (subChunk)
                        currentChunk = subChunk;
                    else
                        currentChunk = '';
                }
                else {
                    currentChunk = para;
                }
            }
        }
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }
        return chunks;
    }
}
exports.VectorSearchEngine = VectorSearchEngine;
