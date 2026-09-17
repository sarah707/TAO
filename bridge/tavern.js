import { makeGenerationId, sanitizeAiText } from './text.js?build=20260917153610';
import {
  buildGraduationWorldbook,
  buildLiveWorldbookName,
  buildLiveWorldbookPromptContext,
  mergeLiveWorldbookEntries
} from './worldbook.js?build=20260917153610';

export const BRIDGE_KEY = '__NOBLE_SCHOOL_TAVERN_BRIDGE_V1__';
export const CHAT_STORAGE_VARIABLE = '$nobleSchoolGameStorage';

function getMiniGameImageApi(hostWindow, apiWindow) {
  return hostWindow?.STMiniGameImage || apiWindow?.STMiniGameImage || null;
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
  const options = payload?.options || {};
  const ordered = [];
  if (options.systemInstruction) {
    ordered.push({ role: 'system', content: String(options.systemInstruction) });
  }
  if (options.assistantInstruction) {
    ordered.push({ role: 'assistant', content: String(options.assistantInstruction) });
  }
  if (options.locationInstruction) {
    ordered.push({
      role: 'assistant',
      content: `以下是此前已经确定的地点描述，后续章节可据此保持一致：\n\n${String(options.locationInstruction)}`
    });
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

const PRESET_PLACEHOLDER_IDS = new Map([
  ['worldInfoBefore', 'world_info_before'],
  ['personaDescription', 'persona_description'],
  ['charDescription', 'char_description'],
  ['charPersonality', 'char_personality'],
  ['scenario', 'scenario'],
  ['worldInfoAfter', 'world_info_after'],
  ['dialogueExamples', 'dialogue_examples'],
  ['chatHistory', 'chat_history']
]);

function normalizePromptRole(value) {
  return String(value || '').toLowerCase() === 'model' ? 'assistant' : String(value || '').toLowerCase();
}

function getChatCompletionSettings(hostWindow, apiWindow) {
  return getHostContexts(hostWindow, apiWindow)
    .map((context) => context?.chatCompletionSettings)
    .find((settings) => settings && typeof settings === 'object') || null;
}

function isGeminiChatConnection(hostWindow, apiWindow) {
  const source = String(getChatCompletionSettings(hostWindow, apiWindow)?.chat_completion_source || '').toLowerCase();
  return source === 'makersuite' || source === 'vertexai';
}

function expandPresetPrompt(content, surfaces) {
  const source = String(content || '');
  const expanded = callFirstAvailable(surfaces, 'substitudeMacros', source);
  return expanded === null ? source : String(expanded);
}

function buildGeminiCompatiblePresetRequest(api, request) {
  if (typeof api?.getPreset !== 'function' || typeof api?.generateRaw !== 'function') return null;

  let preset;
  try {
    preset = api.getPreset('in_use');
  } catch {
    return null;
  }
  const enabledPrompts = Array.isArray(preset?.prompts)
    ? preset.prompts.filter((prompt) => prompt?.enabled !== false)
    : [];
  const lastPrompt = enabledPrompts.at(-1);
  if (!lastPrompt || !['assistant', 'model'].includes(String(lastPrompt.role || '').toLowerCase())) {
    return null;
  }

  const keptPrompts = enabledPrompts.slice(0, -1);
  const relativePrompts = keptPrompts.filter((prompt) => prompt?.position?.type !== 'in_chat');
  const presetInjects = keptPrompts
    .filter((prompt) => prompt?.position?.type === 'in_chat')
    .sort((left, right) => {
      const depthDiff = Number(left.position?.depth || 0) - Number(right.position?.depth || 0);
      return depthDiff || Number(left.position?.order || 0) - Number(right.position?.order || 0);
    })
    .map((prompt) => ({
      role: normalizePromptRole(prompt.role),
      content: expandPresetPrompt(prompt.content, request.surfaces),
      position: 'in_chat',
      depth: Number(prompt.position?.depth || 0),
      should_scan: false
    }))
    .filter((prompt) => prompt.content.trim());
  const orderedPrompts = relativePrompts
    .map((prompt) => {
      const placeholder = PRESET_PLACEHOLDER_IDS.get(String(prompt.id || ''));
      if (placeholder) return placeholder;
      return {
        role: normalizePromptRole(prompt.role),
        content: expandPresetPrompt(prompt.content, request.surfaces)
      };
    })
    .filter((prompt) => typeof prompt === 'string' || prompt.content.trim());
  orderedPrompts.push('user_input');

  const settings = preset?.settings || {};
  const customApi = {};
  const copyNumber = (target, source, min = null, max = null) => {
    if (!Number.isFinite(Number(source))) return;
    let value = Number(source);
    if (min !== null) value = Math.max(min, value);
    if (max !== null) value = Math.min(max, value);
    customApi[target] = value;
  };
  copyNumber('max_tokens', settings.max_completion_tokens);
  copyNumber('temperature', settings.temperature, 0, 2);
  copyNumber('frequency_penalty', settings.frequency_penalty, -2, 2);
  copyNumber('presence_penalty', settings.presence_penalty, -2, 2);
  copyNumber('top_p', settings.top_p, 0, 1);
  copyNumber('top_k', settings.top_k, 0, 100);

  return {
    user_input: request.prompt,
    ordered_prompts: orderedPrompts,
    should_silence: true,
    max_chat_history: 0,
    injects: [...request.injects, ...presetInjects],
    overrides: request.overrides,
    custom_api: customApi,
    generation_id: makeGenerationId()
  };
}

function isImagePayload(payload) {
  const modalities = String(payload?.options?.responseModalities || '').toUpperCase();
  return modalities.includes('IMAGE') || /(?:^|[-_])(image|imagen)(?:[-_]|$)/i.test(String(payload?.modelId || ''));
}

async function appendFullTextResponseToChat(helper, text) {
  const message = String(text || '').trim();
  if (!message) return;
  if (typeof helper?.createChatMessages !== 'function') {
    throw new Error('当前酒馆助手缺少 createChatMessages 接口，无法把完整 AI 回复写入聊天楼层；请更新酒馆助手。');
  }
  await helper.createChatMessages([{
    role: 'assistant',
    message,
    data: { nobleSchoolGameResponse: true },
    extra: { source: 'noble-school-tavern-card' }
  }], {
    insert_before: 'end',
    refresh: 'affected'
  });
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
    openImageSettings() {
      const api = getMiniGameImageApi(hostWindow, apiWindow);
      if (typeof api?.openSettings !== 'function') {
        hostWindow.open?.('https://github.com/sarah707/SillyTavern-MiniGame-Image-API', '_blank', 'noopener,noreferrer');
        return false;
      }
      hostWindow.nobleSchoolOverlay?.minimize?.();
      return api.openSettings();
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
      let text;
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
            role: 'system',
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
        const overrides = emptyPromptOverrides();
        const surfaces = collectApiSurfaces(hostWindow, apiWindow);
        let geminiPresetRequest = null;
        let geminiPresetApi = null;
        if (isGeminiChatConnection(hostWindow, apiWindow)) {
          for (const api of surfaces) {
            geminiPresetRequest = buildGeminiCompatiblePresetRequest(api, { prompt, injects, overrides, surfaces });
            if (geminiPresetRequest) {
              geminiPresetApi = api;
              break;
            }
          }
        }
        if (geminiPresetRequest) {
          text = await geminiPresetApi.generateRaw(geminiPresetRequest);
        } else {
          text = await apiWindow.generate({
            preset_name: 'in_use',
            user_input: prompt,
            should_silence: true,
            max_chat_history: 0,
            injects,
            overrides,
            generation_id: makeGenerationId()
          });
        }
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
      const fullText = typeof text === 'string' ? text : String(text?.content || '');
      await appendFullTextResponseToChat(helper, fullText);
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
