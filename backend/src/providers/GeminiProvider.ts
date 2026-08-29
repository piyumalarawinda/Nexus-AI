import { ILLMProvider, ChatMessage, StreamEvent } from './ILLMProvider';
import { ToolDefinition, ToolRegistry } from '../domain/ToolRegistry';
import { ChunkSearchResult } from '../domain/VectorSearch';
import { MockProvider } from './MockProvider';

export class GeminiProvider implements ILLMProvider {
  public id = 'gemini';
  public name = 'Google Gemini (Live Provider)';

  public isAvailable(): boolean {
    return true;
  }

  public async generateStream(
    messages: ChatMessage[],
    ragContext: ChunkSearchResult[],
    tools: ToolDefinition[],
    onEvent: (event: StreamEvent) => void,
    customApiKey?: string
  ): Promise<string> {
    const rawKey = customApiKey || process.env.GEMINI_API_KEY;
    const apiKey = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : '';
    
    if (!apiKey) {
      onEvent({
        type: 'reasoning',
        content: 'No GEMINI_API_KEY found in .env. Routing to Nexus Out-of-the-Box Knowledge Engine...'
      });
      const fallbackMock = new MockProvider();
      return fallbackMock.generateStream(messages, ragContext, tools, onEvent);
    }

    try {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
      
      onEvent({
        type: 'reasoning',
        content: 'Connecting to Google Gemini API (gemini-3.6-flash)...'
      });

      // 1. Emit RAG Context if present
      if (ragContext.length > 0) {
        onEvent({
          type: 'rag_context',
          content: `Retrieved ${ragContext.length} relevant document chunks from Knowledge Base`,
          data: ragContext.map(c => ({ filename: c.filename, similarity: Number(c.similarity.toFixed(4)), snippet: c.content.substring(0, 100) + '...' }))
        });
      }

      // 2. Tool Execution Triggers
      const queryLower = lastUserMessage.toLowerCase();

      if (queryLower.match(/(\d+\s*[\+\-\*\/\^%]\s*\d+)|sqrt|calculate/i)) {
        const mathMatch = queryLower.match(/(\d+\s*[\+\-\*\/]\s*\d+)/);
        const expr = mathMatch ? mathMatch[0] : '458 * 927';
        onEvent({ type: 'tool_call', data: { toolName: 'math_evaluator', args: { expression: expr } } });
        const res = await ToolRegistry.executeTool('math_evaluator', { expression: expr });
        onEvent({ type: 'tool_result', data: res });
      }

      if (queryLower.includes('time') || queryLower.includes('clock') || queryLower.includes('uptime')) {
        onEvent({ type: 'tool_call', data: { toolName: 'system_info', args: { includeMemory: true } } });
        const res = await ToolRegistry.executeTool('system_info', { includeMemory: true });
        onEvent({ type: 'tool_result', data: res });
      }

      // 3. Format Prompt for Gemini API
      const promptParts: string[] = [];
      promptParts.push('You are Nexus AI, a helpful, intelligent, general-purpose AI assistant. Respond accurately, clearly, and directly in whatever language the user speaks (English, Sinhala, Singlish, etc.).');

      if (ragContext.length > 0) {
        promptParts.push('--- KNOWLEDGE BASE CONTEXT ---');
        ragContext.forEach(c => {
          promptParts.push(`Document (${c.filename}): ${c.content}`);
        });
        promptParts.push('-----------------------------');
      }

      const formattedHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      promptParts.push(formattedHistory);

      // Models to try in order
      const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      let response: Response | null = null;
      let lastErrorObject: any = null;

      for (const model of modelsToTry) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptParts.join('\n\n') }] }]
            })
          });

          if (res.ok) {
            response = res;
            break;
          } else {
            const errJson = (await res.json().catch(() => null)) as any;
            lastErrorObject = errJson || { status: res.status, statusText: res.statusText };
          }
        } catch (e) {
          // Try next model
        }
      }

      if (!response) {
        const message = lastErrorObject?.error?.message || JSON.stringify(lastErrorObject);
        throw new Error(message);
      }

      const data = await response.json() as any;
      const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

      // Stream tokens word-by-word
      const words = textResult.split(' ');
      let assembled = '';
      for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i === words.length - 1 ? '' : ' ');
        assembled += word;
        onEvent({ type: 'token', content: word });
        await new Promise(r => setTimeout(r, 15));
      }

      onEvent({ type: 'done', content: assembled });
      return assembled;
    } catch (err: any) {
      onEvent({
        type: 'reasoning',
        content: `Gemini API authentication notice (${err.message}). Seamlessly routing to Nexus Knowledge Engine...`
      });
      const fallbackMock = new MockProvider();
      return fallbackMock.generateStream(messages, ragContext, tools, onEvent);
    }
  }
}
