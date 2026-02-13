import { saveErrorLog } from "./db.js";
import { nowUtcIso } from "./time.js";
import { APP_VERSION } from "./utils.js";
import { logAudit } from "./audit.js";

const classifyError = (message = "") => {
  const msg = String(message || "").toLowerCase();
  if (msg.includes("401")) return { code: "401", userMessage: "Sua sessão expirou. Faça login novamente." };
  if (msg.includes("403")) return { code: "403", userMessage: "Você não tem permissão para esta ação." };
  if (msg.includes("42703")) return { code: "42703", userMessage: "Erro de estrutura de dados. Contate o administrador." };
  if (msg.includes("timeout")) return { code: "TIMEOUT", userMessage: "A operação demorou demais. Tente novamente." };
  if (msg.includes("network") || msg.includes("failed to fetch")) return { code: "NETWORK", userMessage: "Falha de rede. Verifique a conexão." };
  return { code: "UNKNOWN", userMessage: "Ocorreu um erro inesperado." };
};

const logError = async ({
  module = "unknown",
  action = "",
  message = "",
  stack = "",
  context = null,
  route = window.location?.pathname || "unknown",
  correlation_id = crypto.randomUUID(),
  severity = "ERROR"
} = {}) => {
  const created_at = nowUtcIso();
  const classified = classifyError(message);
  try {
    await saveErrorLog({
      error_id: crypto.randomUUID(),
      created_at,
      module,
      action,
      message,
      stack,
      context: { ...(context || {}), route, correlation_id, app_version: APP_VERSION, code: classified.code },
      severity,
      route,
      correlation_id,
      app_version: APP_VERSION
    });
  } catch (error) {
    console.error("Falha ao registrar erro local.", error);
  }
  await logAudit({
    action: "ERROR_EVENT",
    entity_type: "errors",
    entity_id: action || module,
    summary: message || "Erro desconhecido",
    context: { module, stack, ...(context || {}) },
    route,
    severity,
    correlation_id
  });
  return classified;
};

const initGlobalErrorHandling = (moduleName = "unknown", options = {}) => {
  const { onUserError = () => {}, isAdmin = () => false } = options;
  const handle = async (payload) => {
    const classified = await logError(payload);
    onUserError({
      userMessage: classified.userMessage,
      technical: `${payload.message || "Erro"}${payload.stack ? `\n${payload.stack}` : ""}`,
      showTechnical: Boolean(isAdmin())
    });
  };

  window.addEventListener("error", (event) => {
    const error = event.error || {};
    void handle({
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
    void handle({
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
  initGlobalErrorHandling,
  classifyError
};
