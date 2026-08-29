import { ILLMProvider, StreamEvent, ChatMessage } from '../providers/ILLMProvider';
import { MockProvider } from '../providers/MockProvider';
import { GeminiProvider } from '../providers/GeminiProvider';
import { OpenAIProvider } from '../providers/OpenAIProvider';
import { RAGService } from './RAGService';
import { ToolRegistry } from '../domain/ToolRegistry';
import { MemoryService } from './MemoryService';

export class AgentLoopService {
  private static providers: Map<string, ILLMProvider> = new Map([
    ['mock', new MockProvider()],
    ['gemini', new GeminiProvider()],
    ['openai', new OpenAIProvider()]
  ]);

  public static getProvider(id: string): ILLMProvider {
    return this.providers.get(id) || this.providers.get('mock')!;
  }

  public static async executeStream(
    sessionId: string,
    userPrompt: string,
    providerId: string,
    onSSE: (data: StreamEvent) => void,
    apiKey?: string
  ): Promise<string> {
    // 1. Store User Message
    await MemoryService.appendMessage(sessionId, 'user', userPrompt);

    // 2. Fetch Chat History Context (last 10 messages)
    const session = await MemoryService.getSession(sessionId);
    const history: ChatMessage[] = (session?.messages || []).slice(-10).map(m => ({
      role: m.role as any,
      content: m.content
    }));

    // 3. RAG Knowledge Base Retrieval
    const ragContext = await RAGService.searchKnowledgeBase(userPrompt, 3);

    // 4. Select LLM Provider
    const provider = this.getProvider(providerId);

    // 5. Fetch Active Tools
    const tools = ToolRegistry.getToolDefinitions();

    // 6. Run LLM Streaming Loop
    const collectedToolExecutions: any[] = [];

    const finalAnswer = await provider.generateStream(
      history,
      ragContext,
      tools,
      (event) => {
        if (event.type === 'tool_result') {
          collectedToolExecutions.push(event.data);
        }
        onSSE(event);
      },
      apiKey
    );

    // 7. Store Assistant Message in Memory DB
    await MemoryService.appendMessage(
      sessionId,
      'assistant',
      finalAnswer,
      collectedToolExecutions.length > 0 ? collectedToolExecutions : undefined
    );

    return finalAnswer;
  }
}
