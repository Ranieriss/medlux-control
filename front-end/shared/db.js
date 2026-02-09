const DB_NAME = "medlux_suite_db";
const DB_VERSION = 4;

const STORE_EQUIPAMENTOS = "equipamentos";
const STORE_USERS = "users";
const STORE_USUARIOS = "usuarios";
const STORE_VINCULOS = "vinculos";
const STORE_MEDICOES = "medicoes";
const STORE_OBRAS = "obras";
const STORE_ANEXOS = "anexos";
const STORE_AUDITORIA = "auditoria";
const STORE_AUDIT_LOG = "audit_log";

const nowIso = () => new Date().toISOString();
const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};
const normalizeId = (value) => String(value || "").trim().toUpperCase();

const normalizeUserRecord = (record = {}) => {
  const id = record.id || record.user_id || "";
  const id_normalized = record.id_normalized || normalizeId(id);
  const status = record.status || (record.ativo === false ? "INATIVO" : "ATIVO");
  const created_at = record.created_at || record.createdAt || nowIso();
  const updated_at = record.updated_at || record.updatedAt || created_at;
  const pinHash = record.pinHash || record.pin_hash || "";
  return {
    id,
    nome: record.nome || "",
    role: record.role || "",
    status,
    pinHash,
    salt: record.salt || "",
    id_normalized,
    created_at,
    updated_at,
    user_id: id,
    ativo: status === "ATIVO",
    pin_hash: pinHash
  };
};

const normalizeFuncao = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "HORIZONTAL" || raw === "VERTICAL" || raw === "TACHAS") return raw;
  if (raw === "H") return "HORIZONTAL";
  if (raw === "V") return "VERTICAL";
  return "";
};

const normalizeStatusLocal = (value) => {
  const raw = String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  if (raw === "OBRA") return "OBRA";
  if (raw === "LAB_TINTAS" || raw === "LABTINTAS") return "LAB_TINTAS";
  if (raw === "DEMONSTRACAO" || raw === "DEMONSTRACAO_" || raw === "DEMONSTRACAO__") return "DEMONSTRACAO";
  if (raw === "VENDIDO") return "VENDIDO";
  if (raw === "STAND_BY" || raw === "STANDBY") return "STAND_BY";
  return "STAND_BY";
};

const normalizeCalibrado = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (value === true || raw === "true" || raw === "sim") return "Sim";
  if (value === false || raw === "false" || raw === "nao" || raw === "não") return "Não";
  return "";
};

const normalizeEquipamentoRecord = (record = {}) => {
  const created_at = record.created_at || record.createdAt || nowIso();
  const updated_at = record.updated_at || record.updatedAt || created_at;
  const statusLocal = normalizeStatusLocal(record.statusLocal || record.statusOperacional || record.status || "");
  const localidadeCidadeUF = record.localidadeCidadeUF || record.localidade || "";
  const funcao = normalizeFuncao(record.funcao || record.funcaoEquipamento || record.tipo || "");
  const geometria = funcao === "HORIZONTAL" ? (record.geometria || null) : null;
  const calibrado = normalizeCalibrado(record.calibrado || record.calibracao);
  const certificado = record.certificado || record.numeroCertificado || record.numero_certificado || "";
  return {
    id: record.id || "",
    modelo: record.modelo || "",
    funcao,
    geometria,
    numeroSerie: record.numeroSerie || record.numero_serie || "",
    fabricante: record.fabricante || "",
    dataAquisicao: record.dataAquisicao || record.data_aquisicao || "",
    calibrado,
    dataCalibracao: record.dataCalibracao || record.data_calibracao || "",
    numeroCertificado: certificado,
    usuarioAtual: record.usuarioAtual || record.usuarioResponsavel || record.usuario_responsavel || "",
    localidadeCidadeUF,
    dataEntregaUsuario: record.dataEntregaUsuario || record.data_entrega_usuario || "",
    statusLocal,
    observacoes: record.observacoes || "",
    created_at,
    updated_at,
    statusOperacional: statusLocal,
    status: statusLocal,
    localidade: localidadeCidadeUF,
    numeroCertificado: certificado,
    usuarioResponsavel: record.usuarioResponsavel || record.usuario_responsavel || record.usuarioAtual || ""
  };
};

