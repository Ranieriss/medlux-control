import { nowUtcIso } from "./time.js";

const buildLogEntry = ({
  level = "INFO",
  route = "unknown",
  action = "",
  entity = "",
  message = "",
  details = null
} = {}) => ({
  timestamp: nowUtcIso(),
  level,
  route,
  action,
  entity,
  message,
  details
});

const writeLog = (entry, { isAdmin = false } = {}) => {
  const payload = buildLogEntry(entry);
  if (isAdmin) {
    console.info("[MEDLUX]", payload);
  } else {
    console.info("[MEDLUX]", {
      timestamp: payload.timestamp,
      level: payload.level,
      route: payload.route,
      action: payload.action,
      entity: payload.entity,
      message: payload.message,
      details: null
    });
  }
  return payload;
};

export {
  buildLogEntry,
  writeLog
};
