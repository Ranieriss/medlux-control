const DB_NAME = "medlux_shared_db";
const DB_VERSION = 1;

const STORE_EQUIPAMENTOS = "equipamentos";
const STORE_USUARIOS = "usuarios";
const STORE_VINCULOS = "vinculos";
const STORE_MEDICOES = "medicoes";
const STORE_AUDITORIA = "auditoria";

const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_EQUIPAMENTOS)) {
      const store = db.createObjectStore(STORE_EQUIPAMENTOS, { keyPath: "id" });
      store.createIndex("funcao", "funcao", { unique: false });
      store.createIndex("status", "status", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_USUARIOS)) {
      const store = db.createObjectStore(STORE_USUARIOS, { keyPath: "user_id" });
      store.createIndex("role", "role", { unique: false });
      store.createIndex("ativo", "ativo", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_VINCULOS)) {
      const store = db.createObjectStore(STORE_VINCULOS, { keyPath: "vinculo_id" });
      store.createIndex("equip_id", "equip_id", { unique: false });
      store.createIndex("user_id", "user_id", { unique: false });
      store.createIndex("ativo", "ativo", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_MEDICOES)) {
      const store = db.createObjectStore(STORE_MEDICOES, { keyPath: "medicao_id" });
      store.createIndex("equip_id", "equip_id", { unique: false });
      store.createIndex("user_id", "user_id", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_AUDITORIA)) {
      const store = db.createObjectStore(STORE_AUDITORIA, { keyPath: "auditoria_id" });
      store.createIndex("entity", "entity", { unique: false });
      store.createIndex("data_hora", "data_hora", { unique: false });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const runTransaction = async (storeNames, mode, callback) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    const result = callback(transaction);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

const requestToPromise = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const getAllFromStore = (storeName) => runTransaction([storeName], "readonly", (transaction) => {
  const store = transaction.objectStore(storeName);
  return requestToPromise(store.getAll());
});

const getByKey = (storeName, key) => runTransaction([storeName], "readonly", (transaction) => {
  const store = transaction.objectStore(storeName);
  return requestToPromise(store.get(key));
});

const putInStore = (storeName, value) => runTransaction([storeName], "readwrite", (transaction) => {
  const store = transaction.objectStore(storeName);
  return requestToPromise(store.put(value));
});

const deleteFromStore = (storeName, key) => runTransaction([storeName], "readwrite", (transaction) => {
  const store = transaction.objectStore(storeName);
  return requestToPromise(store.delete(key));
});

const clearStore = (storeName) => runTransaction([storeName], "readwrite", (transaction) => {
  const store = transaction.objectStore(storeName);
  return requestToPromise(store.clear());
});

const getAllEquipamentos = () => getAllFromStore(STORE_EQUIPAMENTOS).then((items) => items || []);
const getEquipamentoById = (id) => getByKey(STORE_EQUIPAMENTOS, id);
const saveEquipamento = (equipamento) => putInStore(STORE_EQUIPAMENTOS, equipamento);
const deleteEquipamento = (id) => deleteFromStore(STORE_EQUIPAMENTOS, id);
const clearEquipamentos = () => clearStore(STORE_EQUIPAMENTOS);
const bulkSaveEquipamentos = (items) => runTransaction([STORE_EQUIPAMENTOS], "readwrite", (transaction) => {
  const store = transaction.objectStore(STORE_EQUIPAMENTOS);
  items.forEach((item) => store.put(item));
});

const getAllUsuarios = () => getAllFromStore(STORE_USUARIOS).then((items) => items || []);
const getUsuarioById = (id) => getByKey(STORE_USUARIOS, id);
const saveUsuario = (usuario) => putInStore(STORE_USUARIOS, usuario);
const deleteUsuario = (id) => deleteFromStore(STORE_USUARIOS, id);

const getAllVinculos = () => getAllFromStore(STORE_VINCULOS).then((items) => items || []);
const saveVinculo = (vinculo) => putInStore(STORE_VINCULOS, vinculo);
const deleteVinculo = (id) => deleteFromStore(STORE_VINCULOS, id);

const getVinculosAtivos = async () => {
  const items = await getAllVinculos();
  return items.filter((item) => item.ativo);
};

const getVinculosByUser = async (userId) => {
  const items = await getAllVinculos();
  return items.filter((item) => item.user_id === userId);
};

const getVinculoAtivoByEquip = async (equipId) => {
  const items = await getAllVinculos();
  return items.find((item) => item.equip_id === equipId && item.ativo) || null;
};

const encerrarVinculo = async (vinculoId, dataFim) => {
  const vinculo = await getByKey(STORE_VINCULOS, vinculoId);
  if (!vinculo) return null;
  const atualizado = {
    ...vinculo,
    data_fim: dataFim,
    ativo: false
  };
  await saveVinculo(atualizado);
  return atualizado;
};

const getAllMedicoes = () => getAllFromStore(STORE_MEDICOES).then((items) => items || []);
const saveMedicao = (medicao) => putInStore(STORE_MEDICOES, medicao);
const deleteMedicao = (id) => deleteFromStore(STORE_MEDICOES, id);
const getMedicoesByEquip = async (equipId) => {
  const items = await getAllMedicoes();
  return items.filter((item) => item.equip_id === equipId);
};
const getMedicoesByUser = async (userId) => {
  const items = await getAllMedicoes();
  return items.filter((item) => item.user_id === userId);
};

const getAllAuditoria = () => getAllFromStore(STORE_AUDITORIA).then((items) => items || []);
const saveAuditoria = (entry) => putInStore(STORE_AUDITORIA, entry);

const exportSnapshot = async () => {
  const [equipamentos, usuarios, vinculos, medicoes, auditoria] = await Promise.all([
    getAllEquipamentos(),
    getAllUsuarios(),
    getAllVinculos(),
    getAllMedicoes(),
    getAllAuditoria()
  ]);
  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    equipamentos,
    usuarios,
    vinculos,
    medicoes,
    auditoria
  };
};

