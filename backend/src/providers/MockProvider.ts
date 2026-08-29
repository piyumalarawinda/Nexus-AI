import { ILLMProvider, ChatMessage, StreamEvent } from './ILLMProvider';
import { ToolDefinition, ToolRegistry } from '../domain/ToolRegistry';
import { ChunkSearchResult } from '../domain/VectorSearch';

export class MockProvider implements ILLMProvider {
  public id = 'mock';
  public name = 'Nexus Mock AI (Out-of-The-Box Engine)';

  public isAvailable(): boolean {
    return true;
  }

  public async generateStream(
    messages: ChatMessage[],
    ragContext: ChunkSearchResult[],
    tools: ToolDefinition[],
    onEvent: (event: StreamEvent) => void
  ): Promise<string> {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const queryLower = lastUserMessage.trim().toLowerCase();

    // 1. Emit RAG context event if present
    if (ragContext.length > 0) {
      onEvent({
        type: 'rag_context',
        content: `Retrieved ${ragContext.length} relevant document chunks from Knowledge Base`,
        data: ragContext.map(c => ({
          filename: c.filename,
          similarity: Number(c.similarity.toFixed(4)),
          snippet: c.content.substring(0, 120) + '...'
        }))
      });
      await this.delay(200);
    }

    // 2. Emit initial reasoning step
    onEvent({
      type: 'reasoning',
      content: `Analyzing prompt: "${lastUserMessage.substring(0, 60)}${lastUserMessage.length > 60 ? '...' : ''}"`
    });
    await this.delay(250);

    // 3. Detect and execute Agent Tools
    let toolExecutionSummaries: string[] = [];

    // Math calculation tool detection
    if (queryLower.match(/(\d+\s*[\+\-\*\/\^%]\s*\d+)|sqrt|calculate|math|percent/i)) {
      const mathMatch = queryLower.match(/(\d+\s*[\+\-\*\/]\s*\d+)/);
      const expr = mathMatch ? mathMatch[0] : '458 * 927';
      
      onEvent({
        type: 'reasoning',
        content: `Determined calculation required. Invoking tool: math_evaluator(expression="${expr}")`
      });
      await this.delay(250);

      onEvent({
        type: 'tool_call',
        data: { toolName: 'math_evaluator', args: { expression: expr } }
      });

      const res = await ToolRegistry.executeTool('math_evaluator', { expression: expr });
      
      onEvent({
        type: 'tool_result',
        data: res
      });
      await this.delay(250);

      toolExecutionSummaries.push(`Calculated \`${expr}\` = **${res.result?.answer}**.`);
    }

    // Weather tool detection
    if (queryLower.includes('weather') || queryLower.includes('temperature') || queryLower.includes('forecast')) {
      let city = 'San Francisco';
      if (queryLower.includes('tokyo')) city = 'Tokyo';
      if (queryLower.includes('london')) city = 'London';
      if (queryLower.includes('paris')) city = 'Paris';
      if (queryLower.includes('new york')) city = 'New York';

      onEvent({
        type: 'reasoning',
        content: `Weather query detected. Calling weather_lookup(city="${city}")`
      });
      await this.delay(250);

      onEvent({
        type: 'tool_call',
        data: { toolName: 'weather_lookup', args: { city } }
      });

      const res = await ToolRegistry.executeTool('weather_lookup', { city });
      
      onEvent({
        type: 'tool_result',
        data: res
      });
      await this.delay(250);

      toolExecutionSummaries.push(`Weather in ${city}: **${res.result?.temperatureC}°C (${res.result?.temperatureF}°F)**, ${res.result?.condition}.`);
    }

    // System info & time tool detection
    if (queryLower.includes('system') || queryLower.includes('server') || queryLower.includes('uptime') || queryLower.includes('time') || queryLower.includes('date') || queryLower.includes('clock')) {
      onEvent({
        type: 'reasoning',
        content: `Fetching server diagnostic state and system clock: system_info(includeMemory=true)`
      });
      await this.delay(250);

      onEvent({
        type: 'tool_call',
        data: { toolName: 'system_info', args: { includeMemory: true } }
      });

      const res = await ToolRegistry.executeTool('system_info', { includeMemory: true });

      onEvent({
        type: 'tool_result',
        data: res
      });
      await this.delay(250);

      const sysTime = res.result?.localTime || new Date(res.result?.timestamp).toLocaleTimeString();
      const sysDate = res.result?.localDate || new Date(res.result?.timestamp).toLocaleDateString();
      const sysTz = res.result?.timezone || 'UTC';

      toolExecutionSummaries.push(
        `Current Time: **${sysTime}** (${sysTz}), Date: **${sysDate}** | ` +
        `Server Uptime: **${res.result?.uptimeSeconds}s**, Heap Used: **${res.result?.memory?.heapUsedMB} MB**.`
      );
    }

    // 4. Construct Final AI Text Response
    onEvent({
      type: 'reasoning',
      content: `Synthesizing token stream...`
    });
    await this.delay(200);

    let fullText = '';

    // Handle Greetings & Casual Conversations
    const isGreeting = /^(hi+|hello|hey+|greetings|thanks|thank you|good morning|good evening|howdy|sup)$/i.test(queryLower);

    if (isGreeting) {
      fullText = `Hello! How can I assist you today?`;
    } else if (toolExecutionSummaries.length > 0) {
      fullText += `Agentic Tool Execution Results:\n`;
      toolExecutionSummaries.forEach(sum => {
        fullText += `- ${sum}\n`;
      });
      fullText += `\n`;
    } else if (ragContext.length > 0) {
      fullText += `Based on your Knowledge Base documents:\n\n`;
      ragContext.forEach((chunk, i) => {
        fullText += `> [Source ${i + 1}: ${chunk.filename}] (Similarity Score: ${(chunk.similarity * 100).toFixed(1)}%)\n`;
        fullText += `> ${chunk.content}\n\n`;
      });
      fullText += `Key Takeaway:\n`;
      fullText += `The indexed context directly addresses your query with high confidence.\n\n`;
    } else {
      // Dynamic General Knowledge & QA Engine for ANY question
      fullText = this.synthesizeGeneralKnowledge(lastUserMessage, queryLower);
    }

    // Stream word by word
    const words = fullText.split(' ');
    let assembled = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i === words.length - 1 ? '' : ' ');
      assembled += word;
      onEvent({
        type: 'token',
        content: word
      });
      await this.delay(18); // 18ms token stream rate
    }

    onEvent({
      type: 'done',
      content: assembled
    });

    return assembled;
  }

  /**
   * Synthesizes informative, structured general knowledge answers for ANY question.
   */
  private synthesizeGeneralKnowledge(originalPrompt: string, queryLower: string): string {
    if (queryLower.includes('machine learning') || queryLower.includes('ml') || queryLower.includes('deep learning')) {
      return `What is Machine Learning?\n\n` +
             `Machine Learning (ML) is a subfield of Artificial Intelligence (AI) focused on building algorithms that allow computers to learn patterns from data and make predictions or decisions without being explicitly programmed.\n\n` +
             `Three Primary Types of Machine Learning:\n\n` +
             `- Supervised Learning: Training models on labeled data (e.g. classification, regression, spam detection).\n` +
             `- Unsupervised Learning: Discovering hidden patterns or groupings in unlabeled data (e.g. clustering, PCA, anomaly detection).\n` +
             `- Reinforcement Learning: Training agents to take actions in an environment to maximize cumulative reward (e.g. robotics, game playing).\n\n` +
             `Key Impact:\n` +
             `Machine Learning powers modern Large Language Models (LLMs), Computer Vision, Recommendation Engines, and Autonomous Systems.`;
    }

    if (queryLower.includes('router') || queryLower.includes('routing') || queryLower.includes('network')) {
      return `What is a Network Router?\n\n` +
             `A Router is a networking device that forwards data packets between computer networks. Routers perform the traffic directing functions on the Internet, analyzing destination IP addresses to determine the optimal path for data transfer.\n\n` +
             `Key Functions of a Router:\n\n` +
             `- Packet Forwarding: Examines incoming data packets and forwards them to their target destination IP address.\n` +
             `- Network Interconnection: Connects local networks (LAN) to wide area networks (WAN / Internet).\n` +
             `- DHCP & IP Assignment: Assigns local IP addresses to connected devices (computers, smartphones, IoT).\n` +
             `- NAT & Security Firewall: Translates private IP addresses to public IPs and blocks unauthorized incoming traffic.\n\n` +
             `Web Development Context:\n` +
             `In software development (e.g. Express or React Router), a Router refers to the URL routing mechanism that maps incoming HTTP requests to specific endpoint handlers or UI pages.`;
    }

    if (queryLower.includes('green computing') || queryLower.includes('green IT') || queryLower.includes('sustainable computing')) {
      return `What is Green Computing?\n\n` +
             `Green Computing (also known as Green IT or Sustainable Computing) is the environmentally sustainable practice of designing, manufacturing, using, and disposing of computers, servers, chips, and software systems to minimize their environmental impact and carbon footprint.\n\n` +
             `Four Core Pillars of Green Computing:\n\n` +
             `- Green Design: Designing energy-efficient computers, microprocessors, servers, and data centers.\n` +
             `- Green Manufacturing: Utilizing non-toxic materials and eco-friendly processes during production.\n` +
             `- Green Use: Reducing the power consumption of devices during operation (e.g. dynamic CPU throttling, liquid cooling, efficient algorithms).\n` +
             `- Green Disposal: Reusing, refurbishing, and properly recycling electronic waste (e-waste) to prevent hazardous landfill contamination.\n\n` +
             `Key Impact:\n` +
             `- Data Center Efficiency: Modern hyperscale data centers use renewable energy (solar, wind) and PUE optimization to cut power consumption.\n` +
             `- Efficient Software Engineering: Writing optimized code and lean algorithms reduces CPU cycle utilization and global server electricity usage.`;
    }

    if (queryLower.includes('rag') || queryLower.includes('retrieval') || queryLower.includes('vector')) {
      return `Retrieval-Augmented Generation (RAG) Architecture\n\n` +
             `RAG (Retrieval-Augmented Generation) is an AI framework that grounds Large Language Models on external, private, or real-time document stores to eliminate hallucinations.\n\n` +
             `How RAG Works:\n\n` +
             `- Ingestion & Chunking: Documents are split into semantic passages (chunks).\n` +
             `- Vector Embeddings: High-dimensional vector embeddings are computed for each chunk.\n` +
             `- Top-K Similarity Search: When a user queries, Cosine Similarity search retrieves the top matching vector chunks.\n` +
             `- Grounded Generation: The LLM synthesizes an accurate answer strictly based on the retrieved context.`;
    }

    if (queryLower.includes('node') || queryLower.includes('express') || queryLower.includes('typescript')) {
      return `Node.js, Express & TypeScript Architecture\n\n` +
             `This backend is powered by Node.js, Express 4, and TypeScript.\n\n` +
             `Architectural Highlights:\n` +
             `- Non-Blocking I/O: Event loop handles thousands of concurrent SSE connections cleanly.\n` +
             `- Server-Sent Events (SSE): Streams AI token responses using Content-Type: text/event-stream with lower overhead than WebSockets.\n` +
             `- Prisma SQLite Persistence: Manages session data, chat trajectories, and 128D document chunks.`;
    }

    // Default Comprehensive Answer Synthesizer for Any Query
    return `Overview & Explanation for: "${originalPrompt}"\n\n` +
           `Here is a structured explanation addressing your query:\n\n` +
           `- Core Concept: Your question regarding "${originalPrompt}" touches on key principles in technical architecture and computer systems.\n` +
           `- Execution Strategy: The Nexus AI engine evaluates user prompts by combining active tool loops, vector similarity search, and structured domain reasoning.\n` +
           `- Key Recommendation: You can ask specific questions about networking, math, server state, or weather.`;
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
