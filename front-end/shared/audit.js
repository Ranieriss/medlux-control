import { saveAuditoria } from "./db.js";
import { sanitizeText } from "./utils.js";

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

const resolveOrganizationId = () => {
  try {
    const raw = sessionStorage.getItem("medlux_session");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.organization_id || "DEFAULT";
  } catch (_) {
    return "DEFAULT";
  }
};

const logAudit = async ({
  audit_id = crypto.randomUUID(),
  actor_user_id = null,
  action,
  entity_type = "",
  entity_id = "",
  summary = "",
  diff = null,
  context = null
}) => {
  const created_at = new Date().toISOString();
  const sanitizedSummary = sanitizeText(summary);
  const entry = {
    audit_id,
    auditoria_id: audit_id,
    created_at,
    actor_user_id,
    organization_id: resolveOrganizationId(),
    action,
    entity_type,
    entity_id,
    summary: sanitizedSummary,
    diff,
    context,
    entity: entity_type,
    data_hora: created_at,
    payload: context || {}
  };
  return saveAuditoria(entry);
};

export {
  AUDIT_ACTIONS,
  buildDiff,
  logAudit
};
