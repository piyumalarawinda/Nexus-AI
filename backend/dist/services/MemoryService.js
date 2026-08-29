"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class MemoryService {
    static async createSession(title = 'New Chat Session', provider = 'mock') {
        return prisma.session.create({
            data: {
                title,
                modelProvider: provider
            }
        });
    }
    static async listSessions() {
        return prisma.session.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                _count: { select: { messages: true } }
            }
        });
    }
    static async getSession(id) {
        return prisma.session.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
    }
    static async deleteSession(id) {
        return prisma.session.delete({
            where: { id }
        });
    }
    static async appendMessage(sessionId, role, content, toolCalls) {
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
exports.MemoryService = MemoryService;
