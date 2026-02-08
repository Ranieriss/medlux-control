const DB_NAME = "medlux_control_db";
const DB_VERSION = 1;
const STORE_NAME = "equipamentos";

let dbPromise;

export const openDB = () => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("tipo", "tipo", { unique: false });
        store.createIndex("responsavelLocal", "responsavelLocal", { unique: false });
        store.createIndex("statusOperacional", "statusOperacional", { unique: false });
        store.createIndex("dataCalibracao", "dataCalibracao", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const runTransaction = async (mode, operation) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;

    try {
      const request = operation(store);
      if (request) {
        request.onsuccess = () => {
          result = request.result;
        };
        request.onerror = () => reject(request.error);
      }
    } catch (error) {
      reject(error);
      return;
    }

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

export const upsertEquipamento = async (equipamento) => {
  return runTransaction("readwrite", (store) => store.put(equipamento));
};

export const getEquipamento = async (id) => {
  return runTransaction("readonly", (store) => store.get(id));
};

export const listEquipamentos = async () => {
  return runTransaction("readonly", (store) => store.getAll());
};

export const deleteEquipamento = async (id) => {
  return runTransaction("readwrite", (store) => store.delete(id));
};

export const exportBackupJSON = async () => {
  const equipamentos = await listEquipamentos();
  return JSON.stringify(
    {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      equipamentos
    },
    null,
    2
  );
};

export const importBackupJSON = async (jsonString) => {
  let payload;
  try {
    payload = JSON.parse(jsonString);
  } catch (error) {
    throw new Error("JSON inválido");
  }

  const equipamentos = Array.isArray(payload) ? payload : payload?.equipamentos;

  if (!Array.isArray(equipamentos)) {
    throw new Error("Formato de backup inválido");
  }

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    equipamentos.forEach((equipamento) => {
      store.put(equipamento);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};
