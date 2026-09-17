import { makeGenerationId, sanitizeAiText } from './text.js?build=20260917172536';
import {
  buildGraduationWorldbook,
  buildLiveWorldbookName,
  buildLiveWorldbookPromptContext,
  mergeLiveWorldbookEntries
} from './worldbook.js?build=20260917172536';

export const BRIDGE_KEY = '__NOBLE_SCHOOL_TAVERN_BRIDGE_V1__';
export const CHAT_STORAGE_VARIABLE = '$nobleSchoolGameStorage';

function getMiniGameImageApi(hostWindow, apiWindow) {
  for (const candidateWindow of collectAccessibleWindows(hostWindow, apiWindow)) {
    if (candidateWindow?.STMiniGameImage) return candidateWindow.STMiniGameImage;
  }
  return null;
}

const IMAGE_SETTINGS_RETRY_DELAYS = [0, 50, 100, 200, 350, 500, 800];

function waitForImageSettingsRetry(hostWindow, milliseconds) {
  return new Promise((resolve) => {
    const schedule = typeof hostWindow?.setTimeout === 'function'
      ? hostWindow.setTimeout.bind(hostWindow)
      : globalThis.setTimeout;
    schedule(resolve, milliseconds);
  });
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
    ordered.push({ role: 'assistant', content: supportingContextInstruction });
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
    parts.push(`以下是游戏保存的前几章剧情：\n${String(options.assistantInstruction)}`);
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
    pushSection('ASSISTANT｜in_chat depth=2｜履历、旧章节与地点资料', buildSupportingContextInjection(payload));
    pushSection('USER｜in_chat depth=1｜输出格式与写作要求', buildPenultimateUserInstruction(payload));
    pushSection('USER｜user_input｜本次事件', prompt);
  } else {
    pushSection('SYSTEM｜游戏内置文风与剧本设定', buildBuiltInSystemInstruction(payload));
    pushSection('ASSISTANT｜in_chat depth=2｜履历、旧章节与地点资料', buildSupportingContextInjection(payload));
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
    const listener = (completion) => {
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

async function appendTextExchangeToChat(helper, prompt, response, textPresetMode, capturedFinalPrompt) {
  const promptMessage = wrapPromptForChat(prompt, textPresetMode, capturedFinalPrompt);
  const responseMessage = String(response || '').trim();
  if (!responseMessage) return;
  if (typeof helper?.createChatMessages !== 'function') {
    throw new Error('当前酒馆助手缺少 createChatMessages 接口，无法把完整提示词和 AI 回复写入聊天楼层；请更新酒馆助手。');
  }
  await helper.createChatMessages([
    {
      role: 'user',
      message: promptMessage,
      data: { nobleSchoolGamePrompt: true },
      extra: { source: 'noble-school-tavern-card' }
    },
    {
      role: 'assistant',
      message: responseMessage,
      data: { nobleSchoolGameResponse: true },
      extra: { source: 'noble-school-tavern-card' }
    }
  ], {
    insert_before: 'end',
    refresh: 'all'
  });
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
      if (typeof helper?.insertOrAssignVariables !== 'function') {
        throw new Error('当前酒馆助手缺少对话变量写入接口，无法保存跨设备存档；请更新并启用酒馆助手。');
      }
      const currentChatId = getCurrentChatId();
      if (expectedChatId && currentChatId && String(expectedChatId) !== currentChatId) {
        throw new Error('当前对话已经切换，已取消上一段对话的延迟存档写入。');
      }
      const stored = data && typeof data === 'object'
        ? mapStoredImageUrls(data, (value) => normalizeServerImagePath(value, hostWindow))
        : null;
      await helper.insertOrAssignVariables({ [CHAT_STORAGE_VARIABLE]: stored }, { type: 'chat' });
      await saveChatMetadataDurably(hostWindow, apiWindow);
      return { ok: true, chatId: currentChatId };
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
    async openImageSettings() {
      const api = getMiniGameImageApi(hostWindow, apiWindow);
      if (typeof api?.openSettings !== 'function') {
        hostWindow.open?.('https://github.com/sarah707/SillyTavern-MiniGame-Image-API', '_blank', 'noopener,noreferrer');
        return false;
      }
      for (let attempt = 0; attempt <= IMAGE_SETTINGS_RETRY_DELAYS.length; attempt += 1) {
        const opened = await api.openSettings();
        if (opened !== false) {
          hostWindow.nobleSchoolOverlay?.minimize?.();
          return true;
        }
        if (attempt < IMAGE_SETTINGS_RETRY_DELAYS.length) {
          await waitForImageSettingsRetry(hostWindow, IMAGE_SETTINGS_RETRY_DELAYS[attempt]);
        }
      }
      return false;
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
      return {
        installed: true,
        configured: true,
        ready: true,
        verified: true,
        provider: generated.provider || '',
        model: generated.model || '',
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
      const penultimateUserPrompt = buildPenultimateUserInstruction(payload);
      const removeTrailingModelPrompt = textPresetMode === 'tavern' && isGeminiChatConnection(hostWindow, apiWindow);
      const presetPromptSuppression = textPresetMode === 'tavern'
        ? suppressLastUserMessagePresetPrompts(hostWindow, apiWindow)
        : { restore() {} };
      const finalPromptCapture = createFinalPromptCapture(hostWindow, apiWindow, {
        removeTrailingModelPrompt,
        penultimateUserPrompt,
        eventPrompt: prompt,
        onPromptReady: () => presetPromptSuppression.restore()
      });
      if (textPresetMode === 'tavern' && !finalPromptCapture.available) {
        presetPromptSuppression.restore();
        throw new Error('当前酒馆助手未开放最终提示词事件，无法保证输出格式和事件提示词位于请求末尾；请更新酒馆助手。');
      }
      let text;
      try {
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
              role: 'assistant',
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
            max_chat_history: 0,
            injects,
            overrides: emptyPromptOverrides(),
            generation_id: makeGenerationId()
          });
        } else {
          if (typeof apiWindow.generateRaw !== 'function') {
            throw new Error('未找到酒馆助手 generateRaw，请确认酒馆助手已启用。');
          }
          text = await apiWindow.generateRaw({
            user_input: prompt,
            ordered_prompts: buildOrderedPrompts(payload),
            max_chat_history: 0,
            injects: [],
            overrides: emptyPromptOverrides(),
            generation_id: makeGenerationId()
          });
        }
      } finally {
        presetPromptSuppression.restore();
        finalPromptCapture.stop();
      }
      const capturedMessages = finalPromptCapture.getMessages();
      const capturedFinalPrompt = Array.isArray(capturedMessages) && capturedMessages.length > 0;
      const visiblePrompt = capturedFinalPrompt
        ? formatCapturedFinalPrompt(capturedMessages)
        : buildVisibleTextPrompt(payload, textPresetMode);
      const fullText = typeof text === 'string' ? text : String(text?.content || '');
      await appendTextExchangeToChat(helper, visiblePrompt, fullText, textPresetMode, capturedFinalPrompt);
      return {
        output: { textParts: [sanitizeAiText(fullText)], thoughtParts: [], imageParts: [] },
        raw: { fullText }
      };
    },
    async syncWorldbook(runtime, previousSync = {}, options = {}) {
      if (typeof helper.getOrCreateChatWorldbook !== 'function'
        || typeof helper.getWorldbook !== 'function'
        || (typeof helper.updateWorldbookWith !== 'function' && typeof helper.replaceWorldbook !== 'function')) {
        throw new Error('当前酒馆助手缺少对话世界书读取或更新 API，请更新酒馆助手。');
      }
      const boundWorldbook = typeof helper.getChatWorldbookName === 'function'
        ? helper.getChatWorldbookName('current')
        : null;
      let chatId = getCurrentChatId();
      if (!chatId && boundWorldbook && previousSync?.worldbookName === boundWorldbook) {
        chatId = String(previousSync.chatId || `worldbook-${boundWorldbook}`);
      }
      if (!chatId && boundWorldbook) chatId = `worldbook-${boundWorldbook}`;
      if (!chatId) chatId = `chat-${Date.now()}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
      const desiredName = buildLiveWorldbookName(runtime, chatId);
      const worldbookName = await helper.getOrCreateChatWorldbook('current', desiredName);
      const sameChat = previousSync?.chatId === chatId && previousSync?.worldbookName === worldbookName;
      const baseSync = sameChat ? previousSync : {};
      let merged;
      let updatedEntries;
      if (typeof helper.updateWorldbookWith === 'function') {
        updatedEntries = await helper.updateWorldbookWith(worldbookName, (worldbook) => {
          merged = mergeLiveWorldbookEntries(worldbook, runtime, baseSync);
          return merged.entries;
        }, { render: 'debounced' });
      } else {
        const currentEntries = await helper.getWorldbook(worldbookName);
        merged = mergeLiveWorldbookEntries(currentEntries, runtime, baseSync);
        await helper.replaceWorldbook(worldbookName, merged.entries, { render: 'debounced' });
        updatedEntries = merged.entries;
      }
      if (!merged) merged = mergeLiveWorldbookEntries(updatedEntries, runtime, baseSync);
      return {
        worldbookName,
        chatId,
        sync: {
          ...merged.sync,
          status: 'success',
          chatId,
          worldbookName,
          updatedAt: new Date().toISOString()
        },
        promptContext: buildLiveWorldbookPromptContext(updatedEntries || merged.entries, options.characterIds || [])
      };
    },
    async exportGraduationWorldbook(runtime) {
      if (typeof helper.getOrCreateChatWorldbook === 'function' && typeof helper.getWorldbook === 'function') {
        const synced = await this.syncWorldbook(runtime, runtime?.meta?.worldbookSync || {}, {
          characterIds: (runtime?.characters || []).map((character) => character.id)
        });
        return {
          worldbookName: synced.worldbookName,
          created: false,
          boundToCurrentChat: true,
          existingChatWorldbook: synced.worldbookName,
          sync: synced.sync
        };
      }
      if (typeof apiWindow.createOrReplaceWorldbook !== 'function') {
        throw new Error('当前酒馆助手没有提供世界书写入 API，请更新酒馆助手。');
      }
      const { worldbookName, entries } = buildGraduationWorldbook(runtime);
      const created = await apiWindow.createOrReplaceWorldbook(worldbookName, entries, { render: 'immediate' });
      let boundToCurrentChat = false;
      let existingChatWorldbook = null;
      if (typeof apiWindow.getChatWorldbookName === 'function') {
        existingChatWorldbook = apiWindow.getChatWorldbookName('current');
      }
      if (!existingChatWorldbook && typeof apiWindow.rebindChatWorldbook === 'function') {
        await apiWindow.rebindChatWorldbook('current', worldbookName);
        boundToCurrentChat = true;
      }
      return { worldbookName, created, boundToCurrentChat, existingChatWorldbook };
    }
  };
}
