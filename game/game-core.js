(function (global) {
  const TERM_DEFINITIONS = Object.freeze([
    { id: 'y4-upper', academicYear: 4, semester: '上学期', label: '毕业学年上学期', start: '2003-09-01', end: '2003-12-28' },
    { id: 'y4-lower', academicYear: 4, semester: '下学期', label: '毕业学年下学期', start: '2004-03-01', end: '2004-05-30' }
  ].map((term) => Object.freeze(term)));
  const REGULAR_COURSES = Object.freeze([
    { id: 'y4-upper-1', termId: 'y4-upper', courseName: '金融工程学' },
    { id: 'y4-upper-2', termId: 'y4-upper', courseName: '衍生金融工具' },
    { id: 'y4-upper-3', termId: 'y4-upper', courseName: '固定收益证券' },
    { id: 'y4-upper-4', termId: 'y4-upper', courseName: '金融实证分析' },
    { id: 'y4-lower-1', termId: 'y4-lower', courseName: '投资银行学' },
    { id: 'y4-lower-2', termId: 'y4-lower', courseName: '私募股权与风险投资' }
  ].map((course) => Object.freeze(course)));
  const SPECIAL_COURSES = Object.freeze([
    { id: 'graduation-internship', termId: 'y4-lower', courseName: '毕业实习' },
    { id: 'graduation-thesis', termId: 'y4-lower', courseName: '毕业论文' }
  ].map((course) => Object.freeze(course)));
  const CAMPAIGN_CONFIG = Object.freeze({
    storageVersion: 2,
    startDate: '2003-09-01',
    firstPlayableDate: '2003-09-02',
    endDate: '2004-06-06',
    upperTermId: 'y4-upper',
    graduationTermId: 'y4-lower',
    graduationTermStartDate: '2004-03-01',
    playerStartingAge: 21,
    dailyCost: 50,
    assistantCourse: Object.freeze({ id: 'assistant-microeconomics', courseName: '微观经济学' }),
    businessEndingScore: 100,
    graduationActionProgress: 8,
    upperTermMinimumGrade: 'A',
    minimumGraduationGrade: 'B',
    minimumGraduationProgress: 80,
    honorsGraduationProgress: 90,
    relationshipThresholds: Object.freeze({
      acquaintanceMax: 10,
      interestMax: 30,
      deepenMax: 50,
      admirer: 51,
      confession: 70
    }),
    regularCourses: REGULAR_COURSES,
    specialCourses: SPECIAL_COURSES
  });
  const IMAGE_KEY_VERSION = 'v2';

  function parseDate(dateText) {
    const [year, month, day] = String(dateText).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function toIsoDate(date) {
    return [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0')
    ].join('-');
  }

  function addDays(dateText, amount) {
    const date = parseDate(dateText);
    date.setUTCDate(date.getUTCDate() + amount);
    return toIsoDate(date);
  }

  function diffDays(startDate, endDate) {
    return Math.round((parseDate(endDate) - parseDate(startDate)) / 86400000);
  }

  function getWeekStart(dateText) {
    const date = parseDate(dateText);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    return toIsoDate(date);
  }

  function getWeekDates(dateText) {
    const start = getWeekStart(dateText);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }

  function isLastDayOfMonth(dateText) {
    return addDays(dateText, 1).slice(8, 10) === '01';
  }

  function shouldPayInternshipSalary({ dateText, internship, paidMonths = {}, payrollStartDate = CAMPAIGN_CONFIG.graduationTermStartDate } = {}) {
    const normalizedDate = String(dateText || '');
    if (!internship || normalizedDate < payrollStartDate || !isLastDayOfMonth(normalizedDate)) {
      return false;
    }
    return !paidMonths[normalizedDate.slice(0, 7)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getCharacterRelation(character, thresholds = CAMPAIGN_CONFIG.relationshipThresholds) {
    if (character?.isLover) return '恋人';
    const favorability = Number(character?.favorability) || 0;
    if (favorability <= thresholds.acquaintanceMax) return '认识的人';
    if (favorability <= thresholds.interestMax) return '对<user>产生兴趣';
    if (favorability <= thresholds.deepenMax) return '渴望和<user>加深相互了解，深入彼此生活';
    return '爱慕者';
  }

  function getStoredSaveTimestamp(value) {
    const candidates = [
      value?.savedAt,
      value?.meta?.updatedAt,
      value?.runtime?.meta?.updatedAt,
      value?.meta?.createdAt,
      value?.runtime?.meta?.createdAt
    ];
    return candidates.reduce((latest, candidate) => {
      const timestamp = Date.parse(String(candidate || ''));
      return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest;
    }, 0);
  }

  function selectNewestStoredValue(localValue, remoteValue) {
    if (localValue === undefined) return { source: 'remote', value: remoteValue };
    if (remoteValue === undefined) return { source: 'local', value: localValue };
    return getStoredSaveTimestamp(localValue) > getStoredSaveTimestamp(remoteValue)
      ? { source: 'local', value: localValue }
      : { source: 'remote', value: remoteValue };
  }

  function resolveStoredPlanFixed(plan, fallbackFixed = false) {
    return typeof plan?.fixed === 'boolean' ? plan.fixed : Boolean(fallbackFixed);
  }

  function evaluateGraduation({ regularGrades = [], specialProgress = [], businessScore = 0 } = {}) {
    const gradeOrder = ['F', 'D', 'C', 'B', 'A', 'A+'];
    const minimumRank = gradeOrder.indexOf(CAMPAIGN_CONFIG.minimumGraduationGrade);
    const gradesFinalized = regularGrades.length === CAMPAIGN_CONFIG.regularCourses.length
      && regularGrades.every((grade) => gradeOrder.includes(grade));
    const meetsMinimumGrades = gradesFinalized
      && regularGrades.every((grade) => gradeOrder.indexOf(grade) >= minimumRank);
    const projectsComplete = specialProgress.length === CAMPAIGN_CONFIG.specialCourses.length
      && specialProgress.every((progress) => Number(progress || 0) >= CAMPAIGN_CONFIG.minimumGraduationProgress);
    const honors = meetsMinimumGrades
      && regularGrades.every((grade) => gradeOrder.indexOf(grade) >= gradeOrder.indexOf('A'))
      && specialProgress.every((progress) => Number(progress || 0) >= CAMPAIGN_CONFIG.honorsGraduationProgress);
    return {
      qualified: meetsMinimumGrades && projectsComplete,
      honors,
      businessReady: Number(businessScore || 0) >= CAMPAIGN_CONFIG.businessEndingScore
    };
  }

  function evaluateTermStanding({ termId, regularGrades = [] } = {}) {
    const gradeOrder = ['F', 'D', 'C', 'B', 'A', 'A+'];
    const expectedCourseCount = CAMPAIGN_CONFIG.regularCourses
      .filter((course) => course.termId === termId)
      .length;
    const gradesFinalized = expectedCourseCount > 0
      && regularGrades.length === expectedCourseCount
      && regularGrades.every((grade) => gradeOrder.includes(grade));
    const minimumRank = gradeOrder.indexOf(CAMPAIGN_CONFIG.upperTermMinimumGrade);
    return {
      expelled: termId === CAMPAIGN_CONFIG.upperTermId
        && gradesFinalized
        && regularGrades.some((grade) => gradeOrder.indexOf(grade) < minimumRank)
    };
  }

  function selectFirstClassIntroduction({
    hasKnownProfessor,
    hasKnownAssistant,
    probability = 0.5,
    random = Math.random
  }) {
    const roll = random();
    if (roll >= probability) {
      return null;
    }
    if (hasKnownProfessor !== hasKnownAssistant) {
      return hasKnownProfessor ? '认识助教事件' : '认识教授事件';
    }
    const preferProfessor = roll < probability / 2;
    return preferProfessor ? '认识教授事件' : '认识助教事件';
  }

  function selectRandomAPlusCourseId(courses = {}, courseIds = [], random = Math.random) {
    const eligibleCourseIds = courseIds.filter((courseId) => courses[courseId]?.finalGrade === 'A+');
    if (!eligibleCourseIds.length) {
      return null;
    }
    const roll = Math.max(0, Math.min(0.999999999999, Number(random()) || 0));
    return eligibleCourseIds[Math.floor(roll * eligibleCourseIds.length)];
  }

  function canReceiveGraduationInternshipOffer({ termId } = {}) {
    return termId === CAMPAIGN_CONFIG.upperTermId;
  }

  function shouldResetHomeworkMergeBoard(previousTermId, nextTermId) {
    return nextTermId === CAMPAIGN_CONFIG.graduationTermId
      && previousTermId !== CAMPAIGN_CONFIG.graduationTermId;
  }

  function findCharactersForCourse(characters = [], courseName, identityText) {
    const normalizedCourseName = String(courseName || '').trim();
    const normalizedIdentity = String(identityText || '').trim();
    if (!normalizedCourseName || !normalizedIdentity) {
      return [];
    }
    return characters.filter((character) => (
      String(character?.identity || '').includes(normalizedIdentity)
      && String(character?.identity || '').includes(normalizedCourseName)
    ));
  }

  function isStudentCouncilPresident(character) {
    return /学生(?:联合)?会(?:会长|主席)|学生会长/.test(String(character?.identity || ''));
  }

  function appendIdentityLabel(character, label) {
    const identity = String(character?.identity || '').trim();
    if (!identity.includes(label)) {
      character.identity = [identity, label].filter(Boolean).join('、');
    }
  }

  function normalizeGeneratedCharactersForEvent(eventName, characters = [], options = {}) {
    const generated = characters.filter(Boolean);
    const first = generated[0] || null;
    const courseName = String(options.courseName || CAMPAIGN_CONFIG.assistantCourse.courseName).trim();

    for (const character of generated) {
      if (!Object.prototype.hasOwnProperty.call(character, 'displayIdentity')) {
        character.displayIdentity = String(character.identity || '').trim();
      }
    }

    if (eventName === '第一次开学典礼事件' && first) {
      if (!isStudentCouncilPresident(first)) {
        appendIdentityLabel(first, '学生会长');
      }
      first.school = '兰斯特皇家学院';
      first.grade = 4;
      first.gender = '男';
      first.affiliation = '本校学生';
    }

    if (eventName === '第一次做家教事件' && generated.length) {
      const parentByIdentity = generated.find((character) => String(character.identity || '').includes('家教学生的家长')) || null;
      const student = generated.find((character) => (
        String(character.identity || '').includes('家教学生')
        && !String(character.identity || '').includes('家教学生的家长')
      )) || generated.find((character) => character !== parentByIdentity && Number(character.age) === 18)
        || generated.find((character) => character !== parentByIdentity)
        || first;
      const parent = parentByIdentity
        || generated.find((character) => character !== student)
        || null;
      if (student) {
        appendIdentityLabel(student, '家教学生');
        student.age = 18;
      }
      if (parent) {
        appendIdentityLabel(parent, '家教学生的家长');
      }
    }

    if (eventName === '第一次担任助教事件' && first) {
      appendIdentityLabel(first, `${courseName}课教授`);
      first.affiliation = '本校老师';
    }

    if (eventName === '当助教认识学弟事件' && first) {
      appendIdentityLabel(first, `${courseName}课学生`);
      first.school = '兰斯特皇家学院';
      first.grade = 3;
      first.affiliation = '本校学生';
    }

    if (eventName === '第一天实习事件' && first) {
      appendIdentityLabel(first, '实习上司');
    }

    if (eventName === '第一次实习-教授邀请事件' && first) {
      appendIdentityLabel(first, `${courseName}课教授`);
      appendIdentityLabel(first, '企业高管');
    }

    if (eventName === '企业宣讲会实习邀请事件' && first) {
      appendIdentityLabel(first, '企业高管');
      first.gender = '男';
    }

    return generated;
  }

  function resolveInternshipSelection(offers = [], selectionId, schoolLocation = '兰斯特皇家学院合作实习基地') {
    if (selectionId === 'school') {
      return {
        offerId: 'school',
        locationText: schoolLocation,
        inviterCharacterId: ''
      };
    }
    const offer = offers.find((item) => item?.id === selectionId);
    if (!offer) {
      return null;
    }
    return {
      offerId: offer.id,
      locationText: String(offer.locationText || '实习单位'),
      inviterCharacterId: String(offer.inviterCharacterId || '')
    };
  }

  function findMatchingPetrifiedPieceIndex(board = [], sourceIndex = -1) {
    const source = board[sourceIndex];
    if (!source || source.petrified || Number(source.level) <= 0) {
      return -1;
    }
    return board.findIndex((piece, index) => (
      index !== sourceIndex
      && piece?.petrified
      && Number(piece.chainId) === Number(source.chainId)
      && Number(piece.level) === Number(source.level)
    ));
  }

  function makeImageScopePrefix(scope, namespace = 'tavern-card') {
    return `${IMAGE_KEY_VERSION}|${encodeURIComponent(namespace)}|${scope}|`;
  }

  function getImageScopeFromSaveKey(key) {
    let match = String(key || '').match(/^games0\.runtime\.([A-Za-z0-9_-]+)$/);
    if (match) return { scope: 'runtime', namespace: match[1] };
    match = String(key || '').match(/^games0\.save\.auto\.([A-Za-z0-9_-]+)$/);
    if (match) return { scope: 'auto', namespace: match[1] };
    match = String(key || '').match(/^games0\.save\.(slot[1-3])\.([A-Za-z0-9_-]+)$/);
    return match ? { scope: match[1], namespace: match[2] } : null;
  }

  function migrateRuntimeVersion(candidate, currentVersion = 1) {
    if (!candidate || typeof candidate !== 'object' || !candidate.player || !candidate.courses) {
      return null;
    }
    const sourceVersion = Number(candidate.version ?? 0);
    if (!Number.isInteger(sourceVersion) || sourceVersion < 0 || sourceVersion > currentVersion) {
      return null;
    }
    const runtime = JSON.parse(JSON.stringify(candidate));
    let version = sourceVersion;
    while (version < currentVersion) {
      if (version === 0) {
        runtime.version = 1;
        version = 1;
        continue;
      }
      return null;
    }
    return runtime;
  }

  function stripRuntimeRuleFields(runtime) {
    if (!runtime || typeof runtime !== 'object') return runtime;

    if (runtime.player && typeof runtime.player === 'object') {
      delete runtime.player.dailyCost;
      delete runtime.player.gender;
      if (runtime.player.assistantRole && typeof runtime.player.assistantRole === 'object') {
        delete runtime.player.assistantRole.courseId;
        delete runtime.player.assistantRole.courseName;
      }
    }

    const courseRuleFields = [
      'courseId',
      'courseName',
      'termId',
      'termLabel',
      'homeworkIntervalWeeks',
      'homeworkGrowthFactor'
    ];
    for (const course of Object.values(runtime.courses || {})) {
      if (!course || typeof course !== 'object') continue;
      for (const field of courseRuleFields) delete course[field];
    }

    for (const plan of Object.values(runtime.schedulePlans || {})) {
      if (!plan || typeof plan !== 'object') continue;
      delete plan.label;
      delete plan.specKey;
    }

    for (const boardKey of ['mergeGame', 'bizMergeGame']) {
      const board = runtime[boardKey];
      if (!board || typeof board !== 'object' || !Array.isArray(board.tasks)) continue;
      const isBusinessBoard = boardKey === 'bizMergeGame' || board.mode === 'biz';
      delete board.mode;
      for (const task of board.tasks) {
        if (!task || typeof task !== 'object') continue;
        delete task.courseName;
        delete task.isThesis;
        if (isBusinessBoard) delete task.courseId;
        for (const piece of task.requiredPieces || []) {
          if (!piece || typeof piece !== 'object') continue;
          delete piece.svg;
          delete piece.name;
        }
      }
    }

    return runtime;
  }

  function splitTopLevelJsonObjects(text) {
    const source = String(text || '');
    const blocks = [];
    let depth = 0;
    let start = -1;
    let quote = '';
    let escaped = false;
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === quote) {
          quote = '';
        }
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '{') {
        if (depth === 0) start = index;
        depth += 1;
      } else if (char === '}' && depth > 0) {
        depth -= 1;
        if (depth === 0 && start !== -1) {
          blocks.push(source.slice(start, index + 1));
          start = -1;
        }
      }
    }
    return blocks;
  }

  function extractNearestTagContent(text, tag) {
    return extractNearestTagContents(text, tag).at(-1) || '';
  }

  function extractNearestTagContents(text, tag) {
    const source = String(text || '');
    const normalizedTag = String(tag || '').trim().toLowerCase();
    if (!normalizedTag) return [];
    const lowerSource = source.toLowerCase();
    const openTag = `<${normalizedTag}>`;
    const closeTag = `</${normalizedTag}>`;
    const contents = [];
    let searchIndex = 0;
    while (searchIndex < lowerSource.length) {
      const closeIndex = lowerSource.indexOf(closeTag, searchIndex);
      if (closeIndex < 0) break;
      const openIndex = lowerSource.lastIndexOf(openTag, closeIndex);
      if (openIndex >= 0) {
        contents.push(source.slice(openIndex + openTag.length, closeIndex));
      }
      searchIndex = closeIndex + closeTag.length;
    }
    return contents;
  }

  function extractInfoBlockContent(text) {
    const source = String(text || '');
    const tagged = extractNearestTagContent(source, 'info_block').trim();
    if (tagged) return tagged;
    const lowerSource = source.toLowerCase();
    const contentCloseIndex = lowerSource.lastIndexOf('</content>');
    const contentOpenIndex = lowerSource.lastIndexOf(
      '<content>',
      contentCloseIndex >= 0 ? contentCloseIndex : lowerSource.length
    );
    const prefix = source.slice(0, contentOpenIndex >= 0 ? contentOpenIndex : source.length);
    const bareBlocks = [...prefix.matchAll(/^[\t ]*(『[^\r\n]+』)[\t ]*$/gm)];
    return bareBlocks.at(-1)?.[1]?.trim() || '';
  }

  const CHARACTER_FIELD_ALIASES = Object.freeze({
    姓名: ['姓名', '名字', '角色姓名', 'name', 'characterName', 'character_name'],
    年龄: ['年龄', 'age'],
    性别: ['性别', 'gender', 'sex'],
    生日月份: ['生日月份', '出生月份', 'birthMonth', 'birth_month'],
    生日日期: ['生日日期', '出生日期', 'birthDay', 'birth_day'],
    身份: ['身份', '职业', 'identity', 'occupation'],
    学校: ['学校', 'school'],
    年级: ['年级', 'grade'],
    家业: ['家业', '家族企业', 'familyBusiness', 'family_business'],
    所属: ['所属', '阵营', 'affiliation'],
    外貌服饰氛围气味: ['外貌服饰氛围气味', '外貌、服饰、氛围、气味', '外貌', 'appearance'],
    核心特质: ['核心特质', '性格', 'traits', 'personality'],
    人物小传: ['人物小传', '背景', 'bio', 'biography'],
    爱好: ['爱好', 'hobbies'],
    住所: ['住所', 'home', 'residence'],
    性爱偏好: ['性爱偏好', 'sexualPreference', 'sexual_preference'],
    阴茎描述: ['阴茎描述', 'penisDescription', 'penis_description']
  });

  function normalizeLooseCharacterJsonText(text) {
    return String(text || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[，]/g, ',')
      .replace(/[：]/g, ':')
      .replace(/[【】]/g, '"')
      .replace(/[（]/g, '(')
      .replace(/[）]/g, ')')
      .trim();
  }

  function sanitizeLooseJsonBlock(text) {
    return String(text || '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  function parseLooseCharacterObject(text) {
    const sanitized = sanitizeLooseJsonBlock(text);
    const start = sanitized.indexOf('{');
    const end = sanitized.lastIndexOf('}');
    const objectText = start !== -1 && end !== -1 && end > start
      ? sanitized.slice(start, end + 1)
      : sanitized;
    const normalized = normalizeLooseCharacterJsonText(objectText)
      .replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(normalized);
    } catch {
      const result = {};
      for (const rawLine of normalized.split('\n')) {
        const line = rawLine.trim().replace(/,$/, '');
        if (!line || line === '{' || line === '}') continue;
        const match = line.match(/^(?:[-*]\s*)?(?:"([^"]+)"|\*\*([^*]+)\*\*|([^:=]+?))\s*[:=]\s*(.+)$/);
        if (!match) continue;
        const key = String(match[1] || match[2] || match[3] || '').trim();
        let value = match[4].trim();
        value = value.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1').trim();
        if (/^-?\d+(?:\.\d+)?$/.test(value)) {
          result[key] = Number(value);
        } else if (value === 'true' || value === 'false') {
          result[key] = value === 'true';
        } else if (value === 'null') {
          result[key] = null;
        } else {
          result[key] = value;
        }
      }
      return result;
    }
  }

  function canonicalizeCharacterRecord(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
    const normalized = { ...record };
    const caseInsensitiveKeys = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));
    for (const [canonicalKey, aliases] of Object.entries(CHARACTER_FIELD_ALIASES)) {
      if (normalized[canonicalKey] !== undefined && normalized[canonicalKey] !== null && normalized[canonicalKey] !== '') continue;
      const alias = aliases
        .map((key) => Object.hasOwn(record, key) ? key : caseInsensitiveKeys.get(key.toLowerCase()))
        .find((key) => key && record[key] !== undefined && record[key] !== null && record[key] !== '');
      if (alias) normalized[canonicalKey] = record[alias];
    }
    return normalized;
  }

  function collectNamedCharacterRecords(value) {
    if (Array.isArray(value)) {
      return value.flatMap((item) => collectNamedCharacterRecords(item));
    }
    if (!value || typeof value !== 'object') return [];
    const normalized = canonicalizeCharacterRecord(value);
    if (String(normalized?.姓名 || '').trim()) return [normalized];
    return Object.values(value).flatMap((item) => collectNamedCharacterRecords(item));
  }

  function parseChineseGrade(value) {
    const source = String(value || '').trim();
    if (/^\d+$/.test(source)) return Number(source);
    const digits = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
    return digits[source] || 0;
  }

  function parseNaturalLanguageCharacterRecords(text) {
    const source = String(text || '').trim();
    if (!source) return [];
    const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const knownFieldNames = new Set(Object.values(CHARACTER_FIELD_ALIASES).flat().map((key) => key.toLowerCase()));
    const allowUnbulletedLine = lines.length === 1;
    const records = [];
    for (const rawLine of lines) {
      const bulletMatch = rawLine.match(/^\\?[-*•]\s+([\s\S]+)$/);
      if (!bulletMatch && !allowUnbulletedLine) continue;
      const line = String(bulletMatch?.[1] || rawLine).trim();
      const match = line.match(/^(.{1,100}?)[：:]\s*([\s\S]+)$/);
      if (!match) continue;
      const name = match[1].replace(/^\*\*|\*\*$/g, '').trim();
      const description = match[2].trim();
      if (!name || !description || knownFieldNames.has(name.toLowerCase())) continue;
      const gradeMatch = description.match(/([一二三四五六七八九十]|\d+)\s*年级/);
      const gender = /(?:^|[，,、\s])女性?(?:[，,、\s]|$)/.test(description)
        ? '女'
        : /(?:^|[，,、\s])男性?(?:[，,、\s]|$)/.test(description)
          ? '男'
          : '';
      const school = description.includes('兰斯特皇家学院')
        ? '兰斯特皇家学院'
        : (description.match(/([\p{Script=Han}A-Za-z·]+(?:大学|学院|学校))/u)?.[1] || '无');
      const identity = description.split(/[。！？!?]/)[0].trim();
      const isTeacher = /教授|老师|教师|讲师/.test(description);
      const isStudent = /学生|年级/.test(description);
      records.push({
        姓名: name,
        性别: gender,
        年级: parseChineseGrade(gradeMatch?.[1]),
        学校: school,
        身份: identity,
        所属: school === '兰斯特皇家学院'
          ? (isTeacher ? '本校老师' : (isStudent ? '本校学生' : ''))
          : '',
        外貌服饰氛围气味: description,
        核心特质: description,
        人物小传: description
      });
    }
    return records;
  }

  function parseLooseCharacterRecords(text) {
    const source = sanitizeLooseJsonBlock(text);
    if (!source) return [];
    const normalized = normalizeLooseCharacterJsonText(source);
    let parsedValues;
    try {
      parsedValues = [JSON.parse(normalized.replace(/,\s*([}\]])/g, '$1'))];
    } catch {
      const objectBlocks = splitTopLevelJsonObjects(source);
      parsedValues = objectBlocks.length
        ? objectBlocks.map((item) => parseLooseCharacterObject(item))
        : [parseLooseCharacterObject(source)];
    }
    const structuredRecords = parsedValues.flatMap((item) => collectNamedCharacterRecords(item));
    return structuredRecords.length ? structuredRecords : parseNaturalLanguageCharacterRecords(source);
  }

  global.Games0Core = {
    CAMPAIGN_CONFIG,
    TERM_DEFINITIONS,
    parseDate,
    toIsoDate,
    addDays,
    diffDays,
    getWeekStart,
    getWeekDates,
    isLastDayOfMonth,
    shouldPayInternshipSalary,
    clamp,
    getCharacterRelation,
    getStoredSaveTimestamp,
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
    stripRuntimeRuleFields,
    splitTopLevelJsonObjects,
    extractNearestTagContent,
    extractNearestTagContents,
    extractInfoBlockContent,
    parseLooseCharacterRecords
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.Games0Core;
}
