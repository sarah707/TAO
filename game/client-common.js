(function (global) {
  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function requestJson(url, options = {}) {
    const startedAt = Date.now();
    const requestPath = String(typeof url === 'string' ? url : url?.url || url?.href || '').split(/[?#]/)[0];
    let status = 0;
    try {
      const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });
      status = response.status;
      const raw = await response.text();
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch (error) {
        throw new Error(`接口返回的内容不是有效 JSON，无法读取结果。\n响应类型：${response.headers.get('Content-Type') || '未知'}\n解析异常：${error.message}\n响应片段：${raw.slice(0, 500) || '[空响应]'}`);
      }
      if (!response.ok) {
        const error = new Error(payload.error || `请求失败（HTTP ${response.status}）`);
        error.status = response.status;
        throw error;
      }
      return payload;
    } catch (error) {
      const message = String(error?.message || error || '请求失败');
      const failure = new Error(`${message}\n请求接口：${options.method || 'GET'} ${requestPath}\nHTTP 状态：${status || '未收到响应'}\n接口耗时：${((Date.now() - startedAt) / 1000).toFixed(1)} 秒`);
      failure.status = error?.status || status;
      failure.cause = error;
      throw failure;
    }
  }

  function postJson(url, payload, method = 'POST') {
    return requestJson(url, {
      method,
      body: JSON.stringify(payload)
    });
  }

  function parseDurationMs(text) {
    const source = String(text || '');
    let totalMs = 0;
    for (const match of source.matchAll(/(\d+)\s*小?时/g)) {
      totalMs += Number(match[1]) * 60 * 60 * 1000;
    }
    for (const match of source.matchAll(/(\d+)\s*分(?:钟)?/g)) {
      totalMs += Number(match[1]) * 60 * 1000;
    }
    for (const match of source.matchAll(/(\d+)\s*秒/g)) {
      totalMs += Number(match[1]) * 1000;
    }
    return totalMs || null;
  }

  global.Games0Client = {
    escapeHtml,
    requestJson,
    postJson,
    parseDurationMs
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.Games0Client;
}