const normalizeVinculoRecord = (record = {}) => {
  const id = record.id || record.vinculo_id || "";
  const status = record.status || (record.ativo === false ? "ENCERRADO" : "ATIVO");
  const inicio = record.inicio || record.data_inicio || "";
  const fim = record.fim || record.data_fim || "";
  const created_at = record.created_at || record.createdAt || nowIso();
  const updated_at = record.updated_at || record.updatedAt || created_at;
  return {
    id,
    equipamento_id: record.equipamento_id || record.equip_id || "",
    user_id: record.user_id || "",
    inicio,
    fim,
    status,
    termo_pdf: record.termo_pdf || record.termo_cautela_pdf || record.termo || null,
    created_at,
    updated_at,
    vinculo_id: id,
    equip_id: record.equip_id || record.equipamento_id || "",
    ativo: status === "ATIVO",
    data_inicio: inicio,
    data_fim: fim,
    termo_cautela_pdf: record.termo_cautela_pdf || record.termo_pdf || null
  };
};

const normalizeMedicaoRecord = (record = {}) => {
  const id = record.id || record.medicao_id || "";
  const dataHora = record.dataHora || record.data_hora || "";
  const tipoMedicao = record.tipoMedicao || record.tipo_medicao || "";
  const subtipo = record.subtipo || record.subtipo_medicao || "";
  const leiturasRaw = Array.isArray(record.leituras) ? record.leituras : [];
  const leituras = leiturasRaw.map((item) => toNumber(item)).filter((item) => item !== null);
  if (!leituras.length && record.valor !== undefined) {
    const fallback = toNumber(record.valor);
    if (fallback !== null) leituras.push(fallback);
  }
  const media = record.media !== undefined
    ? toNumber(record.media)
    : (leituras.length ? leituras.reduce((acc, item) => acc + item, 0) / leituras.length : toNumber(record.valor));
  const created_at = record.created_at || record.createdAt || nowIso();
  const gps = record.gps && typeof record.gps === "object"
    ? record.gps
    : {
        lat: toNumber(record.gps_lat || record.lat || null),
        lng: toNumber(record.gps_lng || record.lng || null),
        accuracy: toNumber(record.gps_accuracy || record.accuracy || null),
        source: record.gps_source || record.gpsSource || ""
      };
  const fotos = Array.isArray(record.fotos) ? record.fotos : [];
  return {
    id,
    equipamento_id: record.equipamento_id || record.equip_id || "",
    user_id: record.user_id || "",
    obra_id: record.obra_id || record.obraId || "",
    relatorio_id: record.relatorio_id || record.relatorioId || record.identificadorRelatorio || "",
    tipoMedicao,
    subtipo,
    leituras,
    media,
    unidade: record.unidade || record.unidade_medida || "",
    dataHora,
    dataHoraGPS: record.dataHoraGPS || record.data_hora_gps || "",
    enderecoTexto: record.enderecoTexto || record.endereco || "",
    cidadeUF: record.cidadeUF || record.cidade_uf || "",
    rodovia: record.rodovia || "",
    km: record.km || "",
    sentido: record.sentido || "",
    faixa: record.faixa || "",
    tipoDeMarcacao: record.tipoDeMarcacao || record.tipo_marcacao || "",
    identificadorRelatorio: record.identificadorRelatorio || record.relatorio_id || record.relatorioId || "",
    estacao: record.estacao || record.estacao_id || "",
    linha: record.linha || "",
    letra: record.letra || "",
    cor: record.cor || "",
    angulo: record.angulo || "",
    posicao: record.posicao || "",
    clima: record.clima || "",
    observacoes: record.observacoes || "",
    gps,
    fotos,
    created_at,
    medicao_id: id,
    equip_id: record.equip_id || record.equipamento_id || "",
    tipo_medicao: tipoMedicao,
    valor: record.valor !== undefined ? record.valor : (media !== null ? media : ""),
    data_hora: dataHora
  };
};

const prepareUserRecord = (record = {}) => {
  const normalized = normalizeUserRecord(record);
  return {
    ...normalized,
    id: normalized.id,
    pinHash: normalized.pinHash,
    status: normalized.status,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at
  };
};

const prepareEquipamentoRecord = (record = {}) => {
  const normalized = normalizeEquipamentoRecord(record);
  return {
    ...normalized,
    statusOperacional: normalized.statusLocal,
    statusLocal: normalized.statusLocal,
    localidadeCidadeUF: normalized.localidadeCidadeUF,
    geometria: normalized.funcao === "HORIZONTAL" ? normalized.geometria : null,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at
  };
};

const prepareVinculoRecord = (record = {}) => {
  const normalized = normalizeVinculoRecord(record);
  return {
    ...normalized,
    status: normalized.status,
    inicio: normalized.inicio,
    fim: normalized.fim,
    termo_pdf: normalized.termo_pdf,
    created_at: normalized.created_at,
    updated_at: normalized.updated_at
  };
};

