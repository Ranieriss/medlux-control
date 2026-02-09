const DB_NAME = "medlux_control_db";
const DB_VERSION = 2;
const STORE_NAME = "equipamentos";

const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "id" });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const withStore = async (mode, callback) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = callback(store);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
};

const getAllEquipamentos = () => withStore("readonly", (store) => new Promise((resolve, reject) => {
  const request = store.getAll();
  request.onsuccess = () => resolve(request.result || []);
  request.onerror = () => reject(request.error);
}));

const saveEquipamento = (equipamento) => withStore("readwrite", (store) => store.put(equipamento));
const deleteEquipamento = (id) => withStore("readwrite", (store) => store.delete(id));
const clearEquipamentos = () => withStore("readwrite", (store) => store.clear());

const bulkSaveEquipamentos = (items) => withStore("readwrite", (store) => {
  items.forEach((item) => store.put(item));
});

const exportEquipamentos = async () => {
  const equipamentos = await getAllEquipamentos();
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    equipamentos
  };
};

const importEquipamentos = async (items) => {
  await bulkSaveEquipamentos(items);
};

export {
  getAllEquipamentos,
  saveEquipamento,
  deleteEquipamento,
  clearEquipamentos,
  bulkSaveEquipamentos,
  exportEquipamentos,
  importEquipamentos
};
