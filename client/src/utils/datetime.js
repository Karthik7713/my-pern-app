// Robust date/time parser and formatter for DB timestamps.
export function formatDateTimeSafe(input) {
  const toTwo = (v) => String(v).padStart(2, '0');

  // Handle empty / missing input explicitly — avoid returning current time which is misleading
  if (input === null || input === undefined || input === '') {
    return { date: '-', time: '' };
  }

  // String input normalization
  const sRaw = String(input).trim();

  // If input is a date-only string like "YYYY-MM-DD", return date and empty time
  const dateOnlyMatch = sRaw.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnlyMatch) {
    const [y, m, d] = dateOnlyMatch[1].split('-');
    return { date: `${d}/${m}/${y}`, time: '' };
  }

  const parseToDate = (inp) => {
    if (inp instanceof Date) return inp;
    if (typeof inp === 'number') return new Date(inp);
    let s = String(inp).trim();

    // Normalize common DB timestamp format: "YYYY-MM-DD HH:MM:SS(.ffffff)"
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(?:Z)?$/);
    if (m) {
      const datePart = m[1];
      const timePart = m[2];
      let frac = m[3] || '';
      // Truncate or pad fraction to milliseconds (3 digits)
      if (frac.length > 3) frac = frac.slice(0, 3);
      while (frac.length < 3) frac = frac + '0';
      s = `${datePart}T${timePart}${frac ? '.' + frac : ''}`; // leave without Z so it parses as local
    }

    let d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      // try numeric epoch (seconds/ms)
      const n = Number(s);
      if (!Number.isNaN(n)) {
        d = n < 1e12 ? new Date(n * 1000) : new Date(n);
      } else {
        return null;
      }
    }
    return d;
  };

  const d = parseToDate(sRaw);
  if (!d) {
    // Unparseable input — return date placeholder and empty time
    return { date: '-', time: '' };
  }

  const dd = toTwo(d.getDate()), mm = toTwo(d.getMonth() + 1), yyyy = d.getFullYear();
  const hours = d.getHours(), mins = toTwo(d.getMinutes()), secs = toTwo(d.getSeconds());
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return { date: `${dd}/${mm}/${yyyy}`, time: `${toTwo(hour12)}:${mins}:${secs} ${hours >= 12 ? 'PM' : 'AM'}` };
}

export function formatDate(input) {
  const { date } = formatDateTimeSafe(input);
  return date;
}

export function formatTime(input) {
  const { time } = formatDateTimeSafe(input);
  return time;
}
