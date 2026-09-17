import { BRIDGE_KEY, createTavernBridge } from './bridge/tavern.js?build=20260917204222';
import {
  clampFloatingPosition,
  getDefaultMinimizedPosition,
  getVisibleViewportBounds
} from './overlay-position.js?build=20260917204222';
import { getActiveChatSnapshot, subscribeToChatChanges } from './chat-lifecycle.js?build=20260917204222';

const OVERLAY_ID = 'noble-school-overlay';
const STYLE_ID = 'noble-school-overlay-style';
const ROOT_ID = 'noble-school-root';
const IMAGE_EXTENSION_URL = 'https://github.com/sarah707/SillyTavern-MiniGame-Image-API';
const BUILD_MODE = 'github';

const hostWindow = (() => {
  try {
    return window.parent && window.parent !== window ? window.parent : window;
  } catch {
    return window;
  }
})();
const hostDocument = hostWindow.document;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function overlayCss() {
  return `
#${OVERLAY_ID} { position:fixed; inset:0; z-index:2147483647; pointer-events:none; font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",Arial,sans-serif; color:#212529; font-size:16px; }
#${OVERLAY_ID} *, #${OVERLAY_ID} *::before, #${OVERLAY_ID} *::after { box-sizing:border-box; }
#${OVERLAY_ID} [hidden] { display:none!important; }
#${OVERLAY_ID} .noble-school-stage { position:fixed; inset:0; width:100vw; width:100dvw; height:100vh; height:100dvh; pointer-events:none; }
#${OVERLAY_ID} #${ROOT_ID} { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:min(100%,960px); height:calc(100vh - 32px); height:calc(100dvh - 32px); padding:0 1rem; pointer-events:none; touch-action:none; will-change:transform; }
#${OVERLAY_ID} .noble-school-card { display:flex; flex-direction:column; width:100%; max-width:600px; height:100%; max-height:100%; margin:auto; overflow:hidden; background:#fff; border:1px solid rgba(0,0,0,.125); border-radius:.5rem; box-shadow:0 .125rem .25rem rgba(0,0,0,.075); pointer-events:all; }
#${OVERLAY_ID} .noble-school-body { flex:1 1 0; height:auto; min-height:0; max-height:none; overflow:hidden; background:#fff; pointer-events:all; }
#${OVERLAY_ID} .noble-school-frame { display:block; width:100%; height:100%; border:0; background:#fff; }
#${OVERLAY_ID} .noble-school-config { height:100%; overflow-y:auto; padding:0 1.25rem 1.25rem; overscroll-behavior:contain; }
#${OVERLAY_ID} .noble-school-config-titlebar { position:sticky; top:0; z-index:2; display:flex; align-items:center; justify-content:center; min-height:68px; margin:0 -1.25rem 1rem; padding:14px 64px 12px 16px; color:#4a377d; background:linear-gradient(180deg,rgba(251,248,255,.99),rgba(251,248,255,.94),rgba(251,248,255,.84)); backdrop-filter:blur(14px); cursor:grab; user-select:none; }
#${OVERLAY_ID} .noble-school-config-titlebar:active { cursor:grabbing; }
#${OVERLAY_ID} .noble-school-config-titlebar h1 { margin:0; font-size:1.28rem; font-weight:800; letter-spacing:.06em; text-align:center; }
#${OVERLAY_ID} .noble-school-title-minimize { position:absolute; top:50%; right:12px; transform:translateY(-50%); display:grid; place-items:center; width:38px; height:38px; padding:0; border:0; border-radius:10px; color:#4a377d; background:rgba(167,139,250,.14); font-size:1.35rem; line-height:1; cursor:pointer; }
#${OVERLAY_ID} .noble-school-config h2 { margin:.1rem 0 .5rem; font-size:1.25rem; }
#${OVERLAY_ID} .noble-school-config p { margin:.3rem 0 1rem; color:#6b5960; line-height:1.55; }
#${OVERLAY_ID} .noble-school-field { margin-bottom:1rem; }
#${OVERLAY_ID} .noble-school-field label { display:block; margin-bottom:.35rem; color:#46363c; font-weight:650; }
#${OVERLAY_ID} .noble-school-field input, #${OVERLAY_ID} .noble-school-field select, #${OVERLAY_ID} .noble-school-field textarea { width:100%; padding:.65rem .75rem; border:1px solid #d9c5cc; border-radius:8px; background:#fff; color:#212529; font:inherit; }
#${OVERLAY_ID} .noble-school-field textarea { min-height:150px; resize:vertical; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:.82rem; }
#${OVERLAY_ID} .noble-school-help { display:block; margin-top:.3rem; color:#806d74; font-size:.82rem; line-height:1.45; }
#${OVERLAY_ID} .noble-school-grid { display:grid; grid-template-columns:1fr 1fr; gap:0 1rem; }
#${OVERLAY_ID} .noble-school-actions { display:flex; flex-wrap:wrap; gap:.65rem; margin-top:1.2rem; }
#${OVERLAY_ID} .noble-school-button { border:0; border-radius:16px; padding:12px 16px; color:#fff; background:linear-gradient(135deg,#a78bfa,#8b5cf6); font:inherit; font-weight:700; cursor:pointer; transition:transform .15s ease,opacity .15s ease; }
#${OVERLAY_ID} .noble-school-button:hover { transform:translateY(-1px); }
#${OVERLAY_ID} .noble-school-button.secondary { color:#342a55; background:rgba(255,255,255,.95); border:1px solid rgba(151,125,211,.22); }
#${OVERLAY_ID} .noble-school-button:disabled { cursor:wait; opacity:.55; transform:none; }
#${OVERLAY_ID} .noble-school-status { min-height:1.5rem; margin-top:.9rem; color:#825566; white-space:pre-wrap; }
#${OVERLAY_ID} .noble-school-test-image { display:none; max-width:180px; max-height:180px; margin:1rem auto 0; border-radius:10px; object-fit:cover; }
#${OVERLAY_ID} .noble-school-test-image.visible { display:block; }
#${OVERLAY_ID} .noble-school-plugin-notice { display:flex; min-height:100%; flex-direction:column; }
#${OVERLAY_ID} .noble-school-plugin-notice-main { flex:1; display:flex; flex-direction:column; justify-content:center; padding:1rem 0 2rem; }
#${OVERLAY_ID} .noble-school-plugin-notice code { overflow-wrap:anywhere; color:#4a377d; }
#${OVERLAY_ID} .noble-school-plugin-link { color:#6d4fc2; font-weight:650; text-decoration:none; }
#${OVERLAY_ID} .noble-school-plugin-link:hover { text-decoration:underline; }
#${OVERLAY_ID} .noble-school-minimized { position:fixed; left:0; right:0; bottom:max(8px,calc(24px + env(safe-area-inset-bottom))); width:min(140px,calc(100dvw - 16px)); height:min(96px,calc(100dvh - 16px)); margin-left:auto; margin-right:auto; padding:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:#4a377d; background:linear-gradient(180deg,rgba(251,248,255,.98),rgba(251,248,255,.8),rgba(247,243,255,.96)); border-radius:12px; box-shadow:0 6px 16px rgba(83,58,140,.2); pointer-events:all; cursor:grab; user-select:none; }
#${OVERLAY_ID} .noble-school-minimized[hidden], #${OVERLAY_ID} .noble-school-card[hidden] { display:none!important; }
#${OVERLAY_ID} .noble-school-minimized strong { font-size:.92rem; text-align:center; }
#${OVERLAY_ID} .noble-school-minimized button { border:0; border-radius:6px; padding:6px 12px; background:#fff; box-shadow:0 3px 8px rgba(0,0,0,.15); font:inherit; font-size:.9rem; cursor:pointer; }
#${OVERLAY_ID} .noble-school-minimized button:hover { background:#ede9fe; }
@media (max-width:576px), (max-height:560px) {
  #${OVERLAY_ID} #${ROOT_ID} { top:0; left:0; transform:none!important; width:100%; height:100%; padding:max(4px,env(safe-area-inset-top)) max(4px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(4px,env(safe-area-inset-left)); touch-action:auto; }
  #${OVERLAY_ID} .noble-school-card { width:100%; max-width:none; height:100%; max-height:none; margin:0; border-radius:clamp(0px,1.5vw,8px); }
  #${OVERLAY_ID} .noble-school-body { flex:1 1 0; height:auto; min-height:0; max-height:none; }
  #${OVERLAY_ID} .noble-school-config { padding:0 max(.8rem,env(safe-area-inset-right)) 1rem max(.8rem,env(safe-area-inset-left)); -webkit-overflow-scrolling:touch; }
  #${OVERLAY_ID} .noble-school-config-titlebar { min-height:55px; margin:0 -.8rem .8rem; padding:10px 56px 9px 12px; }
  #${OVERLAY_ID} .noble-school-config-titlebar h1 { font-size:1.05rem; line-height:1.2; }
  #${OVERLAY_ID} .noble-school-title-minimize { right:8px; width:36px; height:36px; }
  #${OVERLAY_ID} .noble-school-grid { grid-template-columns:1fr; }
  #${OVERLAY_ID} .noble-school-actions { display:grid; grid-template-columns:1fr; }
  #${OVERLAY_ID} .noble-school-button { width:100%; min-height:44px; }
}`;
}

