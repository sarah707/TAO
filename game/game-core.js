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
    playerStartingAge: 21,
    assistantCourse: Object.freeze({ id: 'assistant-microeconomics', courseName: '微观经济学' }),
    businessEndingScore: 100,
    graduationActionProgress: 10,
    upperTermMinimumGrade: 'A',
    minimumGraduationGrade: 'B',
    minimumGraduationProgress: 80,
    honorsGraduationProgress: 90,
    relationshipThresholds: Object.freeze({ friend: 25, admirer: 45, confession: 65 }),
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
    probability = 0.15,
    random = Math.random
  }) {
    if (!hasKnownProfessor && random() < probability) {
      return '认识教授事件';
    }
    if (!hasKnownAssistant && random() < probability) {
      return '认识助教事件';
    }
    return null;
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

  global.Games0Core = {
    CAMPAIGN_CONFIG,
    TERM_DEFINITIONS,
    parseDate,
    toIsoDate,
    addDays,
    diffDays,
    getWeekStart,
    getWeekDates,
    clamp,
    evaluateTermStanding,
    evaluateGraduation,
    selectFirstClassIntroduction,
    selectRandomAPlusCourseId,
    canReceiveGraduationInternshipOffer,
    findCharactersForCourse,
    resolveInternshipSelection,
    makeImageScopePrefix,
    getImageScopeFromSaveKey,
    migrateRuntimeVersion,
    splitTopLevelJsonObjects
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.Games0Core;
}
