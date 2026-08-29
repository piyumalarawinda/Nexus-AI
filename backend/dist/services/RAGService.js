"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGService = void 0;
const client_1 = require("@prisma/client");
const VectorSearch_1 = require("../domain/VectorSearch");
const prisma = new client_1.PrismaClient();
class RAGService {
    /**
     * Ingests a document, computes vector embeddings for chunks, and indexes it.
     */
    static async ingestDocument(filename, mimeType, content) {
        const doc = await prisma.document.create({
            data: {
                filename,
                mimeType,
                fileSizeBytes: Buffer.byteLength(content, 'utf8'),
                status: 'INDEXING'
            }
        });
        try {
            const rawChunks = VectorSearch_1.VectorSearchEngine.chunkText(content, 400, 50);
            const chunkRecords = rawChunks.map((chunkContent, index) => {
                const embedding = VectorSearch_1.VectorSearchEngine.generateEmbedding(chunkContent);
                return {
                    documentId: doc.id,
                    content: chunkContent,
                    embedding: JSON.stringify(embedding),
                    chunkIndex: index
                };
            });
            if (chunkRecords.length > 0) {
                await prisma.documentChunk.createMany({
                    data: chunkRecords
                });
            }
            const updated = await prisma.document.update({
                where: { id: doc.id },
                data: {
                    status: 'READY',
                    chunkCount: chunkRecords.length
                }
            });
            return updated;
        }
        catch (err) {
            await prisma.document.update({
                where: { id: doc.id },
                data: { status: 'FAILED' }
            });
            throw err;
        }
    }
    /**
     * Performs Top-K Vector Cosine Similarity Search against all index chunks.
     */
    static async searchKnowledgeBase(query, topK = 3, minScore = 0.30) {
        const cleaned = query.trim().toLowerCase();
        // Ignore short words or conversational greetings to prevent irrelevant RAG triggers
        if (cleaned.length <= 3 || /^(hi+|hello|hey+|greetings|thanks|thank you|good morning|good evening|howdy|sup)$/i.test(cleaned)) {
            return [];
        }
        const queryVector = VectorSearch_1.VectorSearchEngine.generateEmbedding(query);
        const allChunks = await prisma.documentChunk.findMany({
            include: {
                document: {
                    select: { filename: true }
                }
            }
        });
        const results = [];
        for (const chunk of allChunks) {
            try {
                const chunkVector = JSON.parse(chunk.embedding);
                const sim = VectorSearch_1.VectorSearchEngine.cosineSimilarity(queryVector, chunkVector);
                if (sim >= minScore) {
                    results.push({
                        chunkId: chunk.id,
                        documentId: chunk.documentId,
                        filename: chunk.document.filename,
                        content: chunk.content,
                        similarity: sim
                    });
                }
            }
            catch (e) {
                // Ignore parse error
            }
        }
        // Sort descending by similarity score
        results.sort((a, b) => b.similarity - a.similarity);
        return results.slice(0, topK);
    }
    static async listDocuments() {
        return prisma.document.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { chunks: true } }
            }
        });
    }
    static async deleteDocument(id) {
        return prisma.document.delete({
            where: { id }
        });
    }
}
exports.RAGService = RAGService;