function installStyle() {
  hostDocument.getElementById(STYLE_ID)?.remove();
  const style = hostDocument.createElement('style');
  style.id = STYLE_ID;
  style.textContent = overlayCss();
  hostDocument.head.append(style);
}

function setupDrag(handle, target, getPosition, setPosition, excludedSelector, disabledWhen = null, requiredHandleSelector = null) {
  const start = (event) => {
    if (disabledWhen?.()) return;
    if (requiredHandleSelector && !event.target.closest(requiredHandleSelector)) return;
    if (excludedSelector && event.target.closest(excludedSelector)) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const origin = getPosition();
    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    const move = (next) => {
      if (next.pointerId !== pointerId) return;
      next.preventDefault();
      setPosition(origin.x + next.clientX - startX, origin.y + next.clientY - startY);
    };
    const end = (next) => {
      if (next.pointerId !== pointerId) return;
      hostDocument.removeEventListener('pointermove', move);
      hostDocument.removeEventListener('pointerup', end);
      hostDocument.removeEventListener('pointercancel', end);
    };
    hostDocument.addEventListener('pointermove', move, { passive: false });
    hostDocument.addEventListener('pointerup', end);
    hostDocument.addEventListener('pointercancel', end);
    target.setPointerCapture?.(pointerId);
    event.preventDefault();
  };
  handle.addEventListener('pointerdown', start);
  return () => handle.removeEventListener('pointerdown', start);
}