const importSnapshot = async (payload) => runTransaction(
  [STORE_EQUIPAMENTOS, STORE_USUARIOS, STORE_VINCULOS, STORE_MEDICOES, STORE_AUDITORIA],
  "readwrite",
  (transaction) => {
    const equipStore = transaction.objectStore(STORE_EQUIPAMENTOS);
    const userStore = transaction.objectStore(STORE_USUARIOS);
    const vincStore = transaction.objectStore(STORE_VINCULOS);
    const medStore = transaction.objectStore(STORE_MEDICOES);
    const auditStore = transaction.objectStore(STORE_AUDITORIA);
    (payload.equipamentos || []).forEach((item) => equipStore.put(item));
    (payload.usuarios || []).forEach((item) => userStore.put(item));
    (payload.vinculos || []).forEach((item) => vincStore.put(item));
    (payload.medicoes || []).forEach((item) => medStore.put(item));
    (payload.auditoria || []).forEach((item) => auditStore.put(item));
  }
);

const clearAllStores = () => runTransaction(
  [STORE_EQUIPAMENTOS, STORE_USUARIOS, STORE_VINCULOS, STORE_MEDICOES, STORE_AUDITORIA],
  "readwrite",
  (transaction) => {
    transaction.objectStore(STORE_EQUIPAMENTOS).clear();
    transaction.objectStore(STORE_USUARIOS).clear();
    transaction.objectStore(STORE_VINCULOS).clear();
    transaction.objectStore(STORE_MEDICOES).clear();
    transaction.objectStore(STORE_AUDITORIA).clear();
  }
);

export {
  getAllEquipamentos,
  getEquipamentoById,
  saveEquipamento,
  deleteEquipamento,
  clearEquipamentos,
  bulkSaveEquipamentos,
  getAllUsuarios,
  getUsuarioById,
  saveUsuario,
  deleteUsuario,
  getAllVinculos,
  saveVinculo,
  deleteVinculo,
  getVinculosAtivos,
  getVinculosByUser,
  getVinculoAtivoByEquip,
  encerrarVinculo,
  getAllMedicoes,
  saveMedicao,
  deleteMedicao,
  getMedicoesByEquip,
  getMedicoesByUser,
  getAllAuditoria,
  saveAuditoria,
  exportSnapshot,
  importSnapshot,
  clearAllStores
};
