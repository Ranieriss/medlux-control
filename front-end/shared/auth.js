import {
  saveUser,
  getAllUsers
} from "./db.js";
import { AUDIT_ACTIONS, logAudit } from "./audit.js";
import { logError } from "./errors.js";

const SESSION_KEY = "medlux_session";
const ITERATIONS = 100000;
const HASH = "SHA-256";

const textEncoder = new TextEncoder();

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

const generateSalt = () => crypto.getRandomValues(new Uint8Array(16));
const normalizeId = (value) => String(value || "").trim().toUpperCase();
const normalizeRole = (value) => (normalizeId(value) === "ADMIN" ? "ADMIN" : "USER");

const resolveUserByNormalizedId = async (userId) => {
  const normalized = normalizeId(userId);
  if (!normalized) return null;
  const usuarios = await getAllUsers();
  return usuarios.find((item) => normalizeId(item.id || item.user_id) === normalized) || null;
};

const hashPin = async (pin, salt) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: HASH,
      salt,
      iterations: ITERATIONS
    },
    keyMaterial,
    256
  );
  return toBase64(derivedBits);
};

const ensureDefaultAdmin = async () => {
  const users = await getAllUsers();
  if (users.length) return;
  const salt = generateSalt();
  const pinHash = await hashPin("2308", salt);
  await saveUser({
    id: "ADMIN",
    nome: "Administrador",
    role: "ADMIN",
    status: "ATIVO",
    pinHash,
    salt: toBase64(salt),
    id_normalized: "ADMIN",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organization_id: "DEFAULT"
  });
};

const createUserWithPin = async ({ user_id, id, nome, role, ativo, status, pin, organization_id = "DEFAULT" }) => {
  const salt = generateSalt();
  const pinHash = await hashPin(pin, salt);
  const resolvedStatus = status || (ativo === false ? "INATIVO" : "ATIVO");
  const userId = id || user_id;
  const normalized = normalizeId(userId);
  const usuario = {
    id: userId,
    user_id: userId,
    nome,
    role,
    status: resolvedStatus,
    ativo: resolvedStatus === "ATIVO",
    pinHash,
    pin_hash: pinHash,
    salt: toBase64(salt),
    id_normalized: normalized,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organization_id
  };
  await saveUser(usuario);
  return usuario;
};

const authenticate = async (userId, pin) => {
  const usuario = await resolveUserByNormalizedId(userId);
  if (!usuario || usuario.status !== "ATIVO") {
    await logError({
      module: "shared-auth",
      action: "AUTH_LOGIN",
      message: "Usuário inválido ou inativo.",
      context: { user_id: normalizeId(userId) }
    });
    await logAudit({
      action: AUDIT_ACTIONS.LOGIN_FAIL,
      entity_type: "auth",
      entity_id: normalizeId(userId),
      actor_user_id: usuario?.id || null,
      summary: "Falha no login (usuário inválido/inativo)."
    });
    return { success: false, message: "Usuário inválido/inativo" };
  }
  const saltRaw = usuario.salt || usuario.pin_salt;
  const pinHashStored = usuario.pinHash || usuario.pin_hash;
  if (!saltRaw || !pinHashStored) {
    await logError({
      module: "shared-auth",
      action: "AUTH_LOGIN",
      message: "Registro de autenticação incompleto.",
      context: { user_id: usuario.id || usuario.user_id || null }
    });
    return { success: false, message: "Usuário sem PIN configurado." };
  }

  const salt = fromBase64(saltRaw);
  const pinHash = await hashPin(pin, salt);
  if (pinHash !== pinHashStored) {
    await logError({
      module: "shared-auth",
      action: "AUTH_LOGIN",
      message: "PIN incorreto.",
      context: { user_id: usuario.id || usuario.user_id || null }
    });
    await logAudit({
      action: AUDIT_ACTIONS.LOGIN_FAIL,
      entity_type: "auth",
      entity_id: usuario.id,
      actor_user_id: usuario.id,
      summary: "Falha no login (PIN incorreto)."
    });
    return { success: false, message: "PIN incorreto" };
  }
  const session = {
    id: usuario.id,
    user_id: usuario.id,
    nome: usuario.nome,
    role: normalizeRole(usuario.role),
    id_normalized: normalizeId(usuario.id),
    organization_id: usuario.organization_id || "DEFAULT",
    loginAt: new Date().toISOString(),
    isAdmin: normalizeRole(usuario.role) === "ADMIN"
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  await logAudit({
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    entity_type: "auth",
    entity_id: usuario.id,
    actor_user_id: usuario.id,
    summary: "Login efetuado com sucesso."
  });
  return { success: true, session };
};

const logout = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

const getSession = () => {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const updatePin = async (userId, pin) => {
  const usuario = await resolveUserByNormalizedId(userId);
  if (!usuario) return null;
  const salt = generateSalt();
  const pinHash = await hashPin(pin, salt);
  const updated = {
    ...usuario,
    pinHash,
    pin_hash: pinHash,
    salt: toBase64(salt),
    updated_at: new Date().toISOString()
  };
  await saveUser(updated);
  return updated;
};

const requireAuth = ({ allowRoles = [], redirectTo = "", onMissing = null, onUnauthorized = null } = {}) => {
  const session = getSession();
  if (!session) {
    if (typeof onMissing === "function") onMissing();
    if (redirectTo) window.location.href = redirectTo;
    return false;
  }
  if (allowRoles.length && !allowRoles.includes(session.role)) {
    if (typeof onUnauthorized === "function") onUnauthorized(session);
    if (redirectTo) window.location.href = redirectTo;
    return false;
  }
  return true;
};

export {
  ensureDefaultAdmin,
  createUserWithPin,
  authenticate,
  logout,
  getSession,
  updatePin,
  requireAuth
};
