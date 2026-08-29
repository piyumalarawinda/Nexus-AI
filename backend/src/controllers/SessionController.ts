import { Request, Response } from 'express';
import { MemoryService } from '../services/MemoryService';

export const listSessions = async (req: Request, res: Response) => {
  try {
    const sessions = await MemoryService.listSessions();
    return res.json(sessions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { title = 'New Chat Session', provider = 'mock' } = req.body;
    const session = await MemoryService.createSession(title, provider);
    return res.status(201).json(session);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = await MemoryService.getSession(id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    return res.json(session);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await MemoryService.deleteSession(id);
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
