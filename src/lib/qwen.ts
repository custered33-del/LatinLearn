/**
 * Auxilium's built-in AI: a Qwen model downloaded once onto this device and run
 * right here in the browser with WebLLM (WebGPU). No PC, no server, nothing sent
 * anywhere; after the download it works offline. The model files come from
 * Hugging Face (too big for GitHub) and stay in the browser's storage until
 * removed. The engine runs in a Web Worker (qwen.worker.ts) so the page stays smooth.
 */
export interface QwenModel {
  key: string;
  name: string;
  /** WebLLM model ids: half-precision (most GPUs) and full-precision (older GPUs). */
  f16: string;
  f32: string;
  mb: number;
  note: string;
  /** Too big for most phones. */
  big?: boolean;
  recommended?: boolean;
}

export const QWEN_MODELS: QwenModel[] = [
  { key: 'qwen2.5-0.5b', name: 'Qwen2.5 0.5B', f16: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC', mb: 278, note: 'The lightest, for older phones. Fast but makes lots of mistakes.' },
  { key: 'qwen3-0.6b', name: 'Qwen3 0.6B', f16: 'Qwen3-0.6B-q4f16_1-MLC', f32: 'Qwen3-0.6B-q4f32_1-MLC', mb: 335, note: 'Tiny and quick. Still makes lots of mistakes.' },
  { key: 'qwen2.5-1.5b', name: 'Qwen2.5 1.5B', f16: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', mb: 869, note: 'The smallest that gives sensible answers. Newer phones and most computers.', recommended: true },
  { key: 'qwen3-4b', name: 'Qwen3 4B', f16: 'Qwen3-4B-q4f16_1-MLC', f32: 'Qwen3-4B-q4f32_1-MLC', mb: 2263, note: 'Much smarter. Needs a good computer.', big: true },
  { key: 'qwen2.5-7b', name: 'Qwen2.5 7B', f16: 'Qwen2.5-7B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-7B-Instruct-q4f32_1-MLC', mb: 4284, note: 'The best. Needs a strong gaming PC with 8 GB of graphics memory.', big: true },
];
export const DEFAULT_QWEN = QWEN_MODELS.find((m) => m.recommended)!;
export const qwenByKey = (key: string | null) => QWEN_MODELS.find((m) => m.key === key);
export const formatSize = (mb: number) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`);

/** Can this browser run the AI? (WebGPU, and whether it has half-precision maths.) */
let gpu: Promise<{ ok: boolean; f16: boolean }> | null = null;
export function qwenSupport(): Promise<{ ok: boolean; f16: boolean }> {
  if (import.meta.env.MODE === 'play') return Promise.resolve({ ok: false, f16: false });
  gpu ??= (async () => {
    try {
      const nav = navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } };
      const adapter = await nav.gpu?.requestAdapter();
      return { ok: !!adapter, f16: !!adapter?.features.has('shader-f16') };
    } catch {
      return { ok: false, f16: false };
    }
  })();
  return gpu;
}

const idFor = async (m: QwenModel) => ((await qwenSupport()).f16 ? m.f16 : m.f32);

/** Is every piece of this model already in the browser's storage? (Checked without loading the AI engine.) */
export async function isDownloaded(m: QwenModel): Promise<boolean> {
  try {
    const base = `https://huggingface.co/mlc-ai/${await idFor(m)}/resolve/main/`;
    const cache = await caches.open('webllm/model');
    const index = await cache.match(`${base}tensor-cache.json`);
    if (!index) return false;
    const { records } = (await index.json()) as { records: { dataPath: string }[] };
    for (const r of records) if (!(await cache.match(new URL(r.dataPath, base).href))) return false;
    return true;
  } catch {
    return false;
  }
}

// The worker (and the 6 MB engine inside it) only starts when a model is downloaded, used or removed.
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { ok: (v: string) => void; no: (e: Error) => void; progress?: (p: number, text: string) => void }>();
let loaded: string | null = null;

function call(msg: Record<string, unknown>, progress?: (p: number, text: string) => void): Promise<string> {
  if (import.meta.env.MODE === 'play') return Promise.reject(new Error('not in the PC file'));
  if (!worker) {
    worker = new Worker(new URL('./qwen.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data as { id: number; progress?: number; text?: string; done?: boolean; result?: string; error?: string };
      const p = pending.get(d.id);
      if (!p) return;
      if (d.progress !== undefined) return p.progress?.(d.progress, d.text ?? '');
      pending.delete(d.id);
      if (d.error) p.no(new Error(d.error));
      else p.ok(d.result ?? '');
    };
  }
  const id = ++nextId;
  return new Promise((ok, no) => {
    pending.set(id, { ok, no, progress });
    worker!.postMessage({ id, ...msg });
  });
}

/**
 * Download (the first time) and load a model. `onProgress` gets 0-1 and a short
 * status line. Downloading and loading are the same step: files already here are skipped.
 */
export async function loadQwen(m: QwenModel, onProgress?: (p: number, text: string) => void): Promise<void> {
  const id = await idFor(m);
  if (loaded === id) return;
  await call({ type: 'load', model: id }, onProgress);
  loaded = id;
}

/** Delete a downloaded model from this device. */
export async function removeQwen(m: QwenModel): Promise<void> {
  for (const id of [m.f16, m.f32]) {
    await call({ type: 'delete', model: id }).catch(() => undefined);
    if (loaded === id) loaded = null;
  }
}

export async function qwenChat(m: QwenModel, system: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  await loadQwen(m);
  const text = await call({ type: 'chat', messages: [{ role: 'system', content: system }, ...history.slice(-8)] });
  // Qwen3 can still wrap reasoning in <think> tags; keep only the answer.
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<\/?think>/g, '').replace(/\s*\[end\]\s*$/i, '').trim() || '…';
}
