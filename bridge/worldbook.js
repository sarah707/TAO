function cleanLine(value, fallback = '无') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function safeWorldbookPart(value) {
  return cleanLine(value, '主角')
    .replace(/[\\/:*?"<>|]/g, '·')
    .slice(0, 32);
}

function formatCreatedAt(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return '毕业存档';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function entry(name, content, options = {}) {
  return {
    name,
    enabled: true,
    strategy: {
      type: options.constant ? 'constant' : 'selective',
      keys: options.keys || [],
      keys_secondary: { logic: 'and_any', keys: [] },
      scan_depth: 'same_as_global'
    },
    position: {
      type: 'before_character_definition',
      role: 'system',
      depth: 4,
      order: options.order || 100
    },
    content,
    probability: 100,
    recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
    effect: { sticky: null, cooldown: null, delay: null },
    extra: { source: 'noble-school-tavern-card', schemaVersion: 2, ...(options.extra || {}) }
  };
}

export const LIVE_WORLDBOOK_SOURCE = 'noble-school-tavern-card';

function buildCourseLines(runtime) {
  return Object.entries(runtime?.courses || {}).map(([courseId, course]) => {
    const label = cleanLine(course?.name || course?.label || courseId);
    const grade = cleanLine(course?.finalGrade || course?.grade || '未记录');
    const progress = Number(course?.studyProgress ?? course?.progress);
    return `- ${label}：${grade}${Number.isFinite(progress) ? `（进度 ${Math.round(progress)}%）` : ''}`;
  });
}

function buildPlayerContent(runtime) {
  const player = runtime?.player || {};
  const ending = runtime?.meta?.ending || {};
  const lovers = (runtime?.characters || []).filter((character) => character?.isLover).map((character) => character.name);
  const courseLines = buildCourseLines(runtime);
  return [
    '<GraduationProfile>',
    `姓名：${cleanLine(player.name)}`,
    `年龄：${cleanLine(player.age)}`,
    `性别：${cleanLine(player.gender)}`,
    `生日：${cleanLine(player.birthdayMonth)}月${cleanLine(player.birthdayDay)}日`,
    `毕业结局：${cleanLine(ending.title, '顺利毕业')}`,
    `毕业实习：${cleanLine(player.graduationInternship)}`,
    `毕业论文进度：${Math.round(Number(player.graduationThesisProgress || 0))}%`,
    `创业企划进度：${Math.round(Number(player.bizProgress || 0))}%`,
    `毕业时资金：${Math.round(Number(player.money || 0))}`,
    `恋人：${lovers.length ? lovers.join('、') : '无'}`,
    '课程成绩：',
    ...(courseLines.length ? courseLines : ['- 无记录']),
    '',
    '续写约定：以上内容是小游戏通关后的既定事实。后续对话从毕业之后开始，保留人物已经建立的关系和共同经历，不把小游戏重新开局。',
    '</GraduationProfile>'
  ].join('\n');
}

function buildLivePlayerContent(runtime) {
  const player = runtime?.player || {};
  return [
    '<PlayerProfile>',
    '【可自由编辑】游戏生成剧情时会重新读取本条目，并以玩家修改后的文字为准。',
    `姓名：${cleanLine(player.name)}`,
    `年龄：${cleanLine(player.age)}`,
    `性别：${cleanLine(player.gender)}`,
    `生日：${cleanLine(player.birthdayMonth)}月${cleanLine(player.birthdayDay)}日`,
    `当前日期：${cleanLine(player.currentDate)}`,
    `当前资金：${Math.round(Number(player.money || 0))}`,
    `疲劳度：${Math.round(Number(player.fatigue || 0))}`,
    `灵感：${Math.round(Number(player.inspiration || 0))}`,
    '背景：贫穷的毕业年级女学生，作为特招生转入兰斯特皇家学院，用最后一个学年完成课程、工作、社交、实习与毕业目标。',
    '</PlayerProfile>'
  ].join('\n');
}

function buildHistoryContent(runtime) {
  const lines = (runtime?.history || []).map((item) => {
    if (typeof item === 'string') return item.trim();
    const date = cleanLine(item?.date || item?.dateText, '');
    const text = cleanLine(item?.text || item?.content || item?.summary, '');
    return [date, text].filter(Boolean).join(' ');
  }).filter(Boolean);
  return `<SchoolHistory>\n${lines.length ? lines.join('\n') : '暂无履历记录'}\n</SchoolHistory>`;
}

function buildCharacterContent(character) {
  return [
    '<CharacterProfile>',
    '【可自由编辑】游戏生成剧情时会重新读取本条目，并以玩家修改后的文字为准。',
    `姓名：${cleanLine(character?.name)}`,
    `年龄：${cleanLine(character?.age)}`,
    `性别：${cleanLine(character?.gender)}`,
    `生日：${cleanLine(character?.birthMonth)}月${cleanLine(character?.birthDay)}日`,
    `身份：${cleanLine(character?.identity)}`,
    `所属：${cleanLine(character?.affiliation)}`,
    `学校与年级：${cleanLine(character?.school)}${Number(character?.grade) > 0 ? `${character.grade}年级` : ''}`,
    `与主角关系：${character?.isLover ? '恋人' : `好感度 ${Math.round(Number(character?.favorability || 0))}`}`,
    `家业：${cleanLine(character?.familyBusiness)}`,
    `外貌服饰氛围气味：${cleanLine(character?.appearance)}`,
    `核心特质：${cleanLine(character?.traits)}`,
    `人物小传：${cleanLine(character?.bio)}`,
    `爱好：${cleanLine(character?.hobbies)}`,
    `住所：${cleanLine(character?.home)}`,
    `性偏好：${cleanLine(character?.sexualPreference)}`,
    `性器官描述：${cleanLine(character?.penisDescription)}`,
    '</CharacterProfile>'
  ].join('\n');
}

function liveExtra(recordType, recordId = '') {
  return { recordType, recordId: String(recordId || '') };
}

function getRecord(entryValue, recordType, recordId = null) {
  return entryValue?.extra?.source === LIVE_WORLDBOOK_SOURCE
    && entryValue?.extra?.recordType === recordType
    && (recordId === null || String(entryValue?.extra?.recordId || '') === String(recordId));
}

function formatHistoryLine(item) {
  if (typeof item === 'string') return item.trim();
  const date = cleanLine(item?.date || item?.dateText, '');
  const text = cleanLine(item?.text || item?.content || item?.summary, '');
  return [date, text].filter(Boolean).join(' ');
}

function appendHistoryContent(content, lines) {
  if (!lines.length) return content;
  const current = String(content || '').trim();
  const addition = lines.join('\n');
  if (!current) return `<SchoolHistory>\n${addition}\n</SchoolHistory>`;
  const closingTag = '</SchoolHistory>';
  const closingIndex = current.lastIndexOf(closingTag);
  if (closingIndex >= 0) {
    const before = current.slice(0, closingIndex).trimEnd();
    const after = current.slice(closingIndex + closingTag.length);
    return `${before}\n${addition}\n${closingTag}${after}`;
  }
  return `${current}\n${addition}`;
}

export function buildLiveWorldbookName(runtime, chatId = '') {
  const playerName = safeWorldbookPart(runtime?.player?.name);
  const chatPart = safeWorldbookPart(chatId || runtime?.meta?.runId || formatCreatedAt(runtime?.meta?.createdAt)).slice(-24);
  return `贵族学校的特招生·${playerName}·${chatPart}`;
}

export function mergeLiveWorldbookEntries(currentEntries, runtime, previousSync = {}) {
  const entries = Array.isArray(currentEntries) ? currentEntries.map((item) => ({ ...item })) : [];
  let playerEntry = entries.find((item) => getRecord(item, 'player-profile'));
  if (!playerEntry) {
    playerEntry = entry('主角资料（可编辑）', buildLivePlayerContent(runtime), {
      constant: true,
      order: 130,
      extra: liveExtra('player-profile')
    });
    entries.push(playerEntry);
  }

  const history = Array.isArray(runtime?.history) ? runtime.history : [];
  let historyEntry = entries.find((item) => getRecord(item, 'player-history'));
  if (!historyEntry) {
    historyEntry = entry('主角履历（可编辑）', buildHistoryContent(runtime), {
      constant: true,
      order: 120,
      extra: { ...liveExtra('player-history'), syncedHistoryCount: history.length }
    });
    entries.push(historyEntry);
  } else {
    const priorCount = Math.max(0, Math.min(
      history.length,
      Number(previousSync?.historyCount ?? historyEntry?.extra?.syncedHistoryCount ?? 0) || 0
    ));
    const newLines = history.slice(priorCount).map(formatHistoryLine).filter(Boolean);
    historyEntry.content = appendHistoryContent(historyEntry.content, newLines);
    historyEntry.extra = {
      ...(historyEntry.extra || {}),
      source: LIVE_WORLDBOOK_SOURCE,
      schemaVersion: 2,
      ...liveExtra('player-history'),
      syncedHistoryCount: history.length
    };
  }

  const knownCharacterIds = new Set(
    entries
      .filter((item) => getRecord(item, 'character-profile'))
      .map((item) => String(item.extra.recordId || ''))
      .filter(Boolean)
  );
  for (const [index, character] of (runtime?.characters || []).entries()) {
    if (!character?.name || knownCharacterIds.has(String(character.id))) continue;
    entries.push(entry(`角色·${character.name}（可编辑）`, buildCharacterContent(character), {
      keys: [String(character.name)],
      order: 110 - index,
      extra: liveExtra('character-profile', character.id)
    }));
    knownCharacterIds.add(String(character.id));
  }

  return {
    entries,
    sync: {
      historyCount: history.length,
      characterIds: [...knownCharacterIds]
    }
  };
}

export function buildLiveWorldbookPromptContext(entries, characterIds = []) {
  const wanted = new Set((characterIds || []).map(String));
  const selected = (entries || []).filter((item) => {
    if (getRecord(item, 'player-profile') || getRecord(item, 'player-history')) return true;
    return getRecord(item, 'character-profile') && wanted.has(String(item.extra.recordId || ''));
  });
  if (!selected.length) return '';
  return [
    '<EditableWorldbookContext>',
    '以下资料来自当前对话专属世界书，玩家可能已手动修改。与游戏内部旧描述冲突时，以这里的当前文字为准。',
    ...selected.map((item) => `\n## ${cleanLine(item.name)}\n${String(item.content || '').trim()}`),
    '</EditableWorldbookContext>'
  ].join('\n');
}

export function buildGraduationWorldbook(runtime) {
  if (runtime?.meta?.ending?.type !== 'graduation') {
    throw new Error('只有成功毕业的存档可以导出世界书。');
  }
  const playerName = safeWorldbookPart(runtime?.player?.name);
  const runId = safeWorldbookPart(runtime?.meta?.runId || formatCreatedAt(runtime?.meta?.createdAt)).slice(0, 12);
  const worldbookName = `贵族学校的特招生·${playerName}·${formatCreatedAt(runtime?.meta?.createdAt)}·${runId}`;
  const playerKeys = [runtime?.player?.name, '兰斯特皇家学院', '毕业'].filter(Boolean).map(String);
  const entries = [
    entry('毕业后的主角资料', buildPlayerContent(runtime), { constant: true, order: 120 }),
    entry('学院事件履历', buildHistoryContent(runtime), {
      keys: [...new Set([...playerKeys, '履历', '回忆', '学院经历'])],
      order: 110
    }),
    ...(runtime?.characters || []).filter((character) => character?.name).map((character, index) => entry(
      `角色·${character.name}`,
      buildCharacterContent(character),
      { keys: [String(character.name)], order: 100 - index }
    ))
  ];
  return { worldbookName, entries };
}
