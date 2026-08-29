import { Request, Response } from 'express';
import { AgentLoopService } from '../services/AgentLoopService';
import { MemoryService } from '../services/MemoryService';

export const handleChatStream = async (req: Request, res: Response) => {
  const { sessionId: reqSessionId, prompt, provider = 'mock', apiKey } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt string is required.' });
  }

  let sessionId = reqSessionId;

  // Auto-create session if not provided
  if (!sessionId) {
    const newSession = await MemoryService.createSession(
      prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
      provider
    );
    sessionId = newSession.id;
  }

  // Check 100 message limit for existing session
  const existingSession = await MemoryService.getSession(sessionId);
  if (existingSession && existingSession.messages.length >= 100) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'session_init', data: { sessionId } })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'error', content: '🚨 Message limit reached (100/100). Please start a new chat session to continue.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    return res.end();
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering

  // Send initial session metadata frame
  res.write(`data: ${JSON.stringify({ type: 'session_init', data: { sessionId } })}\n\n`);

  try {
    await AgentLoopService.executeStream(
      sessionId,
      prompt,
      provider,
      (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      },
      apiKey
    );
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: err.message || 'Stream processing failed.' })}\n\n`);
  } finally {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }
};