function makePluginNoticeMarkup(status, { openedFromGame = false } = {}) {
  const installed = Boolean(status?.installed);
  const ready = Boolean(status?.ready);
  const title = ready ? '生图插件已就绪' : installed ? '生图插件尚未配置' : '可选生图插件未安装';
  const message = ready
    ? '已经检测到“小游戏轻度生图插件”，当前生图服务配置完整。你可以生成一张测试图再次确认模型、权限、地区和额度，也可以直接返回游戏。'
    : installed
    ? '已经检测到“小游戏轻度生图插件”，但当前选中的生图服务尚未配置完整。你仍然可以正常开始游戏，暂时只不会自动生成角色头像和服装图片。'
    : '没有检测到“小游戏轻度生图插件”。你仍然可以正常开始游戏，暂时只不会自动生成角色头像和服装图片。';
  const continueLabel = openedFromGame || ready ? '返回游戏' : '跳过本次检测，继续游戏';
  return `
    <div class="noble-school-config noble-school-plugin-notice">
      <div class="noble-school-config-titlebar" data-overlay-drag-handle>
        <h1>贵族学院的特招生</h1>
        <button class="noble-school-title-minimize" type="button" data-overlay-action="minimize" title="最小化">—</button>
      </div>
      <div class="noble-school-plugin-notice-main">
        <h2>${title}</h2>
        <p>${message}</p>
        ${installed ? '<p>也可以实际生成一张最小尺寸测试图来验证模型、权限、地区和额度；测试图只用于验证，不会保存到游戏或酒馆图片目录。</p>' : ''}
        <p>安装后刷新一次酒馆；游玩途中安装也没关系，刷新后点击角色头像下方的“重新生成头像”即可使用。</p>
        <p><a class="noble-school-plugin-link" href="${IMAGE_EXTENSION_URL}" target="_blank" rel="noopener noreferrer">小游戏轻度生图插件安装地址</a></p>
        <div class="noble-school-actions">
          ${installed ? '' : '<button class="noble-school-button" type="button" data-plugin-action="install">查看安装页面</button>'}
          ${installed ? '<button class="noble-school-button" type="button" data-plugin-action="test">生成测试图并验证</button>' : ''}
          <button class="noble-school-button secondary" type="button" data-plugin-action="retry">重新检测</button>
          <button class="noble-school-button secondary" type="button" data-plugin-action="continue">${continueLabel}</button>
        </div>
        <div class="noble-school-status" aria-live="polite">${escapeHtml(status?.message || '')}</div>
        <img class="noble-school-test-image" alt="生图测试结果" />
      </div>
    </div>`;
}

