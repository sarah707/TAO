import { makeGenerationId, sanitizeAiText } from './text.js?build=20260917000737';
import {
  buildGraduationWorldbook,
  buildLiveWorldbookName,
  buildLiveWorldbookPromptContext,
  mergeLiveWorldbookEntries
} from './worldbook.js?build=20260917000737';

export const BRIDGE_KEY = '__NOBLE_SCHOOL_TAVERN_BRIDGE_V1__';
export const CHAT_STORAGE_VARIABLE = '$nobleSchoolGameStorage';

function getHelper(apiWindow = globalThis) {
  return apiWindow?.TavernHelper || apiWindow;
}


function getMiniGameImageApi(hostWindow, apiWindow) {
  return hostWindow?.STMiniGameImage || apiWindow?.STMiniGameImage || null;
}

function getHostContext(hostWindow, apiWindow) {
  return hostWindow?.SillyTavern?.getContext?.()
    || apiWindow?.SillyTavern?.getContext?.()
    || null;
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
    persona_description: '',
    dialogue_examples: '',
    chat_history: {
      prompts: [],
      with_depth_entries: true,
      author_note: ''
    }
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
