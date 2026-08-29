import { PrismaClient } from '@prisma/client';
import { VectorSearchEngine, ChunkSearchResult } from '../domain/VectorSearch';

const prisma = new PrismaClient();

export class RAGService {
  /**
   * Ingests a document, computes vector embeddings for chunks, and indexes it.
   */
  public static async ingestDocument(filename: string, mimeType: string, content: string): Promise<any> {
    const doc = await prisma.document.create({
      data: {
        filename,
        mimeType,
        fileSizeBytes: Buffer.byteLength(content, 'utf8'),
        status: 'INDEXING'
      }
    });

    try {
      const rawChunks = VectorSearchEngine.chunkText(content, 400, 50);

      const chunkRecords = rawChunks.map((chunkContent, index) => {
        const embedding = VectorSearchEngine.generateEmbedding(chunkContent);
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
    } catch (err: any) {
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
  public static async searchKnowledgeBase(query: string, topK: number = 3, minScore: number = 0.30): Promise<ChunkSearchResult[]> {
    const cleaned = query.trim().toLowerCase();

    // Ignore short words or conversational greetings to prevent irrelevant RAG triggers
    if (cleaned.length <= 3 || /^(hi+|hello|hey+|greetings|thanks|thank you|good morning|good evening|howdy|sup)$/i.test(cleaned)) {
      return [];
    }

    const queryVector = VectorSearchEngine.generateEmbedding(query);

    const allChunks = await prisma.documentChunk.findMany({
      include: {
        document: {
          select: { filename: true }
        }
      }
    });

    const results: ChunkSearchResult[] = [];

    for (const chunk of allChunks) {
      try {
        const chunkVector = JSON.parse(chunk.embedding) as number[];
        const sim = VectorSearchEngine.cosineSimilarity(queryVector, chunkVector);

        if (sim >= minScore) {
          results.push({
            chunkId: chunk.id,
            documentId: chunk.documentId,
            filename: chunk.document.filename,
            content: chunk.content,
            similarity: sim
          });
        }
      } catch (e) {
        // Ignore parse error
      }
    }

    // Sort descending by similarity score
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, topK);
  }

  public static async listDocuments() {
    return prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { chunks: true } }
      }
    });
  }

  public static async deleteDocument(id: string) {
    return prisma.document.delete({
      where: { id }
    });
  }
}
