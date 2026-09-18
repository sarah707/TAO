import { makeGenerationId, sanitizeAiText } from './text.js?build=20260918142507';
import { buildExportWorldbook } from './worldbook.js?build=20260918142507';

export const BRIDGE_KEY = '__NOBLE_SCHOOL_TAVERN_BRIDGE_V1__';
export const CHAT_STORAGE_VARIABLE = '$nobleSchoolGameStorage';

function getMiniGameImageApi(hostWindow, apiWindow) {
  for (const candidateWindow of collectAccessibleWindows(hostWindow, apiWindow)) {
    if (candidateWindow?.STMiniGameImage) return candidateWindow.STMiniGameImage;
  }
  return null;
}

function collectAccessibleWindows(...seeds) {
  const windows = [];
  for (const seed of seeds) {
    let current = seed;
    for (let depth = 0; current && depth < 6; depth += 1) {
      if (!windows.includes(current)) windows.push(current);
      try {
        if (!current.parent || current.parent === current) break;
        current = current.parent;
      } catch {
        break;
      }
    }
  }
  return windows;
}

function isTextGenerationEndpoint(input, baseUrl = '') {
  const raw = typeof input === 'string' ? input : input?.url || input?.href || '';
  try {
    const path = new URL(raw, baseUrl || 'http://localhost/').pathname.replace(/\/{2,}/g, '/');
    return path === '/api/backends/chat-completions/generate'
      || path === '/api/backends/text-completions/generate'
      || path === '/api/backends/kobold/generate'
      || path === '/api/novelai/generate';
  } catch {
    return /\/api\/(?:backends\/[^/]+\/|novelai\/)generate(?:[?#]|$)/.test(String(raw));
  }
}

function parseJsonObject(value) {
  try {
    const parsed = JSON.parse(String(value || ''));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function redactDiagnosticText(value) {
  return String(value || '')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [已隐藏]')
    .replace(/(["']?(?:api[_-]?key|access[_-]?token|authorization|password|secret)["']?\s*[:=]\s*["']?)([^"',}\s]+)/gi, '$1[已隐藏]');
}

function readGenerationRequestMetadata(input, init) {
  const rawBody = init?.body ?? (typeof input === 'object' ? input?.body : null);
  if (typeof rawBody !== 'string') return {};
  const body = parseJsonObject(rawBody);
  if (!body) return {};
  return {
    source: String(body.chat_completion_source || body.api_type || '').trim(),
    model: String(body.model || '').trim()
  };
}

function extractGenerationResponseText(body) {
  if (typeof body === 'string') return body;
  const content = body?.choices?.[0]?.message?.content
    ?? body?.choices?.[0]?.text
    ?? body?.text
    ?? body?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const parts = content.filter((part) => part?.type === 'text' && typeof part.text === 'string');
    if (parts.length) return parts.map((part) => part.text).join('');
  }
  return null;
}

function isOwnNonStreamingRequest(input, init, eventPrompt) {
  const rawBody = init?.body ?? input?.body;
  if (typeof rawBody !== 'string') return false;
  const body = parseJsonObject(rawBody);
  if (!body || body.stream === true || !Array.isArray(body.messages)) return false;
  const lastUser = body.messages.findLast((message) => message?.role === 'user');
  return formatFinalPromptContent(lastUser?.content) === eventPrompt;
}

function createGenerationErrorCapture(hostWindow, apiWindow, eventPrompt) {
  const patches = [];
  let captured = null;
  let rawResponseText = null;
  for (const candidateWindow of collectAccessibleWindows(hostWindow, apiWindow)) {
    let originalFetch;
    try {
      originalFetch = candidateWindow?.fetch;
    } catch {
      continue;
    }
    if (typeof originalFetch !== 'function') continue;
    const wrappedFetch = async function (...args) {
      const [input, init] = args;
      if (!isTextGenerationEndpoint(input, candidateWindow?.location?.href)) {
        return originalFetch.apply(this, args);
      }
      const startedAt = Date.now();
      const rawUrl = typeof input === 'string' ? input : input?.url || input?.href || '';
      let endpoint;
      try {
        endpoint = new URL(rawUrl, candidateWindow?.location?.href || 'http://localhost/').pathname;
      } catch {
        endpoint = String(rawUrl).split(/[?#]/)[0];
      }
      const request = {
        endpoint,
        ...readGenerationRequestMetadata(input, init)
      };
      const isOwnRequest = isOwnNonStreamingRequest(input, init, eventPrompt);
      captured = request;
      let response;
      try {
        response = await originalFetch.apply(this, args);
      } catch (error) {
        captured = { ...request, elapsedMs: Date.now() - startedAt, transportError: String(error?.message || error) };
        throw error;
      }
      captured = {
        ...request,
        elapsedMs: Date.now() - startedAt,
        httpStatus: Number(response?.status || 0),
        httpStatusText: String(response?.statusText || '').trim()
      };
      if (!response?.ok) {
        let responseText = '';
        try {
          responseText = await response.clone().text();
        } catch {
          // Preserve the original response even when this browser cannot clone it.
        }
        captured = {
          ...captured,
          responseText: redactDiagnosticText(responseText).slice(0, 6000),
          responseBody: parseJsonObject(responseText)
        };
      } else if (isOwnRequest && !String(response.headers?.get?.('content-type') || '').includes('text/event-stream')) {
        // Clone before handing the response to TavernHelper: generation-end hooks can
        // replace its returned message. Never use an unrelated request as our raw text.
        try {
          const body = await response.clone().json();
          rawResponseText = extractGenerationResponseText(body);
        } catch {
          // Unsupported transports still use the helper result, explicitly marked below.
        }
      }
      return response;
    };
    try {
      candidateWindow.fetch = wrappedFetch;
      if (candidateWindow.fetch === wrappedFetch) {
        patches.push({ candidateWindow, originalFetch, wrappedFetch });
      }
    } catch {
      // Some embedded browser surfaces expose a read-only fetch property.
    }
  }
  return {
    getError: () => captured,
    getRawResponseText: () => rawResponseText,
    restore() {
      for (const { candidateWindow, originalFetch, wrappedFetch } of patches.reverse()) {
        try {
          if (candidateWindow.fetch === wrappedFetch) candidateWindow.fetch = originalFetch;
        } catch {
          // Leave a fetch replaced by another extension untouched.
        }
      }
    }
  };
}

function enhanceGenerationError(error, captured = {}, context = {}) {
  captured ||= {};
  const body = captured.responseBody;
  const upstream = body?.error && typeof body.error === 'object' ? body.error : body;
  const upstreamCode = upstream?.code ?? body?.code ?? '';
  const upstreamStatus = upstream?.status ?? body?.status ?? '';
  const upstreamMessage = redactDiagnosticText(
    upstream?.message
      || (typeof body?.error === 'string' ? body.error : '')
      || body?.message
      || body?.response
      || ''
  ).trim();
  const httpStatus = captured.httpStatus
    ? `HTTP ${captured.httpStatus}${captured.httpStatusText ? ` ${captured.httpStatusText}` : ''}`
    : (captured.transportError ? '未收到 HTTP 响应' : '未捕获 HTTP 状态');
  const lines = [
    '文字生成请求失败。',
    `失败阶段：${context.stage || '等待酒馆生成结果'}`,
    `酒馆接口：${httpStatus}`
  ];
  if (captured.endpoint) lines.push(`请求路径：${captured.endpoint}`);
  if (context.elapsedMs !== undefined) lines.push(`本次耗时：${(context.elapsedMs / 1000).toFixed(1)} 秒`);
  if (captured.transportError) lines.push('连接在返回 HTTP 响应前失败，浏览器未提供服务端响应正文。');
  if (upstreamCode || upstreamStatus) {
    lines.push(`上游状态：${[upstreamCode, upstreamStatus].filter(Boolean).join(' / ')}`);
  }
  if (upstreamMessage) lines.push(`上游信息：${upstreamMessage}`);
  if (captured.source || captured.model) {
    lines.push(`生成配置：${[captured.source, captured.model].filter(Boolean).join(' / ')}`);
  }
  if (context.textPresetMode) {
    lines.push(`提示词模式：${context.textPresetMode === 'builtin' ? '游戏内置预设' : '酒馆当前预设'}`);
  }
  if (context.generationId) lines.push(`诊断编号：${context.generationId}`);
  const originalMessage = redactDiagnosticText(error?.message || error || '').trim();
  if (originalMessage) lines.push(`原始异常：${originalMessage}`);
  if (captured.responseText) lines.push(`上游原始响应：${captured.responseText}`);
  if (context.rawText !== undefined) {
    lines.push(`AI 已返回 ${context.rawText.length} 字符；当前错误发生在回复返回之后。`);
    lines.push(`回复原文片段：${context.rawText.slice(0, 1500)}`);
  }
  const enhanced = new Error(lines.join('\n'));
  enhanced.name = error?.name || 'GenerationError';
  enhanced.cause = error;
  return enhanced;
}

function collectApiSurfaces(hostWindow, apiWindow) {
  const surfaces = [];
  for (const candidateWindow of collectAccessibleWindows(apiWindow, hostWindow)) {
    for (const surface of [candidateWindow?.TavernHelper, candidateWindow?.SillyTavern, candidateWindow]) {
      if (surface && !surfaces.includes(surface)) surfaces.push(surface);
    }
  }
  return surfaces;
}

function callFirstAvailable(surfaces, methodName, ...args) {
  for (const surface of surfaces) {
    if (typeof surface?.[methodName] !== 'function') continue;
    try {
      const value = surface[methodName](...args);
      if (value && typeof value.then === 'function') continue;
      if (value !== undefined && value !== null && value !== '') return value;
    } catch {
      // Try the same API exposed on the next accessible window/surface.
    }
  }
  return null;
}

function getHostContexts(hostWindow, apiWindow) {
  const contexts = [];
  for (const surface of collectApiSurfaces(hostWindow, apiWindow)) {
    if (typeof surface?.getContext !== 'function') continue;
    try {
      const context = surface.getContext();
      if (context && !contexts.includes(context)) contexts.push(context);
    } catch {
      // Continue searching parent windows.
    }
  }
  return contexts;
}

function getHostContext(hostWindow, apiWindow) {
  return getHostContexts(hostWindow, apiWindow)[0] || null;
}

function readPersonaDomValue(hostWindow, apiWindow, selector) {
  for (const candidateWindow of collectAccessibleWindows(hostWindow, apiWindow)) {
    try {
      const element = candidateWindow?.document?.querySelector?.(selector);
      const value = String(element?.value || element?.textContent || '').trim();
      if (value) return value;
    } catch {
      // Ignore inaccessible or cross-origin parent documents.
    }
  }
  return '';
}

function expandMacro(value, expanders) {
  const source = String(value || '').trim();
  for (const expand of expanders) {
    if (typeof expand !== 'function') continue;
    try {
      const expanded = String(expand(source) || '').trim();
      if (expanded && expanded !== source) return expanded;
    } catch {
      // Try the next supported SillyTavern/TavernHelper macro API.
    }
  }
  return '';
}

function normalizeServerImagePath(value, hostWindow) {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  try {
    const url = new URL(raw, hostWindow.location?.origin || hostWindow.location?.href);
    if (url.pathname.includes('/user/images/')) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    if (raw.includes('/user/images/')) {
      return raw.slice(raw.indexOf('/user/images/'));
    }
  }
  return raw;
}

function resolveServerImageUrl(value, hostWindow) {
  const raw = String(value || '').trim();
  if (!raw.includes('/user/images/')) return raw;
  const path = raw.slice(raw.indexOf('/user/images/'));
  try {
    return new URL(path, hostWindow.location?.origin || hostWindow.location?.href).href;
  } catch {
    return raw;
  }
}

function mapStoredImageUrls(value, mapper) {
  if (Array.isArray(value)) return value.map((item) => mapStoredImageUrls(item, mapper));
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (['avatarUrl', 'avatarOriginalUrl', 'imageUrl', 'imageOriginalUrl'].includes(key) && typeof item === 'string') {
      result[key] = mapper(item);
    } else {
      result[key] = mapStoredImageUrls(item, mapper);
    }
  }
  return result;
}

function sanitizeUploadName(value) {
  return String(value || `image-${Date.now()}`)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `image-${Date.now()}`;
}

function buildOrderedPrompts(payload) {
  const ordered = [];
  const systemInstruction = buildBuiltInSystemInstruction(payload);
  const supportingContextInstruction = buildSupportingContextInjection(payload);
  const penultimateUserInstruction = buildPenultimateUserInstruction(payload);
  if (systemInstruction) {
    ordered.push({ role: 'system', content: systemInstruction });
  }
  if (supportingContextInstruction) {
    ordered.push({ role: 'user', content: supportingContextInstruction });
  }
  if (penultimateUserInstruction) {
    ordered.push({ role: 'user', content: penultimateUserInstruction });
  }
  ordered.push('user_input');
  return ordered;
}

function buildSupportingContextInjection(payload) {
  const options = payload?.options || {};
  const parts = [];
  if (options.retryMarker) {
    parts.push(String(options.retryMarker));
  }
  if (options.historySystemInstruction) {
    parts.push(String(options.historySystemInstruction));
  }
  if (options.assistantInstruction) {
    parts.push(String(options.assistantInstruction));
  }
  if (options.locationInstruction) {
    parts.push(`以下是此前已经确定的地点描述，后续章节可据此保持一致：\n${String(options.locationInstruction)}`);
  }
  return parts.map((part) => part.trim()).filter(Boolean).join('\n\n');
}

function buildPenultimateUserInstruction(payload) {
  const options = payload?.options || {};
  return [options.outputFormatInstruction, options.writingPointsInstruction]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('\n\n');
}

function buildBuiltInSystemInstruction(payload) {
  const options = payload?.options || {};
  const separated = [options.builtInStyleInstruction, options.scriptSettingsInstruction]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('\n\n');
  return separated || String(options.systemInstruction || '').trim();
}

function buildVisibleTextPrompt(payload, textPresetMode) {
  const options = payload?.options || {};
  const prompt = String(payload?.prompt || '').trim();
  const sections = [];
  const pushSection = (label, content) => {
    const text = String(content || '').trim();
    if (text) sections.push(`===== ${label} =====\n${text}`);
  };

  if (textPresetMode === 'tavern') {
    pushSection('SYSTEM｜before_prompt｜游戏剧本设定', options.scriptSettingsInstruction);
    pushSection('USER｜in_chat depth=2｜履历、旧章节与地点资料', buildSupportingContextInjection(payload));
    pushSection('USER｜in_chat depth=1｜输出格式与写作要求', buildPenultimateUserInstruction(payload));
    pushSection('USER｜user_input｜本次事件', prompt);
  } else {
    pushSection('SYSTEM｜游戏内置文风与剧本设定', buildBuiltInSystemInstruction(payload));
    pushSection('USER｜in_chat depth=2｜履历、旧章节与地点资料', buildSupportingContextInjection(payload));
    pushSection('USER｜倒数第二条｜输出格式与写作要求', buildPenultimateUserInstruction(payload));
    pushSection('USER｜user_input｜本次事件', prompt);
  }

  return sections.join('\n\n');
}

function formatFinalPromptContent(content) {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return String(content || '').trim();
  return content.map((part) => {
    if (typeof part === 'string') return part;
    if (part?.type === 'text' && typeof part.text === 'string') return part.text;
    if (part?.type === 'image_url' || part?.image_url) return '[图片内容]';
    try {
      return JSON.stringify(part, null, 2);
    } catch {
      return String(part || '');
    }
  }).filter(Boolean).join('\n').trim();
}

function formatCapturedFinalPrompt(messages) {
  return messages.map((message, index) => {
    const role = String(message?.role || 'unknown').toUpperCase();
    const content = formatFinalPromptContent(message?.content);
    return `===== FINAL MESSAGE ${index + 1}｜${role} =====\n${content || '[空内容]'}`;
  }).join('\n\n');
}

function removePromptContent(messages, targetContent) {
  const target = String(targetContent || '').trim();
  if (!target) return;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (typeof message?.content === 'string') {
      if (!message.content.includes(target)) continue;
      const remaining = message.content.split(target).join('').trim();
      if (remaining) message.content = remaining;
      else messages.splice(index, 1);
      continue;
    }
    if (!Array.isArray(message?.content)) continue;
    message.content = message.content
      .map((part) => {
        if (part?.type !== 'text' || typeof part.text !== 'string' || !part.text.includes(target)) return part;
        const remaining = part.text.split(target).join('').trim();
        return remaining ? { ...part, text: remaining } : null;
      })
      .filter(Boolean);
    if (message.content.length === 0) messages.splice(index, 1);
  }
}

function appendTextToMessage(message, text) {
  const addition = String(text || '').trim();
  if (!addition || !message) return false;
  if (typeof message.content === 'string') {
    message.content = `${message.content.trimEnd()}\n${addition}`;
    return true;
  }
  if (!Array.isArray(message.content)) return false;
  const lastTextPart = [...message.content].reverse().find((part) => part?.type === 'text' && typeof part.text === 'string');
  if (lastTextPart) lastTextPart.text = `${lastTextPart.text.trimEnd()}\n${addition}`;
  else message.content.push({ type: 'text', text: addition });
  return true;
}

function removeEmptyReorderedPromptWrappers(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (typeof message?.content !== 'string') continue;
    let remaining = message.content
      .replace(/<latest_user_input\b[^>]*>\s*<\/latest_user_input>/gi, '')
      .replace(/<previous_round\b[^>]*>\s*<\/previous_round>/gi, '')
      .trim();
    if (/^<\/previous_round>$/i.test(remaining)) {
      const previousMessage = messages[index - 1];
      const previousContent = formatFinalPromptContent(previousMessage?.content);
      if (/<previous_round\b[^>]*>/i.test(previousContent) && !/<\/previous_round>/i.test(previousContent)) {
        appendTextToMessage(previousMessage, '</previous_round>');
      }
      messages.splice(index, 1);
      continue;
    }
    if (!remaining) {
      messages.splice(index, 1);
      continue;
    }
    message.content = remaining;
  }
}

function moveRequiredUserPromptsToEnd(messages, penultimateUserPrompt, eventPrompt) {
  removePromptContent(messages, penultimateUserPrompt);
  removePromptContent(messages, eventPrompt);
  removeEmptyReorderedPromptWrappers(messages);
  const penultimate = String(penultimateUserPrompt || '').trim();
  const event = String(eventPrompt || '').trim();
  if (penultimate) messages.push({ role: 'user', content: penultimate });
  if (event) messages.push({ role: 'user', content: event });
}

function createFinalPromptCapture(hostWindow, apiWindow, options = {}) {
  for (const context of getHostContexts(hostWindow, apiWindow)) {
    const eventSource = context?.eventSource;
    const eventName = context?.eventTypes?.CHAT_COMPLETION_SETTINGS_READY || 'chat_completion_settings_ready';
    if (!eventSource || (typeof eventSource.makeLast !== 'function' && typeof eventSource.on !== 'function')) continue;
    let capturedMessages = null;
    const listener = async (completion) => {
      options.onPromptReady?.();
      if (!Array.isArray(completion?.messages)) return;
      if (options.removeTrailingModelPrompt) {
        const lastMessage = completion.messages.at(-1);
        if (lastMessage && ['assistant', 'model'].includes(String(lastMessage.role || '').toLowerCase())) {
          completion.messages.pop();
        }
      }
      moveRequiredUserPromptsToEnd(
        completion.messages,
        options.penultimateUserPrompt,
        options.eventPrompt
      );
      capturedMessages = completion.messages.map((message) => ({
        role: message?.role,
        content: message?.content
      }));
      // 酒馆会等待最终提示词事件结束，再发送模型请求。
      await options.onCaptured?.(capturedMessages);
    };
    if (typeof eventSource.makeLast === 'function') {
      eventSource.makeLast(eventName, listener);
    } else {
      eventSource.on(eventName, listener);
    }
    return {
      available: true,
      getMessages: () => capturedMessages,
      stop() {
        eventSource.removeListener?.(eventName, listener);
      }
    };
  }
  return {
    available: false,
    getMessages: () => null,
    stop() {}
  };
}

function wrapPromptForChat(prompt, textPresetMode, capturedFinalPrompt) {
  const source = String(prompt || '').trim();
  let longestBacktickRun = 0;
  for (const match of source.matchAll(/`+/g)) {
    longestBacktickRun = Math.max(longestBacktickRun, match[0].length);
  }
  const fence = '`'.repeat(Math.max(3, longestBacktickRun + 1));
  const modeLabel = textPresetMode === 'tavern' ? '酒馆当前预设' : '游戏内置预设';
  const note = capturedFinalPrompt
    ? '以下内容截取自酒馆提示词查看器使用的最终消息事件，已经过预设宏、变量、世界书、模板和游戏注入处理。'
    : '当前酒馆助手没有暴露最终消息事件；以下仅展示游戏本次提交的提示词。';
  return `【贵族学校的特招生｜本次发送给 AI 的完整提示词】\n模式：${modeLabel}\n${note}\n\n${fence}text\n${source}\n${fence}`;
}

function emptyPromptOverrides() {
  return {
    char_description: '',
    char_personality: '',
    scenario: '',
    dialogue_examples: '',
    chat_history: {
      prompts: [],
      with_depth_entries: true,
      author_note: ''
    }
  };
}

function getChatCompletionSettings(hostWindow, apiWindow) {
  return getHostContexts(hostWindow, apiWindow)
    .map((context) => context?.chatCompletionSettings)
    .find((settings) => settings && typeof settings === 'object') || null;
}

const LAST_USER_MESSAGE_MACRO_PATTERN = /\{\{\s*lastUserMessage\s*\}\}/i;

function suppressLastUserMessagePresetPrompts(hostWindow, apiWindow) {
  const settings = getChatCompletionSettings(hostWindow, apiWindow);
  const rawPrompts = Array.isArray(settings?.prompts) ? settings.prompts : null;
  const surfaces = collectApiSurfaces(hostWindow, apiWindow);
  const preset = callFirstAvailable(surfaces, 'getPreset', 'in_use');
  const presetPrompts = Array.isArray(preset?.prompts) ? preset.prompts : null;
  const detected = (presetPrompts || rawPrompts || []).filter((prompt) => (
    prompt?.enabled !== false
      && LAST_USER_MESSAGE_MACRO_PATTERN.test(String(prompt?.content || ''))
  ));
  if (detected.length === 0) {
    return { restore() {} };
  }
  if (!rawPrompts) {
    throw new Error('检测到酒馆预设含有 {{lastUserMessage}}，但当前酒馆没有开放可在渲染前过滤的预设数据；请更新 SillyTavern。');
  }
  const detectedIds = new Set(detected.map((prompt) => String(prompt?.id || prompt?.identifier || '')).filter(Boolean));
  const targets = rawPrompts.filter((prompt) => (
    LAST_USER_MESSAGE_MACRO_PATTERN.test(String(prompt?.content || ''))
      || detectedIds.has(String(prompt?.id || prompt?.identifier || ''))
  ));
  if (targets.length === 0) {
    throw new Error('检测到酒馆预设含有 {{lastUserMessage}}，但无法定位对应的原始预设条目。');
  }
  const originals = targets.map((prompt) => ({ prompt, content: prompt.content }));
  for (const { prompt } of originals) prompt.content = '';
  let restored = false;
  return {
    restore() {
      if (restored) return;
      restored = true;
      for (const original of originals) original.prompt.content = original.content;
    }
  };
}

function isGeminiChatConnection(hostWindow, apiWindow) {
  const source = String(getChatCompletionSettings(hostWindow, apiWindow)?.chat_completion_source || '').toLowerCase();
  return source === 'makersuite' || source === 'vertexai';
}

function isImagePayload(payload) {
  const modalities = String(payload?.options?.responseModalities || '').toUpperCase();
  return modalities.includes('IMAGE') || /(?:^|[-_])(image|imagen)(?:[-_]|$)/i.test(String(payload?.modelId || ''));
}

function forceHostChatToBottom(hostWindow) {
  try {
    const chat = hostWindow?.document?.getElementById?.('chat');
    if (!chat) return;
    const scroll = () => { chat.scrollTop = chat.scrollHeight; };
    if (typeof hostWindow?.requestAnimationFrame === 'function') {
      hostWindow.requestAnimationFrame(scroll);
    } else {
      scroll();
    }
  } catch {
    // 聊天滚动只是显示增强，不能影响已经写入的剧情楼层。
  }
}

async function appendTextMessageToChat(helper, hostWindow, role, message, data) {
  if (typeof helper?.createChatMessages !== 'function') {
    throw new Error('当前酒馆助手缺少 createChatMessages 接口，无法把完整提示词和 AI 回复写入聊天楼层；请更新酒馆助手。');
  }
  await helper.createChatMessages([{
    role,
    message,
    data,
    extra: { source: 'noble-school-tavern-card' }
  }], {
    insert_before: 'end',
    refresh: 'affected'
  });
  if (role === 'assistant') forceHostChatToBottom(hostWindow);
}

function getChatMessageData(message) {
  if (message?.data && typeof message.data === 'object') return message.data;
  const swipeId = Number(message?.swipe_id || 0);
  if (Array.isArray(message?.variables)) return message.variables[swipeId] || message.variables[0] || {};
  return message?.variables && typeof message.variables === 'object' ? message.variables : {};
}

function findStoredStoryResponse(helper, hostWindow, apiWindow, recoveryId, { requireRaw = false } = {}) {
  const targetId = String(recoveryId || '').trim();
  if (!targetId) return null;
  const messageGroups = [];
  for (const context of getHostContexts(hostWindow, apiWindow)) {
    if (Array.isArray(context?.chat)) messageGroups.push(context.chat);
  }
  // Poll the live chat directly when available; cloning every historical floor
  // every two seconds is unnecessary while waiting for one generation's backup.
  if ((!requireRaw || messageGroups.length === 0) && typeof helper?.getChatMessages === 'function') {
    try {
      const messages = helper.getChatMessages('0-{{lastMessageId}}');
      if (Array.isArray(messages)) messageGroups.push(messages);
    } catch {
      // The accessible live chat records remain available below.
    }
  }
  let legacyText = null;
  for (const messages of messageGroups) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      const data = getChatMessageData(message);
      if (String(data?.nobleSchoolRecoveryId || '') !== targetId) continue;
      if (data?.nobleSchoolGameResponse !== true && data?.nobleSchoolResponseEmpty !== true) continue;
      if (typeof data.nobleSchoolRawResponse === 'string') return data.nobleSchoolRawResponse;
      if (requireRaw) continue;
      if (data?.nobleSchoolResponseEmpty === true) return '';
      const text = typeof message?.message === 'string' ? message.message : message?.mes;
      if (legacyText === null && typeof text === 'string') legacyText = text;
    }
  }
  return legacyText;
}

async function saveChatMetadataDurably(hostWindow, apiWindow) {
  const candidates = [
    ...getHostContexts(hostWindow, apiWindow),
    ...collectApiSurfaces(hostWindow, apiWindow)
  ];
  for (const candidate of candidates) {
    if (typeof candidate?.saveMetadata !== 'function') continue;
    await candidate.saveMetadata();
    return;
  }
  throw new Error('当前酒馆没有提供立即保存对话变量的接口；为避免刷新后回档，本次存档未标记为成功。请更新 SillyTavern。');
}

export function createTavernBridge({ hostWindow, apiWindow = globalThis }) {
  const helper = apiWindow.TavernHelper || apiWindow;
  const getCurrentChatId = () => String(
    hostWindow?.SillyTavern?.getCurrentChatId?.()
      || apiWindow?.SillyTavern?.getCurrentChatId?.()
      || getHostContext(hostWindow, apiWindow)?.chatId
      || helper?.getCurrentChatId?.()
      || ''
  );
  return {
    version: 1,
    getPlayerProfile() {
      const surfaces = collectApiSurfaces(hostWindow, apiWindow);
      const contexts = getHostContexts(hostWindow, apiWindow);
      const persona = callFirstAvailable(surfaces, 'getPersona', 'current');
      const expanders = [
        ...contexts.map((context) => context?.substituteParams?.bind(context)),
        ...surfaces.map((surface) => surface?.substitudeMacros?.bind(surface))
      ];
      const recentUserName = contexts
        .flatMap((context) => Array.isArray(context?.chat) ? context.chat : [])
        .reverse()
        .find((message) => message?.is_user === true || message?.role === 'user')?.name;
      const name = String(
        persona?.name
        || callFirstAvailable(surfaces, 'getCurrentPersonaName')
        || surfaces.map((surface) => surface?.name1).find(Boolean)
        || contexts.map((context) => context?.name1).find(Boolean)
        || expandMacro('{{user}}', expanders)
        || recentUserName
        || readPersonaDomValue(hostWindow, apiWindow, '#your_name')
        || ''
      ).trim();
      const description = String(
        persona?.description
        || surfaces.map((surface) => surface?.powerUserSettings?.persona_description || surface?.persona_description).find(Boolean)
        || contexts.map((context) => context?.powerUserSettings?.persona_description).find(Boolean)
        || expandMacro('{{persona}}', expanders)
        || readPersonaDomValue(hostWindow, apiWindow, '#persona_description')
        || ''
      ).trim();
      return { name, description };
    },
    formatStoryTextForDisplay(text) {
      const source = String(text || '');
      for (const surface of collectApiSurfaces(hostWindow, apiWindow)) {
        if (typeof surface?.formatAsTavernRegexedString !== 'function') continue;
        try {
          const formatted = surface.formatAsTavernRegexedString(source, 'ai_output', 'display', { depth: 0 });
          return typeof formatted === 'string' ? formatted : source;
        } catch {
          // Keep the extracted story readable if a user regex or helper API fails.
        }
      }
      return source;
    },
    async loadGameStorage() {
      if (typeof helper?.getVariables !== 'function') {
        throw new Error('当前酒馆助手缺少对话变量读取接口，无法读取跨设备存档；请更新并启用酒馆助手。');
      }
      const variables = await helper.getVariables({ type: 'chat' });
      const stored = variables?.[CHAT_STORAGE_VARIABLE];
      return {
        chatId: getCurrentChatId(),
        data: stored && typeof stored === 'object'
          ? mapStoredImageUrls(stored, (value) => resolveServerImageUrl(value, hostWindow))
          : null
      };
    },
    async saveGameStorage(data, expectedChatId = '') {
      if (typeof helper?.getVariables !== 'function' || typeof helper?.replaceVariables !== 'function') {
        throw new Error('当前酒馆助手缺少对话变量完整覆盖接口，无法安全保存或回滚存档；请更新并启用酒馆助手。');
      }
      const currentChatId = getCurrentChatId();
      if (expectedChatId && currentChatId && String(expectedChatId) !== currentChatId) {
        throw new Error('当前对话已经切换，已取消上一段对话的延迟存档写入。');
      }
      const stored = data && typeof data === 'object'
        ? mapStoredImageUrls(data, (value) => normalizeServerImagePath(value, hostWindow))
        : null;
      const variables = await helper.getVariables({ type: 'chat' });
      await helper.replaceVariables({
        ...(variables && typeof variables === 'object' ? variables : {}),
        [CHAT_STORAGE_VARIABLE]: stored
      }, { type: 'chat' });
      await saveChatMetadataDurably(hostWindow, apiWindow);
      return { ok: true, chatId: currentChatId };
    },
    loadStoryResponse(recoveryId, options) {
      const fullText = findStoredStoryResponse(helper, hostWindow, apiWindow, recoveryId, options);
      return fullText === null
        ? { found: false, fullText: '' }
        : { found: true, fullText };
    },
    async uploadImage({ data, mimeType, fileName } = {}) {
      const base64Data = String(data || '').replace(/^data:[^;,]+;base64,/, '');
      if (!base64Data) throw new Error('待保存的图片数据为空。');
      const normalizedMimeType = String(mimeType || 'image/png').toLowerCase();
      const format = normalizedMimeType.includes('jpeg') || normalizedMimeType.includes('jpg')
        ? 'jpg'
        : normalizedMimeType.includes('webp')
          ? 'webp'
          : 'png';
      const context = getHostContext(hostWindow, apiWindow);
      if (typeof context?.getRequestHeaders !== 'function') {
        throw new Error('当前酒馆没有提供图片上传鉴权接口，请更新 SillyTavern。');
      }
      const endpoint = new URL('/api/images/upload', hostWindow.location?.origin || hostWindow.location?.href).href;
      const response = await hostWindow.fetch(endpoint, {
        method: 'POST',
        headers: context.getRequestHeaders(),
        body: JSON.stringify({
          image: base64Data,
          format,
          ch_name: 'noble-school',
          filename: sanitizeUploadName(fileName)
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.path) {
        throw new Error(result?.error || `图片保存到酒馆失败（HTTP ${response.status}）。`);
      }
      const path = normalizeServerImagePath(result.path, hostWindow);
      return { path, url: resolveServerImageUrl(path, hostWindow) };
    },
    async openImageSetup() {
      const showImageSetup = hostWindow.nobleSchoolOverlay?.showImageSetup;
      if (typeof showImageSetup !== 'function') return false;
      return Boolean(await showImageSetup());
    },
    async getImageGeneratorStatus() {
      const api = getMiniGameImageApi(hostWindow, apiWindow);
      if (!api || typeof api.getStatus !== 'function') {
        return {
          installed: false,
          configured: false,
          ready: false,
          message: '未检测到“小游戏轻度生图插件”。'
        };
      }
      try {
        return await api.getStatus();
      } catch (error) {
        return {
          installed: true,
          configured: false,
          ready: false,
          message: error.message || '生图插件状态检测失败。'
        };
      }
    },
    async testImageGenerator() {
      const api = getMiniGameImageApi(hostWindow, apiWindow);
      if (!api || typeof api.generate !== 'function') {
        throw new Error('未安装“小游戏轻度生图插件”。');
      }
      const generated = await api.generate({
        prompt: 'A single small pale purple circle centered on a plain white background, no text',
        negativePrompt: 'letters, words, watermark, complex background',
        aspectRatio: '1:1',
        imageSize: '1K',
        width: 256,
        height: 256,
        steps: 4,
        saveToSillyTavern: false
      });
      const image = generated?.images?.[0];
      if (!image?.data && !image?.dataUrl) {
        throw new Error('接口没有返回可用的测试图片。');
      }
      const rawImageData = String(image.data || '');
      const imageDataUrl = String(
        image.dataUrl
        || (rawImageData.startsWith('data:')
          ? rawImageData
          : `data:${image.mimeType || 'image/png'};base64,${rawImageData}`)
      );
      return {
        installed: true,
        configured: true,
        ready: true,
        verified: true,
        provider: generated.provider || '',
        model: generated.model || '',
        imageDataUrl,
        message: '测试生图成功，当前配置可以使用。'
      };
    },
    async request(payload) {
      if (isImagePayload(payload)) {
        const api = getMiniGameImageApi(hostWindow, apiWindow);
        if (!api || typeof api.generate !== 'function') {
          throw new Error('未安装“小游戏轻度生图插件”，已跳过本次图片生成。');
        }
        const generated = await api.generate({
          prompt: payload?.prompt,
          aspectRatio: '1:1',
          imageSize: '1K',
          saveToSillyTavern: false
        });
        const image = generated?.images?.[0];
        if (!image?.data) throw new Error('生图插件没有返回图片数据。');
        return {
          output: { textParts: [], thoughtParts: [], imageParts: [{ mimeType: image.mimeType, data: image.data }] },
          raw: generated.raw
        };
      }
      const prompt = String(payload?.prompt || '').trim();
      if (!prompt) throw new Error('文字生成提示词为空。');
      const textPresetMode = payload?.options?.textPresetMode === 'builtin' ? 'builtin' : 'tavern';
      const startedAt = Date.now();
      let stage = '准备生成请求';
      let promptWrite = null;
      const writePrompt = (messages) => {
        if (!promptWrite) {
          const captured = Array.isArray(messages) && messages.length > 0;
          const visiblePrompt = captured
            ? formatCapturedFinalPrompt(messages)
            : buildVisibleTextPrompt(payload, textPresetMode);
          stage = '写入酒馆 user 楼层';
          promptWrite = appendTextMessageToChat(helper, hostWindow, 'user',
            wrapPromptForChat(visiblePrompt, textPresetMode, captured),
            { nobleSchoolGamePrompt: true }).then(() => { stage = '等待 AI 回复'; });
        }
        return promptWrite;
      };
      const penultimateUserPrompt = buildPenultimateUserInstruction(payload);
      const removeTrailingModelPrompt = textPresetMode === 'tavern' && isGeminiChatConnection(hostWindow, apiWindow);
      const presetPromptSuppression = textPresetMode === 'tavern'
        ? suppressLastUserMessagePresetPrompts(hostWindow, apiWindow)
        : { restore() {} };
      const finalPromptCapture = createFinalPromptCapture(hostWindow, apiWindow, {
        removeTrailingModelPrompt,
        penultimateUserPrompt,
        eventPrompt: prompt,
        onPromptReady: () => presetPromptSuppression.restore(),
        onCaptured: writePrompt
      });
      if (textPresetMode === 'tavern' && !finalPromptCapture.available) {
        presetPromptSuppression.restore();
        throw new Error('当前酒馆助手未开放最终提示词事件，无法保证输出格式和事件提示词位于请求末尾；请更新酒馆助手。');
      }
      let text;
      const recoveryId = String(payload?.recoveryId || '').trim();
      const generationId = makeGenerationId();
      const generationErrorCapture = createGenerationErrorCapture(hostWindow, apiWindow, prompt);
      let generationHooksReleased = false;
      const releaseGenerationHooks = () => {
        if (generationHooksReleased) return;
        generationHooksReleased = true;
        generationErrorCapture.restore();
        presetPromptSuppression.restore();
        finalPromptCapture.stop();
      };
      let fullText;
      let responseSource = 'helper';
      let helperTextChanged = false;
      try {
        if (!finalPromptCapture.available) await writePrompt();
        stage = '等待酒馆生成结果';
        if (textPresetMode === 'tavern') {
          if (typeof apiWindow.generate !== 'function') {
            throw new Error('当前酒馆助手缺少 generate 接口，无法读取酒馆当前预设；请更新酒馆助手，或在“系统”页切换为“游戏内置预设”。');
          }
          const scriptSettingsInstruction = String(payload?.options?.scriptSettingsInstruction || '').trim();
          const supportingContextInstruction = buildSupportingContextInjection(payload);
          const penultimateUserInstruction = buildPenultimateUserInstruction(payload);
          const injects = [];
          if (scriptSettingsInstruction) {
            injects.push({
              role: 'system',
              content: scriptSettingsInstruction,
              position: 'before_prompt',
              depth: 0,
              should_scan: true
            });
          }
          if (supportingContextInstruction) {
            injects.push({
              role: 'user',
              content: supportingContextInstruction,
              position: 'in_chat',
              depth: 2,
              should_scan: false
            });
          }
          if (penultimateUserInstruction) {
            injects.push({
              role: 'user',
              content: penultimateUserInstruction,
              position: 'in_chat',
              depth: 1,
              should_scan: false
            });
          }
          text = await apiWindow.generate({
            preset_name: 'in_use',
            user_input: prompt,
            should_silence: true,
            should_stream: false,
            max_chat_history: 0,
            injects,
            overrides: emptyPromptOverrides(),
            generation_id: generationId
          });
        } else {
          if (typeof apiWindow.generateRaw !== 'function') {
            throw new Error('未找到酒馆助手 generateRaw，请确认酒馆助手已启用。');
          }
          text = await apiWindow.generateRaw({
            user_input: prompt,
            should_stream: false,
            ordered_prompts: buildOrderedPrompts(payload),
            max_chat_history: 0,
            injects: [],
            overrides: emptyPromptOverrides(),
            generation_id: generationId
          });
        }
        // Rendering a chat floor may wait on third-party extensions. The model
        // request is already over, so never keep its global hooks active there.
        releaseGenerationHooks();
        await writePrompt(finalPromptCapture.getMessages());
        const helperText = typeof text === 'string' ? text : String(text?.content || '');
        const networkText = generationErrorCapture.getRawResponseText();
        responseSource = networkText !== null ? 'network' : 'helper';
        fullText = networkText ?? helperText;
        helperTextChanged = networkText !== null && networkText !== helperText;
        stage = '写入酒馆模型楼层（AI 已返回）';
        // 正文可能被其他扩展改写；恢复时优先读取独立备份，不反读展示正文。
        await appendTextMessageToChat(helper, hostWindow, 'assistant',
          fullText || '【贵族学校的特招生｜AI 返回内容为空】',
          {
            ...(fullText ? { nobleSchoolGameResponse: true } : { nobleSchoolGameError: true, nobleSchoolResponseEmpty: true }),
            ...(recoveryId ? { nobleSchoolRecoveryId: recoveryId } : {}),
            nobleSchoolRawResponse: fullText,
            nobleSchoolResponseSource: responseSource,
            nobleSchoolHelperTextChanged: helperTextChanged
          });
      } catch (error) {
        // A rendering callback can fail after the raw reply was inserted. Keep
        // that successful reply instead of adding a misleading failure floor.
        const storedReply = typeof fullText === 'string' && recoveryId
          ? findStoredStoryResponse(helper, hostWindow, apiWindow, recoveryId, { requireRaw: true })
          : null;
        if (storedReply === null || storedReply !== fullText) {
          const diagnostic = enhanceGenerationError(error, generationErrorCapture.getError(), {
            generationId,
            textPresetMode,
            stage,
            elapsedMs: Date.now() - startedAt,
            rawText: fullText
          });
          // 网络断开时写聊天也可能失败或久等，不能让它遮住最初的诊断。
          void writePrompt(finalPromptCapture.getMessages()).then(() => (
            appendTextMessageToChat(helper, hostWindow, 'assistant',
              `【贵族学校的特招生｜AI 请求失败】\n${redactDiagnosticText(diagnostic.message)}`,
              { nobleSchoolGameError: true })
          )).catch(() => {});
          throw diagnostic;
        }
      } finally {
        releaseGenerationHooks();
      }
      return {
        output: { textParts: [sanitizeAiText(fullText)], thoughtParts: [], imageParts: [] },
        raw: { fullText, responseSource, helperTextChanged }
      };
    },
    async exportWorldbook(runtime, promptSettings) {
      if (typeof helper.createOrReplaceWorldbook !== 'function') {
        throw new Error('当前酒馆助手没有提供世界书写入 API，请更新酒馆助手。');
      }
      const { worldbookName, entries } = buildExportWorldbook(runtime, promptSettings);
      const created = await helper.createOrReplaceWorldbook(worldbookName, entries, { render: 'immediate' });
      return { worldbookName, created };
    }
  };
}
