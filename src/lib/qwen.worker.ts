// Runs the Qwen model for Auxilium off the main thread (see qwen.ts), so the page
// itself never loads the AI engine. Messages: load (download if needed), chat, delete.
import { MLCEngine, deleteModelAllInfoInCache } from '@mlc-ai/web-llm';

let engine: MLCEngine | null = null;
let loaded: string | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { id, type, model, messages } = e.data as {
    id: number;
    type: 'load' | 'chat' | 'delete';
    model?: string;
    messages?: { role: 'system' | 'user' | 'assistant'; content: string }[];
  };
  try {
    if (type === 'load') {
      engine ??= new MLCEngine();
      engine.setInitProgressCallback((r) => postMessage({ id, progress: r.progress, text: r.text }));
      if (loaded !== model) {
        await engine.reload(model!);
        loaded = model!;
      }
      postMessage({ id, done: true });
    } else if (type === 'chat') {
      if (!engine || !loaded) throw new Error('no model loaded');
      const r = await engine.chat.completions.create({
        messages: messages!,
        temperature: 0.5,
        max_tokens: 320,
        extra_body: { enable_thinking: false },
      });
      postMessage({ id, done: true, result: r.choices[0]?.message?.content ?? '' });
    } else if (type === 'delete') {
      if (engine && loaded === model) {
        await engine.unload();
        loaded = null;
      }
      await deleteModelAllInfoInCache(model!);
      postMessage({ id, done: true });
    }
  } catch (err) {
    postMessage({ id, error: String((err as Error)?.message ?? err) });
  }
};
