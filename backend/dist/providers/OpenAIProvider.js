"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const GeminiProvider_1 = require("./GeminiProvider");
const MockProvider_1 = require("./MockProvider");
class OpenAIProvider {
    id = 'openai';
    name = 'OpenAI GPT-4o (Live Provider)';
    isAvailable() {
        return true;
    }
    async generateStream(messages, ragContext, tools, onEvent, customApiKey) {
        const rawKey = customApiKey || process.env.OPENAI_API_KEY;
        const apiKey = rawKey ? rawKey.trim().replace(/^["']|["']$/g, '') : '';
        if (!apiKey) {
            if (process.env.GEMINI_API_KEY) {
                onEvent({
                    type: 'reasoning',
                    content: 'No OPENAI_API_KEY found. Seamlessly routing to Google Gemini Live API...'
                });
                const fallbackGemini = new GeminiProvider_1.GeminiProvider();
                return fallbackGemini.generateStream(messages, ragContext, tools, onEvent);
            }
            else {
                onEvent({
                    type: 'reasoning',
                    content: 'No OPENAI_API_KEY found. Routing to Nexus Out-of-the-Box Engine...'
                });
                const fallbackMock = new MockProvider_1.MockProvider();
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
            const data = await response.json();
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
        }
        catch (err) {
            if (process.env.GEMINI_API_KEY) {
                onEvent({
                    type: 'reasoning',
                    content: `OpenAI API Error (${err.message}). Falling back to Google Gemini Live API...`
                });
                const fallbackGemini = new GeminiProvider_1.GeminiProvider();
                return fallbackGemini.generateStream(messages, ragContext, tools, onEvent);
            }
            else {
                onEvent({
                    type: 'reasoning',
                    content: `OpenAI API Error (${err.message}). Falling back to Nexus Out-of-the-Box Engine...`
                });
                const fallbackMock = new MockProvider_1.MockProvider();
                return fallbackMock.generateStream(messages, ragContext, tools, onEvent);
            }
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
