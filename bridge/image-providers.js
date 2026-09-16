export const IMAGE_PROVIDER_IDS = Object.freeze(['gemini', 'vertex', 'openai', 'stability', 'a1111', 'bfl', 'comfyui']);

const DEFAULTS = Object.freeze({
  gemini: { apiUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-3.1-flash-image-preview' },
  vertex: { apiUrl: 'https://aiplatform.googleapis.com/v1', model: 'gemini-3.1-flash-image-preview' },
  openai: { apiUrl: 'https://api.openai.com/v1', model: 'gpt-image-1' },
  stability: { apiUrl: 'https://api.stability.ai/v2beta/stable-image/generate/core', model: '' },
  a1111: { apiUrl: 'http://127.0.0.1:7860', model: '' },
  bfl: { apiUrl: 'https://api.bfl.ai/v1/flux-2-pro', model: 'flux-2-pro' },
  comfyui: { apiUrl: 'http://127.0.0.1:8188', model: '' }
});

const PROVIDERS_WITH_OPTIONAL_KEY = new Set(['vertex', 'a1111', 'comfyui']);
const PROVIDERS_WITH_OPTIONAL_MODEL = new Set(['stability', 'a1111', 'bfl', 'comfyui']);
const VERTEX_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const VERTEX_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIXED_ASPECT_RATIO = '1:1';
const FIXED_IMAGE_SIZE = '1024x1024';
const vertexTokenCache = new Map();

function getProvider(rawProvider) {
  return IMAGE_PROVIDER_IDS.includes(rawProvider) ? rawProvider : 'gemini';
}

export function normalizeImageConfig(raw = {}) {
  const provider = getProvider(raw.provider);
  const defaults = DEFAULTS[provider];
  return {
    provider,
    apiUrl: String(raw.apiUrl || defaults.apiUrl).trim().replace(/\/+$/, ''),
    apiKey: String(raw.apiKey || '').trim(),
    model: String(raw.model ?? defaults.model).trim(),
    quality: String(raw.quality || 'auto').trim(),
    size: FIXED_IMAGE_SIZE,
    aspectRatio: FIXED_ASPECT_RATIO,
    negativePrompt: String(raw.negativePrompt || '').trim(),
    steps: Math.max(1, Math.min(150, Number(raw.steps || 24))),
    workflowJson: String(raw.workflowJson || '').trim(),
    imageProxyUrl: String(raw.imageProxyUrl || '').trim(),
    projectId: String(raw.projectId || '').trim(),
    location: String(raw.location || 'global').trim() || 'global',
    serviceAccountJson: String(raw.serviceAccountJson || '').trim()
  };
}

export function validateImageConfig(raw) {
  const config = normalizeImageConfig(raw);
  if (!config.apiUrl) throw new Error('请填写生图 API 地址。');
  if (!PROVIDERS_WITH_OPTIONAL_MODEL.has(config.provider) && !config.model) {
    throw new Error('请填写生图模型名称。');
  }
  if (!PROVIDERS_WITH_OPTIONAL_KEY.has(config.provider) && !config.apiKey) {
    throw new Error('请填写生图 API Key。');
  }
  if (config.provider === 'vertex') {
    if (!config.serviceAccountJson) throw new Error('请填写 Vertex 服务账号 JSON。');
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(config.serviceAccountJson);
    } catch {
      throw new Error('Vertex 服务账号 JSON 不是合法 JSON。');
    }
    if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
      throw new Error('Vertex 服务账号 JSON 缺少 client_email 或 private_key。');
    }
    config.projectId ||= String(serviceAccount.project_id || '').trim();
    if (!config.projectId) throw new Error('请填写 Vertex Project ID。');
  }
  if (config.provider === 'bfl' && !config.imageProxyUrl) {
    throw new Error('BFL 必须填写可返回图片字节的 CORS 图片代理地址。');
  }
  if (config.provider === 'comfyui') {
    if (!config.workflowJson) throw new Error('请粘贴 ComfyUI 的 API 格式工作流 JSON。');
    try {
      JSON.parse(config.workflowJson);
    } catch {
      throw new Error('ComfyUI 工作流不是合法 JSON。');
    }
  }
  return config;
}

