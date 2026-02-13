import { saveAuditoria } from "./db.js";
import { APP_VERSION, sanitizeText } from "./utils.js";
import { nowUtcIso } from "./time.js";
import { writeLog, getSessionCorrelationId } from "./logger.js";
import { getCurrentOrgId } from "./org.js";

const AUDIT_ACTIONS = {
  ENTITY_CREATED: "ENTITY_CREATED",
  ENTITY_UPDATED: "ENTITY_UPDATED",
  ENTITY_DELETED: "ENTITY_DELETED",
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAIL: "LOGIN_FAIL",
  IMPORT_JSON: "IMPORT_JSON",
  IMPORT_SNAPSHOT: "IMPORT_SNAPSHOT",
  IMPORT_CSV: "IMPORT_CSV",
  IMPORT_XLSX: "IMPORT_XLSX",
  EXPORT_JSON: "EXPORT_JSON",
  EXPORT_CSV: "EXPORT_CSV",
  PDF_GENERATED: "PDF_GENERATED",
  VINCULO_DELETE: "VINCULO_DELETE"
};

const pickFields = (source, fields = []) => {
  if (!source) return {};
  return fields.reduce((acc, field) => {
    if (source[field] !== undefined) acc[field] = source[field];
    return acc;
  }, {});
};

const buildDiff = (before, after, fields = []) => ({
  before: pickFields(before, fields),
  after: pickFields(after, fields)
});

const logAudit = async ({
  audit_id = crypto.randomUUID(),
  actor_user_id = null,
  action,
  entity_type = "",
  entity_id = "",
  summary = "",
  diff = null,
  context = null,
  route = window.location?.pathname || "unknown",
  severity = "INFO",
  correlation_id = getSessionCorrelationId(),
  app_version = APP_VERSION
}) => {
  const created_at = nowUtcIso();
  const sanitizedSummary = sanitizeText(summary);
  const organization_id = await getCurrentOrgId().catch(() => "");
  const entry = {
    audit_id,
    auditoria_id: audit_id,
    created_at,
    actor_user_id,
    organization_id,
    action,
    entity_type,
    entity_id,
    summary: sanitizedSummary,
    diff: diff || { before: null, after: null },
    details: diff || { before: null, after: null },
    context: {
      ...(context || {}),
      route,
      app_version,
      correlation_id
    },
    severity,
    correlation_id,
    route,
    app_version,
    entity: entity_type,
    data_hora: created_at,
    payload: context || {}
  };

  try {
    await saveAuditoria(entry);
    writeLog({ level: severity, context: route, message: sanitizedSummary, details: { entity_id, correlation_id } });
  } catch (error) {
    console.error("Falha ao salvar auditoria.", error);
  }
};

export {
  AUDIT_ACTIONS,
  buildDiff,
  logAudit
};
