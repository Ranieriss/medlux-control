const parseUtc = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toUtcIso = (value = null) => {
  const date = value ? parseUtc(value) : new Date();
  if (!date) return "";
  return date.toISOString();
};

const nowUtcIso = () => toUtcIso();

const formatUtcToLocale = (value, locale = "pt-BR", options = {}) => {
  const date = parseUtc(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    ...options
  }).format(date);
};

export {
  parseUtc,
  toUtcIso,
  nowUtcIso,
  formatUtcToLocale
};
