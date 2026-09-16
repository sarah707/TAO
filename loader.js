import { getDefaultImageConfig, normalizeImageConfig } from './bridge/image-providers.js';
import {
  BRIDGE_KEY,
  createTavernBridge,
  loadImageConfig,
  saveImageConfig
} from './bridge/tavern.js';

const OVERLAY_ID = 'noble-school-overlay';
const STYLE_ID = 'noble-school-overlay-style';
const ROOT_ID = 'noble-school-root';

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
#${OVERLAY_ID} #${ROOT_ID} { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:min(100%,960px); padding:0 1rem; pointer-events:none; touch-action:none; will-change:transform; }
#${OVERLAY_ID} .noble-school-card { display:flex; flex-direction:column; max-width:600px; max-height:calc(100vh - 16px); max-height:calc(100dvh - 16px); margin:auto; overflow:hidden; background:#fff; border:1px solid rgba(0,0,0,.125); border-radius:.5rem; box-shadow:0 .125rem .25rem rgba(0,0,0,.075); pointer-events:all; }
#${OVERLAY_ID} .noble-school-body { flex:1 1 auto; height:clamp(360px,calc(100vh - 150px),792px); height:clamp(360px,calc(100dvh - 150px),792px); min-height:0; max-height:clamp(360px,calc(100vh - 150px),792px); max-height:clamp(360px,calc(100dvh - 150px),792px); overflow:hidden; background:#fff; pointer-events:all; }
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
#${OVERLAY_ID} .noble-school-button { border:0; border-radius:8px; padding:.7rem 1rem; background:#f8d7da; color:#3b2930; font:inherit; font-weight:700; cursor:pointer; }
#${OVERLAY_ID} .noble-school-button.secondary { background:#f4eef0; }
#${OVERLAY_ID} .noble-school-button:disabled { cursor:wait; opacity:.6; }
#${OVERLAY_ID} .noble-school-status { min-height:1.5rem; margin-top:.9rem; color:#825566; white-space:pre-wrap; }
#${OVERLAY_ID} .noble-school-test-image { display:none; max-width:180px; max-height:180px; margin:1rem auto 0; border-radius:10px; object-fit:cover; }
#${OVERLAY_ID} .noble-school-test-image.visible { display:block; }
#${OVERLAY_ID} .noble-school-minimized { position:fixed; left:0; right:0; bottom:max(8px,calc(24px + env(safe-area-inset-bottom))); width:min(140px,calc(100dvw - 16px)); height:min(96px,calc(100dvh - 16px)); margin-left:auto; margin-right:auto; padding:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; color:#000; background:#f8d7da; border-radius:12px; box-shadow:0 6px 16px rgba(0,0,0,.2); pointer-events:all; cursor:grab; user-select:none; }
#${OVERLAY_ID} .noble-school-minimized[hidden], #${OVERLAY_ID} .noble-school-card[hidden] { display:none!important; }
#${OVERLAY_ID} .noble-school-minimized strong { font-size:.92rem; text-align:center; }
#${OVERLAY_ID} .noble-school-minimized button { border:0; border-radius:6px; padding:6px 12px; background:#fff; box-shadow:0 3px 8px rgba(0,0,0,.15); font:inherit; font-size:.9rem; cursor:pointer; }
#${OVERLAY_ID} .noble-school-minimized button:hover { background:#f5c6cb; }
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