async function loadGameDocument(iframe) {
  const gameUrl = new URL('./game/index.html', import.meta.url);
  const response = await fetch(gameUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`游戏页面加载失败（HTTP ${response.status}）。`);
  let html = await response.text();
  const baseTag = `<base href="${escapeHtml(new URL('./game/', import.meta.url).href)}">`;
  const buildModeTag = `<script>globalThis.__NOBLE_SCHOOL_BUILD_MODE__=${JSON.stringify(BUILD_MODE)};<\/script>`;
  html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}${buildModeTag}`);
  const loaded = new Promise((resolve) => iframe.addEventListener('load', resolve, { once: true }));
  iframe.srcdoc = html;
  await loaded;
}

async function mount() {
  hostWindow.nobleSchoolOverlay?.destroy?.();
  hostDocument.getElementById(OVERLAY_ID)?.remove();
  installStyle();

  const overlay = hostDocument.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <div class="noble-school-stage">
      <div id="${ROOT_ID}">
        <section class="noble-school-card">
          <div class="noble-school-body"></div>
        </section>
      </div>
      <aside class="noble-school-minimized" hidden>
        <strong>贵族学校的特招生</strong>
        <button type="button" data-overlay-action="restore">恢复</button>
      </aside>
    </div>`;
  hostDocument.body.append(overlay);

  const root = overlay.querySelector(`#${ROOT_ID}`);
  const card = overlay.querySelector('.noble-school-card');
  const body = overlay.querySelector('.noble-school-body');
  const minimized = overlay.querySelector('.noble-school-minimized');
  let frame = null;
  let destroyed = false;
  let contentEpoch = 0;
  let removeChatChangeListener = () => {};
  const ownerCharacterKey = getActiveChatSnapshot(hostWindow, window).characterKey;
  let activeChatId = getActiveChatSnapshot(hostWindow, window).chatId;
  let cardPosition = { x: 0, y: 0 };
  let minimizedPosition = null;
  const isCompactViewport = () => Boolean(hostWindow.matchMedia?.('(max-width: 576px), (max-height: 560px)').matches);
  const moveCardBy = (deltaX, deltaY) => {
    if (isCompactViewport()) return;
    cardPosition = { x: cardPosition.x + deltaX, y: cardPosition.y + deltaY };
    root.style.transform = `translate(calc(-50% + ${cardPosition.x}px),calc(-50% + ${cardPosition.y}px))`;
  };

  const bridge = createTavernBridge({ hostWindow, apiWindow: window, buildMode: BUILD_MODE });
  hostWindow[BRIDGE_KEY] = bridge;

  const showGame = async (epoch = contentEpoch) => {
    body.replaceChildren();
    frame = hostDocument.createElement('iframe');
    frame.className = 'noble-school-frame';
    frame.setAttribute('title', '贵族学校的特招生游戏');
    body.append(frame);
    try {
      await loadGameDocument(frame);
      if (destroyed || epoch !== contentEpoch || !frame.isConnected) return;
      const frameDocument = frame.contentDocument;
      const title = frameDocument?.querySelector('.title-safe');
      if (title) {
        title.dataset.tavernWindowDragHandle = 'true';
        const titleButton = frameDocument.createElement('button');
        titleButton.type = 'button';
        titleButton.className = 'noble-school-frame-minimize';
        titleButton.title = '最小化';
        titleButton.textContent = '—';
        title.append(titleButton);
        const frameStyle = frameDocument.createElement('style');
        frameStyle.textContent = `
          .title-safe[data-tavern-window-drag-handle] { position:sticky; padding-right:66px; cursor:grab; user-select:none; touch-action:none; }
          .title-safe[data-tavern-window-drag-handle]:active { cursor:grabbing; }
          .noble-school-frame-minimize { position:absolute; top:50%; right:12px; transform:translateY(-50%); display:grid; place-items:center; width:38px; height:38px; padding:0; border:0; border-radius:10px; color:#4a377d; background:rgba(167,139,250,.14); font-size:22px; line-height:1; cursor:pointer; }
          @media (max-width:640px), (max-height:560px) { .title-safe[data-tavern-window-drag-handle] { padding-right:56px; font-size:20px; } .noble-school-frame-minimize { right:8px; width:36px; height:36px; } }
        `;
        frameDocument.head.append(frameStyle);
        titleButton.addEventListener('pointerdown', (event) => event.stopPropagation());
        titleButton.addEventListener('click', minimize);
        title.addEventListener('pointerdown', (event) => {
          if (event.target.closest('button') || isCompactViewport()) return;
          const pointerId = event.pointerId;
          let lastX = event.clientX;
          let lastY = event.clientY;
          title.setPointerCapture?.(pointerId);
          const move = (next) => {
            if (next.pointerId !== pointerId) return;
            moveCardBy(next.clientX - lastX, next.clientY - lastY);
            lastX = next.clientX;
            lastY = next.clientY;
            next.preventDefault();
          };
          const end = (next) => {
            if (next.pointerId !== pointerId) return;
            title.removeEventListener('pointermove', move);
            title.removeEventListener('pointerup', end);
            title.removeEventListener('pointercancel', end);
          };
          title.addEventListener('pointermove', move, { passive: false });
          title.addEventListener('pointerup', end);
          title.addEventListener('pointercancel', end);
          event.preventDefault();
        });
      }
    } catch (error) {
      if (destroyed || epoch !== contentEpoch) return;
      body.innerHTML = `<div class="noble-school-config"><h2>游戏加载失败</h2><p>${escapeHtml(error.message)}</p><button class="noble-school-button" type="button" data-config-action="retry">重新加载</button></div>`;
      body.querySelector('[data-config-action="retry"]')?.addEventListener('click', () => showGame(epoch));
    }
  };

  const showPluginNotice = async (providedStatus = null, epoch = contentEpoch, preservedFrame = null) => {
    const status = providedStatus || await bridge.getImageGeneratorStatus();
    if (destroyed || epoch !== contentEpoch) return;
    const retainedFrame = preservedFrame?.isConnected ? preservedFrame : null;
    if (retainedFrame) {
      for (const child of [...body.children]) {
        if (child !== retainedFrame) child.remove();
      }
      retainedFrame.hidden = true;
      body.insertAdjacentHTML('beforeend', makePluginNoticeMarkup(status, { openedFromGame: true }));
    } else {
      body.innerHTML = makePluginNoticeMarkup(status);
    }
    const notice = body.querySelector('.noble-school-plugin-notice');
    const returnToGame = async () => {
      if (retainedFrame?.isConnected && !destroyed && epoch === contentEpoch) {
        notice?.remove();
        retainedFrame.hidden = false;
        return;
      }
      await showGame(epoch);
    };
    notice?.querySelector('[data-plugin-action="continue"]')?.addEventListener('click', returnToGame);
    notice?.querySelector('[data-plugin-action="install"]')?.addEventListener('click', () => {
      hostWindow.open(IMAGE_EXTENSION_URL, '_blank', 'noopener,noreferrer');
    });
    notice?.querySelector('[data-plugin-action="test"]')?.addEventListener('click', async () => {
      const message = notice.querySelector('.noble-school-status');
      const preview = notice.querySelector('.noble-school-test-image');
      const buttons = [...notice.querySelectorAll('[data-plugin-action]')];
      buttons.forEach((button) => { button.disabled = true; });
      preview?.classList.remove('visible');
      preview?.removeAttribute('src');
      if (message) message.textContent = '正在生成测试图，请稍候……';
      try {
        const result = await bridge.testImageGenerator();
        if (message) message.textContent = result.message || '测试生图成功，当前配置可以使用。';
        if (preview && result.imageDataUrl) {
          preview.src = result.imageDataUrl;
          preview.classList.add('visible');
          preview.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        }
        buttons.forEach((button) => { button.disabled = false; });
      } catch (error) {
        if (message) message.textContent = `测试失败：${error.message || error}`;
        buttons.forEach((button) => { button.disabled = false; });
      }
    });
    notice?.querySelector('[data-plugin-action="retry"]')?.addEventListener('click', async () => {
      const message = notice.querySelector('.noble-school-status');
      if (message) message.textContent = '正在重新检测插件……';
      const nextStatus = await bridge.getImageGeneratorStatus();
      if (destroyed || epoch !== contentEpoch) return;
      await showPluginNotice(nextStatus, epoch, retainedFrame);
    });
  };

  const minimize = () => {
    card.hidden = true;
    minimized.hidden = false;
    const bounds = minimized.getBoundingClientRect();
    const viewport = getVisibleViewportBounds(hostWindow);
    minimizedPosition = minimizedPosition
      ? clampFloatingPosition(minimizedPosition, bounds, viewport)
      : getDefaultMinimizedPosition(bounds, viewport);
    Object.assign(minimized.style, {
      left: `${minimizedPosition.x}px`,
      top: `${minimizedPosition.y}px`,
      right: 'auto',
      bottom: 'auto',
      margin: '0'
    });
  };
  const restore = () => {
    minimized.hidden = true;
    card.hidden = false;
  };
  const showImageSetup = async () => {
    const epoch = ++contentEpoch;
    overlay.hidden = false;
    restore();
    await showPluginNotice(null, epoch, frame);
    return !destroyed && epoch === contentEpoch;
  };
  overlay.querySelector('[data-overlay-action="restore"]').addEventListener('click', restore);
  overlay.addEventListener('click', (event) => {
    if (event.target.closest('[data-overlay-action="minimize"]')) minimize();
  });

  const removeCardDrag = setupDrag(
    body,
    root,
    () => ({ ...cardPosition }),
    (x, y) => {
      cardPosition = { x, y };
      root.style.transform = `translate(calc(-50% + ${x}px),calc(-50% + ${y}px))`;
    },
    'button',
    isCompactViewport,
    '[data-overlay-drag-handle]'
  );
  const removeMinimizedDrag = setupDrag(
    minimized,
    minimized,
    () => {
      if (minimizedPosition) return { ...minimizedPosition };
      const rect = minimized.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    },
    (x, y) => {
      const bounds = minimized.getBoundingClientRect();
      minimizedPosition = clampFloatingPosition(
        { x, y },
        bounds,
        getVisibleViewportBounds(hostWindow)
      );
      Object.assign(minimized.style, { left: `${minimizedPosition.x}px`, top: `${minimizedPosition.y}px`, right: 'auto', bottom: 'auto', margin: '0' });
    },
    'button'
  );

  const fitToViewport = () => {
    if (isCompactViewport()) {
      cardPosition = { x: 0, y: 0 };
      root.style.removeProperty('transform');
    }
    if (minimizedPosition) {
      const rect = minimized.getBoundingClientRect();
      minimizedPosition = clampFloatingPosition(
        minimizedPosition,
        rect,
        getVisibleViewportBounds(hostWindow)
      );
      Object.assign(minimized.style, { left: `${minimizedPosition.x}px`, top: `${minimizedPosition.y}px` });
    }
  };
  hostWindow.addEventListener('resize', fitToViewport);
  hostWindow.visualViewport?.addEventListener('resize', fitToViewport);
  hostWindow.visualViewport?.addEventListener('scroll', fitToViewport);
  hostWindow.addEventListener('orientationchange', fitToViewport);

  const openCurrentChat = async () => {
    const epoch = ++contentEpoch;
    frame?.remove();
    frame = null;
    body.replaceChildren();
    overlay.hidden = false;
    restore();
    const imageStatus = await bridge.getImageGeneratorStatus();
    if (destroyed || epoch !== contentEpoch) return;
    if (imageStatus.ready) await showGame(epoch);
    else await showPluginNotice(imageStatus, epoch);
  };

  const handleChatChanged = (eventChatId) => {
    const snapshot = getActiveChatSnapshot(hostWindow, window);
    const nextChatId = snapshot.chatId || String(eventChatId || '');
    if (ownerCharacterKey && snapshot.characterKey !== ownerCharacterKey) {
      contentEpoch += 1;
      frame?.remove();
      frame = null;
      overlay.hidden = true;
      return;
    }
    if (nextChatId === activeChatId && frame?.isConnected) return;
    activeChatId = nextChatId;
    void openCurrentChat();
  };
  removeChatChangeListener = subscribeToChatChanges(hostWindow, window, handleChatChanged);

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    contentEpoch += 1;
    removeChatChangeListener();
    removeCardDrag();
    removeMinimizedDrag();
    hostWindow.removeEventListener('resize', fitToViewport);
    hostWindow.visualViewport?.removeEventListener('resize', fitToViewport);
    hostWindow.visualViewport?.removeEventListener('scroll', fitToViewport);
    hostWindow.removeEventListener('orientationchange', fitToViewport);
    overlay.remove();
    hostDocument.getElementById(STYLE_ID)?.remove();
    if (hostWindow[BRIDGE_KEY] === bridge) delete hostWindow[BRIDGE_KEY];
  };

  window.addEventListener('pagehide', destroy, { once: true });
  hostWindow.nobleSchoolOverlay = { minimize, restore, showImageSetup, showSettings: showImageSetup, destroy };
  await openCurrentChat();
}

void mount();
