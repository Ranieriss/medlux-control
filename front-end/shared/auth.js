import {
  getUsuarioById,
  saveUsuario,
  getAllUsuarios,
  saveAuditoria
} from "./db.js";

const SESSION_KEY = "medlux_session";
const ITERATIONS = 100000;
const HASH = "SHA-256";

const textEncoder = new TextEncoder();

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

const generateSalt = () => crypto.getRandomValues(new Uint8Array(16));

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
  const users = await getAllUsuarios();
  if (users.length) return;
  const salt = generateSalt();
  const pinHash = await hashPin("1234", salt);
  await saveUsuario({
    user_id: "ADMIN",
    nome: "Administrador",
    role: "ADMIN",
    pin_hash: pinHash,
    salt: toBase64(salt),
    ativo: true
  });
};

const createUserWithPin = async ({ user_id, nome, role, ativo, pin }) => {
  const salt = generateSalt();
  const pinHash = await hashPin(pin, salt);
  const usuario = {
    user_id,
    nome,
    role,
    ativo,
    pin_hash: pinHash,
    salt: toBase64(salt)
  };
  await saveUsuario(usuario);
  return usuario;
};

const authenticate = async (userId, pin) => {
  const usuario = await getUsuarioById(userId);
  if (!usuario || !usuario.ativo) return { success: false, message: "Usuário inválido ou inativo." };
  const salt = fromBase64(usuario.salt);
  const pinHash = await hashPin(pin, salt);
  if (pinHash !== usuario.pin_hash) return { success: false, message: "PIN inválido." };
  const session = {
    user_id: usuario.user_id,
    nome: usuario.nome,
    role: usuario.role,
    loginAt: new Date().toISOString()
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  await saveAuditoria({
    auditoria_id: crypto.randomUUID(),
    entity: "login",
    action: "login",
    data_hora: new Date().toISOString(),
    payload: { user_id: usuario.user_id }
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
  const usuario = await getUsuarioById(userId);
  if (!usuario) return null;
  const salt = generateSalt();
  const pinHash = await hashPin(pin, salt);
  const updated = {
    ...usuario,
    pin_hash: pinHash,
    salt: toBase64(salt)
  };
  await saveUsuario(updated);
  return updated;
};

export {
  ensureDefaultAdmin,
  createUserWithPin,
  authenticate,
  logout,
  getSession,
  updatePin
};
