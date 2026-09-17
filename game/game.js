(function () {
  const app = document.getElementById('app');
  const titleSafe = document.querySelector('.title-safe');
  const syncTitleSafeHeight = () => {
    if (!titleSafe) return;
    document.documentElement.style.setProperty('--title-safe-height', `${Math.ceil(titleSafe.getBoundingClientRect().height)}px`);
  };
  syncTitleSafeHeight();
  if (titleSafe && typeof ResizeObserver === 'function') {
    new ResizeObserver(syncTitleSafeHeight).observe(titleSafe);
  }
  window.addEventListener('resize', syncTitleSafeHeight);
  const IS_TEST_BUILD = String(globalThis.__NOBLE_SCHOOL_BUILD_MODE__ || '').toLowerCase() === 'github';
  const { escapeHtml, requestJson, postJson, parseDurationMs } = window.Games0Client || {};
  const {
    CAMPAIGN_CONFIG,
    TERM_DEFINITIONS,
    parseDate,
    addDays,
    diffDays,
    getWeekStart,
    getWeekDates,
    clamp,
    selectNewestStoredValue,
    resolveStoredPlanFixed,
    evaluateTermStanding,
    evaluateGraduation,
    selectFirstClassIntroduction,
    selectRandomAPlusCourseId,
    canReceiveGraduationInternshipOffer,
    shouldResetHomeworkMergeBoard,
    findCharactersForCourse,
    isStudentCouncilPresident,
    normalizeGeneratedCharactersForEvent,
    resolveInternshipSelection,
    findMatchingPetrifiedPieceIndex,
    makeImageScopePrefix,
    getImageScopeFromSaveKey,
    migrateRuntimeVersion,
    extractNearestTagContent,
    extractInfoBlockContent,
    parseLooseCharacterRecords
  } = window.Games0Core || {};
  const GAME_PROMPTS = window.GAME_PROMPTS;
  if (typeof requestJson !== 'function' || typeof postJson !== 'function' || typeof escapeHtml !== 'function' || typeof parseDurationMs !== 'function') {
    throw new Error('公共客户端工具加载失败。');
  }
  if (!CAMPAIGN_CONFIG || !Array.isArray(TERM_DEFINITIONS) || typeof selectNewestStoredValue !== 'function' || typeof resolveStoredPlanFixed !== 'function' || typeof selectFirstClassIntroduction !== 'function' || typeof selectRandomAPlusCourseId !== 'function' || typeof canReceiveGraduationInternshipOffer !== 'function' || typeof shouldResetHomeworkMergeBoard !== 'function' || typeof findCharactersForCourse !== 'function' || typeof isStudentCouncilPresident !== 'function' || typeof normalizeGeneratedCharactersForEvent !== 'function' || typeof resolveInternshipSelection !== 'function' || typeof findMatchingPetrifiedPieceIndex !== 'function' || typeof evaluateTermStanding !== 'function' || typeof evaluateGraduation !== 'function' || typeof extractNearestTagContent !== 'function' || typeof extractInfoBlockContent !== 'function' || typeof parseLooseCharacterRecords !== 'function') {
    throw new Error('游戏核心规则加载失败。');
  }
  if (!GAME_PROMPTS?.eventSpecs || typeof GAME_PROMPTS.buildPromptModules !== 'function' || typeof GAME_PROMPTS.buildEventPromptTexts !== 'function') {
    throw new Error('提示词模板加载失败。');
  }
  const STORAGE_VERSION = CAMPAIGN_CONFIG.storageVersion;
  const PLACEHOLDER_AVATAR = 'placeholder-avatar.svg?build=20260917215146';
  const DAILY_COST = 25;
  const START_DATE = CAMPAIGN_CONFIG.startDate;
  const FIRST_PLAYABLE_DATE = CAMPAIGN_CONFIG.firstPlayableDate;
  const GRADUATION_TERM_ID = CAMPAIGN_CONFIG.graduationTermId;
  const UPPER_TERM_ID = CAMPAIGN_CONFIG.upperTermId;
  const BUSINESS_ENDING_SCORE = CAMPAIGN_CONFIG.businessEndingScore;
  const GRADUATION_ACTION_PROGRESS = CAMPAIGN_CONFIG.graduationActionProgress;
  const RELATIONSHIP_THRESHOLDS = CAMPAIGN_CONFIG.relationshipThresholds;
  const ASSISTANT_COURSE = CAMPAIGN_CONFIG.assistantCourse;
  const WINTER_BREAK_START = '02-01';
  const WINTER_BREAK_END = '02-28';
  const SUMMER_BREAK_MONTH_DAY_START = '07-06';
  const SUMMER_BREAK_MONTH_DAY_END = '08-30';
  const GAME_BOOTSTRAP_URL = 'api/game/bootstrap';
  const GLOBAL_AI_SETTINGS_KEY = 'games0.ai.settings.global';
  const GLOBAL_AI_ACTIVITY_KEY = 'games0.ai.activity.global';
  const GLOBAL_CHAPTER_DEBUG_KEY = 'games0.chapter.debug';
  const CHAPTER_MODAL_SESSION_KEY = 'games0.ui.chapter-modal';
  const CHAT_STORAGE_URL = 'api/card-storage/chat';
  const TAVERN_DISPLAY_REGEX_URL = 'api/tavern-display-regex';
  const CHAT_CACHE_META_KEY = 'games0.chat-cache-id.tavern-card';
  const CHAT_STORAGE_SCOPES = ['runtime', 'save.auto', 'save.slot1', 'save.slot2', 'save.slot3'];
  const EVENT_ACTIVITY_SKIP_HINTS = new Set(['参观校内马术障碍赛', '校庆晚宴', '慈善拍卖会', '新年舞会', '春游野餐会', '校园音乐节', '校内音乐节', '仲夏夜假面舞会']);
  const EVENT_SPECS = GAME_PROMPTS.eventSpecs;
  const buildPromptModules = GAME_PROMPTS.buildPromptModules;
  const buildBackgroundAvatarPrompt = GAME_PROMPTS.buildBackgroundAvatarPrompt;
  const buildOutfitImagePrompt = GAME_PROMPTS.buildOutfitImagePrompt;
  const HISTORY_MONTH_FORMATTER = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' });
  const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  let AI_MODEL_OPTIONS = {
    aiStudio: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' }
    ],
    vertex: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' }
    ]
  };
  const SPECIAL_COURSES = CAMPAIGN_CONFIG.specialCourses.map((course) => ({
    ...course,
    termLabel: TERM_DEFINITIONS.find((term) => term.id === course.termId)?.label || '毕业学年下学期'
  }));
  const SPECIAL_COURSE_IDS = new Set(SPECIAL_COURSES.map((item) => item.id));
  const ACTIVITY_ALIASES = new Map([
    ['考试周', '考试'],
    ['校际辩论赛报名', '校际辩论会报名'],
    ['辩论会报名', '校际辩论会报名'],
    ['报名辩论会', '校际辩论会报名'],
    ['校际辩论赛', '校际辩论会'],
    ['辩论赛', '校际辩论会'],
    ['野餐会', '春游野餐会'],
    ['校内马术障碍赛', '参观校内马术障碍赛'],
    ['班级旅行', '班级度假'],
    ['班级旅游', '班级度假']
  ]);
  const GRADE_ORDER = ['F', 'D', 'C', 'B', 'A', 'A+'];
  const ACTION_ORDER = [
    '参加毕业典礼',
    '毕业答辩',
    '考试',
    '开学典礼',
    '约会',
    '参观校内马术障碍赛',
    '校庆晚宴',
    '慈善拍卖会',
    '新年舞会',
    '校际辩论会报名',
    '校际辩论会',
    '春游野餐会',
    '校园音乐节',
    '仲夏夜假面舞会',
    '企业宣讲会',
    '上某门课',
    '班级度假',
    '做家教',
    '做学生会秘书',
    '复习某门课',
    '做助教',
    '发传单',
    '新年礼宾临时工',
    '毕业实习',
    '写毕业论文',
    '准备校际辩论会',
    '睡觉'
  ];
  const FIXED_ACTIVITY_SPEC_KEYS = new Map([
    ['参加毕业典礼', '参加毕业典礼'],
    ['考试', '考试'],
    ['开学典礼', '开学典礼'],
    ['参观校内马术障碍赛', '参观校内马术障碍赛'],
    ['校庆晚宴', '校庆晚宴'],
    ['慈善拍卖会', '慈善拍卖会'],
    ['新年舞会', '新年舞会'],
    ['校际辩论会报名', '校际辩论会报名'],
    ['校际辩论会', '校际辩论会'],
    ['春游野餐会', '春游野餐会'],
    ['校园音乐节', '校园音乐节'],
    ['仲夏夜假面舞会', '仲夏夜假面舞会'],
    ['企业宣讲会', '企业宣讲会'],
    ['班级度假', '班级度假']
  ]);
  const LOCKED_SCHEDULE_ACTIVITIES = new Set([
    '参加毕业典礼',
    '毕业答辩',
    '考试',
    '开学典礼',
    '校际辩论会'
  ]);

  // ---- 调试开关 ----
  const AI_DISABLED = false; // 测试小游戏时设为 true，禁止发送 AI 请求；正式使用时改回 false

  // ---- 合成小游戏 ----
  const MERGE_BOARD_COLS = 7;
  const MERGE_BOARD_ROWS = 7;
  const MERGE_BOARD_SIZE = MERGE_BOARD_COLS * MERGE_BOARD_ROWS;
  const MERGE_INSPIRATION_MAX = 65535;
  const MERGE_INSPIRATION_INITIAL = 100;
  const MERGE_INSPIRATION_PER_DAY = 10;
  const MERGE_GENERATION_COST = 1;
  const MERGE_GENERATION_INTERVAL_MS = 600;
  const MERGE_HOMEWORK_PROGRESS_NORMAL = 10;
  const MERGE_HOMEWORK_PROGRESS_THESIS = 2;
  const MERGE_BOARD_CENTER_COL_START = 1;
  const MERGE_BOARD_CENTER_COL_END = 4;
  const MERGE_BOARD_CENTER_ROW_START = 2;
  const MERGE_BOARD_CENTER_ROW_END = 4;
  const MERGE_MOTHER_POSITIONS = [16, 17, 30, 31]; // (2,2) (3,2) (2,4) (3,4) in center 4x3 area

  const MERGE_CHAINS = [
    {
      id: 1, name: '构思链', motherSvg: '1-0.svg?build=20260917215146', motherName: '构思',
      pieces: [
        { level: 1, svg: '1-1.svg?build=20260917215146', name: '灵感微光' },
        { level: 2, svg: '1-2.svg?build=20260917215146', name: '零散想法' },
        { level: 3, svg: '1-3.svg?build=20260917215146', name: '初步构思' },
        { level: 4, svg: '1-4.svg?build=20260917215146', name: '核心论点' },
        { level: 5, svg: '1-5.svg?build=20260917215146', name: '论文大纲' },
        { level: 6, svg: '1-6.svg?build=20260917215146', name: '引言初稿' },
        { level: 7, svg: '1-7.svg?build=20260917215146', name: '引言定稿' }
      ]
    },
    {
      id: 2, name: '文献链', motherSvg: '2-0.svg?build=20260917215146', motherName: '文献',
      pieces: [
        { level: 1, svg: '2-1.svg?build=20260917215146', name: '阅读闪念' },
        { level: 2, svg: '2-2.svg?build=20260917215146', name: '文献摘录' },
        { level: 3, svg: '2-3.svg?build=20260917215146', name: '综述片段' },
        { level: 4, svg: '2-4.svg?build=20260917215146', name: '文献综述' },
        { level: 5, svg: '2-5.svg?build=20260917215146', name: '理论框架' },
        { level: 6, svg: '2-6.svg?build=20260917215146', name: '方法初稿' },
        { level: 7, svg: '2-7.svg?build=20260917215146', name: '方法定稿' }
      ]
    },
    {
      id: 3, name: '实证链', motherSvg: '3-0.svg?build=20260917215146', motherName: '实证',
      pieces: [
        { level: 1, svg: '3-1.svg?build=20260917215146', name: '数据直觉' },
        { level: 2, svg: '3-2.svg?build=20260917215146', name: '实验记录' },
        { level: 3, svg: '3-3.svg?build=20260917215146', name: '分析图表' },
        { level: 4, svg: '3-4.svg?build=20260917215146', name: '结果汇总' },
        { level: 5, svg: '3-5.svg?build=20260917215146', name: '结果解读' },
        { level: 6, svg: '3-6.svg?build=20260917215146', name: '结果初稿' },
        { level: 7, svg: '3-7.svg?build=20260917215146', name: '结果定稿' }
      ]
    },
    {
      id: 4, name: '思辨链', motherSvg: '4-0.svg?build=20260917215146', motherName: '思辨',
      pieces: [
        { level: 1, svg: '4-1.svg?build=20260917215146', name: '讨论灵感' },
        { level: 2, svg: '4-2.svg?build=20260917215146', name: '批判笔记' },
        { level: 3, svg: '4-3.svg?build=20260917215146', name: '逻辑论证' },
        { level: 4, svg: '4-4.svg?build=20260917215146', name: '讨论要点' },
        { level: 5, svg: '4-5.svg?build=20260917215146', name: '结论雏形' },
        { level: 6, svg: '4-6.svg?build=20260917215146', name: '讨论初稿' },
        { level: 7, svg: '4-7.svg?build=20260917215146', name: '讨论定稿' }
      ]
    }
  ];

  const MERGE_CHAIN_MAP = new Map(MERGE_CHAINS.map((c) => [c.id, c]));

  const MERGE_BIZ_CHAINS = [
    {
      id: 1, name: '机会', motherSvg: 'g1-0.svg?build=20260917215146', motherName: '机会',
      pieces: [
        { level: 1, svg: 'g1-1.svg?build=20260917215146', name: '市场杂闻' },
        { level: 2, svg: 'g1-2.svg?build=20260917215146', name: '用户抱怨' },
        { level: 3, svg: 'g1-3.svg?build=20260917215146', name: '需求碎片' },
        { level: 4, svg: 'g1-4.svg?build=20260917215146', name: '目标用户画像' },
        { level: 5, svg: 'g1-5.svg?build=20260917215146', name: '需求验证报告' },
        { level: 6, svg: 'g1-6.svg?build=20260917215146', name: '市场规模预估' },
        { level: 7, svg: 'g1-7.svg?build=20260917215146', name: '市场分析篇' }
      ]
    },
    {
      id: 2, name: '产品', motherSvg: 'g2-0.svg?build=20260917215146', motherName: '产品',
      pieces: [
        { level: 1, svg: 'g2-1.svg?build=20260917215146', name: '产品想法' },
        { level: 2, svg: 'g2-2.svg?build=20260917215146', name: '功能清单' },
        { level: 3, svg: 'g2-3.svg?build=20260917215146', name: '核心功能原型' },
        { level: 4, svg: 'g2-4.svg?build=20260917215146', name: '价值主张' },
        { level: 5, svg: 'g2-5.svg?build=20260917215146', name: '最小可行产品计划' },
        { level: 6, svg: 'g2-6.svg?build=20260917215146', name: '技术路线图' },
        { level: 7, svg: 'g2-7.svg?build=20260917215146', name: '解决方案篇' }
      ]
    },
    {
      id: 3, name: '商业', motherSvg: 'g3-0.svg?build=20260917215146', motherName: '商业',
      pieces: [
        { level: 1, svg: 'g3-1.svg?build=20260917215146', name: '盈利点子' },
        { level: 2, svg: 'g3-2.svg?build=20260917215146', name: '收入来源列表' },
        { level: 3, svg: 'g3-3.svg?build=20260917215146', name: '成本结构分析' },
        { level: 4, svg: 'g3-4.svg?build=20260917215146', name: '定价策略' },
        { level: 5, svg: 'g3-5.svg?build=20260917215146', name: '客户关系策略' },
        { level: 6, svg: 'g3-6.svg?build=20260917215146', name: '核心伙伴设想' },
        { level: 7, svg: 'g3-7.svg?build=20260917215146', name: '商业模式篇' }
      ]
    },
    {
      id: 4, name: '执行', motherSvg: 'g4-0.svg?build=20260917215146', motherName: '执行',
      pieces: [
        { level: 1, svg: 'g4-1.svg?build=20260917215146', name: '创始初心' },
        { level: 2, svg: 'g4-2.svg?build=20260917215146', name: '团队雏形' },
        { level: 3, svg: 'g4-3.svg?build=20260917215146', name: '关键里程碑' },
        { level: 4, svg: 'g4-4.svg?build=20260917215146', name: '资源配置计划' },
        { level: 5, svg: 'g4-5.svg?build=20260917215146', name: '风险预案' },
        { level: 6, svg: 'g4-6.svg?build=20260917215146', name: '财务预测' },
        { level: 7, svg: 'g4-7.svg?build=20260917215146', name: '落地路线图' }
      ]
    }
  ];

  const MERGE_BIZ_CHAIN_MAP = new Map(MERGE_BIZ_CHAINS.map((c) => [c.id, c]));

  function getMergeChainMap() {
    return state.mergeGame?.mode === 'biz' ? MERGE_BIZ_CHAIN_MAP : MERGE_CHAIN_MAP;
  }

  function getMergePieceInfo(chainId, level, petrified) {
    const chain = getMergeChainMap().get(chainId);
    if (!chain) return null;
    const prefix = petrified ? '未验证' : '';
    if (level === 0) return { chainId, level: 0, svg: chain.motherSvg, name: prefix + chain.motherName, chainName: chain.name };
    const piece = chain.pieces[level - 1];
    if (!piece) return null;
    return { chainId, level, svg: piece.svg, name: prefix + piece.name, chainName: chain.name };
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function isCenterCell(cellIndex) {
    const col = cellIndex % MERGE_BOARD_COLS;
    const row = Math.floor(cellIndex / MERGE_BOARD_COLS);
    return col >= MERGE_BOARD_CENTER_COL_START && col <= MERGE_BOARD_CENTER_COL_END &&
           row >= MERGE_BOARD_CENTER_ROW_START && row <= MERGE_BOARD_CENTER_ROW_END;
  }

  function generatePetrifiedBoard(board, motherIndices, mode) {
    const chains = mode === 'biz' ? MERGE_BIZ_CHAINS : MERGE_CHAINS;
    const required = [];
    for (const chain of chains) {
      for (let level = 1; level <= 6; level++) {
        required.push({ chainId: chain.id, level: level });
      }
    }
    const motherSet = new Set(motherIndices);
    // Count cells available for petrified: exclude center area + mother cells
    var availableCells = 0;
    for (let i = 0; i < MERGE_BOARD_SIZE; i++) {
      if (!motherSet.has(i) && !isCenterCell(i)) availableCells++;
    }
    const extraCount = availableCells - required.length;
    const extra = [];
    for (let i = 0; i < extraCount; i++) {
      const chain = chains[Math.floor(Math.random() * chains.length)];
      const level = 1 + Math.floor(Math.random() * 6);
      extra.push({ chainId: chain.id, level: level });
    }
    const allPetrified = shuffleArray([...required, ...extra]);
    let pi = 0;
    for (let i = 0; i < MERGE_BOARD_SIZE; i++) {
      if (!motherSet.has(i) && !isCenterCell(i)) {
        const p = allPetrified[pi];
        board[i] = { id: `petrified-${i}-${p.chainId}-${p.level}`, chainId: p.chainId, level: p.level, petrified: true };
        pi++;
      }
    }
  }

  function createMergeGameState(mode) {
    mode = mode || 'homework';
    const board = new Array(MERGE_BOARD_SIZE).fill(null);
    const chains = mode === 'biz' ? MERGE_BIZ_CHAINS : MERGE_CHAINS;
    const prefix = mode === 'biz' ? 'bmother-' : 'mother-';
    const motherIndices = [];
    for (let i = 0; i < chains.length; i++) {
      const idx = MERGE_MOTHER_POSITIONS[i];
      motherIndices.push(idx);
      board[idx] = { id: `${prefix}${chains[i].id}`, chainId: chains[i].id, level: 0 };
    }
    generatePetrifiedBoard(board, motherIndices, mode);
    return {
      mode: mode,
      board,
      tasks: [],
      generationMotherId: null,
      generationLastClick: 0,
      selectedPieceCell: null,
      pendingPieceTapId: null,
      taskInfoDisplay: null,
      lastGenerated: null,
      lastTaskPieceClick: null,
      submitAnimation: null,
      aiReady: false,
      initialized: false,
      tutorial: null
    };
  }

  const state = {
    bootstrap: null,
    runtime: null,
    specs: {
      actions: [],
      events: new Map(EVENT_SPECS)
    },
    aiSettings: null,
    aiActivity: null,
    ui: {
      page: 'schedule',
      selectedDate: null,
      saveMode: 'save',
      status: '',
      statusTone: '',
      loading: true,
      interactionLocked: false,
      aiLoading: null,
      statChanges: [],
      modal: null,
      currentAiEvent: null
    },
    timers: {
      avatarJobs: new Map(),
      outfitJobs: new Map(),
      assetGenerationQueue: [],
      queuedAssetKeys: new Set(),
      assetGenerationRunning: false
    },
    mergeGame: null,
    pendingChapterShow: null
  };

  function formatStoryContentHtml(value) {
    const source = String(value ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/[\t ]+\n/g, '\n')
      .trim()
      .replace(/\n[^\S\n]*\n(?:[^\S\n]*\n)*/g, '\n\n');
    if (!source) return '';
    const pattern = /"([^"\n]+)"|“([^”\n]+)”|「([^」\n]+)」|\*([^*\n]+)\*/g;
    let html = '';
    let lastIndex = 0;
    let match;
    while ((match = pattern.exec(source)) !== null) {
      html += escapeHtml(source.slice(lastIndex, match.index));
      if (match[1] !== undefined || match[2] !== undefined || match[3] !== undefined) {
        html += `<strong class="story-quoted">${escapeHtml(match[0])}</strong>`;
      } else {
        html += `<span class="story-muted-inline">${escapeHtml(match[4])}</span>`;
      }
      lastIndex = match.index + match[0].length;
    }
    html += escapeHtml(source.slice(lastIndex));
    return html
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
      .join('');
  }

  async function processAssetGenerationQueue() {
    if (state.timers.assetGenerationRunning) {
      return;
    }
    state.timers.assetGenerationRunning = true;
    try {
      while (state.timers.assetGenerationQueue.length) {
        const task = state.timers.assetGenerationQueue.shift();
        if (!task) {
          continue;
        }
        state.timers.queuedAssetKeys.delete(task.key);
        try {
          await task.run();
        } catch (error) {
          console.error('素材生成任务执行失败。', error);
        }
      }
    } finally {
      state.timers.assetGenerationRunning = false;
      if (state.timers.assetGenerationQueue.length) {
        void processAssetGenerationQueue();
      }
    }
  }

  function enqueueAssetGenerationTask(key, run) {
    if (state.timers.queuedAssetKeys.has(key)) {
      return;
    }
    state.timers.queuedAssetKeys.add(key);
    state.timers.assetGenerationQueue.push({ key, run });
    void processAssetGenerationQueue();
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function createRunId() {
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    return `run-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  function getMonthKey(dateText) {
    return dateText.slice(0, 7);
  }

  function formatMonthDay(dateText) {
    const date = parseDate(dateText);
    return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
  }

  function formatWeekday(dateText) {
    return WEEKDAY_LABELS[parseDate(dateText).getUTCDay()];
  }

  function getTermMeta(dateText) {
    for (const term of TERM_DEFINITIONS) {
      if (dateText >= term.start && dateText <= term.end) {
        const weekNumber = Math.floor(diffDays(getWeekStart(term.start), getWeekStart(dateText)) / 7) + 1;
        const totalWeeks = Math.floor(diffDays(getWeekStart(term.start), getWeekStart(term.end)) / 7) + 1;
        return { ...term, weekNumber, totalWeeks };
      }
    }

    for (let index = 0; index < TERM_DEFINITIONS.length - 1; index += 1) {
      const current = TERM_DEFINITIONS[index];
      const next = TERM_DEFINITIONS[index + 1];
      if (dateText > current.end && dateText < next.start) {
        const academicYear = current.academicYear;
        const breakLabel = getBreakLabelForAcademicYear(dateText);
        const gapStart = addDays(current.end, 1);
        const gapEnd = addDays(next.start, -1);
        const weekNumber = Math.floor(diffDays(getWeekStart(current.start), getWeekStart(dateText)) / 7) + 1;
        const totalWeeks = Math.floor(diffDays(getWeekStart(current.start), getWeekStart(gapEnd)) / 7) + 1;
        if (breakLabel) {
          return {
            id: `${current.id}-break`,
            academicYear,
            semester: '假期',
            label: breakLabel,
            start: gapStart,
            end: gapEnd,
            weekNumber,
            totalWeeks,
            isBreak: true
          };
        }
        // 学期与寒暑假之间的间隔期（如考试周前后），非假期也非行课期
        return {
          id: `${current.id}-break`,
          academicYear,
          semester: current.semester,
          label: current.label,
          start: gapStart,
          end: gapEnd,
          weekNumber,
          totalWeeks,
          isBreak: false
        };
      }
    }

    return null;
  }

  function getTermMetaByFullId(termId) {
    return TERM_DEFINITIONS.find(function (t) { return t.id === termId; }) || null;
  }

  function getTimelineLabel(dateText) {
    const meta = getTermMeta(dateText);
    if (!meta) {
      return formatMonthDay(dateText);
    }
    if (meta.isBreak) {
      return `${meta.label}第${meta.weekNumber}周 ${formatMonthDay(dateText)}`;
    }
    return `${meta.label}第${meta.weekNumber}周 ${formatMonthDay(dateText)}`;
  }

  function isDateInWinterBreak(dateText) {
    const monthDay = dateText.slice(5);
    return monthDay >= WINTER_BREAK_START && monthDay <= WINTER_BREAK_END;
  }

  function isDateInSummerBreak(dateText) {
    const monthDay = dateText.slice(5);
    return monthDay >= SUMMER_BREAK_MONTH_DAY_START && monthDay <= SUMMER_BREAK_MONTH_DAY_END;
  }

  function getBreakLabelForAcademicYear(dateText) {
    if (isDateInWinterBreak(dateText)) {
      return '毕业学年寒假';
    }
    if (isDateInSummerBreak(dateText)) {
      return '毕业学年暑假';
    }
    return null;
  }

  function formatHistoryDatePrefix(dateText) {
    const meta = getTermMeta(dateText);
    if (!meta) {
      return formatMonthDay(dateText);
    }
    return `${meta.label}${formatMonthDay(dateText)}`;
  }

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function getLocalStorageUsage() {
    let totalBytes = 0;
    const keys = [];
    try {
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const rawKey = window.localStorage.key(i);
        if (!rawKey) {
          continue;
        }
        const rawValue = window.localStorage.getItem(rawKey) || '';
        const bytes = (rawKey.length + rawValue.length) * 2;
        totalBytes += bytes;
        keys.push({ key: rawKey, kb: (bytes / 1024).toFixed(1) });
      }
    } catch (error) {
      return { totalBytes: null, keys: [] };
    }
    keys.sort((a, b) => parseFloat(b.kb) - parseFloat(a.kb));
    return { totalBytes, keys };
  }

  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError' || String(error).includes('quota')) {
        try {
          window.localStorage.removeItem(key);
          window.localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          // 释放旧值后仍失败，继续报错
        }
      }
      const sizeKB = (value.length / 1024).toFixed(0);
      const usage = getLocalStorageUsage();
      const usageInfo = usage.totalBytes !== null
        ? `（站点LocalStorage总计约 ${(usage.totalBytes / 1024 / 1024).toFixed(1)} MB）`
        : '';
      const keyInfo = usage.keys.length
        ? ` 各key用量: ${usage.keys.map((k) => `${k.key.replace('games0.', '')} ${k.kb}KB`).join(', ')}`
        : '';
      const reason = error.name === 'QuotaExceededError' || String(error).includes('quota')
        ? `localStorage 配额已满${usageInfo}，本次写入 ${sizeKB} KB${keyInfo}`
        : (error.message || String(error));
      setStatus(`写入存档失败: ${reason}`, 'error');
      return false;
    }
  }

  function safeStorageRemove(key) {
    try {
      window.localStorage.removeItem(key);
      if (isChatStorageKey(key) && !chatStorageHydrating) {
        queueChatStorageSync();
      }
    } catch (error) {
      setStatus('浏览器本地存储删除失败。', 'error');
    }
  }

  function makeScopedKey(scope) {
    return `games0.${scope}.tavern-card`;
  }

  function loadJson(key, fallback = null) {
    const raw = safeStorageGet(key);
    if (!raw) {
      return fallback;
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    const saved = safeStorageSet(key, JSON.stringify(value));
    if (saved && isChatStorageKey(key) && !chatStorageHydrating) {
      queueChatStorageSync();
    }
    return saved;
  }

  let chatStorageHydrating = false;
  let chatStorageTimer = null;
  let chatStorageWriteChain = Promise.resolve();
  let activeChatStorageId = '';

  function isChatStorageKey(key) {
    return CHAT_STORAGE_SCOPES.some((scope) => key === makeScopedKey(scope));
  }

  function collectChatStorageSnapshot() {
    const values = {};
    for (const scope of CHAT_STORAGE_SCOPES) {
      const raw = safeStorageGet(makeScopedKey(scope));
      if (!raw) continue;
      try {
        values[scope] = JSON.parse(raw);
      } catch {
        // 损坏的本地缓存不上传到对话变量。
      }
    }
    return { version: 1, values };
  }

  async function persistChatStorage(snapshot = collectChatStorageSnapshot()) {
    return postJson(CHAT_STORAGE_URL, { data: snapshot, chatId: activeChatStorageId });
  }

  function commitChatStorageSnapshot(snapshot) {
    const write = chatStorageWriteChain
      .catch(() => null)
      .then(() => persistChatStorage(snapshot));
    chatStorageWriteChain = write.catch((error) => {
      setStatus(`跨设备存档同步失败：${error.message || error}`, 'error');
      return null;
    });
    return write;
  }

  function flushChatStorage() {
    if (chatStorageHydrating) return Promise.resolve(null);
    if (chatStorageTimer) {
      window.clearTimeout(chatStorageTimer);
      chatStorageTimer = null;
    }
    return commitChatStorageSnapshot(collectChatStorageSnapshot());
  }

  function queueChatStorageSync() {
    if (chatStorageHydrating) return;
    if (chatStorageTimer) window.clearTimeout(chatStorageTimer);
    chatStorageTimer = window.setTimeout(() => {
      chatStorageTimer = null;
      const snapshot = collectChatStorageSnapshot();
      commitChatStorageSnapshot(snapshot).catch(() => null);
    }, 120);
  }

  async function hydrateChatStorage() {
    const remote = await requestJson(CHAT_STORAGE_URL);
    const chatId = String(remote?.chatId || 'current-chat');
    activeChatStorageId = chatId;
    const previousChatId = String(safeStorageGet(CHAT_CACHE_META_KEY) || '');
    const remoteValues = remote?.data?.values && typeof remote.data.values === 'object'
      ? remote.data.values
      : {};
    const hasRemoteData = CHAT_STORAGE_SCOPES.some((scope) => Object.hasOwn(remoteValues, scope));
    const hasLocalData = CHAT_STORAGE_SCOPES.some((scope) => Boolean(safeStorageGet(makeScopedKey(scope))));
    const changedChat = Boolean(previousChatId && chatId && previousChatId !== chatId);
    const sameChat = Boolean(previousChatId && chatId && previousChatId === chatId);
    let keptNewerLocalData = false;

    chatStorageHydrating = true;
    try {
      if (hasRemoteData) {
        for (const scope of CHAT_STORAGE_SCOPES) {
          const key = makeScopedKey(scope);
          const hasRemoteScope = Object.hasOwn(remoteValues, scope);
          const localRaw = safeStorageGet(key);
          const localValue = localRaw ? loadJson(key, null) : undefined;
          if (sameChat && localRaw && localValue !== null) {
            const selected = selectNewestStoredValue(
              localValue,
              hasRemoteScope ? remoteValues[scope] : undefined
            );
            if (selected.source === 'local') {
              keptNewerLocalData = true;
            } else {
              safeStorageSet(key, JSON.stringify(selected.value));
            }
          } else if (hasRemoteScope) {
            safeStorageSet(key, JSON.stringify(remoteValues[scope]));
          } else {
            safeStorageRemove(key);
          }
        }
      } else if (changedChat) {
        for (const scope of CHAT_STORAGE_SCOPES) {
          safeStorageRemove(makeScopedKey(scope));
        }
      }
      safeStorageSet(CHAT_CACHE_META_KEY, chatId);
    } finally {
      chatStorageHydrating = false;
    }

    if (keptNewerLocalData || (!hasRemoteData && hasLocalData && !changedChat)) {
      await flushChatStorage();
    }
  }

  // ---- IndexedDB image store ----
  const IMAGE_DB_NAME = 'games0-images';
  const IMAGE_DB_VERSION = 1;
  const IMAGE_STORE = 'images';
  let pendingImageWrites = Promise.resolve(true);

  function openImageDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IMAGE_STORE)) {
          req.result.createObjectStore(IMAGE_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function extractRuntimeImages(runtime) {
    const images = {};
    for (const character of runtime.characters || []) {
      const entry = {};
      if (character.avatarUrl && character.avatarUrl !== PLACEHOLDER_AVATAR && character.avatarUrl.startsWith('data:')) {
        entry.avatarUrl = character.avatarUrl;
        character.avatarUrl = '';
      }
      if (character.avatarOriginalUrl && character.avatarOriginalUrl.startsWith('data:')) {
        entry.avatarOriginalUrl = character.avatarOriginalUrl;
        character.avatarOriginalUrl = '';
      }
      if (Object.keys(entry).length) {
        images[`char:${character.id}`] = entry;
      }
    }
    for (const outfit of runtime.outfits || []) {
      const entry = {};
      if (outfit.imageUrl && outfit.imageUrl.startsWith('data:')) {
        entry.imageUrl = outfit.imageUrl;
        outfit.imageUrl = '';
      }
      if (outfit.imageOriginalUrl && outfit.imageOriginalUrl.startsWith('data:')) {
        entry.imageOriginalUrl = outfit.imageOriginalUrl;
        outfit.imageOriginalUrl = '';
      }
      if (Object.keys(entry).length) {
        images[`outfit:${outfit.id}`] = entry;
      }
    }
    return images;
  }

  function createRuntimeSnapshot(runtime) {
    const snapshot = deepClone(runtime);
    return {
      snapshot,
      images: extractRuntimeImages(snapshot)
    };
  }

  function restoreRuntimeImages(runtime, images) {
    for (const character of runtime.characters || []) {
      const entry = images[`char:${character.id}`];
      if (entry) {
        if (entry.avatarUrl && (!character.avatarUrl || character.avatarUrl === PLACEHOLDER_AVATAR)) character.avatarUrl = entry.avatarUrl;
        if (entry.avatarOriginalUrl && !character.avatarOriginalUrl) character.avatarOriginalUrl = entry.avatarOriginalUrl;
      }
      if (!character.avatarUrl) character.avatarUrl = PLACEHOLDER_AVATAR;
    }
    for (const outfit of runtime.outfits || []) {
      const entry = images[`outfit:${outfit.id}`];
      if (entry) {
        if (entry.imageUrl && !outfit.imageUrl) outfit.imageUrl = entry.imageUrl;
        if (entry.imageOriginalUrl && !outfit.imageOriginalUrl) outfit.imageOriginalUrl = entry.imageOriginalUrl;
      }
    }
  }

  async function flushImagesToIDB(images, scope = 'runtime', namespace = 'tavern-card') {
    const db = await openImageDB();
    const tx = db.transaction(IMAGE_STORE, 'readwrite');
    const store = tx.objectStore(IMAGE_STORE);
    const prefix = makeImageScopePrefix(scope, namespace);
    const completion = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('图片存储事务已中止。'));
    });
    await new Promise((resolve, reject) => {
      const req = store.openKeyCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          for (const [key, value] of Object.entries(images)) {
            store.put(value, `${prefix}${key}`);
          }
          resolve();
          return;
        }
        if (String(cursor.key).startsWith(prefix)) {
          store.delete(cursor.key);
        }
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
    await completion;
  }

  function enqueueImageWrite(images, scope, namespace = 'tavern-card') {
    pendingImageWrites = pendingImageWrites
      .catch(() => true)
      .then(() => flushImagesToIDB(images, scope, namespace))
      .then(() => true)
      .catch((error) => {
        console.error('图片存入 IndexedDB 失败。', error);
        setStatus(`图片存储失败：${error.message || 'IndexedDB 不可用'}`, 'error');
        return false;
      });
    return pendingImageWrites;
  }

  async function flushPendingImageWrites() {
    return pendingImageWrites;
  }

  function enqueueImageScopeDeletion(scope, namespace = 'tavern-card') {
    pendingImageWrites = pendingImageWrites
      .catch(() => true)
      .then(() => deleteImagesForScope(scope, namespace))
      .then(() => true)
      .catch((error) => {
        console.error('清理 IndexedDB 图片失败。', error);
        return false;
      });
    return pendingImageWrites;
  }

  async function loadImagesFromIDB(scope = 'runtime', namespace = 'tavern-card') {
    try {
      const db = await openImageDB();
      const tx = db.transaction(IMAGE_STORE, 'readonly');
      const store = tx.objectStore(IMAGE_STORE);
      const allKeysPromise = new Promise((resolve, reject) => {
        const req = store.getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      const allValuesPromise = new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      const [allKeys, allValues] = await Promise.all([allKeysPromise, allValuesPromise]);
      const images = {};
      const legacyImages = {};
      const prefix = makeImageScopePrefix(scope, namespace);
      for (let i = 0; i < allKeys.length; i += 1) {
        const key = String(allKeys[i]);
        if (key.startsWith(prefix)) {
          images[key.slice(prefix.length)] = allValues[i];
        } else if (key.startsWith('char:') || key.startsWith('outfit:')) {
          legacyImages[key] = allValues[i];
        }
      }
      return { ...legacyImages, ...images };
    } catch (error) {
      console.error('读取 IndexedDB 图片失败。', error);
      return {};
    }
  }

  async function deleteImagesForScope(scope, namespace = 'tavern-card') {
    try {
      const db = await openImageDB();
      const tx = db.transaction(IMAGE_STORE, 'readwrite');
      const store = tx.objectStore(IMAGE_STORE);
      const prefix = makeImageScopePrefix(scope, namespace);
      const completion = new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('图片清理事务已中止。'));
      });
      await new Promise((resolve, reject) => {
        const req = store.openKeyCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve();
            return;
          }
          if (String(cursor.key).startsWith(prefix)) {
            store.delete(cursor.key);
          }
          cursor.continue();
        };
        req.onerror = () => reject(req.error);
      });
      await completion;
    } catch (error) {
      console.error('清理 IndexedDB 图片失败。', error);
    }
  }

  // 迁移：把现有 localStorage 里的图片数据挪到 IndexedDB，释放空间
  async function migrateImagesToIDB() {
    const keysToProcess = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('games0.') && (key.includes('.runtime.') || key.includes('.save.'))) {
        keysToProcess.push(key);
      }
    }

    for (const key of keysToProcess) {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        let runtime = data?.runtime || (data?.player ? data : null);
        if (!runtime || !runtime.characters) continue;

        const images = extractRuntimeImages(runtime);
        if (!Object.keys(images).length) continue;

        const imageScope = getImageScopeFromSaveKey(key);
        if (!imageScope) continue;

        // 先可靠写入图片，再把轻量数据写回 localStorage，避免迁移中断导致丢图。
        await flushImagesToIDB(images, imageScope.scope, imageScope.namespace);
        if (data?.runtime) {
          // 是存档包装格式 {savedAt, runtime}
          saveJson(key, { savedAt: data.savedAt, runtime });
        } else {
          // 是裸 runtime
          saveJson(key, runtime);
        }
      } catch (e) {
        console.error(`迁移存档图片失败：${key}`, e);
      }
    }
  }

  function safeSessionGet(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeSessionSet(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeSessionRemove(key) {
    try {
      window.sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  function scrollViewportToTop() {
    if (typeof window === 'undefined') {
      return;
    }
    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }

  function getChapterModalSessionKey() {
    return makeScopedKey(CHAPTER_MODAL_SESSION_KEY);
  }

  function saveChapterModalState(modal) {
    if (!modal?.chapterId) {
      return;
    }
    safeSessionSet(getChapterModalSessionKey(), JSON.stringify({
      chapterId: modal.chapterId,
      scrollTop: Number(modal.scrollTop || 0)
    }));
  }

  function clearChapterModalState() {
    safeSessionRemove(getChapterModalSessionKey());
  }

  function loadChapterModalState() {
    const raw = safeSessionGet(getChapterModalSessionKey());
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object'
        ? {
            chapterId: String(parsed.chapterId || ''),
            scrollTop: Math.max(0, Number(parsed.scrollTop || 0))
          }
        : null;
    } catch (error) {
      return null;
    }
  }

  async function ensureSpecs() {
    if (state.specs.actions.length) {
      return;
    }
    state.specs.actions = ACTION_ORDER.slice();
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function copyTextToClipboard(value) {
    const text = String(value || '');
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand?.('copy');
    textarea.remove();
    if (!copied) throw new Error('当前浏览器不允许自动复制。');
  }

  function isPromptCooldownQueueableError(error) {
    const message = String(error?.message || '');
    return message.includes('发送 prompt 需要等待')
      || message.includes('Too Many Requests')
      || message.includes('RESOURCE_EXHAUSTED')
      || message.includes('rate limit')
      || message.includes('quota');
  }

  function getPromptCooldownRetryWaitMs(error) {
    const message = String(error?.message || '');
    const remainingText = message.match(/当前还需等待([^。；\n]+)/)?.[1] || '';
    const parsedRemainingMs = parseDurationMs(remainingText);
    if (parsedRemainingMs) {
      return Math.max(10000, parsedRemainingMs + 1000);
    }
    return 10000;
  }

  function resizeImageToAvatarDataUrl(imagePart) {
    return resizeImagePartToPngDataUrl(imagePart, 128, 128, '头像', 'cover');
  }

  function resizeImageToOutfitDataUrl(imagePart) {
    return resizeImagePartToPngDataUrl(imagePart, 256, 256, '礼服', 'contain');
  }

  function imagePartToDataUrl(imagePart) {
    return `data:${imagePart.mimeType || 'image/png'};base64,${imagePart.data}`;
  }

  async function uploadGeneratedImageDataUrl(dataUrl, fileName) {
    const match = String(dataUrl || '').match(/^data:([^;,]+);base64,(.+)$/s);
    if (!match) throw new Error('生成图片格式无效，无法保存到酒馆。');
    const result = await postJson('api/card-images/upload', {
      mimeType: match[1],
      data: match[2],
      fileName
    });
    if (!result?.url) throw new Error('酒馆没有返回图片保存地址。');
    return result.url;
  }

  async function migrateRuntimeDataImagesToServer(runtime) {
    const uploaded = new Map();
    let changed = false;
    let failed = false;
    const migrateField = async (owner, key, prefix) => {
      const dataUrl = String(owner?.[key] || '');
      if (!dataUrl.startsWith('data:')) return;
      try {
        let url = uploaded.get(dataUrl);
        if (!url) {
          url = await uploadGeneratedImageDataUrl(
            dataUrl,
            `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          );
          uploaded.set(dataUrl, url);
        }
        owner[key] = url;
        changed = true;
      } catch (error) {
        failed = true;
        console.error('旧图片迁移到酒馆服务器失败。', error);
      }
    };

    for (const character of runtime?.characters || []) {
      await migrateField(character, 'avatarOriginalUrl', 'legacy-avatar-original');
      await migrateField(character, 'avatarUrl', 'legacy-avatar-display');
    }
    for (const outfit of runtime?.outfits || []) {
      await migrateField(outfit, 'imageOriginalUrl', 'legacy-outfit-original');
      await migrateField(outfit, 'imageUrl', 'legacy-outfit-display');
    }
    return { changed, failed };
  }

  function getCharacterDisplayAvatarUrl(character) {
    const avatarUrl = String(character?.avatarUrl || '').trim();
    const avatarOriginalUrl = String(character?.avatarOriginalUrl || '').trim();
    if (avatarUrl && avatarUrl !== PLACEHOLDER_AVATAR) {
      return avatarUrl;
    }
    if (avatarOriginalUrl) {
      return avatarOriginalUrl;
    }
    return PLACEHOLDER_AVATAR;
  }

  function canRetryAvatarGeneration(character) {
    const hasVisibleAvatar = getCharacterDisplayAvatarUrl(character) !== PLACEHOLDER_AVATAR;
    if (['queued', 'generating'].includes(String(character?.avatarStatus || ''))) {
      return false;
    }
    return !hasVisibleAvatar || String(character?.avatarStatus || '') === 'failed';
  }

  function resizeImagePartToPngDataUrl(imagePart, width, height, label, fitMode = 'cover') {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error(`${label}缩放失败。`));
          return;
        }
        context.clearRect(0, 0, width, height);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        const imageAspect = image.width / Math.max(1, image.height);
        const canvasAspect = width / Math.max(1, height);
        const scale = fitMode === 'contain'
          ? Math.min(width / Math.max(1, image.width), height / Math.max(1, image.height))
          : Math.max(width / Math.max(1, image.width), height / Math.max(1, image.height));
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        const offsetX = (width - drawWidth) / 2;
        const offsetY = (height - drawHeight) / 2;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        if (fitMode === 'cover' && Math.abs(imageAspect - canvasAspect) < 0.001) {
          context.drawImage(image, 0, 0, width, height);
        } else {
          context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
        }
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error(`${label}图片读取失败。`));
      image.src = `data:${imagePart.mimeType || 'image/png'};base64,${imagePart.data}`;
    });
  }

  function setStatus(message, tone = '') {
    state.ui.status = message;
    state.ui.statusTone = tone;
    render();
  }

  function queueStatChange(label, delta) {
    if (!delta) {
      return;
    }
    const entry = {
      id: `stat-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      label,
      delta
    };
    state.ui.statChanges = [...state.ui.statChanges, entry].slice(-8);
    render();
    window.setTimeout(() => {
      state.ui.statChanges = state.ui.statChanges.filter((item) => item.id !== entry.id);
      render();
    }, 1600);
  }

  function updatePlayerMoney(runtime, delta) {
    const next = runtime.player.money + delta;
    runtime.player.money = next;
    queueStatChange('金钱', delta);
  }

  function updatePlayerFatigue(runtime, delta) {
    const next = clamp(runtime.player.fatigue + delta, 0, 100);
    const actualDelta = next - runtime.player.fatigue;
    runtime.player.fatigue = next;
    queueStatChange('疲劳度', actualDelta);
  }

  function updateCourseStudyProgress(course, delta) {
    const next = clamp(course.studyProgress + delta, 0, 100);
    const actualDelta = next - course.studyProgress;
    course.studyProgress = next;
    queueStatChange(`${course.courseName}学习度`, actualDelta);
    return actualDelta;
  }

  function updateCourseHomeworkProgress(course, delta) {
    const next = clamp(course.currentHomeworkProgress + delta, 0, 100);
    const actualDelta = next - course.currentHomeworkProgress;
    course.currentHomeworkProgress = next;
    queueStatChange(`${course.courseName}完成度`, actualDelta);
    return actualDelta;
  }

  function updateGraduationProgress(runtime, courseId, delta, label) {
    const course = runtime.courses[courseId];
    if (!course) {
      return 0;
    }
    const next = clamp(course.studyProgress + delta, 0, 100);
    const actualDelta = next - course.studyProgress;
    course.studyProgress = next;
    queueStatChange(label, actualDelta);
    return actualDelta;
  }

  function updateCharacterFavorability(character, delta) {
    if (!character) {
      return 0;
    }
    const next = clamp(character.favorability + delta, 0, 100);
    const actualDelta = next - character.favorability;
    character.favorability = next;
    queueStatChange(`${character.name}好感度`, actualDelta);
    return actualDelta;
  }

  function isRuntimeShape(candidate) {
    return candidate && typeof candidate === 'object' && candidate.version === STORAGE_VERSION && candidate.player && candidate.courses;
  }

  function migrateRuntime(candidate) {
    const runtime = migrateRuntimeVersion(candidate, STORAGE_VERSION);
    return runtime ? patchRuntimeDefaults(runtime) : null;
  }

  function patchRuntimeDefaults(runtime) {
    if (!isRuntimeShape(runtime)) {
      return runtime;
    }
    runtime.meta = runtime.meta && typeof runtime.meta === 'object' ? runtime.meta : {};
    runtime.meta.runId = String(runtime.meta.runId || createRunId());
    runtime.meta.ending = runtime.meta.ending || null;
    runtime.meta.worldbookExport = runtime.meta.worldbookExport && typeof runtime.meta.worldbookExport === 'object'
      ? runtime.meta.worldbookExport
      : null;
    runtime.meta.pendingStoryEvent = runtime.meta.pendingStoryEvent && typeof runtime.meta.pendingStoryEvent === 'object'
      ? runtime.meta.pendingStoryEvent
      : null;
    runtime.meta.textPresetMode = runtime.meta.textPresetMode === 'builtin' ? 'builtin' : 'tavern';
    runtime.courses = reconcileCourseStates(runtime.courses);
    runtime.player.assistantRole = runtime.player.assistantRole && typeof runtime.player.assistantRole === 'object'
      ? runtime.player.assistantRole
      : null;
    runtime.player.graduationInternship = runtime.player.graduationInternship || null;
    runtime.player.graduationInternshipBossId = runtime.player.graduationInternshipBossId || '';
    runtime.player.graduationInternshipOfferId = runtime.player.graduationInternshipOfferId || '';
    runtime.player.graduationThesisProgress = Number(runtime.player.graduationThesisProgress || runtime.courses?.['graduation-thesis']?.studyProgress || 0);
    runtime.player.age = Number(runtime.player.age) || CAMPAIGN_CONFIG.playerStartingAge;
    runtime.player.inspiration = Math.max(0, Math.min(MERGE_INSPIRATION_MAX, Number(runtime.player.inspiration ?? MERGE_INSPIRATION_INITIAL)));
    runtime.player.bizProgress = Number(runtime.player.bizProgress || 0);
    runtime.locations = Array.isArray(runtime.locations) ? runtime.locations : [];
    runtime.history = Array.isArray(runtime.history) ? runtime.history : [];
    runtime.chapters = Array.isArray(runtime.chapters) ? runtime.chapters : [];
    runtime.outfits = Array.isArray(runtime.outfits) ? runtime.outfits.map((outfit, index) => patchOutfitDefaults(outfit, index)) : [];
    runtime.characters = Array.isArray(runtime.characters) ? runtime.characters : [];
    runtime.characters.forEach((character) => {
      character.avatarUrl = String(character.avatarUrl || character.previewAvatarUrl || PLACEHOLDER_AVATAR).trim() || PLACEHOLDER_AVATAR;
      character.avatarOriginalUrl = String(character.avatarOriginalUrl || character.originalAvatarUrl || (character.avatarUrl !== PLACEHOLDER_AVATAR ? character.avatarUrl : '')).trim();
      const hasAvatar = (character.avatarUrl && character.avatarUrl !== PLACEHOLDER_AVATAR) || Boolean(character.avatarOriginalUrl);
      if (!['pending', 'queued', 'generating', 'ready', 'failed'].includes(String(character.avatarStatus || ''))) {
        character.avatarStatus = hasAvatar ? 'ready' : 'pending';
      } else if (!hasAvatar && character.avatarStatus === 'ready') {
        character.avatarStatus = 'pending';
      }
      ensureCharacterEventFlags(character);
    });
    runtime.schedulePlans = runtime.schedulePlans && typeof runtime.schedulePlans === 'object' ? runtime.schedulePlans : {};
    for (const plan of Object.values(runtime.schedulePlans)) {
      if (!plan || typeof plan !== 'object') {
        continue;
      }
      const fallbackFixed = plan.kind === 'date'
        || plan.kind === 'exam'
        || (plan.kind === 'activity' && isLockedScheduleActivity(normalizeActivityLabel(plan.activity || plan.label || '')));
      plan.fixed = resolveStoredPlanFixed(plan, fallbackFixed);
    }
    runtime.flags = runtime.flags && typeof runtime.flags === 'object' ? runtime.flags : {};
    runtime.flags.termResults = runtime.flags.termResults && typeof runtime.flags.termResults === 'object' ? runtime.flags.termResults : {};
    runtime.flags.academicWarnings = runtime.flags.academicWarnings && typeof runtime.flags.academicWarnings === 'object' ? runtime.flags.academicWarnings : {};
    runtime.flags.scholarshipPaid = runtime.flags.scholarshipPaid && typeof runtime.flags.scholarshipPaid === 'object' ? runtime.flags.scholarshipPaid : {};
    runtime.flags.triggeredEvents = runtime.flags.triggeredEvents && typeof runtime.flags.triggeredEvents === 'object' ? runtime.flags.triggeredEvents : {};
    runtime.flags.weeklyInvite = runtime.flags.weeklyInvite && typeof runtime.flags.weeklyInvite === 'object'
      ? { weekStart: runtime.flags.weeklyInvite.weekStart || getWeekStart(runtime.player.currentDate || START_DATE), globalLocked: runtime.flags.weeklyInvite.globalLocked || false, attemptedCharacterIds: runtime.flags.weeklyInvite.attemptedCharacterIds || [], nightInviteAskedIds: runtime.flags.weeklyInvite.nightInviteAskedIds || [] }
      : { weekStart: getWeekStart(runtime.player.currentDate || START_DATE), globalLocked: false, attemptedCharacterIds: [], nightInviteAskedIds: [] };
    runtime.flags.historyPanelWeekStart = typeof runtime.flags.historyPanelWeekStart === 'string'
      ? runtime.flags.historyPanelWeekStart
      : getWeekStart(runtime.player.currentDate || START_DATE);
    runtime.flags.annual = runtime.flags.annual && typeof runtime.flags.annual === 'object' ? runtime.flags.annual : {};
    runtime.flags.povertyAidCount = Number(runtime.flags.povertyAidCount || 0);
    runtime.flags.courseFirstClassDone = runtime.flags.courseFirstClassDone && typeof runtime.flags.courseFirstClassDone === 'object' ? runtime.flags.courseFirstClassDone : {};
    runtime.flags.knownProfessorsByCourse = runtime.flags.knownProfessorsByCourse && typeof runtime.flags.knownProfessorsByCourse === 'object' ? runtime.flags.knownProfessorsByCourse : {};
    runtime.flags.knownAssistantsByCourse = runtime.flags.knownAssistantsByCourse && typeof runtime.flags.knownAssistantsByCourse === 'object' ? runtime.flags.knownAssistantsByCourse : {};
    runtime.flags.knownClassmatesByCourse = runtime.flags.knownClassmatesByCourse && typeof runtime.flags.knownClassmatesByCourse === 'object' ? runtime.flags.knownClassmatesByCourse : {};
    runtime.flags.tutor = runtime.flags.tutor && typeof runtime.flags.tutor === 'object' ? runtime.flags.tutor : { started: false, parentCharacterId: null, studentCharacterId: null };
    runtime.flags.assistant = runtime.flags.assistant && typeof runtime.flags.assistant === 'object'
      ? runtime.flags.assistant
      : { juniorCharacterIds: [], completedWeeks: {}, firstDoneByTerm: {}, inviteResolvedByTerm: {} };
    runtime.flags.assistant.firstDoneByTerm = runtime.flags.assistant.firstDoneByTerm && typeof runtime.flags.assistant.firstDoneByTerm === 'object'
      ? runtime.flags.assistant.firstDoneByTerm
      : {};
    runtime.flags.assistant.inviteResolvedByTerm = runtime.flags.assistant.inviteResolvedByTerm && typeof runtime.flags.assistant.inviteResolvedByTerm === 'object'
      ? runtime.flags.assistant.inviteResolvedByTerm
      : {};
    runtime.flags.studentSecretary = runtime.flags.studentSecretary && typeof runtime.flags.studentSecretary === 'object' ? runtime.flags.studentSecretary : { unlocked: false, firstCompleted: false };
    runtime.flags.debate = runtime.flags.debate && typeof runtime.flags.debate === 'object' ? runtime.flags.debate : {};
    runtime.flags.internships = runtime.flags.internships && typeof runtime.flags.internships === 'object'
      ? runtime.flags.internships
      : { firstSeenLocations: {}, offers: {} };
    runtime.flags.internships.offers = runtime.flags.internships.offers && typeof runtime.flags.internships.offers === 'object'
      ? runtime.flags.internships.offers
      : {};
    runtime.flags.internships.acceptedOffers = Array.isArray(runtime.flags.internships.acceptedOffers)
      ? runtime.flags.internships.acceptedOffers.filter((offer) => offer && typeof offer === 'object' && offer.id)
      : [];
    runtime.flags.internships.selectionResolved = Boolean(runtime.flags.internships.selectionResolved);
    runtime.flags.weeklyMergePromptShown = typeof runtime.flags.weeklyMergePromptShown === 'boolean' ? runtime.flags.weeklyMergePromptShown : false;
    runtime.flags.bizMergeTutorialCompleted = runtime.flags.bizMergeTutorialCompleted === true;
    runtime.mergeGame = runtime.mergeGame && typeof runtime.mergeGame === 'object' ? runtime.mergeGame : null;
    runtime.bizMergeGame = runtime.bizMergeGame && typeof runtime.bizMergeGame === 'object' ? runtime.bizMergeGame : null;
    syncTutorCharacterIds(runtime);
    return runtime;
  }

  function patchOutfitDefaults(rawOutfit, index = 0) {
    const source = typeof rawOutfit === 'string'
      ? { description: rawOutfit }
      : (rawOutfit && typeof rawOutfit === 'object' ? rawOutfit : {});
    const description = String(source.description || source.text || '').trim();
    const imageUrl = String(source.imageUrl || source.previewUrl || '').trim();
    const imageOriginalUrl = String(source.imageOriginalUrl || source.originalUrl || imageUrl).trim();
    const allowedStatuses = new Set(['pending', 'queued', 'generating', 'ready', 'failed']);
    const rawStatus = String(source.imageStatus || '').trim();
    const imageStatus = (imageUrl || imageOriginalUrl)
      ? 'ready'
      : (allowedStatuses.has(rawStatus) ? rawStatus : 'pending');
    return {
      id: String(source.id || `outfit-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 8)}`),
      description,
      obtainedAt: String(source.obtainedAt || '').trim(),
      imageUrl,
      imageOriginalUrl,
      imageStatus
    };
  }

  function recoverInterruptedAssetJobs(runtime) {
    const avatarIds = [];
    const outfitIds = [];
    let changed = false;
    for (const character of runtime.characters || []) {
      const avatarUrl = String(character.avatarUrl || '').trim();
      const avatarOriginalUrl = String(character.avatarOriginalUrl || avatarUrl).trim();
      if ((avatarUrl && avatarUrl !== PLACEHOLDER_AVATAR) || (avatarOriginalUrl && avatarOriginalUrl !== PLACEHOLDER_AVATAR)) {
        if (!avatarUrl && avatarOriginalUrl && avatarOriginalUrl !== PLACEHOLDER_AVATAR) {
          character.avatarUrl = avatarOriginalUrl;
          changed = true;
        }
        if (!character.avatarOriginalUrl && avatarOriginalUrl && avatarOriginalUrl !== PLACEHOLDER_AVATAR) {
          character.avatarOriginalUrl = avatarOriginalUrl;
          changed = true;
        }
        if (character.avatarStatus !== 'ready') {
          character.avatarStatus = 'ready';
          changed = true;
        }
        continue;
      }
      if (character.avatarStatus === 'queued' || character.avatarStatus === 'generating') {
        character.avatarStatus = 'pending';
        avatarIds.push(character.id);
        changed = true;
      }
    }
    for (const outfit of runtime.outfits || []) {
      const imageUrl = String(outfit.imageUrl || '').trim();
      const imageOriginalUrl = String(outfit.imageOriginalUrl || imageUrl).trim();
      if (imageUrl || imageOriginalUrl) {
        if (!outfit.imageUrl && imageOriginalUrl) {
          outfit.imageUrl = imageOriginalUrl;
          changed = true;
        }
        if (!outfit.imageOriginalUrl && imageOriginalUrl) {
          outfit.imageOriginalUrl = imageOriginalUrl;
          changed = true;
        }
        if (outfit.imageStatus !== 'ready') {
          outfit.imageStatus = 'ready';
          changed = true;
        }
        continue;
      }
      if (outfit.imageStatus === 'queued' || outfit.imageStatus === 'generating') {
        outfit.imageStatus = 'pending';
        outfitIds.push(outfit.id);
        changed = true;
      }
    }
    return { changed, avatarIds, outfitIds };
  }

  function listStoredSaveEntries() {
    const entries = [];
    const runtime = migrateRuntime(loadJson(makeScopedKey('runtime')));
    if (runtime) {
      entries.push({ kind: 'runtime', savedAt: runtime.meta?.updatedAt || runtime.meta?.createdAt || null, runtime });
    }
    const auto = loadJson(makeScopedKey('save.auto'));
    const autoRuntime = migrateRuntime(auto?.runtime);
    if (autoRuntime) {
      entries.push({ kind: 'auto', savedAt: auto.savedAt || autoRuntime.meta?.updatedAt || null, runtime: autoRuntime });
    }
    for (let slot = 1; slot <= 3; slot += 1) {
      const saved = loadJson(makeScopedKey(`save.slot${slot}`));
      const savedRuntime = migrateRuntime(saved?.runtime);
      if (savedRuntime) {
        entries.push({ kind: `slot${slot}`, savedAt: saved.savedAt || savedRuntime.meta?.updatedAt || null, runtime: savedRuntime });
      }
    }
    return entries;
  }

  function loadPreferredRuntime() {
    const runtime = migrateRuntime(loadJson(makeScopedKey('runtime')));
    if (runtime) {
      return runtime;
    }

    return listStoredSaveEntries()
      .filter((entry) => entry.kind !== 'runtime')
      .sort((left, right) => Date.parse(right.savedAt || 0) - Date.parse(left.savedAt || 0))[0]?.runtime || null;
  }

  function syncMergeGameToRuntime() {
    if (state.runtime && state.mergeGame) {
      var cleanBoard = state.mergeGame.board.slice().map(function (p) {
        if (!p) return null;
        var cleaned = Object.assign({}, p);
        delete cleaned._spawnFrom;
        delete cleaned._spawnTime;
        return cleaned;
      });
      var data = {
        mode: state.mergeGame.mode,
        board: cleanBoard,
        tasks: state.mergeGame.tasks.slice(),
        tutorial: state.mergeGame.tutorial
          ? JSON.parse(JSON.stringify(state.mergeGame.tutorial))
          : null
      };
      if (state.mergeGame.mode === 'biz') {
        state.runtime.bizMergeGame = data;
      } else {
        state.runtime.mergeGame = data;
      }
    }
  }

  function saveCurrentRuntime() {
    if (!state.runtime) {
      return false;
    }
    syncMergeGameToRuntime();
    state.runtime.meta.updatedAt = nowIso();
    const { snapshot, images } = createRuntimeSnapshot(state.runtime);
    const ok = saveJson(makeScopedKey('runtime'), snapshot);
    if (ok) {
      enqueueImageWrite(images, 'runtime');
    }
    return ok;
  }

  function saveAutoSlot() {
    if (!state.runtime) {
      return false;
    }
    syncMergeGameToRuntime();
    const { snapshot, images } = createRuntimeSnapshot(state.runtime);
    const ok = saveJson(makeScopedKey('save.auto'), {
      savedAt: nowIso(),
      runtime: snapshot
    });
    if (ok) {
      enqueueImageWrite(images, 'auto');
    }
    return ok;
  }

  function saveChapterDebug(chapterId, rawResponse, promptText) {
    const store = loadJson(makeScopedKey(GLOBAL_CHAPTER_DEBUG_KEY), {});
    store[chapterId] = { rawResponse: rawResponse || '', promptText: promptText || '' };
    // 只保留最近 20 章的 debug 数据
    const keys = Object.keys(store);
    if (keys.length > 20) {
      keys.slice(0, keys.length - 20).forEach((key) => { delete store[key]; });
    }
    saveJson(makeScopedKey(GLOBAL_CHAPTER_DEBUG_KEY), store);
  }

  function loadChapterDebug(chapterId) {
    const store = loadJson(makeScopedKey(GLOBAL_CHAPTER_DEBUG_KEY), {});
    return store[chapterId] || { rawResponse: '', promptText: '' };
  }

  function saveManualSlot(slot) {
    syncMergeGameToRuntime();
    const { snapshot, images } = createRuntimeSnapshot(state.runtime);
    const ok = saveJson(makeScopedKey(`save.slot${slot}`), {
      savedAt: nowIso(),
      runtime: snapshot
    });
    if (ok) {
      enqueueImageWrite(images, `slot${slot}`);
    }
    return ok;
  }

  function loadManualSlot(slot) {
    const saved = loadJson(makeScopedKey(`save.slot${slot}`));
    const runtime = migrateRuntime(saved?.runtime);
    return runtime ? { ...saved, runtime } : null;
  }

  function loadAutoSlot() {
    const saved = loadJson(makeScopedKey('save.auto'));
    const runtime = migrateRuntime(saved?.runtime);
    return runtime ? { ...saved, runtime } : null;
  }

  function clearCurrentRuntime() {
    safeStorageRemove(makeScopedKey('runtime'));
    enqueueImageScopeDeletion('runtime');
    state.runtime = null;
    state.mergeGame = null;
  }

  function normalizeStoredAiSettings(raw) {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const provider = raw.provider === 'vertex'
      || (!raw.provider && (raw.serviceAccountJson || raw.vertex?.serviceAccountJson) && !(raw.apiKey || raw.aiStudio?.apiKey))
      ? 'vertex'
      : 'aiStudio';

    return {
      provider,
      modelId: String(
        raw.modelId
          || raw.selectedModels?.[provider]
          || raw.selectedModels?.aiStudio
          || 'gemini-2.5-flash'
      ).trim() || 'gemini-2.5-flash',
      apiKey: String(raw.apiKey || raw.aiStudio?.apiKey || '').trim(),
      projectId: String(raw.projectId || raw.vertex?.projectId || '').trim(),
      location: String(raw.location || raw.vertex?.location || 'global').trim() || 'global',
      serviceAccountJson: String(raw.serviceAccountJson || raw.vertex?.serviceAccountJson || '').trim()
    };
  }

  function getDefaultAiSettings() {
    return {
      provider: 'aiStudio',
      modelId: 'gemini-2.5-flash',
      apiKey: '',
      projectId: '',
      location: 'global',
      serviceAccountJson: '',
      configured: false
    };
  }

  function loadAiSettings() {
    const defaults = getDefaultAiSettings();
    const stored = normalizeStoredAiSettings(loadJson(GLOBAL_AI_SETTINGS_KEY, null));
    if (stored) {
      return { ...defaults, ...stored };
    }

    const legacyKeys = [
      makeScopedKey('ai-settings'),
      'games0.ai.settings.v2',
      'games0.ai.settings.v1'
    ];
    for (const legacyKey of legacyKeys) {
      const legacyStored = normalizeStoredAiSettings(loadJson(legacyKey, null));
      if (legacyStored) {
        const migrated = { ...defaults, ...legacyStored };
        saveJson(GLOBAL_AI_SETTINGS_KEY, migrated);
        return migrated;
      }
    }

    return defaults;
  }

  function normalizeServerAiSettings(raw = {}) {
    const defaults = getDefaultAiSettings();
    const settings = {
      ...defaults,
      ...normalizeStoredAiSettings(raw),
      configured: Boolean(raw?.configured)
    };
    const knownModels = AI_MODEL_OPTIONS[settings.provider].map((item) => item.id);
    if (!knownModels.includes(settings.modelId)) {
      settings.modelId = AI_MODEL_OPTIONS[settings.provider][0].id;
    }
    return settings;
  }

  async function refreshAiSettings() {
    const result = await requestJson('api/ai-settings');
    state.aiSettings = normalizeServerAiSettings(result?.settings || {});
    return state.aiSettings;
  }

  function loadAiActivity() {
    const defaults = {
      lastPrompt: '',
      recentPrompts: [],
      lastResponseText: '',
      lastUsageText: 'token 消耗：暂无记录',
      logs: []
    };
    const stored = loadJson(GLOBAL_AI_ACTIVITY_KEY, null);
    return stored && typeof stored === 'object'
      ? {
          ...defaults,
          ...stored,
          recentPrompts: Array.isArray(stored.recentPrompts) ? stored.recentPrompts.slice(0, 5) : [],
          logs: Array.isArray(stored.logs) ? stored.logs.slice(0, 20) : []
        }
      : defaults;
  }

  function saveAiActivity(nextActivity) {
    saveJson(GLOBAL_AI_ACTIVITY_KEY, nextActivity);
  }

  function ensureAiActivityState() {
    if (!state.aiActivity) {
      state.aiActivity = loadAiActivity();
    }
    return state.aiActivity;
  }

  function extractTokenUsageInfo(result) {
    const usage = result?.raw?.usageMetadata || result?.raw?.usage || null;
    if (!usage) {
      return null;
    }
    return {
      input: usage.promptTokenCount ?? null,
      output: usage.candidatesTokenCount ?? null,
      total: usage.totalTokenCount ?? null,
      thoughts: usage.thoughtsTokenCount ?? null
    };
  }

  function extractUsageText(result) {
    const info = extractTokenUsageInfo(result);
    if (!info) {
      return 'token 消耗：接口未返回';
    }
    const parts = [];
    if (info.input !== null) {
      parts.push(`输入 ${info.input}`);
    }
    if (info.output !== null) {
      parts.push(`输出 ${info.output}`);
    }
    if (info.total !== null) {
      parts.push(`总计 ${info.total}`);
    }
    return parts.length ? `token 消耗：${parts.join(' / ')}` : 'token 消耗：接口未返回';
  }

  function formatTokenUsageText(info) {
    if (!info) {
      return '未返回';
    }
    const parts = [];
    if (info.input !== null) parts.push(`输入 ${info.input}`);
    if (info.output !== null) parts.push(`输出 ${info.output}`);
    if (info.thoughts !== null) parts.push(`思考 ${info.thoughts}`);
    if (info.total !== null) parts.push(`总计 ${info.total}`);
    return parts.length ? parts.join(' / ') : '未返回';
  }

  function sanitizeAiText(text) {
    return String(text || '').replace(/极其|极度/g, '');
  }

  function getTavernBridge() {
    try {
      return window.parent?.__NOBLE_SCHOOL_TAVERN_BRIDGE_V1__ || window.__NOBLE_SCHOOL_TAVERN_BRIDGE_V1__ || null;
    } catch {
      return null;
    }
  }

  function buildWorldbookPromptSettings(runtime) {
    const playerName = '<user>';
    return {
      worldBuilding: GAME_PROMPTS.buildWorldBuilding({ playerName }),
      playerSettings: GAME_PROMPTS.buildPlayerSettings({
        playerName,
        playerPersona: '',
        userBirthday: `${runtime.player.birthdayMonth}月${runtime.player.birthdayDay}日`,
        userAge: String(runtime.player.age || 18),
        userGrade: String(getCurrentAcademicYear(runtime.player.currentDate)),
        cloth: ''
      })
    };
  }

  async function exportWorldbook(runtime) {
    const bridge = getTavernBridge();
    if (!bridge || typeof bridge.exportWorldbook !== 'function') {
      runtime.meta.worldbookExport = {
        status: 'failed',
        error: '没有找到酒馆世界书桥接接口。请确认酒馆助手和本卡脚本已经启用。',
        updatedAt: nowIso()
      };
      return runtime.meta.worldbookExport;
    }
    runtime.meta.worldbookExport = { status: 'pending', updatedAt: nowIso() };
    try {
      const result = await bridge.exportWorldbook(runtime, buildWorldbookPromptSettings(runtime));
      runtime.meta.worldbookExport = {
        status: 'success',
        worldbookName: result.worldbookName,
        updatedAt: nowIso()
      };
    } catch (error) {
      runtime.meta.worldbookExport = {
        status: 'failed',
        error: error?.message || '世界书导出失败。',
        updatedAt: nowIso()
      };
    }
    return runtime.meta.worldbookExport;
  }

  function extractResponseText(result) {
    const text = sanitizeAiText((result?.output?.textParts || []).join('\n')).trim();
    if (text) {
      return text;
    }
    const thoughtText = sanitizeAiText((result?.output?.thoughtParts || []).join('\n')).trim();
    if (thoughtText) {
      return `（模型只返回了 thought 内容，没有返回正文）\n${thoughtText}`;
    }
    const imageCount = result?.output?.imageParts?.length || 0;
    if (imageCount) {
      return `（本次返回 ${imageCount} 张图片，没有文字内容）`;
    }
    const candidateSummary = result?.output?.candidateSummaries?.[0] || null;
    if (candidateSummary) {
      const lines = ['（模型返回了候选结果，但没有正文文字）'];
      if (candidateSummary.finishReason) {
        lines.push(`finishReason: ${candidateSummary.finishReason}`);
      }
      if (candidateSummary.finishMessage) {
        lines.push(`finishMessage: ${candidateSummary.finishMessage}`);
      }
      if (candidateSummary.blockReason) {
        lines.push(`blockReason: ${candidateSummary.blockReason}`);
      }
      if (candidateSummary.safetyRatings?.length) {
        lines.push(`safetyRatings: ${JSON.stringify(candidateSummary.safetyRatings)}`);
      }
      return lines.join('\n');
    }
    return '（没有返回文字内容）';
  }

  function toOptionalNumber(value) {
    if (value === '' || value === null || value === undefined) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function buildLoggedGenerateContentBody(payload) {
    const options = payload?.options || {};
    const modelId = String(payload?.modelId || '');
    const generationConfig = {};
    const setNumber = (key, value) => {
      const parsed = toOptionalNumber(value);
      if (parsed !== null) {
        generationConfig[key] = parsed;
      }
    };
    setNumber('temperature', options.temperature);
    setNumber('topP', options.topP);
    setNumber('topK', options.topK);
    setNumber('maxOutputTokens', options.maxOutputTokens);
    setNumber('candidateCount', options.candidateCount);
    setNumber('presencePenalty', options.presencePenalty);
    setNumber('frequencyPenalty', options.frequencyPenalty);
    setNumber('seed', options.seed);

    const stopSequences = String(options.stopSequences || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
    if (stopSequences.length) {
      generationConfig.stopSequences = stopSequences;
    }
    if (options.responseMimeType) {
      generationConfig.responseMimeType = options.responseMimeType;
    }
    if (options.mediaResolution) {
      generationConfig.mediaResolution = options.mediaResolution;
    }
    if (options.responseModalities) {
      generationConfig.responseModalities = String(options.responseModalities)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const thinkingConfig = {};
    if (modelId.startsWith('gemini-2.5')) {
      const budget = toOptionalNumber(options.thinkingBudget);
      if (budget !== null) {
        thinkingConfig.thinkingBudget = budget;
      }
    }
    if ((modelId.startsWith('gemini-3') || modelId.startsWith('gemini-3.5')) && options.thinkingLevel) {
      thinkingConfig.thinkingLevel = String(options.thinkingLevel).toUpperCase();
    }
    if (options.includeThoughts) {
      thinkingConfig.includeThoughts = true;
    }
    if (Object.keys(thinkingConfig).length) {
      generationConfig.thinkingConfig = thinkingConfig;
    }

    const contents = [];
    if (options.assistantInstruction) {
      contents.push({
        role: 'model',
        parts: [{ text: String(options.assistantInstruction) }]
      });
    }
    if (options.locationInstruction) {
      contents.push({
        role: 'model',
        parts: [{ text: '以下是我之前设定好的故事中的地点描述，新的章节可以对此参考使用\n\n' + String(options.locationInstruction) }]
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: String(payload?.prompt || '') }]
    });

    const body = {
      system_instruction: {
        parts: [{ text: String(options.systemInstruction || '') }]
      },
      contents,
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'OFF' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'OFF' }
      ]
    };
    if (Object.keys(generationConfig).length) {
      body.generationConfig = generationConfig;
    }
    if (!options.systemInstruction) {
      delete body.system_instruction;
    }
    return body;
  }

  function buildLoggedPredictBody(payload) {
    const options = payload?.options || {};
    const parameters = {
      sampleCount: Math.max(1, Math.min(4, Number(options.sampleCount || 1))),
      aspectRatio: options.aspectRatio || '1:1',
      personGeneration: options.personGeneration || 'allow_adult',
      language: options.promptLanguage || 'auto',
      safetySetting: options.safetySetting || 'block_medium_and_above',
      addWatermark: Boolean(options.addWatermark),
      enhancePrompt: Boolean(options.enhancePrompt)
    };
    if (options.negativePrompt) {
      parameters.negativePrompt = String(options.negativePrompt);
    }
    const seed = toOptionalNumber(options.seed);
    if (seed !== null) {
      parameters.seed = seed;
    }
    return {
      instances: [{ prompt: String(payload?.prompt || '') }],
      parameters
    };
  }

  function buildLoggedPrompt(payload) {
    const body = String(payload?.modelId || '').startsWith('imagen-')
      ? buildLoggedPredictBody(payload)
      : buildLoggedGenerateContentBody(payload);
    try {
      return JSON.stringify(body, null, 2);
    } catch (error) {
      return String(payload?.prompt || '');
    }
  }

  function recordAiLog(entry) {
    const activity = ensureAiActivityState();
    activity.logs = [entry, ...activity.logs].slice(0, 20);
    saveAiActivity(activity);
  }

  function recordAiPrompt(prompt, label, sentAt, status) {
    const activity = ensureAiActivityState();
    activity.lastPrompt = prompt;
    activity.recentPrompts = [{
      prompt,
      label,
      sentAt,
      status
    }, ...(activity.recentPrompts || [])].slice(0, 5);
  }

  function recordAiSuccess(prompt, result, label, sentAt, receivedAt) {
    const activity = ensureAiActivityState();
    recordAiPrompt(prompt, label, sentAt, 'success');
    activity.lastResponseText = extractResponseText(result);
    activity.lastUsageText = extractUsageText(result);
    const tokenInfo = extractTokenUsageInfo(result);
    recordAiLog({
      label,
      sentAt,
      receivedAt,
      status: 'success',
      error: '',
      tokenText: formatTokenUsageText(tokenInfo)
    });
    saveAiActivity(activity);
  }

  function recordAiFailure(prompt, error, label, sentAt, receivedAt) {
    const activity = ensureAiActivityState();
    recordAiPrompt(prompt, label, sentAt, 'error');
    activity.lastResponseText = '';
    activity.lastUsageText = 'token 消耗：请求失败，未返回';
    recordAiLog({
      label,
      sentAt,
      receivedAt,
      status: 'error',
      error: String(error?.message || '请求失败')
    });
    saveAiActivity(activity);
  }

  var ENDING_EVENT_NAMES = new Set(['退学事件', '普通毕业事件', '全A毕业事件', '毕业创业事件']);

  function resolveMergeGameMode(hasHomework) {
    // 首次教程固定使用创业棋盘；即使刷新后已经出现作业，也继续恢复同一套引导。
    if (state.runtime && state.runtime.flags.bizMergeTutorialCompleted !== true) {
      return 'biz';
    }
    return hasHomework ? 'homework' : 'biz';
  }

  function setAiLoading(message) {
    var aiLoadingMsg = message || '正在等待 AI 回复…';
    var canMerge = state.runtime && state.runtime.phase !== 'ended';
    var isEndingEvent = state.ui.currentAiEvent && ENDING_EVENT_NAMES.has(state.ui.currentAiEvent);
    var hasHomework = canMerge && getActiveHomeworkCourses().length > 0;
    var bizDone = (state.runtime?.player?.bizProgress || 0) >= BUSINESS_ENDING_SCORE;

    // 结局事件不弹框
    if (canMerge && !isEndingEvent && !(!hasHomework && bizDone)) {
      var mode = resolveMergeGameMode(hasHomework);
      if (!state.mergeGame || !state.mergeGame.initialized || state.mergeGame.mode !== mode) {
        initMergeGame(mode);
      } else {
        state.mergeGame.tasks = cleanupStaleMergeTasks(mode, state.mergeGame.tasks);
        if (!state.mergeGame.tasks.length) {
          refreshMergeTasks();
        }
      }
      state.mergeGame.aiReady = false;

      if (state.runtime) {
        state.runtime.flags.weeklyMergePromptShown = true;
      }

      var dialogMsg = mode === 'homework' ? '写点作业吧' : '闲着也是闲着，搞搞我的创业企划书吧';
      openModal({
        type: 'confirm',
        title: '',
        message: dialogMsg,
        confirmLabel: '确定',
        hideCancel: true,
        onConfirm: function () {
          state.ui.aiLoading = { message: aiLoadingMsg };
          state.ui.page = 'merge-game';
          render();
        }
      });
      render();
      return;
    }

    state.ui.aiLoading = { message: aiLoadingMsg };
    render();
  }

  function clearAiLoading() {
    if (!state.ui.aiLoading) {
      return;
    }
    state.ui.aiLoading = null;
    state.ui.currentAiEvent = null;
    if (state.mergeGame?.initialized) {
      state.mergeGame.aiReady = true;
    }
    render();
  }

  function waitForAiPollWake(delayMs) {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return sleep(delayMs);
    }
    return new Promise((resolve) => {
      let settled = false;
      let timerId = null;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        if (timerId !== null) {
          window.clearTimeout(timerId);
        }
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleWindowFocus);
        resolve();
      };
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          finish();
        }
      };
      const handleWindowFocus = () => {
        finish();
      };
      timerId = window.setTimeout(finish, delayMs);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleWindowFocus, { once: true });
    });
  }

  async function executeAiRequest(label, endpoint, payload, options = {}) {
    if (AI_DISABLED) {
      const loadingMsg = options.message || `正在等待 AI 完成：${label}`;
      setAiLoading(loadingMsg);
      await sleep(10000);
      clearAiLoading();
      const mockOutput = {
        output: {
          textParts: [
            '<info_block>『2025年9月1日 星期一｜午前10:00｜兰斯特皇家学院·礼堂｜晴朗｜』</info_block>\n<content>测试剧情内容（AI 已禁用）。</content>\n<newHistory>2025年9月1日，测试剧情发生。</newHistory>'
          ]
        }
      };
      recordAiSuccess(buildLoggedPrompt(payload), mockOutput, label, nowIso(), nowIso());
      return mockOutput;
    }
    const shouldBlock = options.blocking !== false;
    const sentAt = nowIso();
    const loggedPrompt = buildLoggedPrompt(payload);
    let cooldownRetryCount = 0;
    if (shouldBlock) {
      setAiLoading(options.message || `正在等待 AI 完成：${label}`);
    }
    try {
      while (true) {
        try {
          const created = await postJson(endpoint, { ...payload, background: true });
          if (created?.output || created?.raw) {
            const receivedAt = nowIso();
            recordAiSuccess(loggedPrompt, created, label, sentAt, receivedAt);
            return created;
          }
          const jobId = created?.job?.id;
          if (!jobId) {
            throw new Error(`AI 后台任务创建失败。服务端返回：${JSON.stringify(created || {})}`);
          }
          let result = null;
          let pollFailureCount = 0;
          while (true) {
            let polled;
            try {
              polled = await requestJson(`api/ai-jobs/${encodeURIComponent(jobId)}`);
              pollFailureCount = 0;
            } catch (error) {
              if (error && typeof error === 'object' && error.status === 404) {
                throw error;
              }
              pollFailureCount += 1;
              if (pollFailureCount >= 30) {
                throw error;
              }
              await waitForAiPollWake(2000);
              continue;
            }
            const job = polled?.job;
            if (!job) {
              throw new Error('AI 后台任务状态读取失败。');
            }
            if (job.status === 'completed') {
              result = job.result;
              break;
            }
            if (job.status === 'failed') {
              throw new Error(job.error || 'AI 请求失败。');
            }
            await waitForAiPollWake(2000);
          }
          const receivedAt = nowIso();
          recordAiSuccess(loggedPrompt, result, label, sentAt, receivedAt);
          return result;
        } catch (error) {
          if (!isPromptCooldownQueueableError(error) || cooldownRetryCount >= 24) {
            throw error;
          }
          cooldownRetryCount += 1;
          await waitForAiPollWake(getPromptCooldownRetryWaitMs(error));
        }
      }
    } catch (error) {
      const receivedAt = nowIso();
      recordAiFailure(loggedPrompt, error, label, sentAt, receivedAt);
      throw error;
    } finally {
      if (shouldBlock) {
        clearAiLoading();
      }
    }
  }

  function validateAiSettings(raw = {}, options = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const requireCredentials = Boolean(options.requireCredentials);
    const inferredProvider = source.provider === 'vertex'
      || (!source.provider && source.serviceAccountJson && !source.apiKey)
      ? 'vertex'
      : 'aiStudio';
    const settings = {
      provider: inferredProvider,
      modelId: String(source.modelId || 'gemini-2.5-flash').trim() || 'gemini-2.5-flash',
      apiKey: String(source.apiKey || '').trim(),
      projectId: String(source.projectId || '').trim(),
      location: String(source.location || 'global').trim() || 'global',
      serviceAccountJson: String(source.serviceAccountJson || '').trim(),
      configured: Boolean(source.configured)
    };
    const knownModels = AI_MODEL_OPTIONS[settings.provider].map((item) => item.id);
    if (!knownModels.includes(settings.modelId)) {
      settings.modelId = AI_MODEL_OPTIONS[settings.provider][0].id;
    }
    if (requireCredentials && settings.provider === 'aiStudio' && !settings.apiKey) {
      throw new Error('请填写 AI Studio API Key。');
    }
    if (requireCredentials && settings.provider === 'vertex') {
      if (!settings.serviceAccountJson) {
        throw new Error('请填写 Vertex 服务账号 JSON。');
      }
      JSON.parse(settings.serviceAccountJson);
      if (!settings.projectId) {
        throw new Error('请填写 Vertex Project ID。');
      }
    }
    return settings;
  }

  function buildAiPayload(prompt, overrides = {}) {
    const settings = validateAiSettings(state.aiSettings || getDefaultAiSettings());
    const modelId = overrides.modelId || settings.modelId;
    const provider = overrides.provider || settings.provider;
    const defaultOptions = {
      systemInstruction: '',
      temperature: 1.05,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 10000,
      candidateCount: 1,
      stopSequences: '',
      responseMimeType: 'text/plain'
    };
    const payload = {
      provider,
      modelId,
      prompt,
      options: {
        ...defaultOptions,
        ...(overrides.options || {})
      }
    };
    return payload;
  }

  function getCourseMapCourses() {
    return state.bootstrap?.courseMap?.courses || {};
  }

  function getTermCourseIds(termId, options = {}) {
    const includeSpecial = options.includeSpecial === true;
    const regularCourseIds = Object.entries(getCourseMapCourses())
      .filter(([courseId, value]) => value.termId === termId && (includeSpecial || !SPECIAL_COURSE_IDS.has(courseId)))
      .sort(([leftId], [rightId]) => leftId.localeCompare(rightId, 'zh-CN'))
      .map(([courseId]) => courseId);
    if (!includeSpecial) {
      return regularCourseIds;
    }
    return regularCourseIds.concat(
      SPECIAL_COURSES.filter((course) => course.termId === termId).map((course) => course.id)
    );
  }

  function buildCourseStates() {
    const courses = {};
    const homeworkSettings = state.bootstrap?.homework?.settings || {};
    for (const [courseId, courseMeta] of Object.entries(getCourseMapCourses())) {
      courses[courseId] = {
        courseId,
        courseName: courseMeta.courseName,
        termId: courseMeta.termId,
        termLabel: courseMeta.termLabel,
        studyProgress: 0,
        currentHomeworkProgress: 0,
        homeworkWeeksRemaining: null,
        pastHomeworkGrades: [],
        examScore: null,
        finalGrade: null,
        currentAssignmentActive: false,
        homeworkIntervalWeeks: Number(homeworkSettings[courseId]?.intervalWeeks || 4),
        homeworkGrowthFactor: Number(homeworkSettings[courseId]?.growthFactor || 1),
        assignmentCounter: 0
      };
    }

    for (const special of SPECIAL_COURSES) {
      courses[special.id] = {
        courseId: special.id,
        courseName: special.courseName,
        termId: special.termId,
        termLabel: special.termLabel,
        studyProgress: 0,
        currentHomeworkProgress: 0,
        homeworkWeeksRemaining: null,
        pastHomeworkGrades: [],
        examScore: null,
        finalGrade: null,
        currentAssignmentActive: false,
        homeworkIntervalWeeks: 0,
        homeworkGrowthFactor: 0,
        assignmentCounter: 0
      };
    }

    return courses;
  }

  function toFiniteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeCourseState(existing, defaults) {
    if (!existing || typeof existing !== 'object') {
      return defaults;
    }
    const homeworkWeeksRemaining = existing.homeworkWeeksRemaining === null || existing.homeworkWeeksRemaining === undefined || existing.homeworkWeeksRemaining === ''
      ? null
      : Math.max(0, Math.floor(toFiniteNumber(existing.homeworkWeeksRemaining, 0)));
    const examScore = existing.examScore === null || existing.examScore === undefined || existing.examScore === ''
      ? null
      : clamp(Math.round(toFiniteNumber(existing.examScore, 0)), 0, 100);
    return {
      ...defaults,
      ...existing,
      courseId: defaults.courseId,
      courseName: defaults.courseName,
      termId: defaults.termId,
      termLabel: defaults.termLabel,
      studyProgress: clamp(toFiniteNumber(existing.studyProgress, defaults.studyProgress), 0, 100),
      currentHomeworkProgress: clamp(toFiniteNumber(existing.currentHomeworkProgress, defaults.currentHomeworkProgress), 0, 100),
      homeworkWeeksRemaining,
      pastHomeworkGrades: Array.isArray(existing.pastHomeworkGrades)
        ? existing.pastHomeworkGrades
          .map((value) => clamp(Math.round(toFiniteNumber(value, 0)), 0, 100))
          .filter((value) => Number.isFinite(value))
        : [],
      examScore,
      finalGrade: GRADE_ORDER.includes(existing.finalGrade) ? existing.finalGrade : defaults.finalGrade,
      currentAssignmentActive: Boolean(existing.currentAssignmentActive),
      homeworkIntervalWeeks: Math.max(0, Math.floor(toFiniteNumber(defaults.homeworkIntervalWeeks, 4))),
      homeworkGrowthFactor: toFiniteNumber(defaults.homeworkGrowthFactor, 1),
      assignmentCounter: Math.max(0, Math.floor(toFiniteNumber(existing.assignmentCounter, defaults.assignmentCounter)))
    };
  }

  function reconcileCourseStates(existingCourses) {
    const nextCourses = buildCourseStates();
    for (const [courseId, defaults] of Object.entries(nextCourses)) {
      nextCourses[courseId] = normalizeCourseState(existingCourses?.[courseId], defaults);
    }
    return nextCourses;
  }

  function createRuntime(playerInput) {
    const runtime = {
      version: STORAGE_VERSION,
      phase: 'intro',
      player: {
        name: playerInput.name,
        age: CAMPAIGN_CONFIG.playerStartingAge,
        gender: '女',
        birthdayMonth: playerInput.birthMonth,
        birthdayDay: playerInput.birthDay,
        money: 1000,
        fatigue: 0,
        dailyCost: DAILY_COST,
        currentDate: START_DATE,
        assistantRole: null,
        graduationInternship: null,
        graduationInternshipBossId: '',
        graduationInternshipOfferId: '',
        graduationThesisProgress: 0,
        inspiration: 100,
        bizProgress: 0
      },
      courses: buildCourseStates(),
      characters: [],
      locations: [],
      history: [],
      chapters: [],
      outfits: [],
      schedulePlans: {},
      flags: {
        termResults: {},
        academicWarnings: {},
        scholarshipPaid: {},
        firstOpeningCeremonyTriggered: false,
        bizMergeTutorialCompleted: false,
        triggeredEvents: {},
        historyPanelWeekStart: getWeekStart(START_DATE),
        weeklyInvite: {
          weekStart: getWeekStart(START_DATE),
          globalLocked: false,
          attemptedCharacterIds: [],
          nightInviteAskedIds: []
        },
        annual: {},
        courseFirstClassDone: {},
        knownProfessorsByCourse: {},
        knownAssistantsByCourse: {},
        knownClassmatesByCourse: {},
        tutor: {
          started: false,
          parentCharacterId: null,
          studentCharacterId: null
        },
        assistant: {
          juniorCharacterIds: [],
          completedWeeks: {},
          firstDoneByTerm: {},
          inviteResolvedByTerm: {}
        },
        studentSecretary: {
          unlocked: false,
          firstCompleted: false
        },
        debate: {},
        internships: {
          firstSeenLocations: {},
          offers: {},
          acceptedOffers: [],
          selectionResolved: false
        }
      },
      meta: {
        runId: createRunId(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        ending: null,
        worldbookExport: null,
        pendingStoryEvent: null,
        textPresetMode: 'tavern'
      }
    };
    ensureAssignmentsForDate(runtime, runtime.player.currentDate);
    return runtime;
  }

  function ensureAnnualFlags(runtime, year) {
    if (!runtime.flags.annual[year]) {
      runtime.flags.annual[year] = {};
    }
    const annual = runtime.flags.annual[year];
    annual.confessedCharacterIds = Array.isArray(annual.confessedCharacterIds) ? annual.confessedCharacterIds : [];
    annual.valentinesFromCharacterIds = Array.isArray(annual.valentinesFromCharacterIds) ? annual.valentinesFromCharacterIds : [];
    annual.valentinesSentCharacterIds = Array.isArray(annual.valentinesSentCharacterIds) ? annual.valentinesSentCharacterIds : [];
    annual.newYearPartnerCharacterId = annual.newYearPartnerCharacterId || null;
    annual.maskBallPartnerCharacterId = annual.maskBallPartnerCharacterId || null;
    annual.newYearInviteAskedCharacterIds = Array.isArray(annual.newYearInviteAskedCharacterIds) ? annual.newYearInviteAskedCharacterIds : [];
    annual.maskBallInviteAskedCharacterIds = Array.isArray(annual.maskBallInviteAskedCharacterIds) ? annual.maskBallInviteAskedCharacterIds : [];
    return annual;
  }

  function resetAnnualFlags(runtime, dateText) {
    if (!dateText.endsWith('-01-01')) {
      return;
    }
    ensureAnnualFlags(runtime, dateText.slice(0, 4));
  }

  function hasAnyHomeworkInTerm(runtime, termId) {
    return getTermCourseIds(termId).some((courseId) => runtime.courses[courseId]?.currentAssignmentActive);
  }

  function getDebateState(runtime, termId) {
    if (!runtime.flags.debate[termId]) {
      runtime.flags.debate[termId] = {
        registered: false,
        preparation: 0,
        firstPreparationDone: false,
        completedDays: 0
      };
    }
    return runtime.flags.debate[termId];
  }

  function markEventTriggered(runtime, eventName) {
    runtime.flags.triggeredEvents[eventName] = (runtime.flags.triggeredEvents[eventName] || 0) + 1;
  }

  function hasTriggeredEvent(runtime, eventName) {
    return Boolean(runtime.flags.triggeredEvents[eventName]);
  }

  function getWeeksRemainingInTerm(termId, dateText) {
    const term = TERM_DEFINITIONS.find((item) => item.id === termId);
    if (!term) {
      return 0;
    }
    return Math.floor(diffDays(getWeekStart(dateText), getWeekStart(term.end)) / 7) + 1;
  }

  function ensureAssignmentsForDate(runtime, dateText) {
    const term = getTermMeta(dateText);
    if (!term || term.isBreak) {
      return;
    }

    for (const courseId of getTermCourseIds(term.id)) {
      const course = runtime.courses[courseId];
      if (!course || course.currentAssignmentActive || course.finalGrade) {
        continue;
      }
      const remainingWeeks = getWeeksRemainingInTerm(term.id, dateText);
      if (remainingWeeks >= course.homeworkIntervalWeeks) {
        course.currentAssignmentActive = true;
        course.homeworkWeeksRemaining = course.homeworkIntervalWeeks;
        course.currentHomeworkProgress = 0;
        course.assignmentCounter += 1;
      }
    }
  }

  function calculateCourseGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  function gradeRank(grade) {
    return GRADE_ORDER.indexOf(grade);
  }

  function summarizeTermResults(runtime, termId, options = {}) {
    const includeCurrentAssignment = options.includeCurrentAssignment === true;
    const courseIds = getTermCourseIds(termId);
    const results = courseIds.map((courseId) => {
      const course = runtime.courses[courseId];
      const homeworkGrades = course.pastHomeworkGrades.slice();
      if (includeCurrentAssignment && course.currentAssignmentActive && course.currentHomeworkProgress > 0) {
        homeworkGrades.push(Math.round(clamp(course.currentHomeworkProgress, 0, 100)));
      }
      const examScore = Math.round(clamp(course.studyProgress, 0, 100));
      const homeworkAverage = homeworkGrades.length
        ? homeworkGrades.reduce((sum, value) => sum + value, 0) / homeworkGrades.length
        : 0;
      const finalScore = examScore * 0.4 + homeworkAverage * 0.6;
      const finalGrade = calculateCourseGrade(finalScore);
      return {
        courseId,
        courseName: course.courseName,
        examScore,
        homeworkAverage: Math.round(homeworkAverage),
        finalGrade
      };
    });
    return {
      termId,
      results,
      failed: results.some((item) => gradeRank(item.finalGrade) < gradeRank('A'))
    };
  }

  function finalizeTermIfNeeded(runtime, termId) {
    if (!termId || runtime.flags.termResults[termId]) {
      return null;
    }
    const courseIds = getTermCourseIds(termId);
    if (!courseIds.length) {
      runtime.flags.termResults[termId] = true;
      return { results: [], failed: false, termId };
    }

    for (const courseId of courseIds) {
      const course = runtime.courses[courseId];
      if (course.currentAssignmentActive && course.currentHomeworkProgress > 0) {
        course.pastHomeworkGrades.push(Math.round(clamp(course.currentHomeworkProgress, 0, 100)));
        course.currentAssignmentActive = false;
        course.currentHomeworkProgress = 0;
        course.homeworkWeeksRemaining = null;
      }
    }
    const summary = summarizeTermResults(runtime, termId);
    for (const item of summary.results) {
      const course = runtime.courses[item.courseId];
      course.examScore = item.examScore;
      course.finalGrade = item.finalGrade;
    }

    runtime.flags.termResults[termId] = true;
    return summary;
  }

  function awardTermScholarshipIfEligible(runtime, termId, summary, dateText) {
    if (termId !== UPPER_TERM_ID || runtime.flags.scholarshipPaid[termId] || !summary?.results?.length) {
      return 0;
    }
    const termStanding = evaluateTermStanding({
      termId,
      regularGrades: summary.results.map((item) => item.finalGrade)
    });
    if (termStanding.expelled) {
      return 0;
    }
    const awardCount = summary.results.filter((item) => item.finalGrade === 'A+').length;
    const scholarship = awardCount * 5000;
    runtime.flags.scholarshipPaid[termId] = true;
    if (scholarship > 0) {
      updatePlayerMoney(runtime, scholarship);
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}凭上学期取得的 ${awardCount} 门 A+ 获得了 ${scholarship} 元奖学金。`);
    }
    return scholarship;
  }

  async function handleTermOutcome(runtime, termId, summary, dateText) {
    if (!summary?.results?.length) {
      return false;
    }
    const termStanding = evaluateTermStanding({
      termId,
      regularGrades: summary.results.map((item) => item.finalGrade)
    });
    if (termStanding.expelled) {
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}因上学期有课程评价低于 A，触发转学协议中的退学条款。`);
      await executeStoryEvent('退学事件', dateText, {
        characterIds: runtime.characters.map((item) => item.id),
        replacements: { '｛退学原因｝': '毕业学年上学期有课程评价低于 A，触发了转学协议中的退学条款' }
      });
      runtime.phase = 'ended';
      runtime.meta.ending = {
        type: 'game-over',
        title: '退学',
        text: `${runtime.player.name}因上学期有课程评价低于 A，被兰斯特皇家学院劝退。`
      };
      return true;
    }
    if (termId === GRADUATION_TERM_ID && summary.failed && !runtime.flags.academicWarnings[termId]) {
      runtime.flags.academicWarnings[termId] = true;
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}收到下学期学业警告，需要在毕业前达到最终毕业标准。`);
      await waitForTextModal('学业警告', '下学期有课程低于 A。此时是否能毕业仍按最终标准判定：所有普通课程不低于 B，并完成毕业论文与毕业实习。');
    }
    return false;
  }

  function getScheduleAssignments() {
    return state.bootstrap?.schedule?.assignments || {};
  }

  function getScheduleActivities() {
    return state.bootstrap?.schedule?.activities || {};
  }

  function normalizeActivityLabel(activityText) {
    return ACTIVITY_ALIASES.get(activityText) || activityText;
  }

  function getCourseAssignment(dateText) {
    return getScheduleAssignments()[dateText] || null;
  }

  function getFixedActivity(dateText) {
    const raw = getScheduleActivities()[dateText];
    return raw ? normalizeActivityLabel(raw) : null;
  }

  function shouldExposeFixedActivity(runtime, dateText, activity) {
    if (activity !== '校际辩论会') {
      return true;
    }
    const term = getTermMeta(dateText);
    return Boolean(term && getDebateState(runtime, term.id).registered);
  }

  function syncSchedulePlansWithBootstrap(runtime) {
    if (!runtime?.schedulePlans || !state.bootstrap?.schedule) {
      return false;
    }
    let changed = false;
    for (const [dateText, plan] of Object.entries(runtime.schedulePlans)) {
      if (!plan?.fixed || plan.completed || !['activity', 'exam'].includes(plan.kind)) {
        continue;
      }
      const activity = getFixedActivity(dateText);
      if (!activity || !shouldExposeFixedActivity(runtime, dateText, activity)) {
        delete runtime.schedulePlans[dateText];
        changed = true;
        continue;
      }
      const kind = activity === '考试' ? 'exam' : 'activity';
      const specKey = FIXED_ACTIVITY_SPEC_KEYS.get(activity) || activity;
      const fixed = isLockedScheduleActivity(activity);
      if (plan.activity !== activity || plan.label !== activity || plan.kind !== kind || plan.specKey !== specKey || plan.fixed !== fixed) {
        runtime.schedulePlans[dateText] = {
          ...plan,
          kind,
          label: activity,
          specKey,
          fixed,
          activity
        };
        changed = true;
      }
    }
    return changed;
  }

  function isLockedScheduleActivity(activity) {
    return LOCKED_SCHEDULE_ACTIVITIES.has(activity);
  }

  function getPlanForDate(runtime, dateText) {
    const existing = runtime.schedulePlans[dateText];
    if (existing) {
      return existing.cleared ? null : existing;
    }

    const activity = getFixedActivity(dateText);
    if (activity && shouldExposeFixedActivity(runtime, dateText, activity)) {
      runtime.schedulePlans[dateText] = {
        kind: activity === '考试' ? 'exam' : 'activity',
        label: activity,
        specKey: FIXED_ACTIVITY_SPEC_KEYS.get(activity) || activity,
        fixed: isLockedScheduleActivity(activity),
        completed: false,
        activity
      };
      return runtime.schedulePlans[dateText];
    }

    return null;
  }

  function setPlanForDate(runtime, dateText, plan) {
    runtime.schedulePlans[dateText] = {
      ...(runtime.schedulePlans[dateText] || {}),
      cleared: false,
      ...plan
    };
  }

  function isDateCompleted(runtime, dateText) {
    return Boolean(runtime.schedulePlans[dateText]?.completed);
  }

  function isWeekend(dateText) {
    const day = parseDate(dateText).getUTCDay();
    return day === 0 || day === 6;
  }

  function getWeekInviteState(runtime, weekStart) {
    if (runtime.flags.weeklyInvite.weekStart !== weekStart) {
      runtime.flags.weeklyInvite = {
        weekStart,
        globalLocked: false,
        attemptedCharacterIds: [],
        nightInviteAskedIds: []
      };
    }
    return runtime.flags.weeklyInvite;
  }

  function getActionToken(action) {
    switch (action.kind) {
      case 'course':
      case 'homework':
      case 'review':
        return `${action.kind}:${action.courseId}`;
      case 'date':
        return `date:${action.characterId}`;
      case 'activity':
      case 'exam':
        return `activity:${action.label}`;
      default:
        return action.kind;
    }
  }

  function makeAction(kind, label, extra = {}) {
    return {
      kind,
      label,
      specKey: extra.specKey || getActionGroup({ kind, label, ...extra }),
      ...extra
    };
  }

  function buildActionFromToken(runtime, dateText, token) {
    const [kind, rawValue] = token.split(':');
    if (kind === 'course') {
      const course = runtime.courses[rawValue];
      return makeAction('course', `上${course.courseName}`, { courseId: rawValue, specKey: '上某门课' });
    }
    if (kind === 'homework') {
      const course = runtime.courses[rawValue];
      return makeAction('homework', `写${course.courseName}的作业`, { courseId: rawValue, specKey: '写某门课的作业' });
    }
    if (kind === 'review') {
      const course = runtime.courses[rawValue];
      return makeAction('review', `复习${course.courseName}`, { courseId: rawValue, specKey: '复习某门课' });
    }
    if (kind === 'date') {
      const character = runtime.characters.find((item) => item.id === rawValue);
      return makeAction('date', `与${character?.name || '某人'}约会`, { characterId: rawValue, fixed: true, specKey: '约会' });
    }
    if (kind === 'activity') {
      const label = normalizeActivityLabel(rawValue || token.replace(/^activity:/, ''));
      return makeAction(label === '考试' ? 'exam' : 'activity', label, {
        activity: label,
        fixed: isLockedScheduleActivity(label),
        specKey: FIXED_ACTIVITY_SPEC_KEYS.get(label) || label
      });
    }
    if (token === 'flyer') {
      return makeAction('flyer', '发传单');
    }
    if (token === 'tutor') {
      return makeAction('tutor', '做家教');
    }
    if (token === 'student-secretary') {
      return makeAction('student-secretary', '做学生会秘书');
    }
    if (token === 'sleep') {
      return makeAction('sleep', '睡觉');
    }
    if (token === 'assistant') {
      return makeAction('assistant', '做助教');
    }
    if (token === 'class-trip') {
      return makeAction('activity', '班级度假', { activity: '班级度假', fixed: false, specKey: '班级度假' });
    }
    if (token === 'winter-job') {
      return makeAction('winter-job', '新年礼宾临时工');
    }
    if (token === 'graduation-internship') {
      return makeAction('graduation-internship', '毕业实习');
    }
    if (token === 'graduation-thesis') {
      return makeAction('graduation-thesis', '写毕业论文');
    }
    if (token === 'debate-prep') {
      return makeAction('debate-prep', '准备校际辩论会');
    }
    return null;
  }

  function getDebateStartDate(termId) {
    return Object.keys(getScheduleActivities())
      .filter((dateText) => {
        const activity = normalizeActivityLabel(getScheduleActivities()[dateText]);
        return activity === '校际辩论会' && getTermMeta(dateText)?.id === termId;
      })
      .sort()[0] || null;
  }

  function hasAssistantAvailableThisWeek(runtime, dateText) {
    const weekStart = getWeekStart(dateText);
    return runtime.flags.assistant.completedWeeks[weekStart] !== true;
  }

  function getAvailableActions(runtime, dateText) {
    const fixed = getPlanForDate(runtime, dateText);
    if (fixed && fixed.fixed && !fixed.completed) {
      return [fixed];
    }

    const actions = [];
    const scheduledActivity = getFixedActivity(dateText);
    if (scheduledActivity && shouldExposeFixedActivity(runtime, dateText, scheduledActivity) && !isLockedScheduleActivity(scheduledActivity)) {
      actions.push(makeAction(scheduledActivity === '考试' ? 'exam' : 'activity', scheduledActivity, {
        activity: scheduledActivity,
        fixed: false,
        specKey: FIXED_ACTIVITY_SPEC_KEYS.get(scheduledActivity) || scheduledActivity
      }));
    }
    if (fixed?.activity === '班级度假') {
      actions.push(makeAction('activity', '班级度假', { activity: '班级度假', specKey: '班级度假' }));
    }
    const currentTerm = getTermMeta(dateText);
    const courseId = getCourseAssignment(dateText);
    if (courseId) {
      actions.push(makeAction('course', `上${runtime.courses[courseId].courseName}`, { courseId, specKey: '上某门课' }));
    }

    if (currentTerm && !currentTerm.isBreak) {
      var effectiveTermId = currentTerm.id.endsWith('-break') ? currentTerm.id.replace(/-break$/, '') : currentTerm.id;
      var termFinalized = runtime.flags.termResults[effectiveTermId];
      if (!termFinalized) {
        for (const activeCourseId of getTermCourseIds(effectiveTermId)) {
          const course = runtime.courses[activeCourseId];
          actions.push(makeAction('review', `复习${course.courseName}`, { courseId: activeCourseId, specKey: '复习某门课' }));
        }
      }
      const debate = getDebateState(runtime, currentTerm.id);
      const debateStartDate = getDebateStartDate(currentTerm.id);
      if (debate.registered && debateStartDate && dateText < debateStartDate) {
        actions.push(makeAction('debate-prep', '准备校际辩论会'));
      }
    }

    actions.push(makeAction('flyer', '发传单'));
    if (isWeekend(dateText) && !runtime.flags.tutor.studentUpgraded) {
      actions.push(makeAction('tutor', '做家教'));
    }
    if (runtime.flags.studentSecretary.unlocked && currentTerm && !currentTerm.isBreak && formatWeekday(dateText) === '周五' && hasAnyHomeworkInTerm(runtime, currentTerm.id)) {
      actions.push(makeAction('student-secretary', '做学生会秘书'));
    }
    if (runtime.player.assistantRole?.termId === currentTerm?.id && currentTerm && !currentTerm.isBreak && !isWeekend(dateText) && hasAssistantAvailableThisWeek(runtime, dateText) && hasAnyHomeworkInTerm(runtime, currentTerm.id)) {
      actions.push(makeAction('assistant', '做助教'));
    }
    if (isDateInWinterBreak(dateText)) {
      actions.push(makeAction('winter-job', '新年礼宾临时工'));
    }
    if (currentTerm?.id === GRADUATION_TERM_ID && !isWeekend(dateText)) {
      actions.push(makeAction('graduation-internship', '毕业实习'));
      actions.push(makeAction('graduation-thesis', '写毕业论文'));
    }
    actions.push(makeAction('sleep', '睡觉'));

    const uniqueActions = [];
    const seenActionKeys = new Set();
    for (const action of actions) {
      const actionKey = [
        action.kind,
        action.activity || '',
        action.label || '',
        action.courseId || '',
        action.characterId || '',
        action.specKey || ''
      ].join('::');
      if (seenActionKeys.has(actionKey)) {
        continue;
      }
      seenActionKeys.add(actionKey);
      uniqueActions.push(action);
    }

    return uniqueActions.sort((left, right) => {
      const orderedActions = state.specs.actions.length ? state.specs.actions : ACTION_ORDER;
      const fallbackActions = ACTION_ORDER;
      const leftGroup = getActionGroup(left);
      const rightGroup = getActionGroup(right);
      const leftOrder = orderedActions.indexOf(leftGroup) !== -1 ? orderedActions.indexOf(leftGroup) : fallbackActions.indexOf(leftGroup);
      const rightOrder = orderedActions.indexOf(rightGroup) !== -1 ? orderedActions.indexOf(rightGroup) : fallbackActions.indexOf(rightGroup);
      return leftOrder - rightOrder;
    });
  }

  function getActionGroup(action) {
    if (action.specKey) return action.specKey;
    if (action.kind === 'activity') return FIXED_ACTIVITY_SPEC_KEYS.get(action.label) || action.label;
    if (action.kind === 'exam') return '考试';
    if (action.kind === 'date') return '约会';
    if (action.kind === 'course') return '上某门课';
    if (action.kind === 'homework') return '写某门课的作业';
    if (action.kind === 'review') return '复习某门课';
    if (action.kind === 'flyer') return '发传单';
    if (action.kind === 'tutor') return '做家教';
    if (action.kind === 'student-secretary') return '做学生会秘书';
    if (action.kind === 'assistant') return '做助教';
    if (action.kind === 'winter-job') return '新年礼宾临时工';
    if (action.kind === 'graduation-internship') return '毕业实习';
    if (action.kind === 'graduation-thesis') return '写毕业论文';
    if (action.kind === 'debate-prep') return '准备校际辩论会';
    return '睡觉';
  }

  function addHistory(runtime, dateText, text, options = {}) {
    const historyIndex = runtime.history.length + 1;
    runtime.history.push({
      index: historyIndex,
      date: dateText,
      text,
      chapterId: options.chapterId || null
    });
    return historyIndex;
  }

  function addChapter(runtime, dateText, infoBlock, content, historyIndex) {
    const chapterId = `chapter-${runtime.chapters.length + 1}`;
    runtime.chapters.push({
      id: chapterId,
      date: dateText,
      infoBlock,
      content,
      historyIndex
    });
    const history = runtime.history.find((item) => item.index === historyIndex);
    if (history) {
      history.chapterId = chapterId;
    }
    return chapterId;
  }

  function getCharacterSummary(character) {
    const suffix = character.school && character.school !== '无' && character.grade > 0
      ? `${character.identity}/${character.school}${character.grade}年级生`
      : character.identity;
    return suffix;
  }

  function patchCharacterDefaults(rawCharacter) {
    return {
      id: `character-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      avatarUrl: String(rawCharacter.avatarUrl || rawCharacter.previewAvatarUrl || PLACEHOLDER_AVATAR).trim() || PLACEHOLDER_AVATAR,
      avatarOriginalUrl: String(rawCharacter.avatarOriginalUrl || rawCharacter.originalAvatarUrl || rawCharacter.avatarUrl || rawCharacter.previewAvatarUrl || '').trim(),
      avatarStatus: String(rawCharacter.avatarUrl || rawCharacter.previewAvatarUrl || rawCharacter.avatarOriginalUrl || rawCharacter.originalAvatarUrl || '').trim() ? 'ready' : 'pending',
      name: String(rawCharacter['姓名'] || '').trim(),
      age: Number(rawCharacter['年龄'] || 0),
      birthMonth: Number(rawCharacter['生日月份'] || 1),
      birthDay: (Number(rawCharacter['生日月份']) === 2 && Number(rawCharacter['生日日期']) === 29) ? 28 : Number(rawCharacter['生日日期'] || 1),
      identity: String(rawCharacter['身份'] || '').trim(),
      school: String(rawCharacter['学校'] || '无').trim() || '无',
      grade: Number(rawCharacter['年级'] || 0),
      gender: String(rawCharacter['性别'] || '').trim(),
      familyBusiness: String(rawCharacter['家业'] || '').trim(),
      affiliation: String(rawCharacter['所属'] || '').trim(),
      favorability: 0,
      isLover: false,
      bio: String(rawCharacter['人物小传'] || '').trim(),
      traits: String(rawCharacter['核心特质'] || '').trim(),
      hobbies: String(rawCharacter['爱好'] || '').trim(),
      home: String(rawCharacter['住所'] || '').trim(),
      sexualPreference: String(rawCharacter['性爱偏好'] || '').trim(),
      penisDescription: String(rawCharacter['阴茎描述'] || '').trim(),
      appearance: String(rawCharacter['外貌服饰氛围气味'] || '').trim(),
      eventFlags: {}
    };
  }

  function parseEventOutput(text) {
    const sanitizedText = sanitizeAiText(text);
    const infoBlock = sanitizeAiText(extractInfoBlockContent(sanitizedText)).trim();
    const content = sanitizeAiText(extractNearestTagContent(sanitizedText, 'content')).trim();
    const newHistory = sanitizeAiText(extractNearestTagContent(sanitizedText, 'newHistory')).trim();
    const newLocation = sanitizeAiText(extractNearestTagContent(sanitizedText, 'newLocation')).trim();
    const newCharacterText = extractNearestTagContent(sanitizedText, 'newCharacter');
    const newCharacterTexts = newCharacterText ? [newCharacterText] : [];
    const newClothText = sanitizeAiText(extractNearestTagContent(sanitizedText, 'newCloth')).trim();
    const newClothTexts = newClothText ? [newClothText] : [];
    if (!content || !newHistory) {
      throw new Error('AI 返回缺少必要标签（<content> 或 <newHistory>），请重试。');
    }
    const newCharacters = newCharacterTexts
      .flatMap((item) => parseLooseCharacterRecords(item))
      .map((item) => patchCharacterDefaults(item))
      .filter((item) => item.name);
    const newCloths = newClothTexts
      .map((item) => item.trim())
      .filter((item) => item && item !== '无');
    return {
      infoBlock,
      content,
      newHistory,
      newLocation,
      newCharacters,
      newCloths
    };
  }

  async function applyTavernDisplayRegex(text) {
    const source = String(text || '');
    try {
      const result = await postJson(TAVERN_DISPLAY_REGEX_URL, { text: source });
      return typeof result?.text === 'string' ? result.text.trim() : source;
    } catch {
      return source;
    }
  }

  function getCharacterRelation(character) {
    if (character.isLover) {
      return '恋人';
    }
    if (character.favorability < 0) {
      return '关系不好';
    }
    if (character.favorability < RELATIONSHIP_THRESHOLDS.friend) {
      return '认识的人';
    }
    if (character.gender === '男' && character.favorability >= RELATIONSHIP_THRESHOLDS.admirer) {
      return '爱慕者';
    }
    return '朋友';
  }

  function isPlayerBirthday(runtime, dateText) {
    const date = parseDate(dateText);
    return Number(runtime.player.birthMonth) === date.getUTCMonth() + 1
      && Number(runtime.player.birthDay) === date.getUTCDate();
  }

  function applyCharacterBirthdays(runtime, dateText) {
    const date = parseDate(dateText);
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    for (const character of runtime.characters) {
      if (Number(character.birthMonth) === month && Number(character.birthDay) === day) {
        character.age = (Number(character.age) || 0) + 1;
      }
    }
    if (Number(runtime.player.birthdayMonth) === month && Number(runtime.player.birthdayDay) === day) {
      runtime.player.age = (Number(runtime.player.age) || 18) + 1;
    }
  }

  function isCharacterAdmirer(character) {
    return !character.isLover && character.gender === '男' && character.favorability >= RELATIONSHIP_THRESHOLDS.admirer;
  }

  function getBirthdayGiftRecipients(runtime) {
    const premiumRecipients = runtime.characters.filter((character) => character.isLover || isCharacterAdmirer(character));
    const regularRecipients = runtime.characters.filter((character) => character.favorability >= RELATIONSHIP_THRESHOLDS.admirer && !premiumRecipients.some((item) => item.id === character.id));
    return { premiumRecipients, regularRecipients };
  }

  function isCurrentSchoolStudent(character) {
    return Boolean(character)
      && character.gender === '男'
      && character.grade > 0
      && String(character.school || '').includes('兰斯特皇家学院');
  }

  function isEligibleDanceInviteCharacter(character) {
    return isCurrentSchoolStudent(character) && (character.isLover || character.favorability >= RELATIONSHIP_THRESHOLDS.admirer);
  }

  function isDateInNewYearInviteWindow(dateText) {
    return dateText.slice(5) >= '12-20' && dateText.slice(5) <= '12-30';
  }

  function isDateInMaskBallInviteWindow(runtime, dateText) {
    if (formatWeekday(dateText) === '周日') {
      return false;
    }
    return getWeekDates(getWeekStart(dateText)).some((weekDate) => {
      const plan = getPlanForDate(runtime, weekDate);
      return normalizeActivityLabel(plan?.activity || plan?.label || '') === '仲夏夜假面舞会';
    });
  }

  async function maybeHandleDanceInvite(runtime, dateText, config) {
    const annual = ensureAnnualFlags(runtime, dateText.slice(0, 4));
    if (annual[config.partnerKey]) {
      return;
    }
    if (!config.shouldCheck(runtime, dateText)) {
      return;
    }
    const askedIds = annual[config.askedKey];
    const candidates = runtime.characters.filter((character) => isEligibleDanceInviteCharacter(character) && !askedIds.includes(character.id));
    if (!candidates.length || !chance(0.5)) {
      return;
    }
    const candidate = pickRandom(candidates);
    if (!candidate) {
      return;
    }
    askedIds.push(candidate.id);
    const accepted = await waitForBooleanChoice(config.title, `${candidate.name}邀请你做他${config.partnerLabel}，是否同意？`, '同意', '拒绝');
    addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${candidate.name}邀请${runtime.player.name}做他${config.partnerLabel}。`);
    if (accepted) {
      annual[config.partnerKey] = candidate.id;
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}答应做${candidate.name}${config.partnerLabel}。`);
    } else {
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}拒绝了${candidate.name}的邀约。`);
    }
  }

  async function maybeHandleBirthdayGifts(runtime, dateText) {
    if (!isPlayerBirthday(runtime, dateText)) {
      return;
    }
    const { premiumRecipients, regularRecipients } = getBirthdayGiftRecipients(runtime);
    const gifts = [
      ...premiumRecipients.map((character) => ({ character, amount: randomInt(1000, 5000) })),
      ...regularRecipients.map((character) => ({ character, amount: randomInt(500, 1000) }))
    ];
    for (const gift of gifts) {
      updatePlayerMoney(runtime, gift.amount);
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${gift.character.name}赠送了${runtime.player.name}生日礼物，${runtime.player.name}在二手市场卖了${gift.amount}元。`);
      await waitForTextModal('生日礼物', `${gift.character.name}赠送了你生日礼物，你在二手市场卖了${gift.amount}钱`);
    }
  }

  async function maybeHandlePlayerBirthdayEvent(runtime, dateText, skipPlan, hadChapter, hospitalized) {
    if (!isPlayerBirthday(runtime, dateText)) return;
    if (hospitalized) return;
    if (skipPlan) return;
    if (hadChapter) return;
    var closeCharacters = runtime.characters.filter(function (c) { return c.favorability >= RELATIONSHIP_THRESHOLDS.admirer; });
    if (!closeCharacters.length) return;
    await executeStoryEvent('主角生日事件', dateText);
  }

  function isFixedPlanDate(runtime, dateText) {
    return Boolean(getPlanForDate(runtime, dateText)?.fixed);
  }

  function getValentinesCandidates(runtime) {
    return runtime.characters.filter((character) => character.isLover || isCharacterAdmirer(character));
  }

  function getCharactersWithPendingDates(runtime) {
    const ids = new Set();
    for (const plan of Object.values(runtime.schedulePlans || {})) {
      if (plan && plan.kind === 'date' && !plan.completed && plan.characterId != null) {
        ids.add(plan.characterId);
      }
    }
    return ids;
  }

  function getFriendLoanCandidates(runtime) {
    return runtime.characters.filter((character) => !character.isLover && !isCharacterAdmirer(character) && character.favorability >= RELATIONSHIP_THRESHOLDS.admirer);
  }

  async function maybeHandleValentinesDay(runtime, dateText) {
    if (!dateText.endsWith('-02-14') || isFixedPlanDate(runtime, dateText)) {
      return false;
    }
    const candidates = getValentinesCandidates(runtime);
    if (!candidates.length) {
      return false;
    }
    const annual = ensureAnnualFlags(runtime, dateText.slice(0, 4));
    annual.valentinesFromCharacterIds = [...new Set([...annual.valentinesFromCharacterIds, ...candidates.map((character) => character.id)])];
    await executeStoryEvent('情人节事件', dateText, {
      characterIds: candidates.map((character) => character.id)
    });
    return true;
  }

  function waitForChocolateSelection(runtime, dateText) {
    const annual = ensureAnnualFlags(runtime, dateText.slice(0, 4));
    const characters = runtime.characters.filter((character) => character.gender === '男');
    return new Promise((resolve) => {
      openModal({
        type: 'chocolate-picker',
        title: '送巧克力',
        characters,
        valentinesFromIds: annual.valentinesFromCharacterIds.slice(),
        selectedCharacterIds: annual.valentinesSentCharacterIds.slice(),
        resolver: resolve
      });
    });
  }

  async function maybeHandleWhiteDay(runtime, dateText) {
    if (!dateText.endsWith('-03-14') || isFixedPlanDate(runtime, dateText) || runtime.player.money <= 100) {
      return false;
    }
    await waitForTextModal('白色情人节', '白色情人节要不要送一些巧克力呢？');
    const selectedCharacterIds = (await waitForChocolateSelection(runtime, dateText)) || [];
    if (!selectedCharacterIds.length) {
      return false;
    }
    const cost = selectedCharacterIds.length * 100;
    if (runtime.player.money < cost) {
      await waitForTextModal('金钱不足', `送出这些巧克力需要 ${cost} 元，但当前金钱不足。`);
      return false;
    }
    const confirmed = await waitForBooleanChoice('送出巧克力', `是否花费金钱${cost}送出这些巧克力？`, '是', '否');
    if (!confirmed) {
      return false;
    }
    updatePlayerMoney(runtime, -cost);
    const annual = ensureAnnualFlags(runtime, dateText.slice(0, 4));
    annual.valentinesSentCharacterIds = selectedCharacterIds.slice();
    await executeStoryEvent('白色情人节事件', dateText, {
      characterIds: selectedCharacterIds
    });
    return true;
  }

  async function maybeHandlePovertyEvent(runtime, dateText) {
    if (isFixedPlanDate(runtime, dateText) || runtime.player.money >= 10) {
      return false;
    }
    if (runtime.flags.povertyAidCount <= 0) {
      const president = runtime.characters.find(isStudentCouncilPresident);
      if (!president) {
        throw new Error('学生会长角色缺失，无法触发勤工助学事件。请重新开始游戏并完成开学典礼。');
      }
      await executeStoryEvent('勤工助学事件已有学生会长版', dateText, {
        characterIds: [president.id]
      });
      updatePlayerMoney(runtime, 1000);
      runtime.flags.povertyAidCount = 1;
      return true;
    }
    const friendCandidates = getFriendLoanCandidates(runtime);
    if (friendCandidates.length) {
      const lender = pickRandom(friendCandidates);
      const amount = randomInt(1000, 5000);
      await executeStoryEvent('朋友借钱事件', dateText, {
        characterIds: lender ? [lender.id] : [],
        moneyAmount: amount
      });
      updatePlayerMoney(runtime, amount);
      runtime.flags.povertyAidCount += 1;
      return true;
    }
    await executeStoryEvent('贫困生补助事件', dateText, {
      characterIds: runtime.characters.map((item) => item.id)
    });
    runtime.flags.povertyAidCount += 1;
    return true;
  }

  function waitForIncomingInviteDate(characterId) {
    const character = state.runtime.characters.find((item) => item.id === characterId);
    if (!character) {
      return Promise.resolve('');
    }
    return new Promise((resolve) => {
      openModal({
        type: 'date-picker',
        title: `选择和 ${character.name} 的约会日期`,
        characterId,
        dates: buildInviteDateOptions(state.runtime, character),
        inviteOrigin: 'character',
        resolver: resolve
      });
    });
  }

  async function maybeHandleIncomingCharacterInvite(runtime, dateText) {
    const pendingDateCharacterIds = getCharactersWithPendingDates(runtime);
    const weekInvite = getWeekInviteState(runtime, getWeekStart(dateText));
    const candidates = shuffleArray(getValentinesCandidates(runtime).filter((c) => !pendingDateCharacterIds.has(c.id) && !weekInvite.nightInviteAskedIds.includes(c.id)));
    for (const candidate of candidates) {
      if (!chance(0.1)) {
        continue;
      }
      weekInvite.nightInviteAskedIds.push(candidate.id);
      const accepted = await waitForBooleanChoice('收到邀约', `${candidate.name}想要约你一起出去玩，是否同意？`, '同意', '拒绝');
      if (!accepted) {
        addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}拒绝了${candidate.name}的约会邀请。`);
        return true;
      }
      await waitForIncomingInviteDate(candidate.id);
      return true;
    }
    return false;
  }

  async function maybeHandleConfession(runtime, dateText) {
    const plan = getPlanForDate(runtime, dateText);
    if (normalizeActivityLabel(plan?.activity || plan?.label || '') === '班级度假') {
      return false;
    }
    const annual = ensureAnnualFlags(runtime, dateText.slice(0, 4));
    const candidates = runtime.characters.filter((character) => !character.isLover && character.gender === '男' && character.favorability >= RELATIONSHIP_THRESHOLDS.confession && !annual.confessedCharacterIds.includes(character.id) && Number(character.age) >= 18);
    if (!candidates.length || !chance(0.1)) {
      return false;
    }
    const candidate = pickRandom(candidates);
    if (!candidate) {
      return false;
    }
    annual.confessedCharacterIds.push(candidate.id);
    const accepted = await waitForBooleanChoice('有人告白', `${candidate.name}约你到楼下对你告白，是否同意？`, '同意', '拒绝');
    await executeStoryEvent(accepted ? '接受告白事件' : '拒绝告白事件', dateText, {
      characterIds: [candidate.id]
    });
    return true;
  }

  async function maybeHandleRandomLoverGifts(runtime, dateText) {
    for (const lover of runtime.characters.filter((character) => character.isLover)) {
      if (!chance(0.05)) {
        continue;
      }
      const amount = randomInt(500, 5000);
      updatePlayerMoney(runtime, amount);
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${lover.name}赠送了${runtime.player.name}礼物，${runtime.player.name}将之挂到二手平台卖了${amount}元。`);
      await waitForTextModal('收到礼物', `${lover.name}赠送你礼物，你将之挂到二手平台卖了金钱${amount}元`);
      return true;
    }
    return false;
  }

  function formatPromptCharacterIdentity(character) {
    if (character.school && character.school !== '无' && character.grade > 0) {
      return `${character.identity}/${character.school}${character.grade}年级生`;
    }
    return character.identity;
  }

  function formatCharactersForPrompt(runtime, characterIds = []) {
    if (!characterIds.length) {
      return '';
    }
    return characterIds
      .map((characterId) => runtime.characters.find((item) => item.id === characterId))
      .filter(Boolean)
      .map((character) => [
        `姓名：${character.name}`,
        `年龄：${character.age}`,
        `性别：${character.gender}`,
        `生日：${character.birthMonth}月${character.birthDay}日`,
        `和<user>的关系：${getCharacterRelation(character)}`,
        `是否和<user>是恋人：${character.isLover ? '是' : '否'}`,
        `身份：${formatPromptCharacterIdentity(character)}`,
        `家业：${character.familyBusiness || '无'}`,
        `外貌服饰氛围气味: ${character.appearance || '无'}`,
        `核心特质: ${character.traits || '无'}`,
        `人物小传：${character.bio || '无'}。`,
        `爱好：${character.hobbies || '无'}`,
        `住所：${character.home || '无'}`,
        `性爱偏好：${character.sexualPreference || '无'}`,
        `阴茎描述：${character.penisDescription || '无'}`
      ].join('\n'))
      .join('\n\n');
  }

  function formatLocationsForPrompt(runtime, requestedLocations = []) {
    const locations = requestedLocations.length ? requestedLocations : runtime.locations;
    return locations.filter(Boolean).join('\n\n');
  }

  function formatHistorysForPrompt(runtime, characterIds = []) {
    const matchedEntries = [];
    const names = characterIds
      .map((characterId) => runtime.characters.find((item) => item.id === characterId)?.name)
      .filter(Boolean);
    for (const history of runtime.history) {
      if (names.some((name) => history.text.includes(name))) {
        matchedEntries.push(history);
      }
    }
    const recentEntries = runtime.history.slice(-20);
    const merged = [];
    const seen = new Set();
    for (const item of [...matchedEntries, ...recentEntries]) {
      if (!seen.has(item.index)) {
        seen.add(item.index);
        merged.push(item);
      }
    }
    return merged.length ? merged.map((item) => item.text).join('\n') : '无';
  }

  function formatAllCharacterNamesForPrompt(runtime) {
    const names = [
      String(runtime?.player?.name || '').trim(),
      ...runtime.characters.map((character) => String(character?.name || '').trim())
    ].filter(Boolean);
    return [...new Set(names)].join('、');
  }

  function formatChaptersForPrompt(runtime) {
    const chapters = runtime.chapters.slice(-6);
    return chapters.length
      ? chapters.map((chapter) => [
          chapter.infoBlock ? `<info_block>\n${chapter.infoBlock}\n</info_block>` : '',
          `<content>\n${chapter.content}\n</content>`
        ].filter(Boolean).join('\n')).join('\n\n')
      : '无';
  }

  function joinSystemInstructionParts(parts) {
    return parts.map((item) => String(item || '').trim()).filter(Boolean).join('\n\n');
  }

  function getPromptTimeText(dateText) {
    const meta = getTermMeta(dateText);
    if (!meta) {
      return `当前时间为${formatMonthDay(dateText)}`;
    }
    return `当前时间为${meta.label.replace('上学期', '上半学期').replace('下学期', '下半学期')}${formatMonthDay(dateText)}`;
  }

  function resolvePromptClothText(runtime, eventSpec) {
    const raw = String(eventSpec?.cloth || '').trim();
    if (!raw) {
      return '';
    }
    const pickedOutfit = runtime.outfits.length ? runtime.outfits[Math.floor(Math.random() * runtime.outfits.length)] : null;
    return raw
      .replaceAll('随机从已有的礼服列表里选择一个', pickedOutfit ? pickedOutfit.description : '')
      .replaceAll('${cloth}', pickedOutfit ? pickedOutfit.description : '');
  }

  function getEventCourseName(runtime, context, options = {}) {
    const explicit = String(options.courseName || '').trim();
    if (explicit) {
      return explicit;
    }
    const courseId = options.courseId || context?.courseId || options.assistantCourseId || runtime.player.assistantRole?.courseId || null;
    return courseId ? String(runtime.courses?.[courseId]?.courseName || '').trim() : '';
  }

  function getEventLocationText(context, options = {}) {
    return String(options.locationText || context?.locationText || '').trim();
  }

  function getEventMoneyAmountText(options = {}) {
    if (options.moneyAmount === undefined || options.moneyAmount === null || options.moneyAmount === '') {
      return '';
    }
    return String(options.moneyAmount).trim();
  }

  function getDateInviteDirectiveText(options = {}) {
    if (options.inviteOrigin === 'player') {
      return '本次约会是<user>主动邀约，只有五百块预算，所以不会去太贵的约会项目。';
    }
    if (options.inviteOrigin === 'character') {
      return '本次约会是角色邀约，所以会去很豪华的约会项目。';
    }
    return '';
  }

  function applyEventParameterPlaceholders(promptText, replacementText, patterns) {
    if (!replacementText) {
      return promptText;
    }
    let text = promptText;
    for (const pattern of patterns) {
      text = text.replaceAll(pattern, replacementText);
    }
    return text;
  }

  function applyEventPromptDirectives(runtime, promptText, context, options = {}) {
    let text = promptText;
    const courseName = getEventCourseName(runtime, context, options);
    const locationText = getEventLocationText(context, options);
    const moneyAmountText = getEventMoneyAmountText(options);
    const inviteDirectiveText = getDateInviteDirectiveText(options);

    text = applyEventParameterPlaceholders(text, courseName, [
      '｛参数传入的课程名｝',
      '（参数传入）',
      '(参数传入)'
    ]);
    text = applyEventParameterPlaceholders(text, locationText, [
      'xxx（传入参数）',
      'xxx(传入参数)',
      '｛参数传入的地点名｝'
    ]);
    if (moneyAmountText) {
      text = text
        .replaceAll('xxx元（传入参数）', `${moneyAmountText}元`)
        .replaceAll('xxx元(传入参数)', `${moneyAmountText}元`)
        .replaceAll('｛传入增加金钱数｝元', `${moneyAmountText}元`)
        .replaceAll('｛传入增加金钱数｝', moneyAmountText);
    }
    if (inviteDirectiveText) {
      text = text.replace(/（如果传入变量是主角主动邀约[^）]*）/g, inviteDirectiveText);
    } else {
      text = text.replace(/（如果传入变量是主角主动邀约[^）]*）/g, '');
    }
    return text;
  }

  function getEventSpec(eventName) {
    const spec = EVENT_SPECS.get(eventName);
    if (!spec) {
      throw new Error(`事件配置缺失：${eventName}`);
    }
    return spec;
  }

  function getCharacterById(runtime, characterId) {
    return runtime.characters.find((item) => item.id === characterId) || null;
  }

  function getCurrentAcademicYear(dateText) {
    return getTermMeta(dateText)?.academicYear || 1;
  }

  function getCharactersFromIds(runtime, characterIds = []) {
    return characterIds
      .map((characterId) => getCharacterById(runtime, characterId))
      .filter(Boolean);
  }

  function uniqueCharacterIds(characterIds = []) {
    return [...new Set(characterIds.filter(Boolean))];
  }

  function getCandidateCharacters(runtime, options = {}) {
    const explicitCharacters = getCharactersFromIds(runtime, options.characterIds || []);
    return explicitCharacters.length ? explicitCharacters : runtime.characters.slice();
  }

  function hasAffiliation(character, expected) {
    return String(character?.affiliation || '').includes(expected);
  }

  function getCharactersByAffiliations(runtime, affiliations, options = {}) {
    const candidates = getCandidateCharacters(runtime, options);
    return candidates.filter((character) => affiliations.some((affiliation) => hasAffiliation(character, affiliation)));
  }

  function getCharactersWithGlobalFlag(runtime, flagName) {
    return runtime.characters.filter((character) => getCharacterScopedFlag(character, 'global', flagName));
  }

  function findTutorCharacterByIdentity(characters, role) {
    if (role === 'parent') {
      return characters.find((character) => character.identity.includes('家教学生的家长')) || null;
    }
    return characters.find((character) => character.identity.includes('家教学生') && !character.identity.includes('家教学生的家长')) || null;
  }

  function isTutorStudentCharacter(character) {
    return Boolean(character) && (
      getCharacterScopedFlag(character, 'global', '家教学生')
      || (character.identity.includes('家教学生') && !character.identity.includes('家教学生的家长'))
    );
  }

  function isTutorParentCharacter(character) {
    return Boolean(character) && (
      getCharacterScopedFlag(character, 'global', '家教学生的家长')
      || character.identity.includes('家教学生的家长')
    );
  }

  function resolveTutorCreatedCharacters(newCharacters = [], eventName = '') {
    const createdCharacters = newCharacters.filter(Boolean);
    const studentByIdentity = findTutorCharacterByIdentity(createdCharacters, 'student');
    const parentByIdentity = findTutorCharacterByIdentity(createdCharacters, 'parent');
    if (eventName === '第一次做家教事件') {
      const student = studentByIdentity
        || createdCharacters.find((character) => character.age === 18)
        || createdCharacters[0]
        || null;
      const parent = parentByIdentity
        || createdCharacters[1]
        || createdCharacters.find((character) => character.id !== student?.id && character.age >= 18)
        || createdCharacters.find((character) => character.id !== student?.id)
        || null;
      return { student, parent };
    }
    return {
      student: studentByIdentity || null,
      parent: parentByIdentity || null
    };
  }

  function syncTutorCharacterIds(runtime, preferredCharacters = []) {
    const preferredPool = preferredCharacters.filter(Boolean);
    const allCandidates = [...new Map([...preferredPool, ...runtime.characters].filter(Boolean).map((character) => [character.id, character])).values()];
    const currentStudent = getCharacterById(runtime, runtime.flags.tutor.studentCharacterId);
    const currentParent = getCharacterById(runtime, runtime.flags.tutor.parentCharacterId);
    const preferredTutorCharacters = resolveTutorCreatedCharacters(preferredPool, preferredPool.length >= 2 ? '第一次做家教事件' : '');
    const student = (isTutorStudentCharacter(currentStudent) ? currentStudent : null)
      || getCharactersWithGlobalFlag(runtime, '家教学生')[0]
      || findTutorCharacterByIdentity(allCandidates, 'student')
      || preferredTutorCharacters.student
      || null;
    const parent = (isTutorParentCharacter(currentParent) && currentParent?.id !== student?.id ? currentParent : null)
      || getCharactersWithGlobalFlag(runtime, '家教学生的家长')[0]
      || findTutorCharacterByIdentity(allCandidates, 'parent')
      || (preferredTutorCharacters.parent?.id !== student?.id ? preferredTutorCharacters.parent : null)
      || null;
    runtime.flags.tutor.studentCharacterId = student?.id || null;
    runtime.flags.tutor.parentCharacterId = parent?.id || null;
  }

  function clearCharacterGlobalFlag(runtime, flagName) {
    for (const character of runtime.characters) {
      const flags = ensureCharacterEventFlags(character);
      if (flags.global && Object.prototype.hasOwnProperty.call(flags.global, flagName)) {
        delete flags.global[flagName];
      }
    }
  }

  function resolveDebateTeammateIds(runtime, dateText) {
    const flagged = getCharactersWithGlobalFlag(runtime, '辩论队队友');
    if (flagged.length) {
      return uniqueCharacterIds(flagged.map((character) => character.id));
    }
    const currentYear = getCurrentAcademicYear(dateText);
    const teammates = [];
    for (let year = 1; year <= 4; year += 1) {
      if (year === currentYear) {
        continue;
      }
      const candidate = pickRandom(runtime.characters.filter((character) => hasAffiliation(character, '本校学生') && character.grade === year));
      if (candidate) {
        teammates.push(candidate.id);
      }
    }
    return uniqueCharacterIds(teammates);
  }

  function resolveEventCharacterIds(runtime, eventName, dateText, options = {}) {
    const spec = getEventSpec(eventName);
    const rule = String(spec.characters || '').trim();
    const currentYear = getCurrentAcademicYear(dateText);
    const candidates = getCandidateCharacters(runtime, options);
    const explicitIds = uniqueCharacterIds(options.characterIds || []);
    var resolvedIds;
    if (!rule || rule === '无') {
      resolvedIds = [];
    }
    if (rule === '全部已有角色' || rule === '所有角色') {
      return uniqueCharacterIds(candidates.map((character) => character.id));
    }
    if (rule.startsWith('所有好感度高于')) {
      return uniqueCharacterIds(candidates.filter(function (c) { return c.favorability >= RELATIONSHIP_THRESHOLDS.admirer; }).map(function (c) { return c.id; }));
    }
    if (rule.includes('所有传入的角色')) {
      return explicitIds;
    }
    if (rule.includes('本日约会对象') || rule.includes('告白角色')) {
      return explicitIds.slice(0, 1);
    }
    if (rule.includes('介绍实习的角色')) {
      return explicitIds.slice(0, 1);
    }
    if (rule.includes('约会对象和随机的另一个恋人')) {
      const primaryId = explicitIds[0] || null;
      const otherLover = pickRandom(runtime.characters.filter((character) => character.isLover && character.id !== primaryId));
      return uniqueCharacterIds([primaryId, otherLover?.id]);
    }
    if (rule.includes('标记有三人约会参与者的两个人')) {
      return uniqueCharacterIds(getCharactersWithGlobalFlag(runtime, '三人约会参与者').map((character) => character.id).slice(0, 2));
    }
    if (rule === '家教学生') {
      syncTutorCharacterIds(runtime);
      return uniqueCharacterIds([runtime.flags.tutor.studentCharacterId]);
    }
    if (rule.includes('家教学生和家教学生的家长')) {
      syncTutorCharacterIds(runtime);
      return uniqueCharacterIds([runtime.flags.tutor.studentCharacterId, runtime.flags.tutor.parentCharacterId]);
    }
    if (rule === '发传单认识的人') {
      return uniqueCharacterIds(getCharactersWithGlobalFlag(runtime, '发传单认识的人').map((character) => character.id));
    }
    if (rule.includes('没有“发传单认识的人”')) {
      const candidate = pickRandom(candidates.filter((character) => !getCharacterScopedFlag(character, 'global', '发传单认识的人')));
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule === '任意一个恋人') {
      const candidate = pickRandom(candidates.filter((character) => character.isLover));
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule.includes('任意一个好感度大于等于')) {
      const candidate = pickRandom(candidates.filter((character) => character.favorability >= RELATIONSHIP_THRESHOLDS.admirer));
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule.includes('任意一个好感大于')) {
      const candidate = pickRandom(candidates.filter((character) => character.favorability >= RELATIONSHIP_THRESHOLDS.admirer));
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule.includes('任意一个角色列表里的角色')) {
      const candidate = pickRandom(candidates);
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule.includes('学生会长')) {
      const candidate = pickRandom(candidates.filter(isStudentCouncilPresident));
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule.includes('角色列表里的本校学生或本校老师任意一个') || rule.includes('任意一个“本校学生”或“本校老师”')) {
      const candidate = pickRandom(candidates.filter((character) => hasAffiliation(character, '本校学生') || hasAffiliation(character, '本校老师')));
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule.includes('所有同年级同学、该门课助教、该门课教授里任选一人')) {
      const courseId = options.courseId || options.assistantCourseId || runtime.player.assistantRole?.courseId;
      const courseCandidates = [
        ...runtime.characters.filter((character) => hasAffiliation(character, '本校学生') && character.grade === currentYear),
        ...(courseId ? getCharactersForCourse(runtime, courseId, '助教') : []),
        ...(courseId ? getCharactersForCourse(runtime, courseId, '教授') : [])
      ];
      const candidate = pickRandom([...new Map(courseCandidates.map((character) => [character.id, character])).values()]);
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule.includes('本门课教授')) {
      const courseId = options.courseId || options.assistantCourseId || runtime.player.assistantRole?.courseId;
      const courseName = options.courseName || runtime.player.assistantRole?.courseName || '';
      const candidate = pickRandom(courseId ? getCharactersForCourse(runtime, courseId, '教授', courseName) : []);
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule.includes('角色列表里任意一个三年级的兰斯特皇家学院学生')) {
      const flaggedCandidates = candidates.filter((character) => getCharacterScopedFlag(character, 'global', '做助教认识的学弟'));
      const eligibleCandidates = candidates.filter((character) => (
        character.grade === 3
        && (String(character.school || '').includes('兰斯特皇家学院') || hasAffiliation(character, '本校学生'))
      ));
      const candidate = pickRandom(flaggedCandidates.length ? flaggedCandidates : eligibleCandidates);
      return uniqueCharacterIds([candidate?.id]);
    }
    if (rule.includes('角色列表里所有和<user>同年级的本校学生')) {
      return uniqueCharacterIds(runtime.characters.filter((character) => hasAffiliation(character, '本校学生') && character.grade === currentYear).map((character) => character.id));
    }
    if (rule === '实习上司') {
      return uniqueCharacterIds(getCharactersWithGlobalFlag(runtime, '实习上司').map((character) => character.id));
    }
    if (rule.includes('实习上司，除了实习上司外的任意一个恋人')) {
      const boss = getCharactersWithGlobalFlag(runtime, '实习上司')[0] || null;
      const lover = pickRandom(runtime.characters.filter((character) => character.isLover && character.id !== boss?.id));
      return uniqueCharacterIds([boss?.id, lover?.id]);
    }
    if (rule.includes('这些角色里有这次的舞伴')) {
      return uniqueCharacterIds(candidates.map((character) => character.id));
    }
    if (rule.includes('辩论队4个人每个年级出一个人')) {
      return resolveDebateTeammateIds(runtime, dateText);
    }
    if (rule.includes('所有辩论队队友')) {
      const teammateIds = resolveDebateTeammateIds(runtime, dateText);
      if (rule.includes('圣赫尔曼军事大学')) {
        return uniqueCharacterIds([...teammateIds, ...runtime.characters.filter((character) => character.school.includes('圣赫尔曼军事大学')).map((character) => character.id)]);
      }
      if (rule.includes('阿卡迪亚大学')) {
        return uniqueCharacterIds([...teammateIds, ...runtime.characters.filter((character) => character.school.includes('阿卡迪亚大学')).map((character) => character.id)]);
      }
      if (rule.includes('维特鲁威理工学院')) {
        return uniqueCharacterIds([...teammateIds, ...runtime.characters.filter((character) => character.school.includes('维特鲁威理工学院')).map((character) => character.id)]);
      }
      if (rule.includes('银橡叶联合学院')) {
        return uniqueCharacterIds([...teammateIds, ...runtime.characters.filter((character) => character.school.includes('银橡叶联合学院')).map((character) => character.id)]);
      }
      return teammateIds;
    }
    if (rule.includes('所有本校学生，本校老师，杰出校友')) {
      return uniqueCharacterIds(getCharactersByAffiliations(runtime, ['本校学生', '本校老师', '杰出校友'], options).map((character) => character.id));
    }
    if (rule.includes('所有本校学生，本校老师')) {
      return uniqueCharacterIds(getCharactersByAffiliations(runtime, ['本校学生', '本校老师'], options).map((character) => character.id));
    }
    if (rule.includes('所有恋人和好感度大于等于') && rule.includes('男性角色')) {
      return uniqueCharacterIds(runtime.characters
        .filter((character) => character.isLover || (character.gender === '男' && character.favorability >= RELATIONSHIP_THRESHOLDS.confession))
        .map((character) => character.id));
    }
    if (rule.includes('所有本校学生')) {
      return uniqueCharacterIds(getCharactersByAffiliations(runtime, ['本校学生'], options).map((character) => character.id));
    }
    return explicitIds.length ? explicitIds : uniqueCharacterIds(candidates.map((character) => character.id));
  }

  function replaceSequentialXxx(text, names = []) {
    let nextIndex = 0;
    return text.replace(/xxx/g, () => {
      const name = names[Math.min(nextIndex, names.length - 1)] || '某人';
      nextIndex += 1;
      return name;
    });
  }

  function buildPromptNamesForEvent(eventName, characters) {
    const names = characters.map((character) => character.name);
    if (eventName === '做家教事件' && characters.length >= 2) {
      return [characters[0].name, characters[0].name, characters[1].name];
    }
    return names;
  }

  function applyCharacterNamePlaceholders(eventName, promptText, characters) {
    const primary = characters[0]?.name || '某人';
    const secondary = characters[1]?.name || primary;
    let text = replaceSequentialXxx(promptText, buildPromptNamesForEvent(eventName, characters));
    text = text
      .replaceAll('和角色互动的剧情', `和${primary}互动的剧情`)
      .replaceAll('和角色的互动剧情', `和${primary}的互动剧情`)
      .replaceAll('遇到了角色的互动剧情', `遇到了${primary}的互动剧情`)
      .replaceAll('偶遇角色，角色发现了<user>', `偶遇${primary}，${primary}发现了<user>`)
      .replaceAll('角色发现了<user>的困窘', `${primary}发现了<user>的困窘`)
      .replaceAll('学生会长找到<user>', `学生会长${primary}找到<user>`)
      .replaceAll('和学生会长的互动剧情', `和学生会长${primary}的互动剧情`)
      .replaceAll('舞伴为<user>', `舞伴${primary}为<user>`)
      .replaceAll('被友人发现', `被友人${primary}发现`)
      .replaceAll('被友人知道', `被友人${primary}知道`)
      .replaceAll('友人将她送去医院', `友人${primary}将她送去医院`)
      .replaceAll('友人为她付了医药费', `${primary}为她付了医药费`)
      .replaceAll('友人在医院照顾她', `${primary}在医院照顾她`)
      .replaceAll('被认识的人发现', `被认识的人${primary}发现`)
      .replaceAll('认识的人将她送去医院', `认识的人${primary}将她送去医院`)
      .replaceAll('偶然被认识的人发现', `偶然被认识的人${primary}发现`)
      .replaceAll('另一个恋人xxx', `另一个恋人${secondary}`)
      .replaceAll('舞伴｛角色名｝', `舞伴${primary}`)
      .replaceAll('｛角色名｝', primary)
      .replaceAll('｛另一个角色名｝', secondary);
    if (eventName === '第一次三人约会事件' || eventName === '三人约会事件') {
      text = replaceSequentialXxx(text, [primary, secondary]);
    }
    return text;
  }

  function resolveEventContext(runtime, eventName, dateText, options = {}) {
    const courseId = options.courseId || null;
    const locationText = options.locationText || '';
    const characterIds = resolveEventCharacterIds(runtime, eventName, dateText, options);
    const extraCharacterIds = (options.extraCharacterIds || []).filter(function (id) { return id && !characterIds.includes(id); });
    const mergedCharacterIds = characterIds.concat(extraCharacterIds);
    const characters = getCharactersFromIds(runtime, mergedCharacterIds);
    return {
      eventName,
      dateText,
      courseId,
      locationText,
      characterIds: mergedCharacterIds,
      characters
    };
  }

  function getEventParticipantIds(runtime, parsed, context) {
    const fullText = [parsed.infoBlock, parsed.content, parsed.newHistory].filter(Boolean).join('\n');
    const mentionedExistingIds = context.characterIds.filter((characterId) => {
      const character = getCharacterById(runtime, characterId);
      return character && fullText.includes(character.name);
    });
    if (mentionedExistingIds.length) {
      return uniqueCharacterIds(mentionedExistingIds);
    }
    return uniqueCharacterIds(context.characterIds.length <= 2 ? context.characterIds : []);
  }

  function applyFavorabilityToCharacters(characters, min, max, sign = 1) {
    for (const character of characters) {
      updateCharacterFavorability(character, sign * randomInt(min, max));
    }
  }

  function applyEventAfterEffects(runtime, eventSpec, parsed, context) {
    const effects = Array.isArray(eventSpec.effects) ? eventSpec.effects : [];
    if (!effects.length) {
      return;
    }
    const participantIds = getEventParticipantIds(runtime, parsed, context);
    const participantCharacters = getCharactersFromIds(runtime, participantIds);
    const newCharacters = parsed.newCharacters || [];
    const contextCharacters = getCharactersFromIds(runtime, context.characterIds);

    const resolveTargets = (targetType) => {
      switch (targetType) {
        case 'participants':
          return participantCharacters;
        case 'new-characters':
          return newCharacters;
        case 'participants-and-new':
          return [...participantCharacters, ...newCharacters];
        case 'first-two-context':
          return contextCharacters.slice(0, 2);
        case 'first-two-new-or-participants':
          return (newCharacters.length ? newCharacters : participantCharacters).slice(0, 2);
        case 'first-lover': {
          const participantLovers = participantCharacters.filter((character) => character.isLover);
          return (participantLovers.length ? participantLovers : contextCharacters.filter((character) => character.isLover)).slice(0, 1);
        }
        case 'first-new':
          return newCharacters.slice(0, 1);
        case 'first-new-or-participant':
          return (newCharacters.length ? newCharacters : participantCharacters).slice(0, 1);
        case 'first-participant':
          return participantCharacters.slice(0, 1);
        default:
          return [];
      }
    };

    for (const effect of effects) {
      if (effect.type === 'favorability') {
        applyFavorabilityToCharacters(resolveTargets(effect.targets), effect.min, effect.max, effect.sign);
      } else if (effect.type === 'unlock-action' && effect.action === 'student-secretary') {
        runtime.flags.studentSecretary.unlocked = true;
      } else if (effect.type === 'set-lover') {
        const target = resolveTargets(effect.targets)[0];
        if (target) {
          target.isLover = true;
        }
      } else if (effect.type === 'set-character-flag') {
        for (const character of resolveTargets(effect.targets)) {
          setCharacterScopedFlag(character, 'global', effect.flag, true);
        }
      } else if (effect.type === 'assign-tutor-roles') {
        const tutorCharacters = resolveTutorCreatedCharacters(newCharacters, context.eventName);
        const tutorStudent = tutorCharacters.student;
        const tutorParent = tutorCharacters.parent?.id !== tutorStudent?.id ? tutorCharacters.parent : null;
        if (tutorStudent) {
          setCharacterScopedFlag(tutorStudent, 'global', '家教学生', true);
        }
        if (tutorParent) {
          setCharacterScopedFlag(tutorParent, 'global', '家教学生的家长', true);
        }
        syncTutorCharacterIds(runtime, [tutorStudent, tutorParent]);
      }
    }
  }

  function getPromptActionLabel(runtime, dateText) {
    const plan = runtime ? getPlanForDate(runtime, dateText) : null;
    if (!plan) {
      return '其他事情';
    }
    return getActionSummary(plan);
  }

  function buildCourseSkipPromptLine(runtime, dateText) {
    const courseId = getCourseAssignment(dateText);
    const plan = runtime ? getPlanForDate(runtime, dateText) : null;
    if (!courseId || plan?.kind === 'course') {
      return '';
    }
    const course = runtime?.courses?.[courseId];
    if (!course) {
      return '';
    }
    return `注意今天本来应该有${course.courseName}课，主角是逃课来做${getPromptActionLabel(runtime, dateText)}的`;
  }

  function buildActivitySkipPromptLine(runtime, dateText) {
    const fixedActivity = getFixedActivity(dateText);
    const plan = runtime ? getPlanForDate(runtime, dateText) : null;
    if (!fixedActivity || plan?.kind === 'date' || !EVENT_ACTIVITY_SKIP_HINTS.has(fixedActivity)) {
      return '';
    }
    const plannedActivity = normalizeActivityLabel(plan?.activity || plan?.label || '');
    if (plannedActivity === fixedActivity) {
      return '';
    }
    return `注意今日本来有${fixedActivity}活动，主角为了省钱没有参加${fixedActivity}活动来做了${getPromptActionLabel(runtime, dateText)}`;
  }

  function buildEventPrompt(runtime, dateText, eventName, options = {}) {
    const eventSpec = getEventSpec(eventName);
    const context = options.context || resolveEventContext(runtime, eventName, dateText, options);
    const eventConfig = {
      characterIds: context.characterIds,
      locationKeys: options.locationKeys || [],
      modeluList: eventSpec.modeluList === '无' ? '' : eventSpec.modeluList,
      userPrompt: String(eventSpec.userPrompt || '')
    };
    const replacements = options.replacements || {};
    for (const [search, value] of Object.entries(replacements)) {
      eventConfig.userPrompt = eventConfig.userPrompt.replaceAll(search, value);
    }
    eventConfig.userPrompt = applyEventPromptDirectives(runtime, eventConfig.userPrompt, context, options);
    const cloth = resolvePromptClothText(runtime, eventSpec);
    const time = getPromptTimeText(dateText);
    eventConfig.userPrompt = eventConfig.userPrompt
      .replaceAll('${cloth}', cloth)
      .replaceAll('（传入今日行程）', getPromptActionLabel(runtime, dateText))
      .replaceAll('${time}', time);
    eventConfig.userPrompt = applyCharacterNamePlaceholders(eventName, eventConfig.userPrompt, context.characters);
    const promptContextLines = [
      buildCourseSkipPromptLine(runtime, dateText),
      buildActivitySkipPromptLine(runtime, dateText)
    ].filter(Boolean);
    if (options.extraPrompt) {
      promptContextLines.push(String(options.extraPrompt).trim());
    }
    if (promptContextLines.length) {
      eventConfig.userPrompt = `${eventConfig.userPrompt}
${promptContextLines.join('\n')}`;
    }
    const characters = formatCharactersForPrompt(runtime, eventConfig.characterIds);
    const locations = formatLocationsForPrompt(runtime, eventConfig.locationKeys);
    const historys = formatHistorysForPrompt(runtime, eventConfig.characterIds);
    const chapters = formatChaptersForPrompt(runtime);
    const modules = buildPromptModules(eventConfig.modeluList);

    const scriptSettingsCharacterBlock = characters
      ? `<Character_Settings>\n            ${characters}\n        </Character_Settings>`
      : '';
    const scriptSettingsLocationBlock = locations
      ? `<Location_Settings>\n            ${locations}\n        </Location_Settings>`
      : '';

    const promptTexts = GAME_PROMPTS.buildEventPromptTexts({
      playerName: runtime.player.name,
      names: formatAllCharacterNamesForPrompt(runtime),
      cloth,
      scriptSettingsCharacterBlock,
      scriptSettingsLocationBlock,
      modules,
      historys,
      chapters,
      time,
      eventUserPrompt: eventConfig.userPrompt,
      modeluList: eventConfig.modeluList,
      userBirthday: runtime.player.birthdayMonth + '月' + runtime.player.birthdayDay + '日',
      userAge: String(runtime.player.age || 18),
      playerPersona: String(state.bootstrap?.playerProfile?.description || '').trim(),
      userGrade: String(getCurrentAcademicYear(runtime.player.currentDate))
    });

    var locationInstruction = promptTexts.scriptSettingsLocationBlock || '';

    return {
      prompt: promptTexts.userPrompt,
      systemInstruction: joinSystemInstructionParts(promptTexts.systemInstructionParts),
      systemInstructionParts: promptTexts.systemInstructionParts,
      builtInStyleInstruction: promptTexts.builtInStyleInstruction,
      scriptSettingsInstruction: promptTexts.scriptSettingsInstruction,
      outputFormatInstruction: promptTexts.outputFormatInstruction,
      gameSystemInstruction: promptTexts.gameSystemInstruction,
      historySystemInstruction: promptTexts.historySystemInstruction,
      writingPointsInstruction: promptTexts.writingPointsInstruction,
      assistantInstruction: promptTexts.assistantInstruction,
      locationInstruction: locationInstruction,
      context
    };
  }

  function openModal(modal) {
    state.ui.modal = modal?.type === 'chapter'
      ? {
          ...modal,
          chapterId: modal.chapterId || modal.chapter?.id || '',
          scrollTop: Number(modal.scrollTop || 0)
        }
      : modal;
    if (state.ui.modal?.type === 'chapter') {
      saveChapterModalState(state.ui.modal);
    }
    render();
  }

  function clearPendingStoryEventForChapter(chapterId) {
    const pending = state.runtime?.meta?.pendingStoryEvent;
    if (!pending || pending.status !== 'ready' || pending.chapterId !== chapterId) {
      return false;
    }
    state.runtime.meta.pendingStoryEvent = null;
    saveCurrentRuntime();
    return true;
  }

  function closeModal() {
    const currentModal = state.ui.modal;
    const resolver = currentModal?.resolver;
    if (currentModal?.type === 'chapter') {
      clearPendingStoryEventForChapter(currentModal.chapterId || currentModal.chapter?.id || '');
    }
    if (currentModal?.returnToModal) {
      state.ui.modal = currentModal.returnToModal;
      if (state.ui.modal?.type === 'chapter') {
        saveChapterModalState(state.ui.modal);
      } else {
        clearChapterModalState();
      }
      render();
      return;
    }
    state.ui.modal = null;
    clearChapterModalState();
    render();
    if (resolver) {
      resolver();
    }
  }

  function openConfirmModal(title, message, onConfirm, confirmLabel = '确定') {
    openModal({
      type: 'confirm',
      title,
      message,
      confirmLabel,
      onConfirm
    });
  }

  function waitForBooleanChoice(title, message, confirmLabel = '是', cancelLabel = '否') {
    return new Promise((resolve) => {
      openModal({
        type: 'choice',
        title,
        message,
        confirmLabel,
        cancelLabel,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  function openErrorRetryModal(title, message, onRetry) {
    openModal({
      type: 'error-retry',
      title,
      message,
      onRetry
    });
  }

  function waitForErrorRetryModal(title, message) {
    return new Promise((resolve) => {
      openModal({
        type: 'error-retry',
        title,
        message,
        onRetry: () => {},
        resolver: resolve
      });
    });
  }

  function formatAiErrorMessage(error) {
    const message = String(error?.message || '请求失败。');
    if (/\b429\b|RESOURCE_EXHAUSTED|Too Many Requests/i.test(message)) {
      return `${message}\n\n说明：上游模型当前触发限流或资源繁忙，请稍后重试。`;
    }
    if (message.includes('Permission denied on resource project')) {
      return `${message}\n\n请检查 Vertex Project ID、服务账号所属项目，以及该账号是否有调用目标模型的权限。`;
    }
    return message;
  }

  function showChapterModal(chapterId) {
    const chapter = state.runtime?.chapters.find((item) => item.id === chapterId);
    if (!chapter) {
      return;
    }
    openModal({
      type: 'chapter',
      chapter
    });
  }

  function openCharacterImagePreview(characterId) {
    const character = state.runtime?.characters.find((item) => item.id === characterId);
    const imageUrl = character?.avatarOriginalUrl || character?.avatarUrl || '';
    if (!character || !imageUrl || imageUrl === PLACEHOLDER_AVATAR) {
      return;
    }
    openModal({
      type: 'image-preview',
      title: '',
      imageUrl,
      imageAlt: character.name
    });
  }

  function openOutfitImagePreview(outfitId) {
    const outfit = state.runtime?.outfits.find((item) => item.id === outfitId);
    const imageUrl = outfit?.imageOriginalUrl || outfit?.imageUrl || '';
    if (!outfit || !imageUrl) {
      return;
    }
    openModal({
      type: 'image-preview',
      title: '礼服原图',
      imageUrl,
      imageAlt: '礼服原图'
    });
  }

  function openActionPickerForDate(dateText) {
    const runtime = state.runtime;
    if (!runtime || state.ui.interactionLocked) {
      return;
    }
    const weekDates = getWeekDates(runtime.player.currentDate);
    if (!weekDates.includes(dateText)) {
      return;
    }
    state.ui.selectedDate = dateText;
    openModal({
      type: 'action-picker',
      title: `${formatMonthDay(dateText)} 可选行程`,
      selectedDate: dateText,
      actions: getAvailableActions(runtime, dateText)
    });
  }

  function waitForChapterModal(chapterId) {
    const chapter = state.runtime?.chapters.find((item) => item.id === chapterId);
    if (!chapter) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      function showChapterConfirm() {
        openModal({
          type: 'confirm',
          title: '',
          message: '发生了事件',
          confirmLabel: '确定',
          hideCancel: true,
          onConfirm: () => {
            openModal({
              type: 'chapter',
              chapter,
              chapterId,
              resolver: resolve
            });
          }
        });
      }
      if (state.ui.page === 'merge-game') {
        state.pendingChapterShow = showChapterConfirm;
      } else {
        showChapterConfirm();
      }
    });
  }

  function waitForTextModal(title, message) {
    return new Promise((resolve) => {
      openModal({
        type: 'text',
        title,
        message,
        resolver: resolve
      });
    });
  }

  async function queueCharacterAvatarGeneration(characterId) {
    const character = state.runtime?.characters.find((item) => item.id === characterId);
    if (!character) {
      return false;
    }

    const imageBridge = getTavernBridge();
    if (typeof imageBridge?.getImageGeneratorStatus === 'function') {
      const imageStatus = await imageBridge.getImageGeneratorStatus();
      if (!imageStatus?.ready) {
        character.avatarStatus = 'failed';
        saveCurrentRuntime();
        render();
        setStatus(`${imageStatus?.message || '生图插件尚未就绪。'} 你可以继续游戏，配置完成后再点“重新生成头像”。`, 'warning');
        return false;
      }
    }

    try {
      validateAiSettings(state.aiSettings);
    } catch (error) {
      character.avatarStatus = 'failed';
      saveCurrentRuntime();
      render();
      return false;
    }

    if (state.timers.avatarJobs.has(characterId)) {
      clearTimeout(state.timers.avatarJobs.get(characterId));
    }

    character.avatarStatus = 'queued';
    saveCurrentRuntime();
    render();

    const timerId = window.setTimeout(() => {
      state.timers.avatarJobs.delete(characterId);
      enqueueAssetGenerationTask(`avatar:${characterId}`, async () => {
        const freshCharacter = state.runtime?.characters.find((item) => item.id === characterId);
        if (!freshCharacter) {
          return;
        }
        freshCharacter.avatarStatus = 'generating';
        saveCurrentRuntime();
        render();

        try {
          const payload = buildAiPayload(buildBackgroundAvatarPrompt(freshCharacter), {
            modelId: 'gemini-3.1-flash-image',
            options: {
              systemInstruction: '',
              temperature: 1,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: null,
              candidateCount: 1,
              stopSequences: '',
              responseMimeType: '',
              thinkingLevel: '',
              responseModalities: 'IMAGE',
              aspectRatio: '1:1',
              mediaResolution: 'LOW'
            }
          });
          const result = await executeAiRequest('角色头像生成', 'api/generate', payload, { blocking: false });
          const image = result.output?.imageParts?.[0];
          if (image?.data) {
            const originalDataUrl = imagePartToDataUrl(image);
            let displayDataUrl = originalDataUrl;
            try {
              displayDataUrl = await resizeImageToAvatarDataUrl(image);
            } catch (error) {
              // 缩略图失败时仍保存并显示原图。
            }
            const uploadStamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const originalUrl = await uploadGeneratedImageDataUrl(originalDataUrl, `avatar-${uploadStamp}-original`);
            const displayUrl = displayDataUrl === originalDataUrl
              ? originalUrl
              : await uploadGeneratedImageDataUrl(displayDataUrl, `avatar-${uploadStamp}-display`);
            freshCharacter.avatarOriginalUrl = originalUrl;
            freshCharacter.avatarUrl = displayUrl;
            freshCharacter.avatarStatus = 'ready';
          } else {
            freshCharacter.avatarStatus = 'failed';
          }
        } catch (error) {
          freshCharacter.avatarStatus = 'failed';
        }
        saveCurrentRuntime();
        render();
      });
    }, 100);

    state.timers.avatarJobs.set(characterId, timerId);
    return true;
  }

  async function queueOutfitImageGeneration(outfitId) {
    const outfit = state.runtime?.outfits.find((item) => item.id === outfitId);
    if (!outfit) {
      return;
    }

    try {
      validateAiSettings(state.aiSettings);
    } catch (error) {
      outfit.imageStatus = 'failed';
      saveCurrentRuntime();
      render();
      return;
    }

    if (state.timers.outfitJobs.has(outfitId)) {
      clearTimeout(state.timers.outfitJobs.get(outfitId));
    }

    outfit.imageStatus = 'queued';
    saveCurrentRuntime();
    render();

    const timerId = window.setTimeout(() => {
      state.timers.outfitJobs.delete(outfitId);
      enqueueAssetGenerationTask(`outfit:${outfitId}`, async () => {
        const freshOutfit = state.runtime?.outfits.find((item) => item.id === outfitId);
        if (!freshOutfit) {
          return;
        }
        freshOutfit.imageStatus = 'generating';
        saveCurrentRuntime();
        render();

        try {
          const payload = buildAiPayload(buildOutfitImagePrompt(freshOutfit.description), {
            modelId: 'gemini-3.1-flash-image',
            options: {
              systemInstruction: '',
              temperature: 1,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: null,
              candidateCount: 1,
              stopSequences: '',
              responseMimeType: '',
              thinkingLevel: '',
              responseModalities: 'IMAGE',
              aspectRatio: '1:1',
              mediaResolution: 'LOW'
            }
          });
          const result = await executeAiRequest('礼服图片生成', 'api/generate', payload, { blocking: false });
          const image = result.output?.imageParts?.[0];
          if (image?.data) {
            const originalDataUrl = imagePartToDataUrl(image);
            let displayDataUrl = originalDataUrl;
            try {
              displayDataUrl = await resizeImageToOutfitDataUrl(image);
            } catch (error) {
              // 缩略图失败时仍保存并显示原图。
            }
            const uploadStamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const originalUrl = await uploadGeneratedImageDataUrl(originalDataUrl, `outfit-${uploadStamp}-original`);
            const displayUrl = displayDataUrl === originalDataUrl
              ? originalUrl
              : await uploadGeneratedImageDataUrl(displayDataUrl, `outfit-${uploadStamp}-display`);
            freshOutfit.imageOriginalUrl = originalUrl;
            freshOutfit.imageUrl = displayUrl;
            freshOutfit.imageStatus = 'ready';
          } else {
            freshOutfit.imageStatus = 'failed';
          }
        } catch (error) {
          freshOutfit.imageStatus = 'failed';
        }
        saveCurrentRuntime();
        render();
      });
    }, 100);

    state.timers.outfitJobs.set(outfitId, timerId);
  }

  async function applyEventResult(runtime, dateText, parsed, eventSpec, context, rawResponse, promptText, options = {}) {
    if (parsed.newLocation) {
      runtime.locations.push(parsed.newLocation);
    }
    const createdOutfitIds = [];
    for (const clothText of parsed.newCloths || []) {
      const outfit = patchOutfitDefaults({
        id: `outfit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        description: clothText,
        obtainedAt: dateText
      });
      runtime.outfits.push(outfit);
      createdOutfitIds.push(outfit.id);
    }
    parsed.newCharacters = normalizeGeneratedCharactersForEvent(
      context.eventName,
      parsed.newCharacters || [],
      { courseName: options.courseName }
    );
    for (const character of parsed.newCharacters) {
      runtime.characters.push(character);
      if (character.identity.includes('家教学生的家长')) {
        runtime.flags.tutor.parentCharacterId = character.id;
      }
      if (character.identity.includes('家教学生')) {
        runtime.flags.tutor.studentCharacterId = character.id;
      }
    }
    applyEventAfterEffects(runtime, eventSpec, parsed, context);
    syncTutorCharacterIds(runtime, parsed.newCharacters || []);

    const historyIndex = addHistory(runtime, dateText, parsed.newHistory);
    const chapterId = addChapter(runtime, dateText, parsed.infoBlock, parsed.content, historyIndex);
    runtime.meta.pendingStoryEvent = {
      ...(runtime.meta.pendingStoryEvent || {}),
      eventName: context.eventName,
      dateText,
      status: 'ready',
      error: '',
      chapterId,
      updatedAt: nowIso()
    };
    saveCurrentRuntime();
    await flushChatStorage();
    saveChapterDebug(chapterId, rawResponse, promptText);
    if (options.deferChapterModal && Array.isArray(options.deferredChapterIds)) {
      options.deferredChapterIds.push(chapterId);
    }

    for (const character of parsed.newCharacters || []) {
      queueCharacterAvatarGeneration(character.id);
    }
    for (const outfitId of createdOutfitIds) {
      queueOutfitImageGeneration(outfitId);
    }
    if (!options.deferChapterModal) {
      await waitForChapterModal(chapterId);
    }
    return chapterId;
  }

  function generateRetryMarker() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 14; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function cloneStoryEventRecoveryOptions(options = {}) {
    const recoveryOptions = {};
    for (const [key, value] of Object.entries(options)) {
      if (key === 'deferredChapterIds' || key === 'context' || typeof value === 'function' || value === undefined) {
        continue;
      }
      try {
        recoveryOptions[key] = JSON.parse(JSON.stringify(value));
      } catch (error) {
        // 只持久化可序列化的事件参数；界面回调和临时数组由恢复流程重建。
      }
    }
    recoveryOptions.deferChapterModal = false;
    return recoveryOptions;
  }

  async function persistPendingStoryEvent(eventName, dateText, options, status, extra = {}) {
    if (!state.runtime) {
      return;
    }
    state.runtime.meta.pendingStoryEvent = {
      eventName,
      dateText,
      options: cloneStoryEventRecoveryOptions(options),
      status,
      error: '',
      chapterId: '',
      updatedAt: nowIso(),
      ...extra
    };
    saveCurrentRuntime();
    await flushChatStorage();
  }

  function restorePendingStoryEventUi() {
    const pending = state.runtime?.meta?.pendingStoryEvent;
    if (!pending || !pending.eventName || !pending.dateText) {
      return false;
    }

    if (pending.status === 'ready') {
      const chapter = state.runtime.chapters.find((item) => item.id === pending.chapterId);
      if (chapter) {
        state.ui.page = 'schedule';
        state.ui.modal = {
          type: 'chapter',
          chapter,
          chapterId: chapter.id,
          scrollTop: 0
        };
        saveChapterModalState(state.ui.modal);
        return true;
      }
    }

    const interruptedMessage = pending.status === 'failed' && pending.error
      ? pending.error
      : '页面刷新中断了本次剧情生成状态，请重试。已触发的事件和当时的游戏进度仍然保留。';
    pending.status = 'failed';
    pending.error = interruptedMessage;
    pending.updatedAt = nowIso();
    saveCurrentRuntime();
    state.ui.page = 'schedule';
    state.ui.modal = {
      type: 'error-retry',
      title: '剧情生成失败',
      message: interruptedMessage,
      onRetry: async () => {
        await executeStoryEvent(pending.eventName, pending.dateText, {
          ...(pending.options || {}),
          deferChapterModal: false
        });
      }
    };
    return true;
  }

  async function executeStoryEvent(eventName, dateText, options = {}) {
    await ensureSpecs();
    let retryCount = 0;
    while (true) {
      try {
        await persistPendingStoryEvent(eventName, dateText, options, 'generating');
        const deferredChapterIds = Array.isArray(options.deferredChapterIds)
          ? options.deferredChapterIds
          : (Array.isArray(state.ui.deferredChapterIds) ? state.ui.deferredChapterIds : null);
        const context = resolveEventContext(state.runtime, eventName, dateText, options);
        const eventPrompt = buildEventPrompt(state.runtime, dateText, eventName, {
          ...options,
          context,
          characterIds: context.characterIds
        });
        const retryMarker = retryCount > 0 ? generateRetryMarker() : '';
        if (retryMarker) {
          eventPrompt.systemInstruction = retryMarker + '\n' + eventPrompt.systemInstruction;
        }
        const textPresetMode = state.runtime?.meta?.textPresetMode === 'builtin' ? 'builtin' : 'tavern';
        const payload = buildAiPayload(eventPrompt.prompt, {
          options: {
            textPresetMode,
            retryMarker,
            systemInstruction: eventPrompt.systemInstruction,
            systemInstructionParts: eventPrompt.systemInstructionParts,
            builtInStyleInstruction: eventPrompt.builtInStyleInstruction,
            scriptSettingsInstruction: eventPrompt.scriptSettingsInstruction,
            outputFormatInstruction: eventPrompt.outputFormatInstruction,
            gameSystemInstruction: eventPrompt.gameSystemInstruction,
            historySystemInstruction: eventPrompt.historySystemInstruction,
            writingPointsInstruction: eventPrompt.writingPointsInstruction,
            assistantInstruction: eventPrompt.assistantInstruction,
            locationInstruction: eventPrompt.locationInstruction
          }
        });
        const fullPromptJson = buildLoggedPrompt(payload);
        state.ui.currentAiEvent = eventName;
        const result = await executeAiRequest(eventName, 'api/generate', payload, {
          message: IS_TEST_BUILD ? `正在编写剧情：${eventName}` : '正在编写剧情，请稍候…'
        });
        const text = (result.output?.textParts || []).join('\n').trim();
        let parsed;
        try {
          parsed = parseEventOutput(text);
        } catch (error) {
          if (textPresetMode === 'tavern' && /缺少必要标签/.test(String(error?.message || ''))) {
            throw new Error(`${error.message}\n\n当前正在使用酒馆预设。该预设可能要求纯正文或禁止结构化标签；可以重试，或在“系统”页切换为“游戏内置预设”。`);
          }
          throw error;
        }
        if (textPresetMode === 'tavern') {
          parsed.content = await applyTavernDisplayRegex(parsed.content);
        }
        const eventSpec = getEventSpec(eventName);
        const requiredNewCharacterCount = Number(eventSpec.requiredNewCharacterCount || 0);
        if ((parsed.newCharacters || []).length < requiredNewCharacterCount) {
          throw new Error(`AI 返回的新角色数量不足：${eventName}需要 ${requiredNewCharacterCount} 名新角色，请重试。`);
        }
        markEventTriggered(state.runtime, eventName);
        return applyEventResult(state.runtime, dateText, parsed, eventSpec, context, text, fullPromptJson, {
          ...options,
          deferChapterModal: options.deferChapterModal ?? Boolean(deferredChapterIds),
          deferredChapterIds
        });
      } catch (error) {
        retryCount++;
        const errorMessage = formatAiErrorMessage(error);
        await persistPendingStoryEvent(eventName, dateText, options, 'failed', { error: errorMessage });
        await waitForErrorRetryModal('剧情生成失败', errorMessage);
      }
    }
  }

  async function runFirstOpeningCeremony() {
    setStatus('正在编写剧情，请稍候…', 'warning');
    try {
      const chapterId = await executeStoryEvent('第一次开学典礼事件', START_DATE, {
        deferChapterModal: true
      });
      setPlanForDate(state.runtime, START_DATE, {
        kind: 'activity',
        label: '开学典礼',
        specKey: '开学典礼',
        fixed: true,
        completed: true,
        activity: '开学典礼'
      });
      state.runtime.flags.firstOpeningCeremonyTriggered = true;
      state.runtime.phase = 'playing';
      state.runtime.player.currentDate = FIRST_PLAYABLE_DATE;
      // Don't switch away from merge game if player is currently playing it
      if (state.ui.page !== 'merge-game') {
        state.ui.page = 'schedule';
      }
      state.ui.selectedDate = FIRST_PLAYABLE_DATE;
      ensureAssignmentsForDate(state.runtime, FIRST_PLAYABLE_DATE);
      saveCurrentRuntime();
      saveAutoSlot();
      await flushChatStorage();
      setStatus('开学典礼已写入履历，你的毕业学年正式开始。', 'success');
      render();
      await waitForChapterModal(chapterId);
    } catch (error) {
      if (/AI Studio API Key|Vertex 服务账号 JSON|Vertex Project ID|AI 连接尚未配置/.test(String(error.message || ''))) {
        openErrorRetryModal('剧情生成失败', '文字生成连接尚未配置，请检查酒馆当前连接或切换文字生成预设后再重试。', runFirstOpeningCeremony);
        setStatus('文字生成连接尚未配置。', 'error');
        return;
      }
      openErrorRetryModal('剧情生成失败', formatAiErrorMessage(error), runFirstOpeningCeremony);
      setStatus(error.message || '剧情生成失败。', 'error');
    }
  }

  function setCurrentPage(page) {
    state.ui.page = page;
    if (page === 'schedule') {
      const weekDates = getWeekDates(state.runtime?.player.currentDate || START_DATE);
      state.ui.selectedDate = weekDates.find((dateText) => !isDateCompleted(state.runtime, dateText)) || weekDates[0];
    }
    render();
    scrollViewportToTop();
  }

  function getCurrentWeekHistories(runtime) {
    const weekStart = runtime.flags?.historyPanelWeekStart || getWeekStart(runtime.player.currentDate);
    const dates = new Set(getWeekDates(weekStart));
    return runtime.history.filter((item) => dates.has(item.date)).slice().reverse();
  }

  function getAllHistoryMonths(runtime) {
    return Array.from(new Set(runtime.history.map((item) => getMonthKey(item.date)))).sort();
  }

  function openAllHistoryModal() {
    if (!state.runtime.history.length) {
      openModal({
        type: 'text',
        title: '全部履历',
        message: '目前还没有履历。'
      });
      return;
    }

    const months = getAllHistoryMonths(state.runtime);
    const defaultMonth = getMonthKey(state.runtime.player.currentDate);
    openModal({
      type: 'all-history',
      title: '全部履历',
      month: months.includes(defaultMonth) ? defaultMonth : months[months.length - 1]
    });
  }

  function openScoreModal() {
    openModal({
      type: 'scores',
      title: '成绩'
    });
  }

  function openOutfitModal() {
    openModal({
      type: 'outfits',
      title: '礼服'
    });
  }

  function openInternshipOffersModal() {
    openModal({
      type: 'internship-offers',
      title: '实习机会',
      offers: state.runtime?.flags?.internships?.acceptedOffers?.slice() || []
    });
  }

  function summarizeSave(runtime) {
    if (!runtime) {
      return '空存档';
    }
    return `${runtime.player.name || '未命名'} · ${getTimelineLabel(runtime.player.currentDate)}`;
  }

  function renderSaveCards() {
    const auto = loadJson(makeScopedKey('save.auto'));
    const slots = [1, 2, 3].map((slot) => ({
      slot,
      saved: loadManualSlot(slot)
    }));

    return `
      <div class="slot-list">
        <div class="slot-card">
          <strong>自动存档</strong>
          <div class="subtle">${summarizeSave(auto?.runtime)}</div>
          <div class="right-note">${auto?.savedAt ? `保存于 ${auto.savedAt.replace('T', ' ').slice(0, 16)}` : '暂无自动存档'}</div>
          ${state.ui.saveMode === 'load' ? '<button class="secondary" data-action="load-auto-save">读取自动存档</button>' : '<button class="secondary" disabled>自动存档不能手动覆盖</button>'}
        </div>
        ${slots.map(({ slot, saved }) => `
          <div class="slot-card">
            <strong>存档位 ${slot}</strong>
            <div class="subtle">${summarizeSave(saved?.runtime)}</div>
            <div class="right-note">${saved?.savedAt ? `保存于 ${saved.savedAt.replace('T', ' ').slice(0, 16)}` : '暂无内容'}</div>
            <button class="${state.ui.saveMode === 'save' ? 'primary' : 'secondary'}" data-action="${state.ui.saveMode === 'save' ? 'save-slot' : 'load-slot'}" data-slot="${slot}">
              ${state.ui.saveMode === 'save' ? '保存到这里' : '从这里读档'}
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  function getInviteDisabledReason(runtime, character) {
    const weekInvite = getWeekInviteState(runtime, getWeekStart(runtime.player.currentDate));
    if (weekInvite.globalLocked) {
      return '本周已经安排过约会。';
    }
    if (weekInvite.attemptedCharacterIds.includes(character.id)) {
      return '本周已经尝试邀约过这个角色。';
    }
    return '';
  }

  function buildInviteDateOptions(runtime, character) {
    const dates = [];
    const start = runtime.player.currentDate;
    for (let offset = 0; offset < 28; offset += 1) {
      const dateText = addDays(start, offset);
      const existingPlan = getPlanForDate(runtime, dateText);
      const fixed = existingPlan?.fixed;
      const plannedActivity = normalizeActivityLabel(existingPlan?.activity || existingPlan?.label || '');
      const isClassTrip = plannedActivity === '班级度假' || getFixedActivity(dateText) === '班级度假';
      dates.push({
        date: dateText,
        label: formatMonthDay(dateText),
        weekday: formatWeekday(dateText),
        preview: existingPlan?.label || getAvailableActions(runtime, dateText)[0]?.label || '无可选行程',
        disabled: Boolean(existingPlan?.completed || fixed || isClassTrip),
        playerBirthday: runtime.player.birthdayMonth === parseDate(dateText).getUTCMonth() + 1 && runtime.player.birthdayDay === parseDate(dateText).getUTCDate(),
        characterBirthday: character.birthMonth === parseDate(dateText).getUTCMonth() + 1 && character.birthDay === parseDate(dateText).getUTCDate()
      });
    }
    return dates;
  }

  function openDatePicker(characterId, inviteOrigin = 'player') {
    const character = state.runtime.characters.find((item) => item.id === characterId);
    if (!character) {
      return;
    }

    openModal({
      type: 'date-picker',
      title: `选择和 ${character.name} 的约会日期`,
      characterId,
      dates: buildInviteDateOptions(state.runtime, character),
      inviteOrigin
    });
  }

  function handleInvite(characterId) {
    const character = state.runtime.characters.find((item) => item.id === characterId);
    if (!character) {
      return;
    }

    openConfirmModal('是否提出邀约？约会当天会有500元的额外支出', `对象：${character.name}`, () => {
      closeModal();
      openDatePicker(characterId);
    }, '去选日期');
  }

  function completeInvite(characterId, dateText, inviteOrigin = 'player') {
    const character = state.runtime.characters.find((item) => item.id === characterId);
    if (!character) {
      return;
    }

    const weekInvite = getWeekInviteState(state.runtime, getWeekStart(state.runtime.player.currentDate));
    if (inviteOrigin === 'player') {
      const successRate = Math.min(100, Math.max(0, Number(character.favorability || 0) + 10));
      const success = Math.random() * 100 < successRate;
      weekInvite.attemptedCharacterIds.push(character.id);

      if (!success) {
        addHistory(state.runtime, state.runtime.player.currentDate, `${formatHistoryDatePrefix(state.runtime.player.currentDate)}，${character.name}婉拒了你的约会邀请。`);
        saveCurrentRuntime();
        render();
        openModal({
          type: 'text',
          title: '邀约失败',
          message: `${character.name}这次没有答应，下礼拜再试试吧。`
        });
        return;
      }
    }

    weekInvite.globalLocked = true;
    setPlanForDate(state.runtime, dateText, {
      kind: 'date',
      characterId: character.id,
      label: `与${character.name}约会`,
      inviteOrigin,
      fixed: true,
      completed: false
    });
    addHistory(
      state.runtime,
      dateText,
      inviteOrigin === 'player'
        ? `${formatHistoryDatePrefix(dateText)}，${state.runtime.player.name}和${character.name}约好了约会。`
        : `${formatHistoryDatePrefix(state.runtime.player.currentDate)}，${state.runtime.player.name}答应了${character.name}的邀约，并约好在${formatMonthDay(dateText)}见面。`
    );
    saveCurrentRuntime();
    render();
    openModal({
      type: 'text',
      title: inviteOrigin === 'player' ? '邀约成功' : '已接受邀约',
      message: inviteOrigin === 'player'
        ? `${character.name}答应了邀约，这一天已经被锁定为“约会”。`
        : `${formatMonthDay(dateText)} 已锁定为与${character.name}的约会。`
    });
  }

  function getActionSummary(action) {
    if (!action) {
      return '未安排';
    }
    return action.label;
  }

  function chance(probability) {
    return Math.random() < probability;
  }

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function pickRandom(list) {
    return list.length ? list[Math.floor(Math.random() * list.length)] : null;
  }

  function getCharactersByRelation(runtime, predicate) {
    return runtime.characters.filter(predicate);
  }

  function getCharactersForCourse(runtime, courseId, identityText, courseNameOverride = '') {
    const courseName = String(courseNameOverride || runtime.courses[courseId]?.courseName || '').trim();
    return findCharactersForCourse(runtime.characters, courseName, identityText);
  }

  function ensureCharacterEventFlags(character) {
    if (!character.eventFlags || typeof character.eventFlags !== 'object') {
      character.eventFlags = {};
    }
    return character.eventFlags;
  }

  function getCharacterScopedFlag(character, scope, key) {
    const flags = ensureCharacterEventFlags(character);
    const bucket = flags[scope];
    if (!bucket || typeof bucket !== 'object') {
      return undefined;
    }
    return bucket[key];
  }

  function setCharacterScopedFlag(character, scope, key, value = true) {
    const flags = ensureCharacterEventFlags(character);
    if (!flags[scope] || typeof flags[scope] !== 'object') {
      flags[scope] = {};
    }
    flags[scope][key] = value;
  }

  function getCharacterBusinessLocation(character, fallbackName) {
    if (!character) {
      return fallbackName || '实习单位';
    }
    return String(character.familyBusiness || '').trim() || `${character.name}家的企业`;
  }

  function getSkippedCourseId(runtime, dateText, options = {}) {
    const courseId = getCourseAssignment(dateText);
    const plan = options.plan || getPlanForDate(runtime, dateText);
    if (!courseId || plan?.kind === 'course') {
      return null;
    }
    return courseId;
  }

  function addActionHistory(runtime, dateText, actionText, options = {}) {
    const skippedCourseId = getSkippedCourseId(runtime, dateText, options);
    const skippedCourse = skippedCourseId ? runtime.courses[skippedCourseId] : null;
    const prefix = skippedCourse
      ? `逃了${skippedCourse.courseName}课，`
      : '';
    addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}${prefix}${actionText}`);
  }

  function getAssistantRoleForTerm(runtime, termId) {
    if (!runtime.player.assistantRole || runtime.player.assistantRole.termId !== termId) {
      return null;
    }
    return runtime.player.assistantRole;
  }

  function getHighestFavorabilityCharacter(characters) {
    return characters
      .slice()
      .sort((left, right) => (right.favorability || 0) - (left.favorability || 0))[0] || null;
  }

  function isFirstMonthOfTerm(dateText) {
    const term = getTermMeta(dateText);
    return Boolean(term && !term.isBreak && dateText.slice(5, 7) === term.start.slice(5, 7));
  }

  function getInternshipOfferKey(type, termId, sourceKey) {
    return `${termId}:${type}:${sourceKey}`;
  }

  function getInternshipOfferState(runtime, type, termId, sourceKey) {
    return runtime.flags.internships.offers[getInternshipOfferKey(type, termId, sourceKey)] || null;
  }

  function setInternshipOfferState(runtime, type, termId, sourceKey, value) {
    runtime.flags.internships.offers[getInternshipOfferKey(type, termId, sourceKey)] = value;
  }

  function addAcceptedInternshipOffer(runtime, dateText, config) {
    const sourceKey = String(config.sourceKey || 'unknown');
    const inviterCharacterId = String(config.inviterCharacterId || '');
    const existing = runtime.flags.internships.acceptedOffers.find((offer) => (
      offer.sourceKey === sourceKey
      || (inviterCharacterId && offer.inviterCharacterId === inviterCharacterId)
    ));
    if (existing) {
      return existing;
    }
    const inviter = inviterCharacterId ? getCharacterById(runtime, inviterCharacterId) : null;
    const locationText = String(config.locationText || '').trim() || '实习单位';
    const inviterLabel = String(config.inviterLabel || inviter?.name || locationText).trim() || '实习单位';
    const offer = {
      id: getInternshipOfferKey('graduation', UPPER_TERM_ID, sourceKey),
      sourceKey,
      label: String(config.label || `${inviterLabel}发出的实习邀请`),
      locationText,
      inviterCharacterId,
      professorCourseId: String(config.professorCourseId || ''),
      professorCourseName: String(config.professorCourseName || ''),
      acceptedAt: dateText
    };
    runtime.flags.internships.acceptedOffers.push(offer);
    return offer;
  }

  async function maybeAddInternshipOffer(runtime, dateText, config) {
    const term = getTermMeta(dateText);
    if (!term) {
      return false;
    }
    const internshipType = 'graduation';
    const sourceKey = config.sourceKey || internshipType;
    if (getInternshipOfferState(runtime, internshipType, term.id, sourceKey)) {
      return false;
    }
    if (!canReceiveGraduationInternshipOffer({ termId: term.id })) {
      return false;
    }
    if (config.referrerCharacterId && runtime.flags.internships.acceptedOffers.some((offer) => offer.inviterCharacterId === config.referrerCharacterId)) {
      return false;
    }
    if (config.probability !== undefined && !chance(config.probability)) {
      return false;
    }

    const locationText = String(config.locationText || '').trim() || '实习单位';
    const referrerId = String(config.referrerCharacterId || '').trim();
    addAcceptedInternshipOffer(runtime, dateText, {
      sourceKey,
      locationText,
      inviterCharacterId: referrerId,
      inviterLabel: config.inviterLabel,
      label: config.offerLabel
    });
    addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}获得了前往${locationText}毕业实习的邀请，将在下学期开学时决定最终去向。`);
    setInternshipOfferState(runtime, internshipType, term.id, sourceKey, 'accepted');
    if (config.message) {
      await waitForTextModal(config.title || '实习邀请', config.message);
    }
    return true;
  }

  async function maybePromptSeminarInternships(runtime, dateText) {
    const term = getTermMeta(dateText);
    const sourceKey = 'company-briefing-graduation';
    if (!term
      || !canReceiveGraduationInternshipOffer({ termId: term.id })
      || getInternshipOfferState(runtime, 'graduation', term.id, sourceKey)) {
      return;
    }
    const knownCharacterIds = new Set(runtime.characters.map((character) => character.id));
    await executeStoryEvent('企业宣讲会实习邀请事件', dateText, {
      characterIds: runtime.characters.map((character) => character.id)
    });
    const inviter = runtime.characters.find((character) => !knownCharacterIds.has(character.id));
    if (!inviter) {
      return;
    }
    const locationText = getCharacterBusinessLocation(inviter, `${inviter.name}家的企业`);
    addAcceptedInternshipOffer(runtime, dateText, {
      sourceKey,
      locationText,
      inviterCharacterId: inviter.id,
      inviterLabel: inviter.name
    });
    setInternshipOfferState(runtime, 'graduation', term.id, sourceKey, 'accepted');
    addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${inviter.name}向${runtime.player.name}提出毕业实习可以去他家的企业进行实习。`);
  }

  function rewardTutorStudentFavorability(runtime) {
    const student = runtime.characters.find((item) => item.id === runtime.flags.tutor.studentCharacterId)
      || runtime.characters.find((item) => getCharacterScopedFlag(item, 'global', '家教学生'));
    if (!student) {
      return 0;
    }
    return updateCharacterFavorability(student, randomInt(1, 3));
  }

  async function maybePromptCharacterInternship(runtime, dateText, character, options = {}) {
    if (!character || (options.minimumFavorability && character.favorability < options.minimumFavorability)) {
      return;
    }
    const businessLocation = getCharacterBusinessLocation(character, options.fallbackLocation);
    await maybeAddInternshipOffer(runtime, dateText, {
      sourceKey: `${options.sourcePrefix || 'character'}:${character.id}:graduation`,
      title: '实习邀约',
      message: `${character.name}向你提出你的毕业实习可以去他家的企业进行实习。`,
      locationText: businessLocation,
      referrerCharacterId: character.id,
      probability: options.graduationProbability
    });
  }

  function getPreviousTermId(termId) {
    const index = TERM_DEFINITIONS.findIndex((item) => item.id === termId);
    return index > 0 ? TERM_DEFINITIONS[index - 1].id : null;
  }

  function countAllRegularAPlusCourses(runtime) {
    return Object.entries(runtime.courses)
      .filter(([courseId, course]) => !SPECIAL_COURSE_IDS.has(courseId) && course?.finalGrade === 'A+')
      .length;
  }

  function getGraduationCourseEvaluation(runtime, courseId) {
    const course = runtime.courses[courseId];
    if (!course) {
      return '0.00';
    }
    const regularCourseCount = Math.max(1, Object.keys(runtime.courses).filter((id) => !SPECIAL_COURSE_IDS.has(id)).length);
    const score = (clamp(Number(course.studyProgress || 0), 0, 100) / 100) * (1 + countAllRegularAPlusCourses(runtime) / regularCourseCount);
    return score.toFixed(2);
  }

  function getGraduationStatus(runtime) {
    const regularCourses = Object.entries(runtime.courses)
      .filter(([courseId]) => !SPECIAL_COURSE_IDS.has(courseId))
      .map(([, course]) => course);
    const specialCourses = SPECIAL_COURSES.map((course) => runtime.courses[course.id]).filter(Boolean);
    return evaluateGraduation({
      regularGrades: regularCourses.map((course) => course.finalGrade),
      specialProgress: specialCourses.map((course) => course.studyProgress),
      businessScore: runtime.player.bizProgress
    });
  }

  async function maybeAddProfessorInternshipOffer(runtime, dateText) {
    const upperTermCourseIds = getTermCourseIds(UPPER_TERM_ID);
    const aPlusCourseId = selectRandomAPlusCourseId(runtime.courses, upperTermCourseIds);
    if (!aPlusCourseId) {
      return false;
    }

    const sourceKey = `a-plus-professor:${aPlusCourseId}`;
    if (runtime.flags.internships.acceptedOffers.some((offer) => offer.sourceKey === sourceKey)) {
      return false;
    }
    const course = runtime.courses[aPlusCourseId];
    const professor = pickRandom(getCharactersForCourse(runtime, aPlusCourseId, '教授'));
    const professorLabel = professor?.name
      ? `${course.courseName}课教授${professor.name}`
      : `${course.courseName}课教授`;
    addAcceptedInternshipOffer(runtime, dateText, {
      sourceKey,
      locationText: professor ? getCharacterBusinessLocation(professor, `${professor.name}家的企业`) : `${course.courseName}课教授家的企业`,
      inviterCharacterId: professor?.id || '',
      inviterLabel: professorLabel,
      label: `${professorLabel}发出的实习邀请`,
      professorCourseId: aPlusCourseId,
      professorCourseName: course.courseName
    });
    setInternshipOfferState(runtime, 'graduation', UPPER_TERM_ID, sourceKey, 'accepted');
    const message = `${professorLabel}邀请你毕业实习去他家的企业进行实习。`;
    addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${message}`);
    await waitForTextModal('实习邀请', message);
    return true;
  }

  function waitForInternshipSelection(runtime) {
    return new Promise((resolve) => {
      openModal({
        type: 'internship-picker',
        title: '选择毕业实习',
        offers: runtime.flags.internships.acceptedOffers.slice(),
        resolver: resolve
      });
    });
  }

  async function maybeSelectGraduationInternship(runtime, dateText) {
    const graduationTerm = getTermMetaByFullId(GRADUATION_TERM_ID);
    if (!graduationTerm || dateText !== graduationTerm.start || runtime.flags.internships.selectionResolved) {
      return false;
    }
    const selectionId = await waitForInternshipSelection(runtime);
    const selection = resolveInternshipSelection(runtime.flags.internships.acceptedOffers, selectionId);
    if (!selection) {
      throw new Error('选择的实习邀请不存在。');
    }

    clearCharacterGlobalFlag(runtime, '实习上司');
    runtime.player.graduationInternship = selection.locationText;
    runtime.player.graduationInternshipBossId = selection.inviterCharacterId;
    runtime.player.graduationInternshipOfferId = selection.offerId;
    runtime.flags.internships.selectionResolved = true;
    const inviter = selection.inviterCharacterId ? getCharacterById(runtime, selection.inviterCharacterId) : null;
    if (inviter) {
      setCharacterScopedFlag(inviter, 'global', '实习上司', true);
    }
    const selectedOffer = runtime.flags.internships.acceptedOffers.find((offer) => offer.id === selection.offerId);
    const choiceText = selection.offerId === 'school'
      ? '学校分配的实习'
      : (selectedOffer?.label || '已接受的实习邀请');
    addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}选择了${choiceText}，毕业实习地点为${selection.locationText}。`);
    return true;
  }

  async function handleFormalClothingEvent(runtime, dateText, eventTitle) {
    const wantsNewOutfit = runtime.player.money >= 1000
      ? await waitForBooleanChoice(eventTitle, `是否花 1000 元购买新的礼服参加${eventTitle.replace('事件', '')}？`, '购买新礼服', '穿旧礼服')
      : false;
    if (wantsNewOutfit) {
      updatePlayerMoney(runtime, -1000);
      const eventMap = {
        '校庆晚宴': '穿新礼服参加校庆晚宴事件',
        '慈善拍卖会': '穿新礼服参加慈善拍卖会事件',
        '新年舞会': '穿新礼服参加新年舞会事件',
        '仲夏夜假面舞会': '穿新礼服参加假面舞会事件'
      };
      await executeStoryEvent(eventMap[eventTitle], dateText);
      return true;
    }
    if (!runtime.outfits.length) {
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}前往${eventTitle}，未穿礼服被挡在了门外。`);
      return true;
    }
    const eventMap = {
      '校庆晚宴': '穿旧礼服参加校庆晚宴事件',
      '慈善拍卖会': '穿旧礼服参加慈善拍卖会事件',
      '新年舞会': '穿旧礼服参加新年舞会事件',
      '仲夏夜假面舞会': '穿旧礼服参加假面舞会事件'
    };
    await executeStoryEvent(eventMap[eventTitle], dateText);
    return true;
  }

  function applyDailyCost(runtime, dateText) {
    updatePlayerMoney(runtime, -DAILY_COST);
    if (runtime.player.money < 10) {
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}支付了今日生活费后手头越发拮据。`);
    }
  }

  async function executeActivity(runtime, plan, dateText) {
    const label = plan.activity || plan.label;
    switch (label) {
      case '开学典礼':
        addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}作为毕业年级转学生参加了开学典礼。`);
        break;
      case '企业宣讲会':
        updatePlayerFatigue(runtime, 5);
        addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}参加了企业宣讲会。`);
        await maybePromptSeminarInternships(runtime, dateText);
        break;
      case '校庆晚宴':
      case '慈善拍卖会':
        updatePlayerFatigue(runtime, 8);
        await handleFormalClothingEvent(runtime, dateText, label);
        break;
      case '新年舞会':
        updatePlayerFatigue(runtime, 8);
        if (ensureAnnualFlags(runtime, dateText.slice(0, 4)).newYearPartnerCharacterId) {
          await executeStoryEvent('和舞伴参加新年舞会事件', dateText, {
            characterIds: [ensureAnnualFlags(runtime, dateText.slice(0, 4)).newYearPartnerCharacterId]
          });
          ensureAnnualFlags(runtime, dateText.slice(0, 4)).newYearPartnerCharacterId = null;
        } else {
          await handleFormalClothingEvent(runtime, dateText, label);
        }
        break;
      case '仲夏夜假面舞会':
        updatePlayerFatigue(runtime, 8);
        if (ensureAnnualFlags(runtime, dateText.slice(0, 4)).maskBallPartnerCharacterId) {
          await executeStoryEvent('和舞伴参加假面舞会事件', dateText, {
            characterIds: [ensureAnnualFlags(runtime, dateText.slice(0, 4)).maskBallPartnerCharacterId]
          });
          ensureAnnualFlags(runtime, dateText.slice(0, 4)).maskBallPartnerCharacterId = null;
        } else {
          await handleFormalClothingEvent(runtime, dateText, label);
        }
        break;
      case '校际辩论会报名':
        if (getTermMeta(dateText)?.id) {
          getDebateState(runtime, getTermMeta(dateText).id).registered = true;
        }
        addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}报名了校际辩论会。`);
        break;
      case '校际辩论会':
        {
          updatePlayerFatigue(runtime, 8);
          const term = getTermMeta(dateText);
          const debate = term ? getDebateState(runtime, term.id) : null;
          const dayIndex = (debate?.completedDays || 0) + 1;
          const thresholds = [2, 5, 9, 14];
          const stage = Math.min(dayIndex, 4);
          const success = (debate?.preparation || 0) > thresholds[Math.min(dayIndex - 1, thresholds.length - 1)];
          const eventName = [
            null,
            success ? '第一场辩论胜利事件' : '第一场辩论失败事件',
            success ? '第二场辩论胜利事件' : '第二场辩论失败事件',
            success ? '第三场辩论胜利事件' : '第三场辩论失败事件',
            success ? '第四场辩论胜利事件' : '第四场辩论失败事件'
          ][stage];
          if (success && dayIndex === 4) {
            updatePlayerMoney(runtime, 10000);
          }
          if (eventName) {
            await executeStoryEvent(eventName, dateText, { characterIds: runtime.characters.map((item) => item.id) });
          } else {
            addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}参加了校际辩论会。`);
          }
          if (debate) {
            debate.completedDays = dayIndex;
          }
        }
        break;
      case '春游野餐会':
        updatePlayerFatigue(runtime, -50);
        await executeStoryEvent('春游野餐会事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
        break;
      case '校园音乐节':
        updatePlayerFatigue(runtime, -50);
        await executeStoryEvent('校园音乐节事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
        break;
      case '参观校内马术障碍赛':
        updatePlayerFatigue(runtime, -70);
        await executeStoryEvent('参观马术障碍赛事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
        break;
      case '班级度假':
        if (formatWeekday(dateText) === '周一') {
          updatePlayerMoney(runtime, -10000);
        }
        updatePlayerFatigue(runtime, -100);
        await executeStoryEvent('班级度假事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
        break;
      case '参加毕业典礼':
        {
          const graduation = getGraduationStatus(runtime);
          if (!graduation.qualified) {
            await executeStoryEvent('退学事件', dateText, {
              characterIds: runtime.characters.map((item) => item.id),
              replacements: { '｛退学原因｝': '最终课程、毕业论文或毕业实习没有达到转学协议规定的毕业要求' }
            });
            runtime.phase = 'ended';
            runtime.meta.ending = {
              type: 'game-over',
              title: '未能毕业',
              text: `${runtime.player.name}未能在转学协议规定的一年内达到毕业要求。`
            };
            break;
          }
          var gradEvent;
          if (graduation.honors && graduation.businessReady) {
            gradEvent = '毕业创业事件';
          } else if (graduation.honors) {
            gradEvent = '全A毕业事件';
          } else {
            gradEvent = '普通毕业事件';
          }
          await executeStoryEvent(gradEvent, dateText, {
            characterIds: runtime.characters.map((item) => item.id)
          });
          runtime.phase = 'ended';
          runtime.meta.ending = {
            type: 'graduation',
            title: graduation.honors ? (graduation.businessReady ? '优秀毕业 · 创业' : '优秀毕业') : '顺利毕业',
            text: `${runtime.player.name}完成了毕业典礼。`
          };
        }
        break;
      case '看病':
        addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}在医院休养了一天。`);
        break;
      default:
        addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}完成了固定活动：${label}。`);
        break;
    }
  }

  function executeExam(runtime, dateText) {
    updatePlayerFatigue(runtime, 10);
    addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}参加了考试。`);
  }

  async function maybePromptAssistantRole(runtime, dateText) {
    const term = getTermMeta(dateText);
    if (!term || term.isBreak || term.id !== GRADUATION_TERM_ID || !isFirstMonthOfTerm(dateText) || getAssistantRoleForTerm(runtime, term.id) || runtime.flags.assistant.inviteResolvedByTerm[term.id]) {
      return null;
    }
    const sourceTermId = getPreviousTermId(term.id);
    if (!sourceTermId) {
      return null;
    }
    const hasAPlusQualification = getTermCourseIds(sourceTermId).some((courseId) => runtime.courses[courseId]?.finalGrade === 'A+');
    if (!hasAPlusQualification) {
      return null;
    }
    const message = `你上学期取得了 A+，教务处邀请你本学期为低年级的${ASSISTANT_COURSE.courseName}课担任助教，是否同意？`;
    const accepted = await waitForBooleanChoice('助教邀请', message, '同意', '拒绝');
    runtime.flags.assistant.inviteResolvedByTerm[term.id] = true;
    if (!accepted) {
      return { accepted: false, courseId: ASSISTANT_COURSE.id };
    }
    runtime.player.assistantRole = {
      termId: term.id,
      courseId: ASSISTANT_COURSE.id,
      courseName: ASSISTANT_COURSE.courseName
    };
    addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}答应在本学期为低年级的${ASSISTANT_COURSE.courseName}课担任助教。`);
    return { accepted: true, courseId: ASSISTANT_COURSE.id };
  }

  async function executeCourse(runtime, plan, dateText) {
    const course = runtime.courses[plan.courseId];
    updatePlayerFatigue(runtime, 5);
    updateCourseStudyProgress(course, 8);
    const professorIds = getCharactersForCourse(runtime, plan.courseId, '教授').map((item) => item.id);
    const assistantIds = getCharactersForCourse(runtime, plan.courseId, '助教').map((item) => item.id);
    const classmateIds = getCharactersForCourse(runtime, plan.courseId, '学生').map((item) => item.id);
    if (!runtime.flags.courseFirstClassDone[plan.courseId]) {
      runtime.flags.courseFirstClassDone[plan.courseId] = true;
      const hasKnownAssistant = assistantIds.length > 0;
      const hasKnownProfessor = professorIds.length > 0;
      const introductionEvent = selectFirstClassIntroduction({
        hasKnownProfessor,
        hasKnownAssistant
      });
      if (introductionEvent) {
        await executeStoryEvent(introductionEvent, dateText, {
          courseId: plan.courseId,
          replacements: { '（参数传入）': course.courseName },
          characterIds: introductionEvent === '认识教授事件' ? professorIds : assistantIds
        });
        return;
      }
    }
    if (chance(hasTriggeredEvent(runtime, '认识同学事件') ? 0.01 : 0.1)) {
      await executeStoryEvent('认识同学事件', dateText, {
        courseId: plan.courseId,
        replacements: { '（参数传入）': course.courseName },
        characterIds: classmateIds
      });
      return;
    }
    if ([...professorIds, ...assistantIds, ...classmateIds].length && chance(0.1)) {
      await executeStoryEvent('课堂互动事件', dateText, {
        courseId: plan.courseId,
        replacements: { '（参数传入）': course.courseName },
        characterIds: [...new Set([...professorIds, ...assistantIds, ...classmateIds])]
      });
      return;
    }
    await maybePromptAssistantRole(runtime, dateText);
    addActionHistory(runtime, dateText, `上了${course.courseName}。`, { plan });
  }

  function executeHomework(runtime, plan, dateText) {
    const course = runtime.courses[plan.courseId];
    const intervalSpan = Math.max(1, Number(course.homeworkIntervalWeeks || 4) / 2);
    const increment = (100 / intervalSpan) * (1 + (Number(course.studyProgress || 0) / 50));
    updatePlayerFatigue(runtime, 3);
    updateCourseStudyProgress(course, 1);
    updateCourseHomeworkProgress(course, increment);
    addActionHistory(runtime, dateText, `完成了一部分${course.courseName}作业。`, { plan });
  }

  async function executeReview(runtime, plan, dateText) {
    const course = runtime.courses[plan.courseId];
    updatePlayerFatigue(runtime, 5);
    updateCourseStudyProgress(course, 6);
    if (chance(hasTriggeredEvent(runtime, '图书馆偶遇陌生人事件') ? 0.01 : 0.1)) {
      await executeStoryEvent('图书馆偶遇陌生人事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      return;
    }
    if (runtime.characters.length && chance(0.1)) {
      await executeStoryEvent('图书馆偶遇认识的人事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      return;
    }
    addActionHistory(runtime, dateText, `复习了${course.courseName}。`, { plan });
  }

  async function executeFlyer(runtime, dateText) {
    updatePlayerFatigue(runtime, 6);
    updatePlayerMoney(runtime, 200);
    if (!hasTriggeredEvent(runtime, '发传单认识陌生人事件') && chance(0.1)) {
      await executeStoryEvent('发传单认识陌生人事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      return;
    }
    if (hasTriggeredEvent(runtime, '发传单认识陌生人事件') && chance(0.2)) {
      await executeStoryEvent('和发传单认识的人互动事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      return;
    }
    if (runtime.characters.length && chance(0.1)) {
      await executeStoryEvent('被朋友遇到发传单事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      return;
    }
    addActionHistory(runtime, dateText, '去打工发传单。');
  }

  async function executeWinterJob(runtime, dateText) {
    updatePlayerFatigue(runtime, 8);
    updatePlayerMoney(runtime, 400);
    if (!hasTriggeredEvent(runtime, '寒假百货礼宾打工事件') || chance(0.2)) {
      await executeStoryEvent('寒假百货礼宾打工事件', dateText, {
        characterIds: runtime.characters.map((item) => item.id)
      });
      return;
    }
    addActionHistory(runtime, dateText, '在高级百货做了一天新年礼宾临时工。');
  }

  async function executeTutor(runtime, dateText) {
    const tutorPay = 400;
    updatePlayerFatigue(runtime, 6);
    syncTutorCharacterIds(runtime);
    if (!runtime.flags.tutor.started) {
      await executeStoryEvent('第一次做家教事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      runtime.flags.tutor.started = true;
      rewardTutorStudentFavorability(runtime);
      updatePlayerMoney(runtime, tutorPay);
      return;
    }
    await maybePromptCharacterInternship(runtime, dateText, runtime.characters.find((item) => item.id === runtime.flags.tutor.parentCharacterId), {
      minimumFavorability: RELATIONSHIP_THRESHOLDS.admirer,
      sourcePrefix: 'tutor-parent',
      graduationProbability: 0.3
    });
    const tutorStudent = runtime.characters.find((item) => item.id === runtime.flags.tutor.studentCharacterId);
    const tutorParent = runtime.characters.find((item) => item.id === runtime.flags.tutor.parentCharacterId);
    if (chance(0.2) && tutorStudent && tutorParent) {
      await executeStoryEvent('做家教事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      rewardTutorStudentFavorability(runtime);
      updatePlayerMoney(runtime, tutorPay);
      return;
    }
    rewardTutorStudentFavorability(runtime);
    updatePlayerMoney(runtime, tutorPay);
    addActionHistory(runtime, dateText, '做了家教。');
  }

  async function executeStudentSecretary(runtime, dateText) {
    updatePlayerMoney(runtime, 500);
    updatePlayerFatigue(runtime, 8);
    if (!runtime.flags.studentSecretary.firstCompleted) {
      await executeStoryEvent('第一次做学生会秘书事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      runtime.flags.studentSecretary.firstCompleted = true;
      return;
    }
    if (chance(0.3)) {
      await executeStoryEvent('做学生会秘书事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      return;
    }
    addActionHistory(runtime, dateText, '去学生会做了一天秘书。');
  }

  async function executeAssistant(runtime, dateText) {
    const term = getTermMeta(dateText);
    const assistantRole = term ? getAssistantRoleForTerm(runtime, term.id) : null;
    const courseId = assistantRole?.courseId || null;
    const course = courseId ? runtime.courses[courseId] : null;
    const courseName = assistantRole?.courseName || course?.courseName || ASSISTANT_COURSE.courseName;
    const professor = courseId ? getHighestFavorabilityCharacter(getCharactersForCourse(runtime, courseId, '教授', courseName)) : null;
    updatePlayerFatigue(runtime, 6);
    updatePlayerMoney(runtime, 900);
    runtime.flags.assistant.completedWeeks[getWeekStart(dateText)] = true;
    if (term && courseId && !runtime.flags.assistant.firstDoneByTerm[term.id]) {
      await executeStoryEvent('第一次担任助教事件', dateText, {
        characterIds: runtime.characters.map((item) => item.id),
        courseId,
        courseName,
        replacements: { 'xxx课': courseName }
      });
      if (getCharactersForCourse(runtime, courseId, '教授', courseName).length) {
        runtime.flags.assistant.firstDoneByTerm[term.id] = true;
      }
      return;
    }
    if (professor && chance(0.3)) {
      await executeStoryEvent('助教和教授事件', dateText, {
        characterIds: [professor.id],
        courseId,
        courseName,
        replacements: { 'xxx课': courseName }
      });
      return;
    }
    if (!hasTriggeredEvent(runtime, '当助教认识学弟事件') && chance(0.3)) {
      await executeStoryEvent('当助教认识学弟事件', dateText, {
        characterIds: runtime.characters.map((item) => item.id),
        replacements: { 'xxx课': courseName }
      });
      return;
    }
    if (hasTriggeredEvent(runtime, '当助教认识学弟事件') && chance(0.3)) {
      await executeStoryEvent('助教和学弟事件', dateText, {
        characterIds: runtime.characters.map((item) => item.id),
        replacements: { 'xxx课': courseName }
      });
      return;
    }
    addActionHistory(runtime, dateText, `完成了${courseName}助教工作。`);
  }

  function executeSleep(runtime, dateText) {
    updatePlayerFatigue(runtime, -100);
    addActionHistory(runtime, dateText, '好好睡了一觉。');
  }

  async function executeDate(runtime, plan, dateText) {
    const character = runtime.characters.find((item) => item.id === plan.characterId);
    if (plan.inviteOrigin === 'player') {
      updatePlayerMoney(runtime, -500);
    }
    updatePlayerFatigue(runtime, -100);
    if (character) {
      updateCharacterFavorability(character, randomInt(1, 10));
      const lovers = runtime.characters.filter((item) => item.isLover);
      if (character.isLover && lovers.length >= 2 && !hasTriggeredEvent(runtime, '第一次三人约会事件') && chance(0.05)) {
        const otherLover = pickRandom(lovers.filter((item) => item.id !== character.id));
        if (otherLover) {
          setCharacterScopedFlag(character, 'global', '三人约会参与者', true);
          setCharacterScopedFlag(otherLover, 'global', '三人约会参与者', true);
          await executeStoryEvent('第一次三人约会事件', dateText, {
            characterIds: [character.id, otherLover.id],
            inviteOrigin: plan.inviteOrigin
          });
          await maybePromptCharacterInternship(runtime, dateText, character, {
            minimumFavorability: 70,
            sourcePrefix: `date:${character.id}`,
            graduationProbability: 0.2
          });
          return;
        }
      }
      if (getCharacterScopedFlag(character, 'global', '三人约会参与者')) {
        const otherParticipant = pickRandom(lovers.filter((item) => item.id !== character.id && getCharacterScopedFlag(item, 'global', '三人约会参与者')));
        if (otherParticipant && chance(0.5)) {
          await executeStoryEvent('三人约会事件', dateText, {
            characterIds: [character.id, otherParticipant.id],
            inviteOrigin: plan.inviteOrigin
          });
          await maybePromptCharacterInternship(runtime, dateText, character, {
            minimumFavorability: 70,
            sourcePrefix: `date:${character.id}`,
            graduationProbability: 0.2
          });
          return;
        }
      }
      await executeStoryEvent('约会事件', dateText, {
        characterIds: [character.id],
        inviteOrigin: plan.inviteOrigin
      });
      await maybePromptCharacterInternship(runtime, dateText, character, {
        minimumFavorability: 70,
        sourcePrefix: `date:${character.id}`,
        graduationProbability: 0.2
      });
    } else {
      addActionHistory(runtime, dateText, '赴了一场约会。', { plan });
    }
  }

  async function executeInternship(runtime, dateText, locationText) {
    updatePlayerFatigue(runtime, 6);
    updatePlayerMoney(runtime, 500);
    updateGraduationProgress(runtime, 'graduation-internship', GRADUATION_ACTION_PROGRESS, '毕业实习进度');

    var effectiveLocationText = locationText || '实习单位';
    var bossCharacterId = runtime.player.graduationInternshipBossId;
    var bossCharacter = bossCharacterId ? getCharacterById(runtime, bossCharacterId) : null;
    var selectedOffer = runtime.flags.internships.acceptedOffers.find(function (offer) {
      return offer.id === runtime.player.graduationInternshipOfferId;
    }) || null;

    var baseCharacterIds = runtime.characters.map(function (item) { return item.id; });
    if (bossCharacter && !baseCharacterIds.includes(bossCharacter.id)) {
      baseCharacterIds.push(bossCharacter.id);
    }

    var extraCharacterIds = bossCharacter ? [bossCharacter.id] : [];
    const firstSeenKey = `毕业实习:${locationText || '未定'}`;
    if (!runtime.flags.internships.firstSeenLocations[firstSeenKey]) {
      if (bossCharacter) {
        setCharacterScopedFlag(bossCharacter, 'global', '实习上司', true);
        await executeStoryEvent('邀请人担任实习上司事件', dateText, {
          characterIds: [bossCharacter.id],
          locationText: effectiveLocationText
        });
      } else if (selectedOffer?.professorCourseName) {
        const knownCharacterIds = new Set(runtime.characters.map((character) => character.id));
        await executeStoryEvent('第一次实习-教授邀请事件', dateText, {
          characterIds: baseCharacterIds,
          locationText: effectiveLocationText,
          courseId: selectedOffer.professorCourseId,
          courseName: selectedOffer.professorCourseName
        });
        const professor = runtime.characters.find((character) => !knownCharacterIds.has(character.id)) || null;
        if (!professor) {
          return;
        }
        setCharacterScopedFlag(professor, 'global', '实习上司', true);
        runtime.player.graduationInternshipBossId = professor.id;
        selectedOffer.inviterCharacterId = professor.id;
      } else {
        const knownCharacterIds = new Set(runtime.characters.map((character) => character.id));
        await executeStoryEvent('第一天实习事件', dateText, {
          characterIds: [],
          locationText: effectiveLocationText
        });
        const generatedBoss = runtime.characters.find((character) => (
          !knownCharacterIds.has(character.id)
          && getCharacterScopedFlag(character, 'global', '实习上司')
        )) || runtime.characters.find((character) => !knownCharacterIds.has(character.id)) || null;
        if (!generatedBoss) {
          return;
        }
        runtime.player.graduationInternshipBossId = generatedBoss.id;
      }
      runtime.flags.internships.firstSeenLocations[firstSeenKey] = true;
      return;
    }
    if (chance(0.1)) {
      await executeStoryEvent('实习事件', dateText, {
        characterIds: baseCharacterIds,
        extraCharacterIds: extraCharacterIds,
        locationText: effectiveLocationText
      });
      return;
    }
    if (getCharactersByRelation(runtime, (item) => item.isLover).length && chance(0.1)) {
      await executeStoryEvent('恋人来接下班事件', dateText, {
        characterIds: runtime.characters.filter((item) => item.isLover).map((item) => item.id),
        extraCharacterIds: extraCharacterIds,
        locationText: effectiveLocationText
      });
      return;
    }
    addActionHistory(runtime, dateText, `前往${effectiveLocationText}实习。`);
  }

  function executeGraduationThesis(runtime, dateText) {
    updatePlayerFatigue(runtime, 5);
    runtime.flags.courseFirstClassDone['graduation-thesis'] = true;
    runtime.player.graduationThesisProgress = clamp((runtime.player.graduationThesisProgress || 0) + GRADUATION_ACTION_PROGRESS, 0, 100);
    updateGraduationProgress(runtime, 'graduation-thesis', GRADUATION_ACTION_PROGRESS, '毕业论文进度');
    runtime.player.graduationThesisProgress = runtime.courses['graduation-thesis'].studyProgress;
    addActionHistory(runtime, dateText, '推进了毕业论文。');
  }

  async function executeDebatePreparation(runtime, dateText) {
    updatePlayerFatigue(runtime, 5);
    const term = getTermMeta(dateText);
    if (!term) {
      addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}做了辩论准备。`);
      return;
    }
    const debate = getDebateState(runtime, term.id);
    debate.preparation += 1;
    if (!debate.firstPreparationDone) {
      await executeStoryEvent('第一次准备校际辩论会事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      debate.firstPreparationDone = true;
      return;
    }
    if (chance(0.3)) {
      await executeStoryEvent('准备校际辩论会事件', dateText, { characterIds: runtime.characters.map((item) => item.id) });
      return;
    }
    addActionHistory(runtime, dateText, '为校际辩论会做了准备。');
  }

  async function maybeHospitalize(runtime, dateText) {
    const plan = runtime.schedulePlans[dateText];
    if (!plan || plan.fixed || runtime.player.fatigue < 100) {
      return false;
    }

    runtime.schedulePlans[dateText] = {
      kind: 'activity',
      label: '看病',
      activity: '看病',
      fixed: false,
      completed: false
    };
    updatePlayerFatigue(runtime, -runtime.player.fatigue);
    const lovers = runtime.characters.filter((character) => character.isLover);
    const closeFriends = runtime.characters.filter((character) => !character.isLover && character.favorability >= RELATIONSHIP_THRESHOLDS.admirer);
    const lowFavorCharacters = runtime.characters.filter((character) => character.favorability < RELATIONSHIP_THRESHOLDS.admirer);
    const hasHospitalStrangerEvent = hasTriggeredEvent(runtime, '有钱看病版认识校外人士事件')
      || hasTriggeredEvent(runtime, '没钱看病版认识校外人士事件');
    const canPayMedicalFee = runtime.player.money >= 1500;
    if (!hasHospitalStrangerEvent && chance(0.05)) {
      if (canPayMedicalFee) {
        updatePlayerMoney(runtime, -1000);
      }
      await executeStoryEvent(canPayMedicalFee ? '有钱看病版认识校外人士事件' : '没钱看病版认识校外人士事件', dateText, {
        characterIds: runtime.characters.map((item) => item.id)
      });
      return true;
    }
    if (lovers.length) {
      await executeStoryEvent('恋人探病事件', dateText, {
        characterIds: [pickRandom(lovers).id]
      });
      return true;
    }
    if (closeFriends.length && chance(0.5)) {
      if (canPayMedicalFee) {
        updatePlayerMoney(runtime, -1000);
      }
      await executeStoryEvent(canPayMedicalFee ? '有钱看病版友人探病事件' : '没钱看病版友人探病事件', dateText, {
        characterIds: [pickRandom(closeFriends).id]
      });
      return true;
    }
    if (lowFavorCharacters.length && chance(0.3)) {
      if (canPayMedicalFee) {
        updatePlayerMoney(runtime, -1000);
      }
      await executeStoryEvent(canPayMedicalFee ? '有钱看病版被认识的人看到生病事件' : '没钱看病版被认识的人看到生病事件', dateText, {
        characterIds: [pickRandom(lowFavorCharacters).id]
      });
      return true;
    }
    addActionHistory(runtime, dateText, '因为过度疲劳去医院看病休息了一天。');
    return true;
  }

  function shouldShowSundayExamResults(runtime, dateText, weekDates) {
    if (formatWeekday(dateText) !== '周日') {
      return false;
    }
    return weekDates.some((item) => getPlanForDate(runtime, item)?.kind === 'exam');
  }

  async function maybeShowSundayExamResults(runtime, dateText, weekDates) {
    if (!shouldShowSundayExamResults(runtime, dateText, weekDates)) {
      return false;
    }
    let term = getTermMeta(dateText);
    if (!term) {
      return false;
    }
    // 考试周在学期结束后、寒暑假或间隔期内，需回溯到刚结束的学期
    let termId = term.id;
    let termLabel = term.label;
    if (termId.endsWith('-break')) {
      termId = termId.replace(/-break$/, '');
      const resolved = getTermMetaByFullId(termId);
      if (resolved) {
        termLabel = resolved.label;
      }
    }
    const summary = finalizeTermIfNeeded(runtime, termId) || summarizeTermResults(runtime, termId, { includeCurrentAssignment: true });
    if (!summary.results.length) {
      return false;
    }
    const scholarship = awardTermScholarshipIfEligible(runtime, termId, summary, dateText);
    const text = summary.results
      .map((item) => `${item.courseName}：日常分 ${item.homeworkAverage} / 考试分 ${item.examScore} / 总评 ${item.finalGrade}`)
      .concat(scholarship > 0 ? [`奖学金：${scholarship} 元已到账`] : [])
      .join('\n');
    await waitForTextModal(`${termLabel}成绩`, text);
    const ended = await handleTermOutcome(runtime, termId, summary, dateText);
    if (!ended && runtime.phase !== 'ended' && termId === UPPER_TERM_ID) {
      await maybeAddProfessorInternshipOffer(runtime, dateText);
    }
    return ended;
  }

  async function runPrePlanAddDaySteps(runtime, dateText, weekDates) {
    await maybeSelectGraduationInternship(runtime, dateText); // 2. 下学期首日确定毕业实习
    const ended = await maybeShowSundayExamResults(runtime, dateText, weekDates); // 2. 周日考试成绩弹窗
    if (ended || runtime.phase === 'ended') {
      return { hospitalized: false, skipPlan: true, ended: true };
    }
    const hospitalized = await maybeHospitalize(runtime, dateText); // 3. 生病改行程
    if (hospitalized) {
      return { hospitalized: true };
    }
    const valentinesTriggered = await maybeHandleValentinesDay(runtime, dateText); // 4. 情人节事件
    applyDailyCost(runtime, dateText); // 5. 扣除生活费
    const povertyTriggered = await maybeHandlePovertyEvent(runtime, dateText); // 5. 扣费后的贫困链
    const whiteDayTriggered = await maybeHandleWhiteDay(runtime, dateText); // 6. 白色情人节送巧克力
    return {
      hospitalized: false,
      skipPlan: valentinesTriggered || povertyTriggered || whiteDayTriggered
    };
  }

  async function runPostPlanAddDaySteps(runtime, dateText) {
    await maybeHandleBirthdayGifts(runtime, dateText);
    await maybeHandleDanceInvite(runtime, dateText, {
      shouldCheck: (_runtime, currentDate) => isDateInNewYearInviteWindow(currentDate),
      askedKey: 'newYearInviteAskedCharacterIds',
      partnerKey: 'newYearPartnerCharacterId',
      title: '新年舞会邀约',
      partnerLabel: '的新年舞会舞伴'
    });
    await maybeHandleDanceInvite(runtime, dateText, {
      shouldCheck: (currentRuntime, currentDate) => isDateInMaskBallInviteWindow(currentRuntime, currentDate),
      askedKey: 'maskBallInviteAskedCharacterIds',
      partnerKey: 'maskBallPartnerCharacterId',
      title: '仲夏夜假面舞会邀约',
      partnerLabel: '的仲夏夜假面舞会舞伴'
    });
    const showedNightPopup = await maybeHandleIncomingCharacterInvite(runtime, dateText);
    if (showedNightPopup) {
      return;
    }
    const showedConfessionPopup = await maybeHandleConfession(runtime, dateText);
    if (showedConfessionPopup) {
      return;
    }
    await maybeHandleRandomLoverGifts(runtime, dateText);
  }

  async function executeAddDay(runtime, dateText, weekDates) {
    const deferredChapterIds = [];
    state.ui.deferredChapterIds = deferredChapterIds;
    state.ui.statChanges = []; // 清空前一天残留的数值变动动画
    runtime.player.currentDate = dateText; // 1. 时间前进一天
    applyCharacterBirthdays(runtime, dateText); // 1b. 先处理生日年龄增长，确保当天事件中的年龄正确
    runtime.player.inspiration = Math.min(MERGE_INSPIRATION_MAX, (runtime.player.inspiration || 0) + MERGE_INSPIRATION_PER_DAY);
    resetAnnualFlags(runtime, dateText);
    try {
      const { hospitalized, skipPlan, ended } = await runPrePlanAddDaySteps(runtime, dateText, weekDates);
      if (ended) {
        if (runtime.schedulePlans[dateText]) {
          runtime.schedulePlans[dateText].completed = true;
        }
        saveCurrentRuntime();
        render();
        return;
      }
      if (!hospitalized && !skipPlan) {
        await performPlan(runtime, dateText); // 7. 根据当天安排执行行程
      } else if (runtime.schedulePlans[dateText]) {
        runtime.schedulePlans[dateText].completed = true;
      }

      saveCurrentRuntime();
      render();
      var hadChapter = deferredChapterIds.length > 0;
      let handledChapterCount = 0;
      while (handledChapterCount < deferredChapterIds.length) {
        await waitForChapterModal(deferredChapterIds[handledChapterCount]);
        handledChapterCount += 1;
      }
      await runPostPlanAddDaySteps(runtime, dateText);
      await maybeHandlePlayerBirthdayEvent(runtime, dateText, skipPlan, hadChapter, hospitalized);
      saveCurrentRuntime();
      render();
      while (handledChapterCount < deferredChapterIds.length) {
        await waitForChapterModal(deferredChapterIds[handledChapterCount]);
        handledChapterCount += 1;
      }
      await sleep(500); // 13. 一天过去后等待 0.5 秒再进入下一天
    } finally {
      state.ui.deferredChapterIds = null;
    }
  }

  async function performPlan(runtime, dateText) {
    const plan = runtime.schedulePlans[dateText];
    if (!plan) {
      return;
    }

    switch (plan.kind) {
      case 'exam':
        executeExam(runtime, dateText);
        break;
      case 'activity':
        await executeActivity(runtime, plan, dateText);
        break;
      case 'course':
        await executeCourse(runtime, plan, dateText);
        break;
      case 'homework':
        executeHomework(runtime, plan, dateText);
        break;
      case 'review':
        await executeReview(runtime, plan, dateText);
        break;
      case 'flyer':
        await executeFlyer(runtime, dateText);
        break;
      case 'tutor':
        await executeTutor(runtime, dateText);
        break;
      case 'student-secretary':
        await executeStudentSecretary(runtime, dateText);
        break;
      case 'assistant':
        await executeAssistant(runtime, dateText);
        break;
      case 'sleep':
        executeSleep(runtime, dateText);
        break;
      case 'date':
        await executeDate(runtime, plan, dateText);
        break;
      case 'winter-job':
        await executeWinterJob(runtime, dateText);
        break;
      case 'graduation-internship':
        await executeInternship(runtime, dateText, runtime.player.graduationInternship);
        break;
      case 'graduation-thesis':
        executeGraduationThesis(runtime, dateText);
        break;
      case 'debate-prep':
        await executeDebatePreparation(runtime, dateText);
        break;
      default:
        addHistory(runtime, dateText, `${formatHistoryDatePrefix(dateText)}，${runtime.player.name}完成了今日安排。`);
        break;
    }
    runtime.schedulePlans[dateText].completed = true;
  }

  async function finalizeWeek(runtime, executedWeekDates) {
    const lastDate = executedWeekDates[executedWeekDates.length - 1];
    const previousTerm = getTermMeta(lastDate);

    // 周日晚上检测本周到截止期的作业是否都做完了，没做完强制弹出合成小游戏
    var dueIncompleteCourseIds = [];
    for (const courseId of Object.keys(runtime.courses)) {
      const course = runtime.courses[courseId];
      if (course.currentAssignmentActive && course.homeworkWeeksRemaining === 1 && (course.currentHomeworkProgress || 0) < 100) {
        dueIncompleteCourseIds.push(courseId);
      }
    }

    if (dueIncompleteCourseIds.length > 0) {
      var mode = 'homework';
      if (!state.mergeGame || !state.mergeGame.initialized || state.mergeGame.mode !== mode) {
        initMergeGame(mode);
      }
      state.mergeGame.tasks = state.mergeGame.tasks.filter(function (t) {
        return dueIncompleteCourseIds.indexOf(t.courseId) !== -1;
      });
      if (!state.mergeGame.tasks.length) {
        refreshMergeTasks();
        state.mergeGame.tasks = state.mergeGame.tasks.filter(function (t) {
          return dueIncompleteCourseIds.indexOf(t.courseId) !== -1;
        });
      }
      state.mergeGame.aiReady = true;
      state.ui.aiLoading = null;
      runtime.flags.weeklyMergePromptShown = true;

      await new Promise(function (resolve) {
        openModal({
          type: 'confirm',
          title: '',
          message: '还有作业没做完，临时赶一赶吧',
          confirmLabel: '确定',
          hideCancel: true,
          onConfirm: function () {
            closeModal();
            state.ui.page = 'merge-game';
            render();
            resolve();
          }
        });
      });

      await new Promise(function (resolve) {
        state._dueMergeGuard = resolve;
      });
      refreshMergeTasks();
    }

    for (const courseId of Object.keys(runtime.courses)) {
      const course = runtime.courses[courseId];
      if (!course.currentAssignmentActive || !course.homeworkWeeksRemaining) {
        continue;
      }
      course.homeworkWeeksRemaining -= 1;
      if (course.homeworkWeeksRemaining <= 0) {
        course.pastHomeworkGrades.push(Math.round(clamp(course.currentHomeworkProgress, 0, 100)));
        course.currentAssignmentActive = false;
        course.currentHomeworkProgress = 0;
        course.homeworkWeeksRemaining = null;
      }
    }

    runtime.flags.weeklyInvite = {
      weekStart: getWeekStart(addDays(lastDate, 1)),
      globalLocked: false,
      attemptedCharacterIds: [],
      nightInviteAskedIds: []
    };

    const nextDate = addDays(lastDate, 1);
    const nextTerm = getTermMeta(nextDate);
    if (shouldResetHomeworkMergeBoard(previousTerm?.id, nextTerm?.id)) {
      // 下学期使用一张全新的作业棋盘，重新铺满初始石化棋子；创业棋盘独立保留。
      runtime.mergeGame = null;
      if (state.mergeGame?.mode === 'homework') {
        state.mergeGame = null;
      }
    }
    // 仅在真正更换学期/进入假期时才结算成绩，跳过作业期→间隙期的过渡
    var shouldFinalize = previousTerm && !previousTerm.isBreak;
    if (shouldFinalize && nextTerm && !nextTerm.isBreak && nextTerm.id.endsWith('-break')) {
      shouldFinalize = false; // 仍然在同一学期的间隙期，不结算
    }
    if (shouldFinalize && (!nextTerm || nextTerm.isBreak || nextTerm.id !== previousTerm.id)) {
      clearCharacterGlobalFlag(runtime, '辩论队队友');
      refreshMergeTasks();
      var effectiveFinalizeTermId = previousTerm.id.endsWith('-break') ? previousTerm.id.replace(/-break$/, '') : previousTerm.id;
      const summary = finalizeTermIfNeeded(runtime, effectiveFinalizeTermId);
      if (summary?.results?.length) {
        awardTermScholarshipIfEligible(runtime, effectiveFinalizeTermId, summary, lastDate);
        addHistory(runtime, lastDate, `${formatHistoryDatePrefix(lastDate)}，${runtime.player.name}收到了${previousTerm.label}的课程评价。`);
        const ended = await handleTermOutcome(runtime, effectiveFinalizeTermId, summary, lastDate);
        if (ended || runtime.phase === 'ended') {
          return;
        }
      }
    }

    runtime.player.currentDate = nextDate;
    resetAnnualFlags(runtime, nextDate);
    ensureAssignmentsForDate(runtime, nextDate);

    // 周日结束时如果本周没有弹出过弹框，弹出做作业/创业弹框
    if (!runtime.flags.weeklyMergePromptShown) {
      var hasHomework = getActiveHomeworkCourses().length > 0;
      var bizDone = (runtime.player.bizProgress || 0) >= BUSINESS_ENDING_SCORE;
      if (!(!hasHomework && bizDone)) {
        var mode = resolveMergeGameMode(hasHomework);
        if (!state.mergeGame || !state.mergeGame.initialized || state.mergeGame.mode !== mode) {
          initMergeGame(mode);
        } else {
          state.mergeGame.tasks = cleanupStaleMergeTasks(mode, state.mergeGame.tasks);
          if (!state.mergeGame.tasks.length) {
            refreshMergeTasks();
          }
        }
        state.mergeGame.aiReady = false;
        var dialogMsg = mode === 'homework' ? '写点作业吧' : '闲着也是闲着，搞搞我的创业企划书吧';
        openModal({
          type: 'confirm',
          title: '',
          message: dialogMsg,
        confirmLabel: '确定',
        hideCancel: true,
        onConfirm: function () {
          state.ui.aiLoading = { message: '正在等待 AI 回复…' };
          state.ui.page = 'merge-game';
          render();
        }
      });
    }
    }
    runtime.flags.weeklyMergePromptShown = false;
  }

  async function executeCurrentWeek() {
    const runtime = state.runtime;
    const weekDates = getWeekDates(runtime.player.currentDate);
    const pendingDates = weekDates.filter((dateText) => !isDateCompleted(runtime, dateText));
    if (!pendingDates.every((dateText) => runtime.schedulePlans[dateText])) {
      setStatus('请先把本周所有还没完成的日期排满。', 'error');
      return;
    }

    state.ui.status = '';
    state.ui.statusTone = '';
    state.ui.interactionLocked = true;
    runtime.flags.historyPanelWeekStart = getWeekStart(runtime.player.currentDate);
    saveCurrentRuntime();
    closeModal();
    render();
    try {
      const executedDates = [];
      for (const dateText of pendingDates) {
        try {
          await executeAddDay(runtime, dateText, weekDates);
        } catch (error) {
          setStatus(`${formatMonthDay(dateText)}执行失败：${error.message || '未知错误'}`, 'error');
          break;
        }
        executedDates.push(dateText);
        runtime.player.currentDate = addDays(dateText, 1); // 14. 下一天已排定则自动继续
        if (runtime.phase === 'ended') {
          break;
        }
      }

      if (runtime.phase !== 'ended' && executedDates[executedDates.length - 1] === weekDates[weekDates.length - 1]) {
        await finalizeWeek(runtime, executedDates); // 15~16. 周末结算并刷新到新一周
      }
      const savedRuntime = saveCurrentRuntime();
      const savedAuto = saveAutoSlot();
      if (!savedRuntime || !savedAuto) {
        setStatus('本周执行完毕，但存档写入失败。', 'error');
      } else {
        await flushChatStorage();
      }
    } finally {
      state.ui.interactionLocked = false;
      render();
    }
  }

  // ===== 合成小游戏逻辑 =====

  function getActiveHomeworkCourses() {
    const runtime = state.runtime;
    if (!runtime) return [];
    const term = getTermMeta(runtime.player.currentDate);
    if (!term || term.isBreak) return [];
    var effectiveTermId = term.id.endsWith('-break') ? term.id.replace(/-break$/, '') : term.id;
    const results = [];
    for (const courseId of getTermCourseIds(effectiveTermId, { includeSpecial: true })) {
      const course = runtime.courses[courseId];
      if (!course || course.finalGrade) continue;
      const hasAttended = runtime.flags.courseFirstClassDone[courseId];
      const isActive = hasAttended && course.currentAssignmentActive && course.currentHomeworkProgress < 100;
      const isThesis = courseId === 'graduation-thesis';
      const isGraduationInternship = courseId === 'graduation-internship';
      if (isGraduationInternship) continue;
      if (isActive || (isThesis && hasAttended && course.studyProgress < 100)) {
        results.push({ courseId, courseName: course.courseName, isThesis, progress: isThesis ? course.studyProgress : course.currentHomeworkProgress });
      }
    }
    return results;
  }

  function generateMergeTask(courseId, courseName, isThesis) {
    const requiredPieces = [];
    const isBiz = state.mergeGame?.mode === 'biz';
    var targetSum;
    if (isBiz) {
      // 创业版任务完全随机，不随周数增长
      targetSum = 3 + Math.floor(Math.random() * 12);
    } else {
      const termMeta = state.runtime ? getTermMeta(state.runtime.player.currentDate) : null;
      const weekNumber = termMeta ? termMeta.weekNumber : 1;
      const minSum = 3;
      const maxSum = 3 + Math.floor(weekNumber * 0.75);
      targetSum = minSum + Math.floor(Math.random() * (maxSum - minSum + 1));
    }

    function addPiece(maxLevel) {
      const chains = state.mergeGame?.mode === 'biz' ? MERGE_BIZ_CHAINS : MERGE_CHAINS;
      const chain = chains[Math.floor(Math.random() * chains.length)];
      const level = 1 + Math.floor(Math.random() * maxLevel);
      requiredPieces.push({ chainId: chain.id, level, svg: chain.pieces[level - 1].svg, name: chain.pieces[level - 1].name });
      return level;
    }

    // 第一个棋子：随机1到总要求等级的一半（高于7则等于7）
    const piece1Max = Math.min(7, Math.floor(targetSum / 2));
    const piece1Level = addPiece(piece1Max);

    // 第二个棋子：随机1到（总等级-第一个棋子等级）（高于7则等于7）
    const remaining1 = targetSum - piece1Level;
    const piece2Max = Math.min(7, remaining1);
    const piece2Level = addPiece(piece2Max);

    // 第三个棋子：剩余>0则生成，随机1到剩余值（高于7则等于7）
    const remaining2 = targetSum - piece1Level - piece2Level;
    if (remaining2 > 0) {
      addPiece(Math.min(7, remaining2));
    }

    return { courseId, courseName, isThesis, requiredPieces };
  }

  function cleanupStaleMergeTasks(mode, savedTasks) {
    if (mode === 'biz') return savedTasks.slice();
    // 棋盘可能来自上一天，既要移除已完成作业，也要补齐当前已解锁的课程。
    // 保留已有任务的棋子要求，避免每次打开都重新随机。
    return getActiveHomeworkCourses().map(function (course) {
      return savedTasks.find(function (task) { return task.courseId === course.courseId; })
        || generateMergeTask(course.courseId, course.courseName, course.isThesis);
    });
  }

  function refreshMergeTasks() {
    const mg = state.mergeGame;
    if (!mg) return;
    if (mg.mode === 'biz') {
      mg.tasks = [generateMergeTask(null, '创业企划书', false)];
    } else {
      const courses = getActiveHomeworkCourses();
      mg.tasks = courses.map(function (c) { return generateMergeTask(c.courseId, c.courseName, c.isThesis); });
    }
  }

  function initMergeGame(mode) {
    mode = mode || 'homework';
    var saved = state.runtime?.mergeGame;
    if (mode === 'biz') {
      saved = state.runtime?.bizMergeGame;
    }
    const shouldStartTutorial = mode === 'biz' && state.runtime && !state.runtime.flags.bizMergeTutorialCompleted;
    const hasSavedBoard = saved && Array.isArray(saved.board) && saved.board.length === MERGE_BOARD_SIZE && (saved.mode === mode || (!saved.mode && mode === 'homework'));
    if (shouldStartTutorial && hasSavedBoard && saved.tutorial && typeof saved.tutorial === 'object') {
      // 未完成的教程连同当前步骤一起恢复，刷新不会跳过引导或重复消耗灵感。
      state.mergeGame = createMergeGameState(mode);
      state.mergeGame.board = saved.board.slice();
      state.mergeGame.tasks = Array.isArray(saved.tasks) ? saved.tasks.slice() : [];
      state.mergeGame.tutorial = JSON.parse(JSON.stringify(saved.tutorial));
      state.mergeGame.initialized = true;
    } else if (shouldStartTutorial) {
      // 第一次进入或旧存档没有教程状态时，从完整引导开始。
      state.mergeGame = createMergeGameState(mode);
      state.mergeGame.initialized = true;
      state.mergeGame.tutorial = { step: 0, introDetailShown: false, genCount: 0, generatedPieceIds: [], sourcePieceId: '', targetPieceId: '', usePetrifiedTarget: false };
      state.mergeGame.tasks = [{
        courseId: null,
        courseName: '创业企划书',
        isThesis: false,
        requiredPieces: [{ chainId: 1, level: 2, svg: 'g1-2.svg?build=20260917215146', name: '用户抱怨' }]
      }];
    } else if (hasSavedBoard) {
      state.mergeGame = createMergeGameState(mode);
      state.mergeGame.board = saved.board.slice();
      state.mergeGame.initialized = true;
      state.mergeGame.tutorial = null;
      if (Array.isArray(saved.tasks) && saved.tasks.length) {
        state.mergeGame.tasks = cleanupStaleMergeTasks(mode, saved.tasks);
      }
      if (!state.mergeGame.tasks.length) {
        refreshMergeTasks();
      }
    } else {
      state.mergeGame = createMergeGameState(mode);
      state.mergeGame.initialized = true;
      refreshMergeTasks();
    }
  }

  function enterMergeGame(mode) {
    if (!state.runtime || state.runtime.phase === 'ended') return;

    // Preserve the other board before switching between homework and business modes.
    syncMergeGameToRuntime();
    if (!state.mergeGame || !state.mergeGame.initialized || state.mergeGame.mode !== mode) {
      initMergeGame(mode);
    } else {
      state.mergeGame.tasks = cleanupStaleMergeTasks(mode, state.mergeGame.tasks);
      if (!state.mergeGame.tasks.length) {
        refreshMergeTasks();
      }
    }
    state.mergeGame.aiReady = !state.ui.aiLoading;
    state.ui.page = 'merge-game';
    render();
  }

  function findNearestEmptyCell(board, fromIndex) {
    const col = fromIndex % MERGE_BOARD_COLS;
    const row = Math.floor(fromIndex / MERGE_BOARD_COLS);
    for (let dist = 1; dist < MERGE_BOARD_SIZE; dist++) {
      for (let dr = -dist; dr <= dist; dr++) {
        for (let dc = -dist; dc <= dist; dc++) {
          if (Math.abs(dr) + Math.abs(dc) !== dist) continue;
          const r = row + dr;
          const c = col + dc;
          if (r < 0 || r >= MERGE_BOARD_ROWS || c < 0 || c >= MERGE_BOARD_COLS) continue;
          const idx = r * MERGE_BOARD_COLS + c;
          if (!board[idx]) return idx;
        }
      }
    }
    return -1;
  }

  function generateTutorialChildPiece(motherChainId) {
    const mg = state.mergeGame;
    const runtime = state.runtime;
    if (!mg || !runtime || !mg.tutorial) return false;
    const motherIdx = mg.board.findIndex((p) => p && p.chainId === motherChainId && p.level === 0);
    if (motherIdx === -1) return false;
    const targetIdx = findNearestEmptyCell(mg.board, motherIdx);
    if (targetIdx === -1) return false;

    // Tutorial forces level 1
    var tutNow = Date.now();
    var tutPiece = { id: `piece-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, chainId: motherChainId, level: 1, _spawnFrom: motherIdx, _spawnTime: tutNow };
    mg.board[targetIdx] = tutPiece;
    runtime.player.inspiration = Math.max(0, (runtime.player.inspiration || 0) - MERGE_GENERATION_COST);
    scheduleSpawnAnimCleanup(tutPiece);

    mg.tutorial.genCount = (mg.tutorial.genCount || 0) + 1;
    mg.tutorial.generatedPieceIds = Array.isArray(mg.tutorial.generatedPieceIds) ? mg.tutorial.generatedPieceIds : [];
    mg.tutorial.generatedPieceIds.push(tutPiece.id);
    const petrifiedTargetIndex = findMatchingPetrifiedPieceIndex(mg.board, targetIdx);
    if (petrifiedTargetIndex >= 0) {
      mg.tutorial.sourcePieceId = tutPiece.id;
      mg.tutorial.targetPieceId = mg.board[petrifiedTargetIndex].id;
      mg.tutorial.usePetrifiedTarget = true;
      mg.tutorial.step = 3;
    } else if (mg.tutorial.genCount >= 2) {
      mg.tutorial.sourcePieceId = mg.tutorial.generatedPieceIds[0] || '';
      mg.tutorial.targetPieceId = tutPiece.id;
      mg.tutorial.usePetrifiedTarget = false;
      mg.tutorial.step = 3;
    } else {
      mg.tutorial.step = 2;
    }
    return true;
  }

  function generateChildPiece(motherChainId) {
    const mg = state.mergeGame;
    const runtime = state.runtime;
    if (!mg || !runtime || (runtime.player.inspiration || 0) < MERGE_GENERATION_COST) return false;
    const motherIdx = mg.board.findIndex((p) => p && p.chainId === motherChainId && p.level === 0);
    if (motherIdx === -1) return false;
    const targetIdx = findNearestEmptyCell(mg.board, motherIdx);
    if (targetIdx === -1) return false;

    const roll = Math.random();
    let level;
    if (roll < 0.95) level = 1;
    else if (roll < 0.98) level = 2;
    else level = 3;

    var genNow = Date.now();
    var genPiece = { id: `piece-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, chainId: motherChainId, level, _spawnFrom: motherIdx, _spawnTime: genNow };
    mg.board[targetIdx] = genPiece;
    runtime.player.inspiration = Math.max(0, (runtime.player.inspiration || 0) - MERGE_GENERATION_COST);
    scheduleSpawnAnimCleanup(genPiece);
    return true;
  }

  function scheduleSpawnAnimCleanup(piece) {
    setTimeout(function () {
      if (piece) {
        delete piece._spawnFrom;
        delete piece._spawnTime;
      }
    }, 350);
  }

  function canSubmitTask(task) {
    const mg = state.mergeGame;
    if (!mg) return false;
    const usedIndices = new Set();
    for (const req of task.requiredPieces) {
      const idx = mg.board.findIndex(function (p, i) {
        return p && !p.petrified && p.chainId === req.chainId && p.level === req.level && !usedIndices.has(i);
      });
      if (idx === -1) return false;
      usedIndices.add(idx);
    }
    return true;
  }

  function submitMergeTask(taskIndex) {
    const mg = state.mergeGame;
    const runtime = state.runtime;
    if (!mg || !runtime) return;
    const task = mg.tasks[taskIndex];
    if (!task || !canSubmitTask(task)) return;

    // Tutorial: mark as submitted
    if (mg.tutorial) {
      runtime.flags.bizMergeTutorialCompleted = true;
      mg.tutorial.step = 5;
      mg.tutorial = null;
    }

    // 收集要提交的棋子信息（不立即删除）
    const usedIndices = new Set();
    const flyingPieces = [];
    for (const req of task.requiredPieces) {
      const idx = mg.board.findIndex(function (p, i) {
        return p && !p.petrified && p.chainId === req.chainId && p.level === req.level && !usedIndices.has(i);
      });
      if (idx !== -1) {
        usedIndices.add(idx);
        flyingPieces.push({ cellIndex: idx, svg: req.svg });
      }
    }

    // 立即更新进度
    if (mg.mode === 'biz') {
      runtime.player.bizProgress = (runtime.player.bizProgress || 0) + 1;
    } else {
      const course = runtime.courses[task.courseId];
      if (course) {
        const progressGain = task.isThesis ? MERGE_HOMEWORK_PROGRESS_THESIS : MERGE_HOMEWORK_PROGRESS_NORMAL;
        if (task.isThesis) {
          updateGraduationProgress(runtime, task.courseId, progressGain, `${task.courseName}完成度`);
        } else {
          updateCourseHomeworkProgress(course, progressGain);
          // 作业满100后不立即结束，保持 active 让 finalizeWeek
          // 在剩余周数归零时自然结算，避免 ensureAssignmentsForDate 提前开始新作业
        }
      }
    }

    // 设置飞行动画状态
    mg.submitAnimation = { taskIndex, pieces: flyingPieces, startTime: Date.now() };
    render();

    // 动画结束后删除棋子并刷新任务
    setTimeout(function () {
      for (var fi = 0; fi < flyingPieces.length; fi++) {
        mg.board[flyingPieces[fi].cellIndex] = null;
      }
      mg.submitAnimation = null;

      if (mg.mode === 'biz') {
        mg.tasks = [generateMergeTask(null, '创业企划书', false)];
        saveCurrentRuntime();
        render();
        return;
      }

      const remaining = getActiveHomeworkCourses();
      if (!remaining.length) {
        mg.tasks = [];
      } else {
        const stillActive = remaining.some(function (c) { return c.courseId === task.courseId; });
        if (stillActive) {
          mg.tasks[taskIndex] = generateMergeTask(task.courseId, task.courseName, task.isThesis);
        } else {
          mg.tasks.splice(taskIndex, 1);
        }
      }

      mg.tasks = cleanupStaleMergeTasks(mg.mode, mg.tasks);
      // 最后一份作业也要保存，避免等待剧情时刷新又恢复成未完成状态。
      saveCurrentRuntime();
      if (!mg.tasks.length) {
        leaveMergeGame();
      } else {
        render();
      }
    }, 500);
  }

  function handleMergePieceClick(cellIndex) {
    const mg = state.mergeGame;
    if (!mg) return;
    const piece = mg.board[cellIndex];
    if (!piece || piece.petrified) {
      mg.selectedPieceCell = null;
      mg.generationMotherId = null;
      return;
    }
    // Tutorial: block clicking non-tutorial pieces during guided steps
    if (mg.tutorial) {
      if (mg.tutorial.step >= 3) return; // block ALL piece clicks in steps 3-4
      if (mg.tutorial.step === 1 || mg.tutorial.step === 2) {
        if (piece.level !== 0 || piece.chainId !== 1) return; // only chain 1 mother allowed
      }
    }
    mg.selectedPieceCell = cellIndex;
    mg.pendingPieceTapId = piece.id;
    if (piece.level !== 0) mg.generationMotherId = null;
    if (piece.level === 0) {
      const now = Date.now();
      if (mg.generationMotherId === piece.id && (now - mg.generationLastClick) < MERGE_GENERATION_INTERVAL_MS) {
        if ((state.runtime.player.inspiration || 0) < MERGE_GENERATION_COST) {
          if ((state.runtime.player.fatigue || 0) >= 100) {
            openModal({
              type: 'confirm',
              title: '',
              message: '已经精疲力竭了...',
              confirmLabel: '确定',
              hideCancel: true,
              mergeGameModal: true
            });
            mg.generationMotherId = null;
          } else {
            mg.generationMotherId = null;
            openModal({
              type: 'confirm',
              title: '',
              message: '是否增加10点疲劳增加10点灵感？',
              confirmLabel: '是',
              cancelLabel: '否',
              mergeGameModal: true,
              onConfirm: function () {
                state.runtime.player.fatigue = Math.min(100, Math.max(0, (state.runtime.player.fatigue || 0) + 10));
                state.runtime.player.inspiration = Math.min(MERGE_INSPIRATION_MAX, (state.runtime.player.inspiration || 0) + 10);
                if (mg.tutorial) {
                  generateTutorialChildPiece(piece.chainId);
                } else {
                  generateChildPiece(piece.chainId);
                }
                state.mergeGame.generationMotherId = null;
                render();
                setTimeout(function () { saveCurrentRuntime(); }, 0);
              }
            });
          }
        } else {
          if (mg.tutorial) {
            generateTutorialChildPiece(piece.chainId);
          } else {
            generateChildPiece(piece.chainId);
          }
        }
        mg.generationMotherId = null;
      } else {
        mg.generationMotherId = piece.id;
        mg.generationLastClick = now;
      }
    }
  }

  function handleMergePieceDiscard(cellIndex) {
    const mg = state.mergeGame;
    if (!mg) return;
    const piece = mg.board[cellIndex];
    if (!piece || piece.level === 0 || piece.petrified) return;
    // Block discard during tutorial
    if (mg.tutorial && mg.tutorial.step < 5) return;
    mg.board[cellIndex] = null;
    mg.selectedPieceCell = null;
    mg.generationMotherId = null;
  }

  function handleMergeDrop(dragCellIndex, dropCellIndex) {
    const mg = state.mergeGame;
    if (!mg) return;
    if (dragCellIndex === dropCellIndex) return;

    const dragPiece = mg.board[dragCellIndex];
    const dropPiece = mg.board[dropCellIndex];
    if (!dragPiece || dragPiece.petrified) return;

    // Allow normal piece to merge onto petrified piece of same type/level
    if (dropPiece && dropPiece.chainId === dragPiece.chainId && dropPiece.level === dragPiece.level && dropPiece.level < 7 && dropPiece.level > 0) {
      // Tutorial step 3: only allow merging the two tutorial pieces (chain 1, level 1)
      if (mg.tutorial && mg.tutorial.step === 3 && (dragPiece.chainId !== 1 || dragPiece.level !== 1)) return;
      mg.board[dragCellIndex] = null;
      mg.board[dropCellIndex] = { id: `piece-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, chainId: dragPiece.chainId, level: dragPiece.level + 1 };
      mg.selectedPieceCell = dropCellIndex;
      mg.generationMotherId = null;
      // Tutorial: check if player completed the merge step
      if (mg.tutorial && mg.tutorial.step === 3) {
        mg.tutorial.step = 4;
        render();
      }
      return;
    }

    if (!dropPiece) {
      // Tutorial step 3: only allow moving tutorial pieces (chain 1, level 1) to empty cells
      if (mg.tutorial && mg.tutorial.step === 3 && (dragPiece.chainId !== 1 || dragPiece.level !== 1)) return;
      mg.board[dropCellIndex] = dragPiece;
      mg.board[dragCellIndex] = null;
      mg.selectedPieceCell = dropCellIndex;
      return;
    }
  }

  function leaveMergeGame() {
    const container = document.querySelector('.merge-game-container');
    function finishLeave() {
      state.ui.page = 'schedule';
      render();
      const pending = state.pendingChapterShow;
      if (pending) {
        state.pendingChapterShow = null;
        pending();
      }
      if (state._dueMergeGuard) {
        var resolve = state._dueMergeGuard;
        state._dueMergeGuard = null;
        resolve();
      }
    }
    if (container) {
      container.classList.add('merge-fade-out');
      setTimeout(finishLeave, 250);
    } else {
      finishLeave();
    }
  }

  function renderMergeGameContent() {
    const mg = state.mergeGame;
    if (!mg) return '';

    const info = getMergePieceInfo;
    const selectedPiece = mg.selectedPieceCell !== null ? mg.board[mg.selectedPieceCell] : null;
    const selInfo = selectedPiece ? info(selectedPiece.chainId, selectedPiece.level, selectedPiece.petrified) : null;
    const now = Date.now();
    // A board redraw must not replay the click animation for a piece that is
    // merely still selected. Consume the animation marker on its first render.
    const tappedPieceId = mg.pendingPieceTapId;
    mg.pendingPieceTapId = null;

    const isBiz = mg.mode === 'biz';
    const tutorial = mg.tutorial;
    const isTutorialTaskIconStep = !!(tutorial && tutorial.step === 0 && !tutorial.introDetailShown);
    const isTutorialChainStep = !!(tutorial && tutorial.step === 0 && tutorial.introDetailShown);

    let tasksHtml = '';
    if (mg.tasks.length) {
      var tasksTutorialClass = (tutorial && (tutorial.step === 0 || tutorial.step === 4)) ? ' merge-tutorial-surface' : '';
      tasksHtml = `<div class="merge-tasks${tasksTutorialClass}">${mg.tasks.map((task, ti) => {
        const canSubmit = canSubmitTask(task);
        let progressHtml = '';
        if (isBiz) {
          progressHtml = `<div class="merge-task-progress">完成度 ${state.runtime?.player?.bizProgress || 0}/${BUSINESS_ENDING_SCORE}</div>`;
        } else {
          const course = state.runtime?.courses?.[task.courseId];
          const progress = course ? (task.isThesis ? (course.studyProgress || 0) : (course.currentHomeworkProgress || 0)) : 0;
          progressHtml = `<div class="merge-task-progress">完成度 ${Math.round(progress)}%</div>`;
        }
        var taskHighlight = (tutorial && tutorial.step === 4) ? ' merge-task-highlight' : '';
        return `<div class="merge-task-card${taskHighlight}">
          <div class="merge-task-course">${escapeHtml(task.courseName)}${isBiz ? '' : '作业'}</div>
          ${progressHtml}
          <div class="merge-task-pieces-wrapper">
            <div class="merge-task-pieces">${task.requiredPieces.map((rp) => {
              const tapAnim = mg.lastTaskPieceClick && mg.lastTaskPieceClick.chainId === rp.chainId && mg.lastTaskPieceClick.level === rp.level && (now - mg.lastTaskPieceClick.time) < 400 ? ' merge-tap-bounce' : '';
              const tutorialIconClass = isTutorialTaskIconStep ? ' merge-task-icon-tutorial-highlight' : '';
              return `<img src="${rp.svg}" class="merge-task-req-piece${tapAnim}${tutorialIconClass}" data-action="merge-task-piece-info" data-chain-id="${rp.chainId}" data-level="${rp.level}" alt="${rp.name}" title="${rp.name}">`;
            }).join('')}</div>
            ${canSubmit ? `<button class="primary merge-submit-btn" data-action="merge-submit" data-task-index="${ti}">提交</button>` : ''}
          </div>
        </div>`;
      }).join('')}</div>`;
    }

    const leaveGlow = mg.aiReady ? ' merge-leave-glow' : '';
    const boardTutorialClass = tutorial && tutorial.step >= 1 && tutorial.step <= 3 ? ' merge-tutorial-surface' : '';
    const descTutorialClass = isTutorialChainStep ? ' merge-tutorial-surface' : '';

    let boardHtml = '';
    for (let i = 0; i < MERGE_BOARD_SIZE; i++) {
      const piece = mg.board[i];
      const isSelected = mg.selectedPieceCell === i;
      let cellContent = '';
      let cellStyle = '';
      let cellClasses = 'merge-cell';
      if (piece) {
        const pInfo = info(piece.chainId, piece.level, piece.petrified);
        const svg = pInfo ? pInfo.svg : '';
        const isMother = piece.level === 0;
        let animClass = '';
        let imgStyle = '';
        if (piece._spawnFrom !== undefined && (now - piece._spawnTime) < 350) {
          animClass = ' merge-piece-spawn';
          var elapsed = now - piece._spawnTime;
          if (elapsed > 0) {
            imgStyle = ' style="animation-delay:-' + Math.min(elapsed, 300) + 'ms"';
          }
          const fromCol = piece._spawnFrom % MERGE_BOARD_COLS;
          const fromRow = Math.floor(piece._spawnFrom / MERGE_BOARD_COLS);
          const toCol = i % MERGE_BOARD_COLS;
          const toRow = Math.floor(i / MERGE_BOARD_COLS);
          cellStyle = `--anim-from-col:${fromCol};--anim-from-row:${fromRow};--anim-to-col:${toCol};--anim-to-row:${toRow}`;
        }
        if (mg.submitAnimation && mg.submitAnimation.pieces.some(function (sp) { return sp.cellIndex === i; })) {
          animClass = ' merge-piece-fly';
        }
        var pieceClass = 'merge-piece-img';
        if (isMother) pieceClass += ' merge-mother';
        if (piece.petrified) pieceClass += ' merge-petrified';
        if (isSelected) pieceClass += ' merge-selected';
        if (piece.id === tappedPieceId) pieceClass += ' merge-tap-bounce';
        // Tutorial highlight on 机会 mother (chain 1, level 0) during step 1-2
        if (tutorial && (tutorial.step === 1 || tutorial.step === 2) && isMother && piece.chainId === 1) {
          cellClasses += ' merge-cell-tutorial-highlight';
        }
        // Tutorial highlight on the two identical level 1 pieces (chain 1) during step 3
        if (tutorial && tutorial.step === 3 && (piece.id === tutorial.sourcePieceId || piece.id === tutorial.targetPieceId)) {
          cellClasses += ' merge-cell-tutorial-highlight';
        }
        cellContent = `<img src="${svg}" class="${pieceClass}${animClass}"${imgStyle} draggable="false" data-action="merge-piece-click" data-cell="${i}" alt="${pInfo ? pInfo.name : ''}" title="${pInfo ? pInfo.name : ''}">`;
      }
      boardHtml += `<div class="${cellClasses}"${piece ? ' data-action="merge-piece-click"' : ''} data-cell="${i}" style="${cellStyle}">${cellContent}</div>`;
    }

    let descHtml = '';
    const displayInfo = selInfo || (mg.taskInfoDisplay ? info(mg.taskInfoDisplay.chainId, mg.taskInfoDisplay.level, false) : null);
    if (displayInfo) {
      const isBoardPiece = !!selInfo;
      const isMother = displayInfo.level === 0;
      const isPetrified = selectedPiece && selectedPiece.petrified;
      const chain = getMergeChainMap().get(displayInfo.chainId);
      let chainPieces = '';
      if (chain) {
        const showFull = displayInfo.level === 0;
        chainPieces += `<img src="${chain.motherSvg}" class="merge-chain-piece-img" alt="${chain.motherName}" title="${chain.motherName}" style="width:24px;height:24px;opacity:${showFull ? '1' : '0.6'};">`;
        for (const p of chain.pieces) {
          if (!showFull && p.level > displayInfo.level) break;
          chainPieces += `<img src="${p.svg}" class="merge-chain-piece-img" alt="${p.name}" title="Lv${p.level} ${p.name}" style="width:24px;height:24px;opacity:${p.level === displayInfo.level || showFull ? '1' : '0.4'};">`;
        }
      }
      const tutorialChainClass = isTutorialChainStep ? ' merge-desc-tutorial-highlight' : '';
      const tutorialChainAction = isTutorialChainStep ? ' data-action="merge-tutorial-advance"' : '';
      descHtml = `<div class="merge-desc${tutorialChainClass}"${tutorialChainAction}>
        <img src="${displayInfo.svg}" class="merge-desc-icon" alt="${displayInfo.name}">
        <div class="merge-desc-info">
          <span class="merge-desc-name">${escapeHtml(displayInfo.name)}</span>
          <div class="merge-chain-row">${chainPieces}</div>
        </div>
        ${isBoardPiece && !isMother && !isPetrified ? `<button class="secondary merge-discard-btn" data-action="merge-discard" data-cell="${mg.selectedPieceCell}">丢弃</button>` : ''}
      </div>`;
    } else {
      var hintText = isBiz ? '双击「机会」「产品」「商业」「执行」消耗灵感产生企划进度' : '双击「构思」「文献」「实证」「思辨」消耗灵感产生作业进度';
      descHtml = '<div class="merge-desc merge-desc-empty"><span class="merge-desc-hint">' + hintText + '</span></div>';
    }

    // Tutorial overlay and bubble
    var tutorialHtml = '';
    if (tutorial && tutorial.step < 5) {
      tutorialHtml = _renderTutorialHtmlContent(tutorial);
    }

    return `
      <div class="merge-header">
        <span class="merge-inspiration"><span class="merge-title-label">${isBiz ? '创业企划书' : '开始写作业'}</span> 灵感：${state.runtime?.player?.inspiration ?? 0} 疲劳：${state.runtime?.player?.fatigue ?? 0}</span>
        <button class="secondary merge-leave-btn${leaveGlow}" data-action="merge-leave">离开</button>
      </div>
      ${tasksHtml}
      <div class="merge-board${boardTutorialClass}" style="grid-template-columns:repeat(${MERGE_BOARD_COLS},1fr);grid-template-rows:repeat(${MERGE_BOARD_ROWS},1fr);">
        ${boardHtml}
      </div>
      <div class="merge-desc-area${descTutorialClass}">${descHtml}</div>
      ${tutorialHtml}
    `;
  }

  function _renderTutorialHtmlContent(tut) {
    var msg = '';
    if (tut.step === 0 && !tut.introDetailShown) msg = '完成任务要求即可获得企划书完成度，请点击要求框里的小图标';
    else if (tut.step === 0) msg = '这里会显示该图标的合成链，点击屏幕任意位置继续';
    else if (tut.step === 1) msg = '双击母棋可以消耗灵感生成新的棋子';
    else if (tut.step === 2) msg = '请再生成一个棋子';
    else if (tut.step === 3) msg = tut.usePetrifiedTarget
      ? '拖动新生成的普通棋子到相同的石化棋子上，即可解除石化并合成新棋子'
      : '拖动一个棋子到另一个相同的棋子上可以生成新的棋子';
    else if (tut.step === 4) msg = '点提交就能将合成的棋子提交到任务';
    if (!msg) return '';
    var overlayClass = 'merge-tutorial-overlay';
    if (tut.step !== 0) overlayClass += ' merge-tutorial-nonblock';
    if (tut.step === 0 && !tut.introDetailShown) overlayClass += ' merge-tutorial-wait-for-icon';
    var actionAttr = (tut.step === 0 && tut.introDetailShown) ? ' data-action="merge-tutorial-advance"' : '';
    return '<div class="' + overlayClass + '"' + actionAttr + '></div><div class="merge-tutorial-bubble">' + msg + '</div>';
  }

  function renderMergeGame() {
    return `<div class="merge-game-wrapper"><div class="merge-game-container">${renderMergeGameContent()}</div></div>`;
  }

  function renderIntro() {
    if (!state.runtime) {
      return '';
    }
    if (state.runtime.phase === 'intro') {
      return `
        <div class="panel section intro-layout">
          <div class="muted-box intro-copy">
            是的，就像标题暗示的那样，你是个穷人。<br />
            你在毕业前的最后一年转入兰斯特皇家学院，必须在这一年里确保自己能在吃得饱饭的前提下顺利毕业。<br />
            拿奖学金也好，打工也好，总之要想办法把生活费挣出来。<br />
            上学期任何一门普通课程低于 A 都会立即退学；进入下学期后，毕业时普通课程必须达到 B 以上，毕业论文和实习也必须完成，否则你将面对的是——<br /><strong class="intro-expulsion">无法毕业</strong>
          </div>
          <div class="inline-actions intro-actions">
            <button class="primary" data-action="start-opening-ceremony">前往报到</button>
          </div>
        </div>
      `;
    }
    return '';
  }

  function renderApplication() {
    if (!state.bootstrap) {
      return `
        <div class="panel section">
          <h2>${state.ui.loading ? '正在读取酒馆资料…' : '游戏初始化失败'}</h2>
          ${state.ui.loading ? '' : `
            <div class="status error" role="alert" style="white-space:pre-wrap;">${escapeHtml(state.ui.status || '未能加载游戏初始化数据。')}</div>
            <p class="subtle">请刷新酒馆页面后重新打开游戏；如果仍然失败，请反馈上方的具体错误。</p>
          `}
        </div>
      `;
    }
    return `
      <div class="panel section">
        <h2>入学申请书</h2>
        ${state.ui.status ? `<div class="status ${state.ui.statusTone || ''}" role="status" style="white-space:pre-wrap;">${escapeHtml(state.ui.status)}</div>` : ''}
        <form id="applicationForm" class="grid-2" style="margin-top:18px;">
          <div class="field">
            <label for="playerName">姓名</label>
            <input id="playerName" value="${escapeHtml(state.bootstrap?.playerProfile?.name || '')}" placeholder="未读取到酒馆主角卡姓名" disabled />
          </div>
          <div class="field">
            <label>性别 / 年龄</label>
            <input value="女 / 18岁" disabled />
          </div>
          <div class="field">
            <label for="birthMonth">生日月份</label>
            <select id="birthMonth" name="birthMonth">
              ${Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${index + 1}月</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label for="birthDay">生日日期</label>
            <select id="birthDay" name="birthDay">
              ${Array.from({ length: 31 }, (_, index) => `<option value="${index + 1}">${index + 1}日</option>`).join('')}
            </select>
          </div>
          <div class="inline-actions">
            <button class="primary" type="submit">提交</button>
          </div>
        </form>
      </div>
    `;
  }

  function renderSchedulePage() {
    const runtime = state.runtime;
    const weekDates = getWeekDates(runtime.player.currentDate);
    weekDates.forEach((dateText) => {
      getPlanForDate(runtime, dateText);
    });
    const weekHistories = getCurrentWeekHistories(runtime);
    const canExecute = weekDates
      .filter((dateText) => !isDateCompleted(runtime, dateText))
      .every((dateText) => {
        const plan = runtime.schedulePlans[dateText];
        return Boolean(plan && !plan.cleared);
      });
    const weekRows = [weekDates.slice(0, 3), weekDates.slice(3)];

    const fatigueClass = runtime.player.fatigue > 80 ? 'danger-text' : '';
    return `
      <div class="panel section schedule-panel">
        <div class="schedule-summary">
          <div class="schedule-summary-main">
            <strong>${escapeHtml(runtime.player.name)}</strong>
            <span>金钱：${runtime.player.money}</span>
            <span>灵感：${state.runtime?.player?.inspiration ?? 0}</span>
            <span>${escapeHtml(getTimelineLabel(runtime.player.currentDate))}</span>
            <span>每日生活费：${runtime.player.dailyCost}</span>
            <span class="${fatigueClass}">疲劳度：${runtime.player.fatigue}</span>
          </div>
          <div class="schedule-summary-actions">
            <button class="secondary" data-action="open-scores" ${state.ui.interactionLocked ? 'disabled' : ''}>成绩</button>
            <button class="secondary" data-action="open-outfits" ${state.ui.interactionLocked ? 'disabled' : ''}>礼服</button>
            ${runtime.player.currentDate < getTermMetaByFullId(GRADUATION_TERM_ID).start
              ? `<button class="secondary" data-action="open-internship-offers" ${state.ui.interactionLocked ? 'disabled' : ''}>实习机会</button>`
              : ''}
            ${getActiveHomeworkCourses().length > 0
              ? `<button class="secondary" data-action="open-homework-merge" ${state.ui.interactionLocked ? 'disabled' : ''}>做作业</button>`
              : ''}
            ${(runtime.player.bizProgress || 0) < BUSINESS_ENDING_SCORE
              ? `<button class="secondary" data-action="open-business-merge" ${state.ui.interactionLocked ? 'disabled' : ''}>写创业计划</button>`
              : ''}
          </div>
        </div>
        ${state.ui.status ? `<div class="schedule-meta-note"><div class="status ${state.ui.statusTone || ''}" style="white-space:pre-wrap;font-size:13px;">${escapeHtml(state.ui.status)}</div></div>` : ''}
        <div class="schedule-week-layout">
          ${weekRows.map((row, rowIndex) => `
            <div class="schedule-week-row ${rowIndex === 0 ? 'schedule-week-row-three' : 'schedule-week-row-four'}">
              ${row.map((dateText) => {
                const rawPlan = runtime.schedulePlans[dateText];
                const plan = rawPlan?.cleared ? null : rawPlan;
                const preview = getActionSummary(plan || getAvailableActions(runtime, dateText)[0]);
                const classes = [
                  'schedule-day-button',
                  plan?.completed ? 'completed' : '',
                  plan?.fixed ? 'fixed' : '',
                  !plan ? 'empty' : ''
                ].filter(Boolean).join(' ');
                const disabled = state.ui.interactionLocked || plan?.completed || plan?.fixed;
                return `
                  <button class="${classes}" data-action="select-day" data-date="${dateText}" ${disabled ? 'disabled' : ''}>
                    <span class="schedule-day-date">${escapeHtml(formatMonthDay(dateText))}</span>
                    <span class="schedule-day-weekday">${escapeHtml(formatWeekday(dateText))}</span>
                    <span class="schedule-day-plan">${escapeHtml(preview)}</span>
                  </button>
                `;
              }).join('')}
            </div>
          `).join('')}
        </div>

        <div class="schedule-execute-row">
          <button class="primary schedule-execute-button" data-action="execute-week" ${canExecute && !state.ui.interactionLocked ? '' : 'disabled'}>
            执行行程
          </button>
        </div>

        <div class="schedule-history-panel">
          <div class="schedule-history-header">
            <h3>本周履历</h3>
            ${state.ui.statChanges.length ? `
              <div class="stat-change-list">
                ${state.ui.statChanges.map((item) => `
                  <div class="stat-change-pill ${item.delta > 0 ? 'positive' : 'negative'}">
                    ${escapeHtml(`${item.label}${item.delta > 0 ? '+' : ''}${Math.round(item.delta * 100) / 100}`)}
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="schedule-history-scroll">
            ${weekHistories.length ? weekHistories.map((item) => item.chapterId ? `
              <button class="schedule-history-entry schedule-history-entry-button" data-action="open-chapter" data-chapter-id="${item.chapterId}">
                ${escapeHtml(item.text)}
              </button>
            ` : `
              <div class="schedule-history-entry">
                ${escapeHtml(item.text)}
              </div>
            `).join('') : '<div class="muted-box">本周还没有履历。</div>'}
          </div>
          <button class="secondary schedule-history-all-button" data-action="open-all-history" ${state.ui.interactionLocked ? 'disabled' : ''}>显示全部履历</button>
        </div>

        <div class="schedule-bottom-nav">
          <button class="nav-tab ${state.ui.page === 'schedule' ? 'active' : 'secondary'}" data-action="switch-page" data-page="schedule" ${state.ui.interactionLocked ? 'disabled' : ''}>行程</button>
          <button class="nav-tab ${state.ui.page === 'characters' ? 'active' : 'secondary'}" data-action="switch-page" data-page="characters" ${state.ui.interactionLocked ? 'disabled' : ''}>角色</button>
          <button class="nav-tab ${state.ui.page === 'system' ? 'active' : 'secondary'}" data-action="switch-page" data-page="system" ${state.ui.interactionLocked ? 'disabled' : ''}>系统</button>
        </div>
      </div>
    `;
  }

  function renderCharactersPage() {
    const runtime = state.runtime;
    return `
      <div class="panel section">
        <div class="topbar">
          <div>
            <h2></h2>
          </div>
        </div>
        <div class="character-list" style="margin-top:18px;">
          ${runtime.characters.length ? runtime.characters.map((character) => {
            const disabledReason = getInviteDisabledReason(runtime, character);
            const displayAvatarUrl = getCharacterDisplayAvatarUrl(character);
            return `
              <div class="character-card">
                <button class="image-preview-button" data-action="open-character-image" data-character-id="${character.id}" ${displayAvatarUrl === PLACEHOLDER_AVATAR ? 'disabled' : ''}>
                  <img class="avatar" src="${escapeHtml(displayAvatarUrl)}" alt="${escapeHtml(character.name)}" />
                </button>
                <div class="character-list">
                  <div>
                    <h3>${escapeHtml(character.name)}</h3>
                    <p class="subtle">${escapeHtml(getCharacterSummary(character))}</p>
                  </div>
                  <div class="pill">好感度 ${character.favorability}</div>
                  <div class="subtle">年龄：${character.age} · 生日：${character.birthMonth}月${character.birthDay}日 · 家业：${escapeHtml(character.familyBusiness || '未记录')}</div>
                  <div class="subtle">${escapeHtml(character.bio || '暂无人物小传。')}</div>
                  <div class="action-row">
                    <button class="primary" data-action="invite-character" data-character-id="${character.id}" ${disabledReason ? 'disabled' : ''}>邀约</button>
                    ${canRetryAvatarGeneration(character) ? `<button class="secondary" data-action="retry-avatar" data-character-id="${character.id}">${character.avatarStatus === 'failed' ? '重新生成头像' : '生成头像'}</button>` : ''}
                    ${disabledReason ? `<span class="subtle">${escapeHtml(disabledReason)}</span>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('') : '<div class="muted-box">角色列表目前为空。第一次开学典礼成功生成后，你会先认识一名角色。</div>'}
        </div>

        <div class="nav-row">
          <div class="schedule-bottom-nav">
            <button class="nav-tab secondary" data-action="switch-page" data-page="schedule">行程</button>
            <button class="nav-tab active" data-action="switch-page" data-page="characters">角色</button>
            <button class="nav-tab secondary" data-action="switch-page" data-page="system">系统</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSystemPage() {
    const worldbookExport = state.runtime?.meta?.worldbookExport;
    const worldbookStatus = worldbookExport?.status === 'success'
      ? `已导出世界书：${worldbookExport.worldbookName}`
      : (worldbookExport?.status === 'failed'
          ? `上次导出失败：${worldbookExport.error}`
          : '游戏不会自动创建、绑定或读取世界书。');
    const worldbookButtonLabel = worldbookExport?.status === 'pending'
      ? '正在导出…'
      : (worldbookExport?.status === 'success' ? '重新导出世界书' : '导出世界书');
    const textPresetMode = state.runtime?.meta?.textPresetMode === 'builtin' ? 'builtin' : 'tavern';
    return `
      <div class="panel section">
        <div class="topbar">
          <div>
            <h2></h2>
          </div>
          <div class="inline-actions">
            <button class="secondary" data-action="open-image-settings">生图设定</button>
            <button class="danger" data-action="restart-runtime">重开</button>
          </div>
        </div>
        <div class="inline-actions" style="margin-top:18px;">
          <button class="${state.ui.saveMode === 'save' ? 'primary' : 'secondary'}" data-action="set-save-mode" data-mode="save">存档</button>
          <button class="${state.ui.saveMode === 'load' ? 'primary' : 'secondary'}" data-action="set-save-mode" data-mode="load">读档</button>
        </div>
        <div style="margin-top:18px;">
          ${renderSaveCards()}
        </div>
        <div class="muted-box" style="margin-top:18px;">
          ${escapeHtml(worldbookStatus)}<br />
          导出的世界书可以在你新开的对话里挂载，用来和现有角色在酒馆里互动
          <div class="inline-actions" style="margin-top:10px;">
            <button class="secondary" data-action="export-worldbook" ${worldbookExport?.status === 'pending' ? 'disabled' : ''}>${worldbookButtonLabel}</button>
          </div>
        </div>
        <div class="muted-box" style="margin-top:12px;">
          <strong>文字生成预设</strong>
          <div class="inline-actions" style="margin-top:10px;">
            <button class="${textPresetMode === 'tavern' ? 'primary' : 'secondary'}" data-action="set-text-preset-mode" data-mode="tavern">酒馆当前预设</button>
            <button class="${textPresetMode === 'builtin' ? 'primary' : 'secondary'}" data-action="set-text-preset-mode" data-mode="builtin">游戏内置预设</button>
          </div>
          <div class="subtle" style="margin-top:8px;">
            酒馆模式会采用当前预设的文风与生成参数，并保留玩家启用的世界书内容。游戏内置预设会完全无视酒馆预设和世界书，但可以确保格式正确。注意游戏内置预设是gemini专属，用在其他模型上可能效果不好。
          </div>
        </div>

        <div class="nav-row">
          <div class="schedule-bottom-nav">
            <button class="nav-tab secondary" data-action="switch-page" data-page="schedule">行程</button>
            <button class="nav-tab secondary" data-action="switch-page" data-page="characters">角色</button>
            <button class="nav-tab active" data-action="switch-page" data-page="system">系统</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderMain() {
    const runtime = state.runtime;
    const content = runtime
      ? (runtime.phase === 'intro'
          ? renderIntro()
          : state.ui.page === 'merge-game'
            ? renderMergeGame()
            : (state.ui.page === 'characters'
                ? renderCharactersPage()
                : state.ui.page === 'system'
                  ? renderSystemPage()
                  : renderSchedulePage()))
      : renderApplication();

    return `
      <div class="page ${state.ui.interactionLocked && state.ui.page !== 'merge-game' ? 'interaction-locked' : ''}">
        ${content}
        ${runtime?.phase === 'ended' && runtime.meta.ending ? `
          <div class="panel section">
            <h2>${escapeHtml(runtime.meta.ending.title)}</h2>
            <p class="subtle">${escapeHtml(runtime.meta.ending.text)}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderModal() {
    const modal = state.ui.modal;
    if (!modal) {
      return '';
    }

    if (modal.type === 'chapter') {
      return `
        <div class="modal-backdrop">
          <div class="modal" data-chapter-id="${escapeHtml(modal.chapterId || modal.chapter.id)}">
            <div class="modal-body">
              <div class="story-content">${formatStoryContentHtml(modal.chapter.content)}</div>
              <div class="modal-actions">
                <button class="primary" data-action="close-modal">确定</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'text') {
      return `
        <div class="modal-backdrop">
          <div class="modal modal-center">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title)}</h2>
            </div>
            <div class="modal-body" style="text-align:center">
              <pre>${escapeHtml(modal.message)}</pre>
              <div class="modal-actions inline-actions" style="justify-content:center">
                <button class="primary" data-action="close-modal">确定</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'action-picker') {
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title)}</h2>
              <button class="secondary" data-action="close-modal">关闭</button>
            </div>
            <div class="modal-body">
              <div class="subtle">选择后会直接安排到这一天。</div>
              <div class="action-list">
                ${modal.actions.map((action) => `
                  <button class="action-card action-picker-button" data-action="choose-day-action" data-date="${modal.selectedDate}" data-token="${escapeHtml(getActionToken(action))}">
                    <strong>${escapeHtml(action.label)}</strong>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'internship-picker') {
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title)}</h2>
            </div>
            <div class="modal-body">
              <div class="subtle">请选择本学期最终参加的毕业实习。选择后不能更改。</div>
              <div class="action-list">
                ${modal.offers.map((offer) => `
                  <button class="action-card action-picker-button" data-action="select-internship-offer" data-offer-id="${escapeHtml(offer.id)}">
                    <strong>${escapeHtml(offer.label)}</strong>
                    <small>${escapeHtml(offer.locationText)}</small>
                  </button>
                `).join('')}
                <button class="action-card action-picker-button" data-action="select-internship-offer" data-offer-id="school">
                  <strong>学校分配的实习</strong>
                  <small>兰斯特皇家学院合作实习基地</small>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'internship-offers') {
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title)}</h2>
              <button class="secondary" data-action="close-modal">关闭</button>
            </div>
            <div class="modal-body">
              <div class="muted-box">目前共有 ${modal.offers.length} 份毕业实习邀请。</div>
              <div class="action-list">
                ${modal.offers.length ? modal.offers.map((offer) => `
                  <div class="action-card">
                    <strong>${escapeHtml(offer.label)}</strong>
                    <small>${escapeHtml(offer.locationText)}</small>
                  </div>
                `).join('') : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'confirm') {
      return `
        <div class="modal-backdrop">
          <div class="modal${modal.hideCancel ? ' modal-center' : ''}">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title)}</h2>
            </div>
            <div class="modal-body">
              <p${modal.hideCancel ? ' style="text-align:center"' : ''}>${escapeHtml(modal.message)}</p>
              <div class="modal-actions inline-actions"${modal.hideCancel ? ' style="justify-content:center"' : ''}>
                <button class="primary" data-action="confirm-modal">${escapeHtml(modal.confirmLabel || '确定')}</button>
                ${modal.hideCancel ? '' : '<button class="secondary" data-action="close-modal">取消</button>'}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'choice') {
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title)}</h2>
            </div>
            <div class="modal-body">
              <p>${escapeHtml(modal.message)}</p>
              <div class="modal-actions inline-actions">
                <button class="primary" data-action="confirm-modal">${escapeHtml(modal.confirmLabel || '是')}</button>
                <button class="secondary" data-action="cancel-modal">${escapeHtml(modal.cancelLabel || '否')}</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'error-retry') {
      const canRetryWithBuiltInPreset = /当前正在使用酒馆预设/.test(String(modal.message || ''));
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title)}</h2>
            </div>
            <div class="modal-body">
              <pre>${escapeHtml(modal.message)}</pre>
              <div class="modal-actions inline-actions">
                <button class="primary" data-action="retry-modal">重试</button>
                <button class="secondary" data-action="copy-error-details">复制报错信息</button>
                ${canRetryWithBuiltInPreset ? '<button class="secondary" data-action="retry-with-builtin-preset">改用游戏内置预设并重试</button>' : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'all-history') {
      const month = modal.month;
      const months = getAllHistoryMonths(state.runtime);
      const monthHistories = state.runtime.history.filter((item) => getMonthKey(item.date) === month);
      const currentIndex = months.indexOf(month);
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>全部履历</h2>
              <button class="secondary" data-action="close-modal">关闭</button>
            </div>
            <div class="modal-body">
              <div class="topbar">
                <button class="secondary" data-action="history-prev-month" ${currentIndex <= 0 ? 'disabled' : ''}>←</button>
                <strong>${escapeHtml(HISTORY_MONTH_FORMATTER.format(parseDate(`${month}-01`)))}</strong>
                <button class="secondary" data-action="history-next-month" ${currentIndex >= months.length - 1 ? 'disabled' : ''}>→</button>
              </div>
              <div class="history-list">
                ${monthHistories.map((item) => item.chapterId ? `
                  <button class="schedule-history-entry schedule-history-entry-button" data-action="open-chapter" data-chapter-id="${item.chapterId}">
                    ${escapeHtml(item.text)}
                  </button>
                ` : `
                  <div class="schedule-history-entry">${escapeHtml(item.text)}</div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'scores') {
      const currentMeta = getTermMeta(state.runtime.player.currentDate);
      var rawCurrentTermId = (currentMeta && !currentMeta.isBreak) ? currentMeta.id : null;
      var currentTermId = rawCurrentTermId && rawCurrentTermId.endsWith('-break') ? rawCurrentTermId.replace(/-break$/, '') : rawCurrentTermId;
      const sections = TERM_DEFINITIONS.map((term) => {
        const courseCards = getTermCourseIds(term.id, { includeSpecial: true }).map((courseId) => {
          const course = state.runtime.courses[courseId];
          if (SPECIAL_COURSE_IDS.has(courseId)) {
            return `
              <div class="score-card">
                <strong>${escapeHtml(course.courseName)}</strong>
                <div class="subtle">完成度：${Math.round(course.studyProgress)}</div>
                <div class="subtle">课程评价：${getGraduationCourseEvaluation(state.runtime, courseId)}</div>
              </div>
            `;
          }
          const currentHomework = course.currentAssignmentActive
            ? `第${course.assignmentCounter}次作业完成度（距离交作业尚有${course.homeworkWeeksRemaining}周）：${Math.round(course.currentHomeworkProgress)}`
            : '';
          return `
            <div class="score-card">
              <strong>${escapeHtml(course.courseName)}</strong>
              <div class="subtle">学习度：${Math.round(course.studyProgress)}</div>
              ${course.pastHomeworkGrades.map((grade, index) => `<div class="subtle">第${index + 1}次作业成绩：${grade}</div>`).join('')}
              ${currentHomework ? `<div class="subtle">${currentHomework}</div>` : ''}
              <div class="subtle">期末考试：${course.examScore ?? '--'}</div>
              <div class="subtle">课程评价：${course.finalGrade || '--'}</div>
            </div>
          `;
        }).join('');
        const isCurrent = term.id === currentTermId;
        return `
          <details class="score-term"${isCurrent ? ' open' : ''}>
            <summary class="score-term-summary"><h3>${escapeHtml(term.label)}</h3></summary>
            <div class="score-list">${courseCards || '<div class="subtle">暂无课程。</div>'}</div>
          </details>
        `;
      }).join('');

      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>成绩</h2>
              <button class="secondary" data-action="close-modal">关闭</button>
            </div>
            <div class="modal-body">
              ${sections}
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'outfits') {
      const outfits = (state.runtime?.outfits || []).filter((item) => item.imageUrl);
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>礼服</h2>
              <button class="secondary" data-action="close-modal">关闭</button>
            </div>
            <div class="modal-body">
              <div class="outfit-gallery-grid">
                ${outfits.length ? outfits.map((item) => `
                  <div class="outfit-gallery-card">
                    <button class="image-preview-button" data-action="open-outfit-image" data-outfit-id="${item.id}">
                      <img class="outfit-gallery-image" src="${escapeHtml(item.imageUrl)}" alt="礼服展示" />
                    </button>
                  </div>
                `).join('') : '<div class="muted-box">暂无礼服图片。</div>'}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'image-preview') {
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title || '')}</h2>
              <button class="secondary" data-action="close-modal">关闭</button>
            </div>
            <div class="modal-body">
              <img class="image-preview-full" src="${escapeHtml(modal.imageUrl || '')}" alt="${escapeHtml(modal.imageAlt || '原图')}" />
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'ai-settings') {
      return '';
      /* istanbul ignore next -- legacy web-only panel is unreachable in the role card */
      const settings = state.aiSettings || getDefaultAiSettings();
      const activity = state.aiActivity || loadAiActivity();
      return `
        <div class="modal-backdrop">
          <div class="modal ai-settings-modal">
            <div class="modal-header">
              <h2>AI 设定</h2>
              <button class="secondary" data-action="close-modal">关闭</button>
            </div>
            <div class="modal-body">
              <div class="grid-2 ai-settings-grid">
                <div class="field">
                  <label for="aiProvider">Provider</label>
                  <select id="aiProvider">
                    <option value="aiStudio" ${settings.provider === 'aiStudio' ? 'selected' : ''}>AI Studio</option>
                    <option value="vertex" ${settings.provider === 'vertex' ? 'selected' : ''}>Vertex AI</option>
                  </select>
                </div>
                <div class="field">
                  <label for="aiModelId">文字模型</label>
                  <select id="aiModelId">
                    ${AI_MODEL_OPTIONS[settings.provider].map((item) => `<option value="${item.id}" ${item.id === settings.modelId ? 'selected' : ''}>${item.label}</option>`).join('')}
                  </select>
                </div>
                <div class="field">
                  <label for="aiApiKey">AI Studio API Key</label>
                  <input id="aiApiKey" value="${escapeHtml(settings.apiKey)}" placeholder="使用 AI Studio 时填写" />
                </div>
                <div class="field">
                  <label for="aiProjectId">Vertex Project ID</label>
                  <input id="aiProjectId" value="${escapeHtml(settings.projectId)}" placeholder="使用 Vertex 时填写" />
                </div>
                <div class="field">
                  <label for="aiLocation">Vertex Location</label>
                  <input id="aiLocation" value="${escapeHtml(settings.location || 'global')}" placeholder="global" />
                </div>
                <div class="field">
                  <label for="aiServiceAccountJson">Vertex 服务账号 JSON</label>
                  <textarea id="aiServiceAccountJson" placeholder="使用 Vertex 时填写">${escapeHtml(settings.serviceAccountJson)}</textarea>
                </div>
              </div>
              <div class="muted-box">${settings.configured ? '当前 AI 设置已保存。' : '当前没有可用的 AI 设置。'}</div>
              <div class="inline-actions ai-settings-actions">
                <button class="primary" data-action="save-ai-settings">保存设定</button>
                <button class="secondary" data-action="test-ai-settings">测试连接</button>
                <button class="secondary" data-action="close-modal">关闭</button>
              </div>
              <div class="score-card">
                <h3>最近 5 次发送的 prompt JSON</h3>
                <div class="history-list">
                  ${(activity.recentPrompts || []).length ? activity.recentPrompts.map((item, index) => `
                    <details class="prompt-details">
                      <summary>${escapeHtml(`第 ${index + 1} 条｜${item.label || 'AI请求'}｜${(item.sentAt || '').replace('T', ' ').slice(0, 19) || '--'}｜${item.status === 'error' ? '失败' : '成功'}`)}</summary>
                      <pre>${escapeHtml(item.prompt || '暂无记录')}</pre>
                    </details>
                  `).join('') : '<div class="muted-box">暂无记录</div>'}
                </div>
              </div>
              <div class="score-card">
                <h3>最近一次从 AI 获得的文字</h3>
                <div class="subtle">${escapeHtml(activity.lastUsageText || 'token 消耗：暂无记录')}</div>
                <pre>${escapeHtml(activity.lastResponseText || '暂无记录')}</pre>
              </div>
              <div class="score-card">
                <h3>最近 20 行 log</h3>
                <div class="history-list">
                  ${activity.logs.length ? activity.logs.map((item) => `
                    <div class="history-card">
                      <div><strong>${escapeHtml(item.label || 'AI请求')}</strong></div>
                      <div class="subtle">发送时间：${escapeHtml((item.sentAt || '').replace('T', ' ').slice(0, 19) || '--')}</div>
                      <div class="subtle">收到回复时间：${escapeHtml((item.receivedAt || '').replace('T', ' ').slice(0, 19) || '--')}</div>
                      ${item.tokenText ? `<div class="subtle">token 消耗：${escapeHtml(item.tokenText)}</div>` : ''}
                      ${item.status === 'error'
                        ? `<div class="subtle">报错内容：${escapeHtml(item.error || '未知错误')}</div>`
                        : '<div class="subtle">状态：成功</div>'}
                    </div>
                  `).join('') : '<div class="muted-box">暂无 log。</div>'}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'date-picker') {
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title)}</h2>
              <button class="secondary" data-action="close-modal">关闭</button>
            </div>
            <div class="modal-body">
              <div class="date-picker-grid">
                ${modal.dates.map((item) => `
                  <button class="date-picker-card" data-action="pick-date" data-character-id="${modal.characterId}" data-date="${item.date}" ${item.disabled ? 'disabled' : ''}>
                    <strong>${escapeHtml(item.label)}</strong>
                    <small>${escapeHtml(item.weekday)}</small>
                    <small>${escapeHtml(item.preview)}</small>
                    ${(item.playerBirthday || item.characterBirthday) ? `<span class="pill">${item.playerBirthday ? '主角生日' : ''}${item.playerBirthday && item.characterBirthday ? ' / ' : ''}${item.characterBirthday ? 'TA 的生日' : ''}</span>` : ''}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (modal.type === 'chocolate-picker') {
      return `
        <div class="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <h2>${escapeHtml(modal.title)}</h2>
              <button class="secondary" data-action="close-modal">关闭</button>
            </div>
            <div class="modal-body">
              <div class="subtle">每送出一份巧克力需要 100 元。</div>
              <div class="date-picker-grid">
                ${modal.characters.map((character) => {
                  const selected = modal.selectedCharacterIds.includes(character.id);
                  const received = modal.valentinesFromIds.includes(character.id);
                  return `
                    <button class="date-picker-card" data-action="toggle-chocolate-character" data-character-id="${character.id}">
                      <strong>${escapeHtml(character.name)}</strong>
                      <small>${escapeHtml(character.identity || '无身份')}</small>
                      <small>${received ? '情人节曾送你巧克力' : '情人节未送你巧克力'}</small>
                      <span class="pill">${selected ? '本次送出' : '本次不送'}</span>
                    </button>
                  `;
                }).join('') || '<div class="muted-box">暂无可送巧克力的男性角色。</div>'}
              </div>
            </div>
            <div class="modal-footer">
              <button class="secondary" data-action="cancel-chocolate-pick">取消</button>
              <button data-action="confirm-chocolate-pick">确认</button>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  function render() {
    if (state.ui.loading) {
      app.innerHTML = `
        <div class="page">
          <div class="panel section">
            <div class="status warning">正在加载网站内容…</div>
          </div>
        </div>
      `;
      return;
    }

    if (state.ui.page === 'merge-game') {
      if (state.ui.modal && state.ui.modal.mergeGameModal) {
        app.innerHTML = renderMergeGame() + renderModal() + renderAiLoading();
        state._mergeHadModal = true;
      } else if (state._mergeHadModal) {
        state._mergeHadModal = false;
        app.innerHTML = renderMergeGame() + renderAiLoading();
      } else {
        var container = document.querySelector('.merge-game-container');
        if (container) {
          container.innerHTML = renderMergeGameContent();
        } else {
          app.innerHTML = renderMergeGame() + renderAiLoading();
        }
      }
      return;
    }

    const chapterModal = state.ui.modal?.type === 'chapter' ? state.ui.modal : null;
    const chapterId = chapterModal?.chapterId || chapterModal?.chapter?.id;
    const previousChapterElement = app.querySelector('.modal[data-chapter-id]');
    if (chapterModal && previousChapterElement?.dataset.chapterId === chapterId) {
      // 后台生图等任务会重绘页面；直接读取实际滚动容器，避免遗漏尚未派发的 scroll 事件。
      chapterModal.scrollTop = previousChapterElement.scrollTop;
      saveChapterModalState(chapterModal);
    }
    app.innerHTML = renderMain() + renderModal() + renderAiLoading();
    if (chapterModal) {
      const chapterElement = app.querySelector('.modal[data-chapter-id]');
      if (chapterElement) {
        // .modal 才是滚动容器；同步恢复，避免下一帧的回调覆盖玩家刚刚滚动的位置。
        chapterElement.scrollTop = Number(chapterModal.scrollTop || 0);
      }
    }
  }

  function renderAiLoading() {
    if (!state.ui.aiLoading || state.ui.page === 'merge-game') {
      return '';
    }
    var canEnterMerge = state.runtime && state.runtime.phase !== 'ended';
    var isEndingEvent = state.ui.currentAiEvent && ENDING_EVENT_NAMES.has(state.ui.currentAiEvent);
    var hasHomework = canEnterMerge && getActiveHomeworkCourses().length > 0;
    var bizDone = (state.runtime?.player?.bizProgress || 0) >= BUSINESS_ENDING_SCORE;
    var showButton = canEnterMerge && !isEndingEvent && !(!hasHomework && bizDone);
    var label = resolveMergeGameMode(hasHomework) === 'homework' ? '去写作业' : '去写创业企划书';
    return `
      <div class="loading-backdrop" aria-live="polite" aria-busy="true">
        <div class="loading-panel">
          <div class="loading-spinner" aria-hidden="true"></div>
          <div class="subtle">${escapeHtml(state.ui.aiLoading.message || '请稍候…')}</div>
          ${showButton ? `<button class="primary" data-action="merge-enter" style="margin-top:12px;">${label}</button>` : ''}
        </div>
      </div>
    `;
  }

  async function ensureBootstrap() {
    const [bootstrap] = await Promise.all([
      requestJson(GAME_BOOTSTRAP_URL),
      ensureSpecs()
    ]);
    state.bootstrap = bootstrap;
    if (bootstrap?.aiModels?.aiStudio?.length && bootstrap?.aiModels?.vertex?.length) {
      AI_MODEL_OPTIONS = bootstrap.aiModels;
    }
  }

  async function initializeGame() {
    await ensureBootstrap();
    await refreshAiSettings();
    state.aiActivity = loadAiActivity();
    await hydrateChatStorage();
    await migrateImagesToIDB();
    state.runtime = loadPreferredRuntime();
    state.mergeGame = null;
    if (state.runtime) {
      const images = await loadImagesFromIDB('runtime');
      restoreRuntimeImages(state.runtime, images);
      const imageMigration = await migrateRuntimeDataImagesToServer(state.runtime);
      if (imageMigration.changed) {
        saveCurrentRuntime();
        await persistChatStorage();
      }
      if (imageMigration.failed) {
        state.ui.status = '部分旧图片未能迁移到酒馆服务器；本机仍会保留这些图片，可稍后重新打开游戏再试。';
        state.ui.statusTone = 'error';
      }
      if (syncSchedulePlansWithBootstrap(state.runtime)) {
        saveCurrentRuntime();
      }
      const recoveredAssets = recoverInterruptedAssetJobs(state.runtime);
      if (recoveredAssets.changed) {
        saveCurrentRuntime();
      }
      state.ui.page = 'schedule';
      state.ui.selectedDate = getWeekDates(state.runtime.player.currentDate).find((dateText) => !isDateCompleted(state.runtime, dateText)) || getWeekStart(state.runtime.player.currentDate);
      const chapterModalState = loadChapterModalState();
      if (chapterModalState?.chapterId) {
        const chapter = state.runtime.chapters.find((item) => item.id === chapterModalState.chapterId);
        if (chapter) {
          state.ui.modal = {
            type: 'chapter',
            chapter,
            chapterId: chapter.id,
            scrollTop: chapterModalState.scrollTop || 0
          };
        } else {
          clearChapterModalState();
        }
      }
      restorePendingStoryEventUi();
      for (const characterId of recoveredAssets.avatarIds) {
        queueCharacterAvatarGeneration(characterId);
      }
      for (const outfitId of recoveredAssets.outfitIds) {
        queueOutfitImageGeneration(outfitId);
      }
    }
  }

  async function boot() {
    state.ui.loading = true;
    render();
    try {
      await initializeGame();
    } catch (error) {
      setStatus(error.message || '初始化失败。', 'error');
    } finally {
      state.ui.loading = false;
      render();
    }
  }

  function submitApplication(form) {
    const name = String(state.bootstrap?.playerProfile?.name || '').trim();
    const birthMonth = Number(form.get('birthMonth'));
    const birthDay = Number(form.get('birthDay'));
    if (!name) {
      throw new Error('未读取到酒馆玩家主角卡姓名，请先在酒馆中选择主角卡。');
    }
    state.runtime = createRuntime({ name, birthMonth, birthDay });
    saveCurrentRuntime();
    saveAutoSlot();
    setStatus('主角已建立。下一步会进入入学说明，再触发第一次开学典礼。', 'success');
    render();
    scrollViewportToTop();
  }

  function chooseDayAction(dateText, token) {
    const action = buildActionFromToken(state.runtime, dateText, token);
    if (!action) {
      return;
    }
    const weekDates = getWeekDates(dateText);
    if (action.activity === '班级度假') {
      if (state.runtime.player.money < 10000) {
        throw new Error('金钱不足以参与班级度假。');
      }
      if (weekDates.some((day) => {
        const existing = getPlanForDate(state.runtime, day);
        return existing && existing.kind === 'date' && !existing.completed;
      })) {
        throw new Error('本周已有约会，不能安排班级度假。');
      }
      for (const day of weekDates) {
        setPlanForDate(state.runtime, day, {
          ...action,
          fixed: false,
          completed: false
        });
      }
      saveCurrentRuntime();
      setStatus(`${getTimelineLabel(dateText)} 所在整周已安排为：${action.label}`, 'success');
      render();
      return;
    }
    if (weekDates.some((day) => normalizeActivityLabel(state.runtime.schedulePlans[day]?.activity || state.runtime.schedulePlans[day]?.label || '') === '班级度假')) {
      for (const day of weekDates) {
        state.runtime.schedulePlans[day] = {
          cleared: true,
          completed: false,
          fixed: false,
          label: ''
        };
      }
    }
    setPlanForDate(state.runtime, dateText, {
      ...action,
      fixed: Boolean(action.fixed),
      completed: false
    });
    saveCurrentRuntime();
    setStatus(`${formatMonthDay(dateText)} 已安排为：${action.label}`, 'success');
    render();
  }

  function changeHistoryMonth(direction) {
    const months = getAllHistoryMonths(state.runtime);
    const currentIndex = months.indexOf(state.ui.modal.month);
    const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (months[nextIndex]) {
      state.ui.modal.month = months[nextIndex];
      render();
    }
  }

  function collectAiModalSettings() {
    const provider = document.getElementById('aiProvider')?.value || 'aiStudio';
    const modelId = document.getElementById('aiModelId')?.value || AI_MODEL_OPTIONS[provider][0].id;
    return {
      provider,
      modelId,
      apiKey: document.getElementById('aiApiKey')?.value || '',
      projectId: document.getElementById('aiProjectId')?.value || '',
      location: document.getElementById('aiLocation')?.value || 'global',
      serviceAccountJson: document.getElementById('aiServiceAccountJson')?.value || ''
    };
  }

  async function saveAiSettingsFromModal() {
    const settings = validateAiSettings(collectAiModalSettings(), { requireCredentials: true });
    const saved = await postJson('api/admin/ai-settings', settings);
    state.aiSettings = normalizeServerAiSettings(saved?.settings || settings);
    setStatus('AI 设定已保存。', 'success');
    closeModal();
  }

  async function testAiSettingsFromModal() {
    const settings = validateAiSettings(collectAiModalSettings(), { requireCredentials: true });
    const payload = {
      settings,
      modelId: settings.modelId,
      prompt: 'Reply with OK only.',
      options: {
        systemInstruction: '',
        temperature: 0.2,
        topP: 0.8,
        topK: 20,
        maxOutputTokens: 64,
        candidateCount: 1,
        stopSequences: '',
        responseMimeType: 'text/plain'
      }
    };
    const sentAt = nowIso();
    const loggedPrompt = buildLoggedPrompt({
      provider: settings.provider,
      modelId: settings.modelId,
      prompt: payload.prompt,
      options: payload.options
    });
    setStatus('正在测试 AI 连接…', 'warning');
    setAiLoading('正在测试 AI 连接，请稍候…');
    let result;
    try {
      result = await postJson('api/admin/ai-settings/test', payload);
      const receivedAt = nowIso();
      recordAiSuccess(loggedPrompt, result, 'AI连接测试', sentAt, receivedAt);
      render();
    } catch (error) {
      const receivedAt = nowIso();
      recordAiFailure(loggedPrompt, error, 'AI连接测试', sentAt, receivedAt);
      render();
      throw error;
    } finally {
      clearAiLoading();
    }
    setStatus(`连接成功：${result.model.label || result.model.id}`, 'success');
  }

  app.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      if (event.target.id === 'applicationForm') {
        submitApplication(form);
      }
    } catch (error) {
      setStatus(error.message || '提交失败。', 'error');
    }
  });

  document.getElementById('gameInfoButton')?.addEventListener('click', () => {
    openModal({
      type: 'text',
      title: '游戏信息',
      message: '版本 1.0\n作者 水螅'
    });
  });

  app.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) {
      return;
    }

    const { action } = button.dataset;
    try {
      switch (action) {
        case 'switch-page':
          setCurrentPage(button.dataset.page);
          return;
        case 'select-day':
          state.ui.selectedDate = button.dataset.date;
          openActionPickerForDate(button.dataset.date);
          return;
        case 'choose-day-action':
          if (state.ui.modal?.type === 'action-picker') {
            closeModal();
          }
          chooseDayAction(button.dataset.date, button.dataset.token);
          return;
        case 'select-internship-offer':
          if (state.ui.modal?.type === 'internship-picker') {
            const resolver = state.ui.modal.resolver;
            state.ui.modal.resolver = null;
            closeModal();
            if (resolver) {
              resolver(button.dataset.offerId);
            }
          }
          return;
        case 'execute-week':
          await executeCurrentWeek();
          return;
        case 'open-all-history':
          openAllHistoryModal();
          return;
        case 'export-worldbook': {
          setStatus('正在导出独立世界书…', 'warning');
          const exported = await exportWorldbook(state.runtime);
          saveCurrentRuntime();
          render();
          if (exported?.status === 'success') {
            setStatus(`世界书已导出：${exported.worldbookName}`, 'success');
          } else {
            setStatus(exported?.error || '世界书导出失败。', 'error');
          }
          return;
        }
        case 'open-image-settings': {
          const bridge = getTavernBridge();
          if (!bridge || typeof bridge.openImageSetup !== 'function') {
            throw new Error('没有找到游戏内生图检测页面的桥接接口。');
          }
          const opened = await bridge.openImageSetup();
          if (!opened) {
            throw new Error('游戏内生图检测页面打开失败，请刷新酒馆后重试。');
          }
          return;
        }
        case 'open-chapter':
          showChapterModal(button.dataset.chapterId);
          return;
        case 'close-modal':
          closeModal();
          return;
        case 'show-chapter-prompt': {
          const debug = loadChapterDebug(button.dataset.chapterId);
          openModal({
            type: 'text',
            title: '本次发送的 prompt',
            message: debug.promptText || '暂无记录',
            returnToModal: state.ui.modal
          });
          return;
        }
        case 'show-chapter-raw-response': {
          const debug = loadChapterDebug(button.dataset.chapterId);
          openModal({
            type: 'text',
            title: 'AI 原始返回内容',
            message: debug.rawResponse || '暂无记录',
            returnToModal: state.ui.modal
          });
          return;
        }
        case 'confirm-modal':
          if (state.ui.modal?.onConfirm) {
            const onConfirm = state.ui.modal.onConfirm;
            closeModal();
            onConfirm();
          } else {
            closeModal();
          }
          return;
        case 'cancel-modal':
          if (state.ui.modal?.onCancel) {
            const onCancel = state.ui.modal.onCancel;
            closeModal();
            onCancel();
          } else {
            closeModal();
          }
          return;
        case 'retry-modal':
          if (state.ui.modal?.onRetry) {
            const retry = state.ui.modal.onRetry;
            closeModal();
            await retry();
          }
          return;
        case 'copy-error-details':
          try {
            await copyTextToClipboard(state.ui.modal?.message || '');
            button.textContent = '已复制';
          } catch (error) {
            setStatus(error.message || '复制报错信息失败。', 'error');
          }
          return;
        case 'retry-with-builtin-preset':
          {
            const retry = state.ui.modal?.onRetry;
            if (state.runtime) {
              state.runtime.meta.textPresetMode = 'builtin';
              saveCurrentRuntime();
            }
            closeModal();
            if (retry) {
              await retry();
            }
          }
          return;
        case 'history-prev-month':
          changeHistoryMonth('prev');
          return;
        case 'history-next-month':
          changeHistoryMonth('next');
          return;
        case 'open-scores':
          openScoreModal();
          return;
        case 'open-outfits':
          openOutfitModal();
          return;
        case 'open-internship-offers':
          openInternshipOffersModal();
          return;
        case 'open-homework-merge':
          enterMergeGame('homework');
          return;
        case 'open-business-merge':
          enterMergeGame('biz');
          return;
        case 'set-save-mode':
          state.ui.saveMode = button.dataset.mode;
          render();
          return;
        case 'set-text-preset-mode': {
          const mode = button.dataset.mode === 'builtin' ? 'builtin' : 'tavern';
          state.runtime.meta.textPresetMode = mode;
          saveCurrentRuntime();
          await flushChatStorage();
          setStatus(mode === 'tavern' ? '文字生成已使用酒馆当前预设。' : '文字生成已使用游戏内置预设。', 'success');
          render();
          return;
        }
        case 'save-slot': {
          const slot = Number(button.dataset.slot);
          const ok = saveManualSlot(slot);
          if (!ok) {
            render();
            return;
          }
          const mediaSaved = await flushPendingImageWrites();
          if (!mediaSaved) {
            throw new Error('存档主体已保存，但图片保存失败，请重试。');
          }
          await flushChatStorage();
          setStatus(`已保存到存档位 ${slot}。`, 'success');
          render();
          await waitForTextModal('提示', '存档成功');
          return;
        }
        case 'load-slot': {
          const saved = loadManualSlot(Number(button.dataset.slot));
          if (!saved?.runtime) {
            throw new Error('这个存档位还是空的。');
          }
          state.runtime = saved.runtime;
          state.mergeGame = null;
          await flushPendingImageWrites();
          const slotImages = await loadImagesFromIDB(`slot${button.dataset.slot}`);
          restoreRuntimeImages(state.runtime, slotImages);
          saveCurrentRuntime();
          await flushChatStorage();
          setStatus(`已从存档位 ${button.dataset.slot} 读档。`, 'success');
          render();
          await waitForTextModal('提示', '读档成功');
          return;
        }
        case 'load-auto-save': {
          const auto = loadAutoSlot();
          if (!auto?.runtime) {
            throw new Error('还没有自动存档。');
          }
          state.runtime = auto.runtime;
          state.mergeGame = null;
          await flushPendingImageWrites();
          const autoImages = await loadImagesFromIDB('auto');
          restoreRuntimeImages(state.runtime, autoImages);
          saveCurrentRuntime();
          await flushChatStorage();
          setStatus('已读取自动存档。', 'success');
          render();
          await waitForTextModal('提示', '读档成功');
          return;
        }
        case 'restart-runtime':
          openConfirmModal('确定要重开吗？', '这会清空当前运行中的数据，但不会删除手动存档和自动存档。', () => {
            closeModal();
            clearCurrentRuntime();
            setStatus('当前运行数据已清空。', 'warning');
            render();
          });
          return;
        case 'invite-character':
          handleInvite(button.dataset.characterId);
          return;
        case 'open-character-image':
          openCharacterImagePreview(button.dataset.characterId);
          return;
        case 'open-outfit-image':
          openOutfitImagePreview(button.dataset.outfitId);
          return;
        case 'retry-avatar':
          if (await queueCharacterAvatarGeneration(button.dataset.characterId)) {
            setStatus('已重新提交头像生成请求。', 'success');
          }
          return;
        case 'pick-date':
          if (state.ui.modal?.type === 'date-picker') {
            const inviteOrigin = state.ui.modal.inviteOrigin || 'player';
            const resolver = state.ui.modal.resolver;
            state.ui.modal.resolver = null;
            closeModal();
            completeInvite(button.dataset.characterId, button.dataset.date, inviteOrigin);
            if (resolver) {
              resolver(button.dataset.date);
            }
          }
          return;
        case 'toggle-chocolate-character':
          if (state.ui.modal?.type === 'chocolate-picker') {
            const selected = new Set(state.ui.modal.selectedCharacterIds || []);
            if (selected.has(button.dataset.characterId)) {
              selected.delete(button.dataset.characterId);
            } else {
              selected.add(button.dataset.characterId);
            }
            state.ui.modal.selectedCharacterIds = [...selected];
            render();
          }
          return;
        case 'cancel-chocolate-pick':
          if (state.ui.modal?.type === 'chocolate-picker') {
            const resolver = state.ui.modal.resolver;
            state.ui.modal.resolver = null;
            closeModal();
            if (resolver) {
              resolver([]);
            }
          } else {
            closeModal();
          }
          return;
        case 'confirm-chocolate-pick':
          if (state.ui.modal?.type === 'chocolate-picker') {
            const resolver = state.ui.modal.resolver;
            const selectedIds = (state.ui.modal.selectedCharacterIds || []).slice();
            state.ui.modal.resolver = null;
            closeModal();
            if (resolver) {
              resolver(selectedIds);
            }
          }
          return;
        case 'start-opening-ceremony':
          await runFirstOpeningCeremony();
          return;
        case 'merge-piece-click': {
          // Pointer gestures are handled on pointerup, before a render can
          // replace the image or the browser can retarget its follow-up click.
          if (event.detail !== 0) return;
          const cellIndex = Number(button.dataset.cell);
          state.mergeGame.taskInfoDisplay = null;
          handleMergePieceClick(cellIndex);
          render();
          setTimeout(function () { saveCurrentRuntime(); }, 0);
          return;
        }
        case 'merge-task-piece-info': {
          // The first tutorial screen only accepts the highlighted requirement icon.
          if (state.mergeGame.tutorial && state.mergeGame.tutorial.step >= 1 && state.mergeGame.tutorial.step <= 4) return;
          const chainId = Number(button.dataset.chainId);
          const level = Number(button.dataset.level);
          state.mergeGame.selectedPieceCell = null;
          state.mergeGame.generationMotherId = null;
          state.mergeGame.taskInfoDisplay = { chainId, level };
          state.mergeGame.lastTaskPieceClick = { chainId, level, time: Date.now() };
          if (state.mergeGame.tutorial && state.mergeGame.tutorial.step === 0) {
            state.mergeGame.tutorial.introDetailShown = true;
          }
          render();
          setTimeout(function () { saveCurrentRuntime(); }, 0);
          return;
        }
        case 'merge-discard': {
          // Block discard during tutorial
          if (state.mergeGame.tutorial && state.mergeGame.tutorial.step < 5) return;
          const cellIndex = Number(button.dataset.cell);
          handleMergePieceDiscard(cellIndex);
          render();
          setTimeout(function () { saveCurrentRuntime(); }, 0);
          return;
        }
        case 'merge-submit': {
          // Only allow submit during step 4 or no tutorial
          if (state.mergeGame.tutorial && state.mergeGame.tutorial.step !== 4) return;
          const taskIndex = Number(button.dataset.taskIndex);
          submitMergeTask(taskIndex);
          return;
        }
        case 'merge-enter': {
          var hasHomework = getActiveHomeworkCourses().length > 0;
          var mode = resolveMergeGameMode(hasHomework);
          enterMergeGame(mode);
          return;
        }
        case 'merge-tutorial-advance':
          if (state.mergeGame && state.mergeGame.tutorial) {
            var tut = state.mergeGame.tutorial;
            if (tut.step === 0 && tut.introDetailShown) {
              tut.step = 1;
              state.mergeGame.taskInfoDisplay = null;
            }
            // step 1 and 2 advance via generateTutorialChildPiece
            // step 3 advances via handleMergeDrop
            // step 4 advances via submitMergeTask
            render();
            setTimeout(function () { saveCurrentRuntime(); }, 0);
          }
          return;
        case 'merge-leave':
          if (state.mergeGame) {
            state.mergeGame.generationMotherId = null;
            state.mergeGame.selectedPieceCell = null;
          }
          leaveMergeGame();
          return;
        default:
          return;
      }
    } catch (error) {
      setStatus(error.message || '操作失败。', 'error');
    }
  });

  // 合成小游戏 拖拽 (touch-action:none 在 CSS 上防滚动，不需要 preventDefault)
  let mergeDrag = null;
  let mergeClone = null;
  let mergeDragOrigImg = null;

  function getMergeCellFromBoard(boardEl, clientX, clientY) {
    const hitElement = document.elementFromPoint?.(clientX, clientY);
    const hitCell = hitElement?.closest?.('.merge-cell');
    if (hitCell && boardEl.contains(hitCell)) {
      return Number(hitCell.dataset.cell);
    }

    // elementFromPoint 在部分内嵌浏览器中可能不可用；按真实格子边界兜底，避免边框和 gap 造成落点偏移。
    const cells = boardEl.querySelectorAll('.merge-cell');
    for (const cell of cells) {
      const rect = cell.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return Number(cell.dataset.cell);
      }
    }
    return -1;
  }

  function showMergeClone(imgEl, clientX, clientY) {
    removeMergeClone();
    mergeDragOrigImg = imgEl;
    imgEl.style.opacity = '0';
    const clone = imgEl.cloneNode(true);
    clone.className = '';
    clone.style.position = 'fixed';
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    clone.style.width = (imgEl.getBoundingClientRect().width * 1.25) + 'px';
    clone.style.height = (imgEl.getBoundingClientRect().height * 1.25) + 'px';
    clone.style.opacity = '0.9';
    clone.style.transform = 'translate(-50%, -50%)';
    clone.style.filter = 'drop-shadow(0 4px 16px rgba(126,34,206,0.6))';
    clone.style.left = clientX + 'px';
    clone.style.top = clientY + 'px';
    document.body.appendChild(clone);
    mergeClone = clone;
  }

  function moveMergeClone(clientX, clientY) {
    if (!mergeClone) return;
    mergeClone.style.left = clientX + 'px';
    mergeClone.style.top = clientY + 'px';
  }

  function removeMergeClone() {
    if (mergeDragOrigImg) {
      mergeDragOrigImg.style.opacity = '';
      mergeDragOrigImg = null;
    }
    if (mergeClone) {
      mergeClone.remove();
      mergeClone = null;
    }
  }

  app.addEventListener('pointerdown', (event) => {
    if (!state.mergeGame || mergeDrag || event.button !== 0 || event.isPrimary === false) return;
    const cellEl = event.target.closest?.('.merge-cell');
    if (!cellEl) return;
    const cell = Number(cellEl.dataset.cell);
    const piece = state.mergeGame.board[cell];
    if (!piece) return;
    const tutorial = state.mergeGame.tutorial;
    const canDrag = !piece.petrified && (!tutorial || tutorial.step >= 5 ||
      (tutorial.step === 3 && piece.chainId === 1 && piece.level === 1));
    // Track taps in tutorial generation steps too. Both mother and child
    // pieces remain draggable in free play; capture only after real movement.
    mergeDrag = { cell, startX: event.clientX, startY: event.clientY, moved: false, captured: false, pointerId: event.pointerId, target: cellEl, canDrag, pieceId: piece.id, game: state.mergeGame };
  });

  app.addEventListener('pointermove', (event) => {
    if (!mergeDrag || event.pointerId !== mergeDrag.pointerId) return;
    // Use radial distance so small diagonal jitter is still a tap.
    if (!mergeDrag.moved && Math.hypot(event.clientX - mergeDrag.startX, event.clientY - mergeDrag.startY) < 10) return;
    if (!mergeDrag.moved) {
      mergeDrag.moved = true;
      state.mergeGame.generationMotherId = null;
      if (!mergeDrag.canDrag) return;
      mergeDrag.target?.setPointerCapture?.(mergeDrag.pointerId);
      mergeDrag.captured = true;
      const cellEl = document.querySelector(`.merge-cell[data-cell="${mergeDrag.cell}"]`);
      const img = cellEl?.querySelector('.merge-piece-img');
      if (img) showMergeClone(img, event.clientX, event.clientY);
    }
    moveMergeClone(event.clientX, event.clientY);
  });

  app.addEventListener('pointerup', (event) => {
    if (mergeDrag && event.pointerId !== mergeDrag.pointerId) return;
    if (!mergeDrag || !state.mergeGame) { mergeDrag = null; removeMergeClone(); return; }
    const completedDrag = mergeDrag;
    mergeDrag = null;
    if (completedDrag.captured && completedDrag.target && completedDrag.pointerId != null) {
      completedDrag.target.releasePointerCapture?.(completedDrag.pointerId);
    }
    removeMergeClone();
    if (state.mergeGame !== completedDrag.game || state.mergeGame.board[completedDrag.cell]?.id !== completedDrag.pieceId) return;
    if (completedDrag.moved) {
      if (!completedDrag.canDrag) return;
      const boardEl = document.querySelector('.merge-board');
      if (boardEl) {
        const targetCell = getMergeCellFromBoard(boardEl, event.clientX, event.clientY);
        if (targetCell >= 0 && targetCell !== completedDrag.cell) {
          handleMergeDrop(completedDrag.cell, targetCell);
        }
      }
      render();
      setTimeout(function () { saveCurrentRuntime(); }, 0);
    } else {
      const boardEl = document.querySelector('.merge-board');
      if (!boardEl || getMergeCellFromBoard(boardEl, event.clientX, event.clientY) !== completedDrag.cell) return;
      state.mergeGame.taskInfoDisplay = null;
      handleMergePieceClick(completedDrag.cell);
      render();
      setTimeout(function () { saveCurrentRuntime(); }, 0);
    }
  });

  app.addEventListener('pointercancel', (event) => {
    if (!mergeDrag || event.pointerId !== mergeDrag.pointerId) return;
    if (state.mergeGame) state.mergeGame.generationMotherId = null;
    if (mergeDrag?.captured && mergeDrag.target && mergeDrag.pointerId != null) {
      mergeDrag.target.releasePointerCapture?.(mergeDrag.pointerId);
    }
    mergeDrag = null;
    removeMergeClone();
  });

  app.addEventListener('change', (event) => {
    if (event.target.id === 'aiProvider') {
      const provider = event.target.value === 'vertex' ? 'vertex' : 'aiStudio';
      const select = document.getElementById('aiModelId');
      if (select) {
        select.innerHTML = AI_MODEL_OPTIONS[provider]
          .map((item) => `<option value="${item.id}">${item.label}</option>`)
          .join('');
      }
    }
  });

  app.addEventListener('scroll', (event) => {
    if (state.ui.modal?.type !== 'chapter') {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement) || target !== app.querySelector('.modal[data-chapter-id]')
      || target.dataset.chapterId !== (state.ui.modal.chapterId || state.ui.modal.chapter?.id)) {
      return;
    }
    state.ui.modal.scrollTop = target.scrollTop;
    saveChapterModalState(state.ui.modal);
  }, true);

  boot();
}());
