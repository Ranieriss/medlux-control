import { nowUtcIso } from "./time.js";

const CORRELATION_KEY = "medlux:correlation_id";

const getSessionCorrelationId = () => {
  const existing = sessionStorage.getItem(CORRELATION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(CORRELATION_KEY, created);
  return created;
};

const buildLogEntry = ({
  level = "INFO",
  context = "app",
  message = "",
  details = null,
  correlation_id = getSessionCorrelationId()
} = {}) => ({
  ts: nowUtcIso(),
  level,
  context,
  message,
  details,
  correlation_id
});

const writeLog = (entry, { isAdmin = false } = {}) => {
  const payload = buildLogEntry(entry);
  if (isAdmin) {
    console.info("[MEDLUX]", payload);
  } else {
    console.info("[MEDLUX]", { ...payload, details: null });
  }
  return payload;
};

export {
  buildLogEntry,
  writeLog,
  getSessionCorrelationId
};
