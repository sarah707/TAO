import { generateImage, validateImageConfig } from './image-providers.js';
import { makeGenerationId, sanitizeAiText } from './text.js';
import {
  buildGraduationWorldbook,
  buildLiveWorldbookName,
  buildLiveWorldbookPromptContext,
  mergeLiveWorldbookEntries
} from './worldbook.js';

export const BRIDGE_KEY = '__NOBLE_SCHOOL_TAVERN_BRIDGE_V1__';
export const IMAGE_CONFIG_KEY = 'noble-school.image-config.v1';

function getStorage(hostWindow) {
  return hostWindow.localStorage;
}

export function loadImageConfig(hostWindow) {
  try {
    const raw = getStorage(hostWindow).getItem(IMAGE_CONFIG_KEY);
    return raw ? validateImageConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveImageConfig(hostWindow, config) {
  const normalized = validateImageConfig(config);
  getStorage(hostWindow).setItem(IMAGE_CONFIG_KEY, JSON.stringify(normalized));
  return normalized;
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

function buildGameInjection(payload) {
  const options = payload?.options || {};
  const parts = [];
  if (options.retryMarker) {
    parts.push(String(options.retryMarker));
  }
  if (options.gameSystemInstruction) {
    parts.push(String(options.gameSystemInstruction));
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
  if (options.writingPointsInstruction) {
    parts.push(String(options.writingPointsInstruction));
  }
  return parts.map((part) => part.trim()).filter(Boolean).join('\n\n');
}

function emptyPromptOverrides() {
  return {
    char_description: '',
    char_personality: '',
    scenario: '',
    persona_description: '',
    world_info_before: '',
    world_info_after: '',
    dialogue_examples: '',
    chat_history: {
      prompts: [],
      with_depth_entries: false,
      author_note: ''
    }
  };
}

function isImagePayload(payload) {
  const modalities = String(payload?.options?.responseModalities || '').toUpperCase();
  return modalities.includes('IMAGE') || /(?:^|[-_])(image|imagen)(?:[-_]|$)/i.test(String(payload?.modelId || ''));
}

export function createTavernBridge({ hostWindow, apiWindow = globalThis, getImageConfig, onOpenImageSettings = null }) {
  const helper = apiWindow.TavernHelper || apiWindow;
  const getCurrentChatId = () => String(
    hostWindow?.SillyTavern?.getCurrentChatId?.()
      || apiWindow?.SillyTavern?.getCurrentChatId?.()
      || ''
  );
  return {
    version: 1,
    openImageSettings() {
      if (typeof onOpenImageSettings !== 'function') throw new Error('生图设置界面尚未就绪。');
      onOpenImageSettings();
    },
    async request(payload) {
      if (isImagePayload(payload)) {
        const image = await generateImage(getImageConfig(), {
          prompt: payload?.prompt,
          aspectRatio: payload?.options?.aspectRatio || '1:1',
          size: payload?.options?.size
        });
        return {
          output: { textParts: [], thoughtParts: [], imageParts: [{ mimeType: image.mimeType, data: image.data }] },
          raw: image.raw
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
        const gameInjection = buildGameInjection(payload);
        text = await apiWindow.generate({
          preset_name: 'in_use',
          user_input: prompt,
          should_silence: true,
          max_chat_history: 0,
          injects: gameInjection
            ? [{
                role: 'system',
                content: gameInjection,
                position: 'in_chat',
                depth: 0,
                should_scan: false
              }]
            : [],
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
      return {
        output: { textParts: [sanitizeAiText(text)], thoughtParts: [], imageParts: [] },
        raw: {}
      };
    },
    async testImage(config) {
      const image = await generateImage(config, {
        prompt: 'A single pink camellia on a clean ivory background, elegant game UI asset, no text',
        aspectRatio: '1:1'
      });
      return { mimeType: image.mimeType, data: image.data };
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