function makeConfigMarkup(config, initial) {
  const value = normalizeImageConfig(config || getDefaultImageConfig());
  return `
    <div class="noble-school-config">
      <div class="noble-school-config-titlebar" data-overlay-drag-handle>
        <h1>贵族学院的特招生</h1>
        <button class="noble-school-title-minimize" type="button" data-overlay-action="minimize" title="最小化">—</button>
      </div>
      <h2>${initial ? '开始前配置生图模型' : '生图模型配置'}</h2>
      <p>文字剧情直接使用酒馆当前连接。这里仅设置角色头像和礼服图片，不会写入游戏存档或世界书。</p>
      <form id="noble-school-image-form">
        <div class="noble-school-grid">
          <div class="noble-school-field">
            <label for="noble-image-provider">接口类型</label>
            <select id="noble-image-provider" name="provider">
              <option value="gemini" ${value.provider === 'gemini' ? 'selected' : ''}>Gemini AI Studio（API Key）</option>
              <option value="vertex" ${value.provider === 'vertex' ? 'selected' : ''}>Gemini Vertex AI（服务账号 JSON）</option>
              <option value="openai" ${value.provider === 'openai' ? 'selected' : ''}>OpenAI Images 兼容</option>
              <option value="stability" ${value.provider === 'stability' ? 'selected' : ''}>Stability AI</option>
              <option value="a1111" ${value.provider === 'a1111' ? 'selected' : ''}>AUTOMATIC1111 WebUI</option>
              <option value="bfl" ${value.provider === 'bfl' ? 'selected' : ''}>Black Forest Labs / FLUX</option>
              <option value="comfyui" ${value.provider === 'comfyui' ? 'selected' : ''}>ComfyUI API 工作流</option>
            </select>
          </div>
          <div class="noble-school-field" data-providers="gemini vertex openai a1111">
            <label for="noble-image-model">生图模型</label>
            <input id="noble-image-model" name="model" value="${escapeHtml(value.model)}" autocomplete="off" />
            <small class="noble-school-help">A1111 留空时使用当前加载的 checkpoint。</small>
          </div>
        </div>
        <div class="noble-school-field" data-providers="gemini vertex openai stability a1111 bfl comfyui">
          <label for="noble-image-url">API 地址</label>
          <input id="noble-image-url" name="apiUrl" value="${escapeHtml(value.apiUrl)}" autocomplete="off" />
          <small class="noble-school-help" data-providers="vertex">Vertex 使用默认地址时，会根据 Location 自动选择 global 或区域端点。</small>
        </div>
        <div class="noble-school-field" data-providers="gemini openai stability a1111 bfl comfyui">
          <label for="noble-image-key">API Key</label>
          <input id="noble-image-key" name="apiKey" type="password" value="${escapeHtml(value.apiKey)}" autocomplete="off" />
          <small class="noble-school-help">A1111、ComfyUI 本地无鉴权服务可留空；A1111 Basic Auth 可填写“用户名:密码”。</small>
        </div>
        <div class="noble-school-grid" data-providers="vertex">
          <div class="noble-school-field">
            <label for="noble-vertex-project">Vertex Project ID</label>
            <input id="noble-vertex-project" name="projectId" value="${escapeHtml(value.projectId)}" autocomplete="off" placeholder="可从服务账号 JSON 自动读取" />
          </div>
          <div class="noble-school-field">
            <label for="noble-vertex-location">Vertex Location</label>
            <input id="noble-vertex-location" name="location" value="${escapeHtml(value.location)}" autocomplete="off" placeholder="global" />
          </div>
        </div>
        <div class="noble-school-field" data-providers="vertex">
          <label for="noble-vertex-service-account">Vertex 服务账号 JSON</label>
          <textarea id="noble-vertex-service-account" name="serviceAccountJson" spellcheck="false" placeholder='粘贴包含 client_email、private_key 和 project_id 的完整 JSON'>${escapeHtml(value.serviceAccountJson)}</textarea>
          <small class="noble-school-help">配置只保存在当前浏览器本地。建议使用专用服务账号，并仅授予调用 Vertex AI 所需权限。</small>
        </div>
        <div class="noble-school-grid">
          <div class="noble-school-field">
            <label for="noble-image-ratio">默认比例</label>
            <select id="noble-image-ratio" name="aspectRatio">
              ${['1:1','3:4','4:3','9:16','16:9'].map((item) => `<option value="${item}" ${value.aspectRatio === item ? 'selected' : ''}>${item}</option>`).join('')}
            </select>
          </div>
          <div class="noble-school-field" data-providers="openai a1111 bfl comfyui">
            <label for="noble-image-size">目标图片尺寸</label>
            <select id="noble-image-size" name="size">
              ${['1024x1024','1024x1536','1536x1024','auto'].map((item) => `<option value="${item}" ${value.size === item ? 'selected' : ''}>${item}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="noble-school-field" data-providers="stability a1111 comfyui">
          <label for="noble-image-negative">负面提示词</label>
          <input id="noble-image-negative" name="negativePrompt" value="${escapeHtml(value.negativePrompt)}" autocomplete="off" />
        </div>
        <div class="noble-school-field" data-providers="a1111">
          <label for="noble-image-steps">采样步数</label>
          <input id="noble-image-steps" name="steps" type="number" min="1" max="150" value="${escapeHtml(value.steps)}" />
        </div>
        <div class="noble-school-field" data-providers="bfl">
          <label for="noble-image-proxy">BFL 图片 CORS 代理</label>
          <input id="noble-image-proxy" name="imageProxyUrl" value="${escapeHtml(value.imageProxyUrl)}" placeholder="https://example.com/image-proxy?url= 或含 {url}" autocomplete="off" />
          <small class="noble-school-help">BFL 官方交付地址禁止浏览器跨域读取且图片十分钟失效。要存进游戏存档，必须填一个由玩家控制、能返回图片字节并允许 CORS 的代理。</small>
        </div>
        <div class="noble-school-field" data-providers="comfyui">
          <label for="noble-image-workflow">ComfyUI API 格式工作流 JSON</label>
          <textarea id="noble-image-workflow" name="workflowJson" spellcheck="false" placeholder='从 ComfyUI 导出 API 格式工作流；把正面提示文本写成 {{prompt}}'>${escapeHtml(value.workflowJson)}</textarea>
          <small class="noble-school-help">支持占位符 {{prompt}}、{{negative_prompt}}、{{seed}}、{{width}}、{{height}}；工作流需包含 SaveImage 或 PreviewImage 输出。</small>
        </div>
        <div class="noble-school-actions">
          <button class="noble-school-button secondary" type="button" data-config-action="test">测试生图</button>
          <button class="noble-school-button" type="submit">${initial ? '保存并开始游戏' : '保存配置'}</button>
          ${initial ? '' : '<button class="noble-school-button secondary" type="button" data-config-action="cancel">返回游戏</button>'}
        </div>
        <div class="noble-school-status" aria-live="polite"></div>
        <img class="noble-school-test-image" alt="生图测试结果" />
      </form>
    </div>`;
}

async function loadGameDocument(iframe) {
  const gameUrl = new URL('./game/index.html', import.meta.url);
  const response = await fetch(gameUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`游戏页面加载失败（HTTP ${response.status}）。`);
  let html = await response.text();
  const baseTag = `<base href="${escapeHtml(new URL('./game/', import.meta.url).href)}">`;
  html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  const loaded = new Promise((resolve) => iframe.addEventListener('load', resolve, { once: true }));
  iframe.srcdoc = html;
  await loaded;
}

function mount() {
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
  let imageConfig = loadImageConfig(hostWindow);
  let frame = null;
  let cardPosition = { x: 0, y: 0 };
  let minimizedPosition = null;
  const isCompactViewport = () => Boolean(hostWindow.matchMedia?.('(max-width: 576px), (max-height: 560px)').matches);
  const moveCardBy = (deltaX, deltaY) => {
    if (isCompactViewport()) return;
    cardPosition = { x: cardPosition.x + deltaX, y: cardPosition.y + deltaY };
    root.style.transform = `translate(calc(-50% + ${cardPosition.x}px),calc(-50% + ${cardPosition.y}px))`;
  };

  const bridge = createTavernBridge({
    hostWindow,
    apiWindow: window,
    getImageConfig: () => imageConfig,
    onOpenImageSettings: () => showConfig(false)
  });
  hostWindow[BRIDGE_KEY] = bridge;

  const showGame = async () => {
    body.replaceChildren();
    frame = hostDocument.createElement('iframe');
    frame.className = 'noble-school-frame';
    frame.setAttribute('title', '贵族学校的特招生游戏');
    body.append(frame);
    try {
      await loadGameDocument(frame);
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
      body.innerHTML = `<div class="noble-school-config"><h2>游戏加载失败</h2><p>${escapeHtml(error.message)}</p><button class="noble-school-button" type="button" data-config-action="retry">重新加载</button></div>`;
      body.querySelector('[data-config-action="retry"]')?.addEventListener('click', showGame);
    }
  };

  const readForm = (form) => Object.fromEntries(new FormData(form).entries());
  const showConfig = (initial = false) => {
    body.innerHTML = makeConfigMarkup(imageConfig, initial);
    const form = body.querySelector('#noble-school-image-form');
    const provider = form.elements.provider;
    const status = form.querySelector('.noble-school-status');
    const testImage = form.querySelector('.noble-school-test-image');
    const buttons = [...form.querySelectorAll('button')];
    const updateVisibility = () => {
      form.querySelectorAll('[data-providers]').forEach((field) => {
        field.hidden = !field.dataset.providers.split(/\s+/).includes(provider.value);
      });
    };
    const updateProviderDefaults = () => {
      const defaults = getDefaultImageConfig(provider.value);
      form.elements.apiUrl.value = defaults.apiUrl;
      form.elements.model.value = defaults.model;
      form.elements.size.value = defaults.size;
      form.elements.location.value = defaults.location;
      updateVisibility();
    };
    provider.addEventListener('change', updateProviderDefaults);
    updateVisibility();
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        imageConfig = saveImageConfig(hostWindow, readForm(form));
        status.textContent = '配置已保存。';
        await showGame();
      } catch (error) {
        status.textContent = error.message || '配置保存失败。';
      }
    });
    form.querySelector('[data-config-action="test"]')?.addEventListener('click', async () => {
      buttons.forEach((button) => { button.disabled = true; });
      status.textContent = '正在测试生图，请稍候……';
      testImage.classList.remove('visible');
      try {
        const result = await bridge.testImage(readForm(form));
        testImage.src = `data:${result.mimeType};base64,${result.data}`;
        testImage.classList.add('visible');
        status.textContent = '生图测试成功。测试图片不会写入游戏存档。';
      } catch (error) {
        status.textContent = error.message || '生图测试失败。';
      } finally {
        buttons.forEach((button) => { button.disabled = false; });
      }
    });
    form.querySelector('[data-config-action="cancel"]')?.addEventListener('click', showGame);
  };

  const minimize = () => {
    card.hidden = true;
    minimized.hidden = false;
  };
  const restore = () => {
    minimized.hidden = true;
    card.hidden = false;
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
      const viewport = hostWindow.visualViewport;
      const viewportWidth = viewport?.width || hostWindow.innerWidth;
      const viewportHeight = viewport?.height || hostWindow.innerHeight;
      const bounds = minimized.getBoundingClientRect();
      minimizedPosition = {
        x: Math.min(Math.max(4, x), Math.max(4, viewportWidth - bounds.width - 4)),
        y: Math.min(Math.max(4, y), Math.max(4, viewportHeight - bounds.height - 4))
      };
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
      const viewport = hostWindow.visualViewport;
      const viewportWidth = viewport?.width || hostWindow.innerWidth;
      const viewportHeight = viewport?.height || hostWindow.innerHeight;
      minimizedPosition = {
        x: Math.min(Math.max(4, minimizedPosition.x), Math.max(4, viewportWidth - rect.width - 4)),
        y: Math.min(Math.max(4, minimizedPosition.y), Math.max(4, viewportHeight - rect.height - 4))
      };
      Object.assign(minimized.style, { left: `${minimizedPosition.x}px`, top: `${minimizedPosition.y}px` });
    }
  };
  hostWindow.addEventListener('resize', fitToViewport);
  hostWindow.visualViewport?.addEventListener('resize', fitToViewport);

  const destroy = () => {
    removeCardDrag();
    removeMinimizedDrag();
    hostWindow.removeEventListener('resize', fitToViewport);
    hostWindow.visualViewport?.removeEventListener('resize', fitToViewport);
    overlay.remove();
    hostDocument.getElementById(STYLE_ID)?.remove();
    if (hostWindow[BRIDGE_KEY] === bridge) delete hostWindow[BRIDGE_KEY];
  };

  window.addEventListener('pagehide', destroy, { once: true });
  hostWindow.nobleSchoolOverlay = { minimize, restore, showSettings: () => showConfig(false), destroy };
  if (imageConfig) showGame();
  else showConfig(true);
}

mount();