function dataUrlToImagePart(value) {
  const match = String(value || '').match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function parseResponseJson(response) {
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`生图接口返回的不是 JSON（HTTP ${response.status}）。`);
  }
  if (!response.ok) {
    const detail = body?.error?.message || body?.message || body?.errors?.join?.('；') || text || `HTTP ${response.status}`;
    throw new Error(`生图请求失败：${detail}`);
  }
  return body;
}

function authHeaders(config, scheme = 'Bearer') {
  if (!config.apiKey) return {};
  if (scheme === 'x-key') return { 'x-key': config.apiKey };
  if (scheme === 'Basic') return { Authorization: `Basic ${btoa(config.apiKey)}` };
  return { Authorization: `Bearer ${config.apiKey}` };
}

function withPath(apiUrl, path) {
  return apiUrl.endsWith(path) ? apiUrl : `${apiUrl}${path}`;
}

function getDimensions(request, fallback = 1024) {
  const exact = String(request.size || '').match(/^(\d+)x(\d+)$/);
  if (exact) return { width: Number(exact[1]), height: Number(exact[2]) };
  const dimensions = {
    '1:1': [fallback, fallback],
    '3:4': [768, 1024],
    '4:3': [1024, 768],
    '9:16': [576, 1024],
    '16:9': [1024, 576]
  }[request.aspectRatio] || [fallback, fallback];
  return { width: dimensions[0], height: dimensions[1] };
}

function getStabilityRatio(ratio) {
  return ({ '3:4': '2:3', '4:3': '3:2' })[ratio] || ratio || '1:1';
}

async function blobToImagePart(blob) {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return { mimeType: blob.type || 'image/png', data: btoa(binary) };
}

async function fetchImageUrlAsPart(url, config = null) {
  let targetUrl = url;
  if (config?.imageProxyUrl) {
    targetUrl = config.imageProxyUrl.includes('{url}')
      ? config.imageProxyUrl.replaceAll('{url}', encodeURIComponent(url))
      : `${config.imageProxyUrl}${config.imageProxyUrl.includes('?') ? '&' : '?'}url=${encodeURIComponent(url)}`;
  }
  let response;
  try {
    response = await fetch(targetUrl);
  } catch (error) {
    if (config?.provider === 'bfl' && !config.imageProxyUrl) {
      throw new Error('BFL 图片交付地址不允许浏览器跨域下载。请填写可返回图片字节的 CORS 图片代理地址。');
    }
    throw error;
  }
  if (!response.ok) throw new Error(`图片下载失败（HTTP ${response.status}）。`);
  return blobToImagePart(await response.blob());
}

async function generateWithGemini(config, request) {
  const endpoint = `${config.apiUrl}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: request.aspectRatio || config.aspectRatio }
      }
    })
  });
  const raw = await parseResponseJson(response);
  const parts = raw?.candidates?.flatMap((candidate) => candidate?.content?.parts || []) || [];
  const image = parts.find((part) => part?.inlineData?.data)?.inlineData;
  if (!image?.data) throw new Error('生图接口没有返回图片数据。');
  return { mimeType: image.mimeType || 'image/png', data: image.data, raw };
}

function toBase64Url(bytes) {
  let binary = '';
  const source = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let index = 0; index < source.length; index += 0x8000) {
    binary += String.fromCharCode(...source.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeJsonPart(value) {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodePrivateKey(pem) {
  const base64 = String(pem || '')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!base64) throw new Error('Vertex 服务账号 private_key 为空。');
  try {
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error('Vertex 服务账号 private_key 格式无效。');
  }
}

async function createVertexAssertion(serviceAccount, tokenUrl) {
  if (!globalThis.crypto?.subtle) throw new Error('当前页面环境不支持 Web Crypto，无法使用 Vertex 服务账号。');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  if (serviceAccount.private_key_id) header.kid = serviceAccount.private_key_id;
  const payload = {
    iss: serviceAccount.client_email,
    scope: VERTEX_SCOPE,
    aud: tokenUrl,
    iat: now,
    exp: now + 3600
  };
  const signingInput = `${encodeJsonPart(header)}.${encodeJsonPart(payload)}`;
  let key;
  try {
    key = await globalThis.crypto.subtle.importKey(
      'pkcs8',
      decodePrivateKey(serviceAccount.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } catch (error) {
    throw new Error(`Vertex 服务账号 private_key 无法导入：${error.message || '格式错误'}`);
  }
  const signature = await globalThis.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${toBase64Url(signature)}`;
}

