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
    try {
      const response = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {})
        }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || `请求失败（HTTP ${response.status}）`);
        error.status = response.status;
        throw error;
      }
      return payload;
    } catch (error) {
      const message = String(error?.message || '');
      if (message === 'Load failed' || message === 'Failed to fetch' || message === 'NetworkError when attempting to fetch resource.') {
        throw new Error('网络请求失败（Load failed）。请检查网页服务是否在线，或稍后重试。');
      }
      throw error;
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
