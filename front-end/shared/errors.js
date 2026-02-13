import { saveErrorLog } from "./db.js";

const logError = async ({
  module = "unknown",
  action = "",
  message = "",
  stack = "",
  context = null
} = {}) => {
  try {
    await saveErrorLog({
      error_id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      module,
      action,
      message,
      stack,
      context
    });
  } catch (error) {
    // Falha silenciosa para não quebrar o app
    console.error("Falha ao registrar erro local.", error);
  }
};

const initGlobalErrorHandling = (moduleName = "unknown") => {
  window.addEventListener("error", (event) => {
    const error = event.error || {};
    logError({
      module: moduleName,
      action: "window.onerror",
      message: event.message || "Erro desconhecido",
      stack: error.stack || "",
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason || {};
    logError({
      module: moduleName,
      action: "unhandledrejection",
      message: reason.message || String(reason),
      stack: reason.stack || "",
      context: null
    });
  });
};

export {
  logError,
  initGlobalErrorHandling
};