const prepareMedicaoRecord = (record = {}) => {
  const normalized = normalizeMedicaoRecord(record);
  return {
    ...normalized,
    tipoMedicao: normalized.tipoMedicao,
    dataHora: normalized.dataHora,
    created_at: normalized.created_at
  };
};

const normalizeObraRecord = (record = {}) => {
  const id = record.id || record.idObra || record.obra_id || "";
  const created_at = record.created_at || record.createdAt || nowIso();
  const updated_at = record.updated_at || record.updatedAt || created_at;
  return {
    id,
    idObra: id,
    nomeObra: record.nomeObra || record.nome_obra || record.nome || "",
    rodovia: record.rodovia || "",
    kmInicio: record.kmInicio || record.km_inicio || "",
    kmFim: record.kmFim || record.km_fim || "",
    cidadeUF: record.cidadeUF || record.cidade_uf || "",
    concessionariaCliente: record.concessionariaCliente || record.concessionaria_cliente || record.cliente || "",
    responsavelTecnico: record.responsavelTecnico || record.responsavel_tecnico || "",
    observacoes: record.observacoes || "",
    created_at,
    updated_at
  };
};

const prepareObraRecord = (record = {}) => normalizeObraRecord(record);

const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    const transaction = request.transaction;
    if (!db.objectStoreNames.contains(STORE_EQUIPAMENTOS)) {
      const store = db.createObjectStore(STORE_EQUIPAMENTOS, { keyPath: "id" });
      store.createIndex("funcao", "funcao", { unique: false });
      store.createIndex("statusOperacional", "statusOperacional", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_USERS)) {
      const store = db.createObjectStore(STORE_USERS, { keyPath: "id" });
      store.createIndex("role", "role", { unique: false });
      store.createIndex("status", "status", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_VINCULOS)) {
      const store = db.createObjectStore(STORE_VINCULOS, { keyPath: "id" });
      store.createIndex("equipamento_id", "equipamento_id", { unique: false });
      store.createIndex("user_id", "user_id", { unique: false });
      store.createIndex("status", "status", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_MEDICOES)) {
      const store = db.createObjectStore(STORE_MEDICOES, { keyPath: "id" });
      store.createIndex("equipamento_id", "equipamento_id", { unique: false });
      store.createIndex("user_id", "user_id", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_OBRAS)) {
      const store = db.createObjectStore(STORE_OBRAS, { keyPath: "id" });
      store.createIndex("idObra", "idObra", { unique: false });
      store.createIndex("cidadeUF", "cidadeUF", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_ANEXOS)) {
      const store = db.createObjectStore(STORE_ANEXOS, { keyPath: "id" });
      store.createIndex("medicao_id", "medicao_id", { unique: false });
      store.createIndex("tipo", "tipo", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_AUDITORIA)) {
      const store = db.createObjectStore(STORE_AUDITORIA, { keyPath: "auditoria_id" });
      store.createIndex("entity", "entity", { unique: false });
      store.createIndex("data_hora", "data_hora", { unique: false });
    }
    if (!db.objectStoreNames.contains(STORE_AUDIT_LOG)) {
      const store = db.createObjectStore(STORE_AUDIT_LOG, { keyPath: "auditoria_id" });
      store.createIndex("entity", "entity", { unique: false });
      store.createIndex("data_hora", "data_hora", { unique: false });
    }

    if (db.objectStoreNames.contains(STORE_USUARIOS) && db.objectStoreNames.contains(STORE_USERS)) {
      const legacyStore = transaction.objectStore(STORE_USUARIOS);
      const usersStore = transaction.objectStore(STORE_USERS);
      const legacyRequest = legacyStore.getAll();
      legacyRequest.onsuccess = () => {
        (legacyRequest.result || []).forEach((item) => {
          usersStore.put(prepareUserRecord(item));
        });
      };
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
  const keyPath = store.keyPath;
  const normalized = { ...value };
  if (keyPath && normalized[keyPath] === undefined) {
    if (keyPath === "id") {
      normalized.id = normalized.id || normalized.vinculo_id || normalized.medicao_id || normalized.user_id;
    }
    if (keyPath === "user_id") {
      normalized.user_id = normalized.user_id || normalized.id;
    }
    if (keyPath === "vinculo_id") {
      normalized.vinculo_id = normalized.vinculo_id || normalized.id;
    }
    if (keyPath === "medicao_id") {
      normalized.medicao_id = normalized.medicao_id || normalized.id;
    }
  }
  return requestToPromise(store.put(normalized));
});

