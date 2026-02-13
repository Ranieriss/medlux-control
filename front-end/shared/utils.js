const sanitizeText = (value) => String(value ?? "")
  .replace(/[<>]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const APP_VERSION = "1.0.0";

const getAppVersion = () => document.querySelector("meta[name='app-version']")?.content || APP_VERSION;

const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export {
  sanitizeText,
  APP_VERSION,
  getAppVersion,
  isValidDate
};