async function getVertexAccessToken(serviceAccount) {
  const tokenUrl = String(serviceAccount.token_uri || VERTEX_TOKEN_URL).trim() || VERTEX_TOKEN_URL;
  const cacheKey = `${serviceAccount.client_email}\n${serviceAccount.private_key_id || ''}\n${serviceAccount.private_key}`;
  const cached = vertexTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60000) return cached.accessToken;

  const assertion = await createVertexAssertion(serviceAccount, tokenUrl);
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const raw = await response.json().catch(() => ({}));
  if (!response.ok || !raw.access_token) {
    throw new Error(`Vertex OAuth 换取令牌失败：${raw.error_description || raw.error || `HTTP ${response.status}`}`);
  }
  const expiresIn = Math.max(60, Number(raw.expires_in || 3600));
  vertexTokenCache.set(cacheKey, { accessToken: raw.access_token, expiresAt: Date.now() + expiresIn * 1000 });
  return raw.access_token;
}

function getVertexEndpoint(config) {
  let apiRoot = config.apiUrl;
  if (config.location !== 'global' && apiRoot === DEFAULTS.vertex.apiUrl) {
    apiRoot = `https://${config.location}-aiplatform.googleapis.com/v1`;
  }
  return `${apiRoot}/projects/${encodeURIComponent(config.projectId)}/locations/${encodeURIComponent(config.location)}/publishers/google/models/${encodeURIComponent(config.model)}:generateContent`;
}

async function generateWithVertex(config, request) {
  const serviceAccount = JSON.parse(config.serviceAccountJson);
  const accessToken = await getVertexAccessToken(serviceAccount);
  const response = await fetch(getVertexEndpoint(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: request.aspectRatio || config.aspectRatio }
      }
    })
  });
  const raw = await parseResponseJson(response);
  const parts = raw?.candidates?.flatMap((candidate) => candidate?.content?.parts || []) || [];
  const image = parts.find((part) => part?.inlineData?.data)?.inlineData;
  if (!image?.data) throw new Error('Vertex 生图接口没有返回图片数据。');
  return { mimeType: image.mimeType || 'image/png', data: image.data, raw };
}

async function generateWithOpenAi(config, request) {
  const endpoint = withPath(config.apiUrl, '/images/generations');
  const body = { model: config.model, prompt: request.prompt, n: 1, size: request.size || config.size };
  if (config.quality && config.quality !== 'auto') body.quality = config.quality;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
    body: JSON.stringify(body)
  });
  const raw = await parseResponseJson(response);
  const first = raw?.data?.[0] || {};
  if (first.b64_json) return { mimeType: 'image/png', data: first.b64_json, raw };
  const embedded = dataUrlToImagePart(first.url);
  if (embedded) return { ...embedded, raw };
  if (first.url) return { ...(await fetchImageUrlAsPart(first.url, config)), raw };
  throw new Error('生图接口没有返回图片数据。');
}

