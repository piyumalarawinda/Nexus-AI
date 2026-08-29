"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSession = exports.getSession = exports.createSession = exports.listSessions = void 0;
const MemoryService_1 = require("../services/MemoryService");
const listSessions = async (req, res) => {
    try {
        const sessions = await MemoryService_1.MemoryService.listSessions();
        return res.json(sessions);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listSessions = listSessions;
const createSession = async (req, res) => {
    try {
        const { title = 'New Chat Session', provider = 'mock' } = req.body;
        const session = await MemoryService_1.MemoryService.createSession(title, provider);
        return res.status(201).json(session);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.createSession = createSession;
const getSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await MemoryService_1.MemoryService.getSession(id);
        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }
        return res.json(session);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.getSession = getSession;
const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        await MemoryService_1.MemoryService.deleteSession(id);
        return res.json({ success: true });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.deleteSession = deleteSession;