const deleteFromStore = (storeName, key) => runTransaction([storeName], "readwrite", (transaction) => {
  const store = transaction.objectStore(storeName);
  return requestToPromise(store.delete(key));
});

const clearStore = (storeName) => runTransaction([storeName], "readwrite", (transaction) => {
  const store = transaction.objectStore(storeName);
  return requestToPromise(store.clear());
});

const getAllEquipamentos = () => getAllFromStore(STORE_EQUIPAMENTOS).then((items) => (items || []).map(normalizeEquipamentoRecord));
const getEquipamentoById = (id) => getByKey(STORE_EQUIPAMENTOS, id).then((item) => (item ? normalizeEquipamentoRecord(item) : null));
const saveEquipamento = (equipamento) => putInStore(STORE_EQUIPAMENTOS, prepareEquipamentoRecord(equipamento));
const deleteEquipamento = (id) => deleteFromStore(STORE_EQUIPAMENTOS, id);
const clearEquipamentos = () => clearStore(STORE_EQUIPAMENTOS);
const bulkSaveEquipamentos = (items) => runTransaction([STORE_EQUIPAMENTOS], "readwrite", (transaction) => {
  const store = transaction.objectStore(STORE_EQUIPAMENTOS);
  items.forEach((item) => store.put(prepareEquipamentoRecord(item)));
});

const getAllUsers = async () => {
  const items = await getAllFromStore(STORE_USERS).catch(() => []);
  if (items && items.length) return items.map(normalizeUserRecord);
  const legacy = await getAllFromStore(STORE_USUARIOS).catch(() => []);
  return (legacy || []).map(normalizeUserRecord);
};
const getUserById = async (id) => {
  const item = await getByKey(STORE_USERS, id).catch(() => null);
  if (item) return normalizeUserRecord(item);
  const legacy = await getByKey(STORE_USUARIOS, id).catch(() => null);
  return legacy ? normalizeUserRecord(legacy) : null;
};
const saveUser = (usuario) => putInStore(STORE_USERS, prepareUserRecord(usuario));
const deleteUser = (id) => deleteFromStore(STORE_USERS, id);

const getAllUsuarios = () => getAllUsers();
const getUsuarioById = (id) => getUserById(id);
const saveUsuario = (usuario) => saveUser(usuario);
const deleteUsuario = (id) => deleteUser(id);

const getAllVinculos = () => getAllFromStore(STORE_VINCULOS).then((items) => (items || []).map(normalizeVinculoRecord));
const saveVinculo = (vinculo) => putInStore(STORE_VINCULOS, prepareVinculoRecord(vinculo));
const deleteVinculo = (id) => deleteFromStore(STORE_VINCULOS, id);

const isVinculoAtivo = (item) => item.status === "ATIVO" || item.ativo === true;

const getVinculosAtivos = async () => {
  const items = await getAllVinculos();
  return items.filter((item) => isVinculoAtivo(item));
};

const getVinculosByUser = async (userId) => {
  const items = await getAllVinculos();
  return items.filter((item) => item.user_id === userId);
};

const getVinculoAtivoByEquip = async (equipId) => {
  const items = await getAllVinculos();
  return items.find((item) => item.equipamento_id === equipId && isVinculoAtivo(item)) || null;
};

const encerrarVinculo = async (vinculoId, dataFim) => {
  const vinculo = await getByKey(STORE_VINCULOS, vinculoId);
  if (!vinculo) return null;
  const atualizado = prepareVinculoRecord({
    ...vinculo,
    fim: dataFim,
    data_fim: dataFim,
    status: "ENCERRADO",
    ativo: false,
    updated_at: nowIso()
  });
  await saveVinculo(atualizado);
  return normalizeVinculoRecord(atualizado);
};

const getAllMedicoes = () => getAllFromStore(STORE_MEDICOES).then((items) => (items || []).map(normalizeMedicaoRecord));
const saveMedicao = (medicao) => putInStore(STORE_MEDICOES, prepareMedicaoRecord(medicao));
const deleteMedicao = (id) => deleteFromStore(STORE_MEDICOES, id);
const getMedicoesByEquip = async (equipId) => {
  const items = await getAllMedicoes();
  return items.filter((item) => item.equipamento_id === equipId);
};
const getMedicoesByUser = async (userId) => {
  const items = await getAllMedicoes();
  return items.filter((item) => item.user_id === userId);
};

