export const getDateInTimezone = (date, timezone) => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString('sv-SE', { timeZone: timezone });
  } catch (e) {
    return null;
  }
};

export const getTimeInTimezoneMinutes = (date, timezone) => {
  if (!date) return null;
  try {
    const d = new Date(date);
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    let hour = 0;
    let minute = 0;
    for (const part of parts) {
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
    }
    return hour * 60 + minute;
  } catch (e) {
    return null;
  }
};

export const getDateRangesForReservation = (startTime, endTime, timezone) => {
  if (!startTime || !endTime || !timezone) return [];

  const start = new Date(startTime);
  const end = new Date(endTime);

  const dates = [];
  let current = new Date(start);

  while (current <= end) {
    const dateStr = getDateInTimezone(current, timezone);
    if (dateStr && !dates.includes(dateStr)) {
      dates.push(dateStr);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates.sort();
};
