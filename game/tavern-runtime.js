(() => {
  'use strict';

  const BRIDGE_KEY = '__NOBLE_SCHOOL_TAVERN_BRIDGE_V1__';
  const originalFetch = window.fetch.bind(window);
  const jobs = new Map();

  function bridge() {
    const value = window.parent?.[BRIDGE_KEY];
    if (!value?.request) throw new Error('酒馆桥接尚未就绪，请关闭浮窗后重新打开。');
    return value;
  }

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  function normalizePath(input) {
    const raw = typeof input === 'string' ? input : input?.url;
    try {
      return new URL(raw, window.location.href).pathname.replace(/\/{2,}/g, '/');
    } catch {
      return String(raw || '');
    }
  }

  async function readJsonFile(name) {
    const response = await originalFetch(name, { cache: 'no-store' });
    if (!response.ok) throw new Error(`读取 ${name} 失败。`);
    return response.json();
  }

  async function bootstrapResponse() {
    const [courseMap, schedule, homework] = await Promise.all([
      readJsonFile('editsch-course-map.json'),
      readJsonFile('.editsch-schedule.txt'),
      readJsonFile('.editsch-homework.txt')
    ]);
    return { courseMap, schedule, homework, aiModels: null };
  }

  function createJob(payload) {
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const job = { id, status: 'queued', result: null, error: '' };
    jobs.set(id, job);
    Promise.resolve().then(async () => {
      job.status = 'running';
      try {
        job.result = await bridge().request(payload);
        job.status = 'completed';
      } catch (error) {
        job.error = String(error?.message || error || '请求失败');
        job.status = 'failed';
      }
    });
    return job;
  }

  async function getRequestBody(input, init) {
    if (init?.body) return JSON.parse(init.body);
    if (typeof input !== 'string' && input?.clone) return input.clone().json();
    return {};
  }

  window.fetch = async (input, init = {}) => {
    const path = normalizePath(input);
    const method = String(init.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
    if (!/(?:^|\/)api\//.test(path)) return originalFetch(input, init);

    if (path.endsWith('/api/game/bootstrap')) return jsonResponse(await bootstrapResponse());
    if (path.endsWith('/api/ai-settings')) {
      return jsonResponse({ settings: { provider: 'aiStudio', modelId: 'gemini-2.5-flash', configured: true } });
    }
    if (path.endsWith('/api/card-storage/chat') && method === 'GET') {
      return jsonResponse(await bridge().loadGameStorage());
    }
    if (path.endsWith('/api/card-storage/chat') && method === 'POST') {
      const payload = await getRequestBody(input, init);
      return jsonResponse(await bridge().saveGameStorage(payload.data, payload.chatId));
    }
    if (path.endsWith('/api/card-images/upload') && method === 'POST') {
      const payload = await getRequestBody(input, init);
      return jsonResponse(await bridge().uploadImage(payload));
    }
    if (path.endsWith('/api/generate') && method === 'POST') {
      const payload = await getRequestBody(input, init);
      const job = createJob(payload);
      return jsonResponse({ job: { id: job.id, status: job.status } }, 202);
    }
    const jobMatch = path.match(/\/api\/ai-jobs\/([^/]+)$/);
    if (jobMatch) {
      const job = jobs.get(decodeURIComponent(jobMatch[1]));
      if (!job) return jsonResponse({ error: 'AI 任务不存在。' }, 404);
      return jsonResponse({ job: { id: job.id, status: job.status, result: job.result, error: job.error } });
    }
    return jsonResponse({ error: `酒馆版不支持接口：${path}` }, 404);
  };
})();
