import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MemoryService {
  public static async createSession(title: string = 'New Chat Session', provider: string = 'mock') {
    return prisma.session.create({
      data: {
        title,
        modelProvider: provider
      }
    });
  }

  public static async listSessions() {
    return prisma.session.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } }
      }
    });
  }

  public static async getSession(id: string) {
    return prisma.session.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }

  public static async deleteSession(id: string) {
    return prisma.session.delete({
      where: { id }
    });
  }

  public static async appendMessage(sessionId: string, role: string, content: string, toolCalls?: any) {
    const message = await prisma.message.create({
      data: {
        sessionId,
        role,
        content,
        toolCalls: toolCalls ? JSON.stringify(toolCalls) : null
      }
    });

    await prisma.session.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    return message;
  }
}
