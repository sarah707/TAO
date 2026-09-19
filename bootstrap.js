const BOOTSTRAP_STATE_KEY = '__NOBLE_SCHOOL_REMOTE_BOOTSTRAP_V1__';
const VERSION_MANIFEST_URL = 'https://sarah707.github.io/TAO/version.json';
const FALLBACK_LOADER_URL = 'https://sarah707.github.io/TAO/loader.js?build=20260919023659';

async function resolveLoaderUrl() {
  try {
    const manifestUrl = new URL(VERSION_MANIFEST_URL);
    manifestUrl.searchParams.set('_', String(Date.now()));
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`版本清单请求失败：HTTP ${response.status}`);
    const manifest = await response.json();
    const loaderUrl = String(manifest?.loaderUrl || '').trim();
    if (!loaderUrl) throw new Error('版本清单没有 loaderUrl。');
    return loaderUrl;
  } catch (error) {
    console.warn('[贵族学校的特招生] 无法读取最新版本清单，改用角色卡内置的首发版本。', error);
    return FALLBACK_LOADER_URL;
  }
}

async function boot() {
  const loaderUrl = await resolveLoaderUrl();
  await import(loaderUrl);
}

if (!globalThis[BOOTSTRAP_STATE_KEY]) {
  globalThis[BOOTSTRAP_STATE_KEY] = boot().catch((error) => {
    delete globalThis[BOOTSTRAP_STATE_KEY];
    console.error('[贵族学校的特招生] 远程游戏加载失败。', error);
    throw error;
  });
}

await globalThis[BOOTSTRAP_STATE_KEY];
