import { ToolDefinition } from '../domain/ToolRegistry';
import { ChunkSearchResult } from '../domain/VectorSearch';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: any[];
}

export interface StreamEvent {
  type: 'reasoning' | 'tool_call' | 'tool_result' | 'rag_context' | 'token' | 'done' | 'error';
  content?: string;
  data?: any;
}

export interface ILLMProvider {
  id: string;
  name: string;
  isAvailable(): boolean;
  generateStream(
    messages: ChatMessage[],
    ragContext: ChunkSearchResult[],
    tools: ToolDefinition[],
    onEvent: (event: StreamEvent) => void,
    customApiKey?: string
  ): Promise<string>;
}
