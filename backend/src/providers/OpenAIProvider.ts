import { ILLMProvider, ChatMessage, StreamEvent } from './ILLMProvider';
import { ToolDefinition, ToolRegistry } from '../domain/ToolRegistry';
import { ChunkSearchResult } from '../domain/VectorSearch';
import { GeminiProvider } from './GeminiProvider';
import { MockProvider } from './MockProvider';

export class OpenAIProvider implements ILLMProvider {
  public id = 'openai';
  public name = 'OpenAI GPT-4o (Live Provider)';

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
    const rawKey = customApiKey || process.env.OPENAI_API_KEY;
    const apiKey = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : '';

    if (!apiKey) {
      if (process.env.GEMINI_API_KEY) {
        onEvent({
          type: 'reasoning',
          content: 'No OPENAI_API_KEY found. Seamlessly routing to Google Gemini Live API...'
        });
        const fallbackGemini = new GeminiProvider();
        return fallbackGemini.generateStream(messages, ragContext, tools, onEvent);
      } else {
        onEvent({
          type: 'reasoning',
          content: 'No OPENAI_API_KEY found. Routing to Nexus Out-of-the-Box Engine...'
        });
        const fallbackMock = new MockProvider();
        return fallbackMock.generateStream(messages, ragContext, tools, onEvent);
      }
    }

    try {
      onEvent({
        type: 'reasoning',
        content: 'Connecting to OpenAI API completions endpoint (gpt-4o-mini)...'
      });

      const formattedMessages = messages.map(m => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content }));
      if (ragContext.length > 0) {
        const ragPrompt = `Relevant Context:\n` + ragContext.map(c => `[${c.filename}]: ${c.content}`).join('\n\n');
        formattedMessages.unshift({ role: 'system', content: ragPrompt });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: formattedMessages
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errText}`);
      }

      const data = await response.json() as any;
      const textResult = data.choices?.[0]?.message?.content || 'No response generated.';

      const words = textResult.split(' ');
      let assembled = '';
      for (const word of words) {
        assembled += word + ' ';
        onEvent({ type: 'token', content: word + ' ' });
        await new Promise(r => setTimeout(r, 15));
      }

      onEvent({ type: 'done', content: assembled });
      return assembled;
    } catch (err: any) {
      if (process.env.GEMINI_API_KEY) {
        onEvent({
          type: 'reasoning',
          content: `OpenAI API Error (${err.message}). Falling back to Google Gemini Live API...`
        });
        const fallbackGemini = new GeminiProvider();
        return fallbackGemini.generateStream(messages, ragContext, tools, onEvent);
      } else {
        onEvent({
          type: 'reasoning',
          content: `OpenAI API Error (${err.message}). Falling back to Nexus Out-of-the-Box Engine...`
        });
        const fallbackMock = new MockProvider();
        return fallbackMock.generateStream(messages, ragContext, tools, onEvent);
      }
    }
  }
}