async function generateWithStability(config, request) {
  const form = new FormData();
  form.set('prompt', request.prompt);
  form.set('aspect_ratio', getStabilityRatio(request.aspectRatio));
  form.set('output_format', 'png');
  if (config.negativePrompt) form.set('negative_prompt', config.negativePrompt);
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { Accept: 'image/*', ...authHeaders(config) },
    body: form
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Stability 生图失败（HTTP ${response.status}）：${detail}`);
  }
  return { ...(await blobToImagePart(await response.blob())), raw: { provider: 'stability' } };
}

async function generateWithA1111(config, request) {
  const dimensions = getDimensions(request);
  const body = {
    prompt: request.prompt,
    negative_prompt: config.negativePrompt,
    steps: config.steps,
    width: dimensions.width,
    height: dimensions.height,
    send_images: true,
    save_images: false
  };
  if (config.model) body.override_settings = { sd_model_checkpoint: config.model };
  const response = await fetch(withPath(config.apiUrl, '/sdapi/v1/txt2img'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config, config.apiKey.includes(':') ? 'Basic' : 'Bearer') },
    body: JSON.stringify(body)
  });
  const raw = await parseResponseJson(response);
  const image = raw?.images?.[0];
  if (!image) throw new Error('AUTOMATIC1111 没有返回图片数据。');
  const embedded = dataUrlToImagePart(image);
  return { mimeType: embedded?.mimeType || 'image/png', data: embedded?.data || image, raw };
}

async function pollJson(url, options, decide, timeoutMs = 240000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(url, options);
    const body = await parseResponseJson(response);
    const result = decide(body);
    if (result?.done) return result.value;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('生图任务等待超时。');
}

async function generateWithBfl(config, request) {
  const dimensions = getDimensions(request);
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...authHeaders(config, 'x-key') },
    body: JSON.stringify({ prompt: request.prompt, width: dimensions.width, height: dimensions.height, output_format: 'png' })
  });
  const submitted = await parseResponseJson(response);
  if (!submitted.polling_url) throw new Error('BFL 没有返回 polling_url。');
  const finished = await pollJson(submitted.polling_url, {
    headers: { Accept: 'application/json', ...authHeaders(config, 'x-key') }
  }, (body) => {
    if (body.status === 'Ready') return { done: true, value: body };
    if (['Error', 'Failed', 'Request Moderated', 'Content Moderated'].includes(body.status)) {
      throw new Error(`BFL 生图失败：${body.error || body.status}`);
    }
    return { done: false };
  });
  const imageUrl = finished?.result?.sample;
  if (!imageUrl) throw new Error('BFL 完成任务后没有返回图片地址。');
  return { ...(await fetchImageUrlAsPart(imageUrl, config)), raw: finished };
}

function applyWorkflowTemplate(value, replacements) {
  if (Array.isArray(value)) return value.map((item) => applyWorkflowTemplate(item, replacements));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, applyWorkflowTemplate(item, replacements)]));
  }
  if (value === '{{seed}}') return replacements.seed;
  if (value === '{{width}}') return replacements.width;
  if (value === '{{height}}') return replacements.height;
  if (typeof value === 'string') {
    return value
      .replaceAll('{{prompt}}', replacements.prompt)
      .replaceAll('{{negative_prompt}}', replacements.negativePrompt)
      .replaceAll('{{seed}}', String(replacements.seed))
      .replaceAll('{{width}}', String(replacements.width))
      .replaceAll('{{height}}', String(replacements.height));
  }
  return value;
}

async function generateWithComfyUi(config, request) {
  const dimensions = getDimensions(request);
  const prompt = applyWorkflowTemplate(JSON.parse(config.workflowJson), {
    prompt: request.prompt,
    negativePrompt: config.negativePrompt,
    seed: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    width: dimensions.width,
    height: dimensions.height
  });
  const response = await fetch(withPath(config.apiUrl, '/prompt'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config) },
    body: JSON.stringify({ prompt })
  });
  const submitted = await parseResponseJson(response);
  if (!submitted.prompt_id) throw new Error('ComfyUI 没有返回 prompt_id。');
  const history = await pollJson(withPath(config.apiUrl, `/history/${encodeURIComponent(submitted.prompt_id)}`), {
    headers: { ...authHeaders(config) }
  }, (body) => {
    const item = body?.[submitted.prompt_id];
    if (!item) return { done: false };
    if (item.status?.status_str === 'error') throw new Error('ComfyUI 工作流执行失败。');
    if (item.status?.completed || item.outputs) return { done: true, value: item };
    return { done: false };
  });
  const images = Object.values(history?.outputs || {}).flatMap((output) => output?.images || []);
  const image = images[0];
  if (!image?.filename) throw new Error('ComfyUI 工作流没有输出 SaveImage/PreviewImage 图片。');
  const params = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || '', type: image.type || 'output' });
  const imagePart = await fetchImageUrlAsPart(`${withPath(config.apiUrl, '/view')}?${params.toString()}`, config);
  return { ...imagePart, raw: history };
}

const GENERATORS = {
  gemini: generateWithGemini,
  vertex: generateWithVertex,
  openai: generateWithOpenAi,
  stability: generateWithStability,
  a1111: generateWithA1111,
  bfl: generateWithBfl,
  comfyui: generateWithComfyUi
};

export async function generateImage(rawConfig, request) {
  const config = validateImageConfig(rawConfig);
  const normalizedRequest = {
    prompt: String(request?.prompt || '').trim(),
    aspectRatio: FIXED_ASPECT_RATIO,
    size: FIXED_IMAGE_SIZE
  };
  if (!normalizedRequest.prompt) throw new Error('生图提示词不能为空。');
  return GENERATORS[config.provider](config, normalizedRequest);
}

export function getDefaultImageConfig(provider = 'gemini') {
  return normalizeImageConfig({ provider });
}
