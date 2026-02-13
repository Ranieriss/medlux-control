const toUtcIso = (value = null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const nowUtcIso = () => toUtcIso();

const formatUtcToLocale = (value, locale = "pt-BR", options = {}) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    ...options
  }).format(date);
};

export {
  toUtcIso,
  nowUtcIso,
  formatUtcToLocale
};