const dedupeAuditoria = (items = []) => {
  const map = new Map();
  items.forEach((item) => {
    const key = item.auditoria_id || item.id || crypto.randomUUID();
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
};

const getAllAuditoria = async () => {
  const auditoria = await getAllFromStore(STORE_AUDITORIA).catch(() => []);
  const auditLog = await getAllFromStore(STORE_AUDIT_LOG).catch(() => []);
  return dedupeAuditoria([...(auditLog || []), ...(auditoria || [])]);
};
const saveAuditoria = async (entry) => {
  const db = await openDB();
  const primaryStore = db.objectStoreNames.contains(STORE_AUDIT_LOG) ? STORE_AUDIT_LOG : STORE_AUDITORIA;
  if (!primaryStore) return null;
  return runTransaction([primaryStore], "readwrite", (transaction) => {
    transaction.objectStore(primaryStore).put(entry);
    return entry;
  });
};

const getAllObras = () => getAllFromStore(STORE_OBRAS).then((items) => (items || []).map(normalizeObraRecord));
const getObraById = (id) => getByKey(STORE_OBRAS, id).then((item) => (item ? normalizeObraRecord(item) : null));
const saveObra = (obra) => putInStore(STORE_OBRAS, prepareObraRecord(obra));
const deleteObra = (id) => deleteFromStore(STORE_OBRAS, id);

const exportSnapshot = async () => {
  const [equipamentos, usuarios, vinculos, medicoes, auditoria] = await Promise.all([
    getAllEquipamentos(),
    getAllUsers(),
    getAllVinculos(),
    getAllMedicoes(),
    getAllAuditoria()
  ]);
  const obras = await getAllObras();
  return {
    version: 4,
    generatedAt: new Date().toISOString(),
    equipamentos,
    users: usuarios,
    usuarios,
    vinculos,
    medicoes,
    obras,
    auditoria,
    audit_log: auditoria
  };
};

const importSnapshot = async (payload) => runTransaction(
  [STORE_EQUIPAMENTOS, STORE_USERS, STORE_VINCULOS, STORE_MEDICOES, STORE_OBRAS, STORE_AUDITORIA, STORE_AUDIT_LOG],
  "readwrite",
  (transaction) => {
    const equipStore = transaction.objectStore(STORE_EQUIPAMENTOS);
    const userStore = transaction.objectStore(STORE_USERS);
    const vincStore = transaction.objectStore(STORE_VINCULOS);
    const medStore = transaction.objectStore(STORE_MEDICOES);
    const obraStore = transaction.objectStore(STORE_OBRAS);
    const hasAuditLog = transaction.objectStoreNames.contains(STORE_AUDIT_LOG);
    const auditStore = transaction.objectStore(hasAuditLog ? STORE_AUDIT_LOG : STORE_AUDITORIA);
    (payload.equipamentos || []).forEach((item) => equipStore.put(prepareEquipamentoRecord(item)));
    (payload.users || payload.usuarios || []).forEach((item) => userStore.put(prepareUserRecord(item)));
    (payload.vinculos || []).forEach((item) => vincStore.put(prepareVinculoRecord(item)));
    (payload.medicoes || []).forEach((item) => medStore.put(prepareMedicaoRecord(item)));
    (payload.obras || []).forEach((item) => obraStore.put(prepareObraRecord(item)));
    (payload.audit_log || payload.auditoria || []).forEach((item) => {
      auditStore.put(item);
    });
  }
);

const clearAllStores = async () => {
  const db = await openDB();
  const stores = [STORE_EQUIPAMENTOS, STORE_USERS, STORE_VINCULOS, STORE_MEDICOES, STORE_OBRAS, STORE_ANEXOS, STORE_AUDITORIA, STORE_AUDIT_LOG]
    .filter((name) => db.objectStoreNames.contains(name));
  if (db.objectStoreNames.contains(STORE_USUARIOS)) stores.push(STORE_USUARIOS);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, "readwrite");
    stores.forEach((storeName) => {
      transaction.objectStore(storeName).clear();
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

export {
  getAllEquipamentos,
  getEquipamentoById,
  saveEquipamento,
  deleteEquipamento,
  clearEquipamentos,
  bulkSaveEquipamentos,
  getAllUsers,
  getUserById,
  saveUser,
  deleteUser,
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
  getAllObras,
  getObraById,
  saveObra,
  deleteObra,
  exportSnapshot,
  importSnapshot,
  clearAllStores
};
