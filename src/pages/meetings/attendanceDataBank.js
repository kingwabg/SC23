const STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  OFFICIAL: 'OFFICIAL',
  LATE: 'LATE',
};

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const parseDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return isValidDate(parsed) ? parsed : null;
};

const getYearData = (child, year) => child?.yearlyData?.[year] || child?.yearlyData?.[String(year)] || null;

const compareByName = (left, right) => String(left?.name || '').localeCompare(String(right?.name || ''), 'ko');

export const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();

export const toAttendanceDateKey = (year, month, day) => (
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
);

export const formatAttendanceDateLabel = (year, month, day) => `${year}년 ${month}월 ${day}일`;

export const getAvailableAttendanceYears = (children) => {
  const years = new Set([new Date().getFullYear()]);

  (Array.isArray(children) ? children : []).forEach((child) => {
    Object.keys(child?.yearlyData || {}).forEach((key) => {
      const year = Number(key);
      if (Number.isInteger(year)) {
        years.add(year);
      }
    });

    Object.keys(child?.attendance || {}).forEach((key) => {
      const year = Number(String(key).slice(0, 4));
      if (Number.isInteger(year)) {
        years.add(year);
      }
    });
  });

  return Array.from(years).sort((left, right) => right - left);
};

export const isChildActiveOnDate = (child, year, month, day) => {
  const yearData = getYearData(child, year);
  if (!yearData) return false;

  const targetDate = new Date(year, month - 1, day);
  const enrollmentDate = parseDateValue(child?.enrollment || yearData?.enrollment);
  const dischargeDate = parseDateValue(child?.dischargeDate || yearData?.dischargeDate);

  if (enrollmentDate && enrollmentDate > targetDate) {
    return false;
  }

  if (dischargeDate && dischargeDate <= targetDate) {
    return false;
  }

  return true;
};

export const buildDailyAttendanceSummary = (children, year, month, day) => {
  const dateKey = toAttendanceDateKey(year, month, day);
  const activeChildren = (Array.isArray(children) ? children : [])
    .filter((child) => isChildActiveOnDate(child, year, month, day))
    .sort(compareByName);

  const groups = {
    presentChildren: [],
    absentChildren: [],
    officialChildren: [],
    lateChildren: [],
    unrecordedChildren: [],
  };

  activeChildren.forEach((child) => {
    const entry = child?.attendance?.[dateKey];
    const item = {
      id: child?.id,
      name: child?.name || '이름 없음',
      school: getYearData(child, year)?.school || child?.school || '',
      grade: getYearData(child, year)?.grade || child?.grade || '',
      entry: entry || null,
    };

    switch (entry?.status) {
      case STATUS.PRESENT:
        groups.presentChildren.push(item);
        break;
      case STATUS.ABSENT:
        groups.absentChildren.push(item);
        break;
      case STATUS.OFFICIAL:
        groups.officialChildren.push(item);
        break;
      case STATUS.LATE:
        groups.lateChildren.push(item);
        break;
      default:
        groups.unrecordedChildren.push(item);
        break;
    }
  });

  const recordedCount = activeChildren.length - groups.unrecordedChildren.length;
  const participantCount = groups.presentChildren.length + groups.officialChildren.length + groups.lateChildren.length;
  const attendanceRate = recordedCount > 0
    ? Math.round(((groups.presentChildren.length + groups.officialChildren.length) / recordedCount) * 100)
    : 0;

  return {
    year,
    month,
    day,
    dateKey,
    label: formatAttendanceDateLabel(year, month, day),
    activeCount: activeChildren.length,
    recordedCount,
    participantCount,
    presentCount: groups.presentChildren.length,
    absentCount: groups.absentChildren.length,
    officialCount: groups.officialChildren.length,
    lateCount: groups.lateChildren.length,
    attendanceRate,
    ...groups,
  };
};

export const buildMonthlyAttendanceSummaries = (children, year, month) => (
  Array.from({ length: getDaysInMonth(year, month) }, (_, index) => (
    buildDailyAttendanceSummary(children, year, month, index + 1)
  ))
);

export const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
