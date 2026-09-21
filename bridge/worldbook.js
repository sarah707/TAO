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
  if (Number.isNaN(date.getTime())) return '存档';
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
    extra: { source: 'noble-school-tavern-card', schemaVersion: 3, ...(options.extra || {}) }
  };
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

function replacePlayerNameWithUserToken(content, runtime) {
  const playerName = String(runtime?.player?.name || '').trim();
  const text = String(content || '');
  return playerName ? text.split(playerName).join('<user>') : text;
}

export function buildExportWorldbook(runtime, promptSettings = {}) {
  const playerName = safeWorldbookPart(runtime?.player?.name);
  const runId = safeWorldbookPart(runtime?.meta?.runId || formatCreatedAt(runtime?.meta?.createdAt)).slice(0, 12);
  const worldbookName = `贵族学校的特招生·${playerName}·${formatCreatedAt(runtime?.meta?.createdAt)}·${runId}`;
  const worldBuilding = String(promptSettings?.worldBuilding || '').trim();
  const playerSettings = String(promptSettings?.playerSettings || '').trim();
  if (!worldBuilding || !playerSettings) {
    throw new Error('导出世界书缺少世界观或主角设定。');
  }
  const entries = [
    entry('世界观设定', worldBuilding, { constant: true, order: 150 }),
    entry('主角设定', playerSettings, { constant: true, order: 140 }),
    entry('学院事件履历', buildHistoryContent(runtime), { constant: true, order: 120 }),
    ...(runtime?.characters || []).filter((character) => character?.name).map((character, index) => entry(
      `角色·${character.name}`,
      buildCharacterContent(character),
      { keys: [String(character.name)], order: 110 - index }
    ))
  ].map((item) => ({
    ...item,
    content: replacePlayerNameWithUserToken(item.content, runtime)
  }));
  return { worldbookName, entries };
}
