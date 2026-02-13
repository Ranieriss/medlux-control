const sanitizeText = (value) => String(value ?? "")
  .replace(/[<>]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const getAppVersion = () => document.querySelector("meta[name='app-version']")?.content || "unknown";

const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export {
  sanitizeText,
  getAppVersion,
  isValidDate
};
