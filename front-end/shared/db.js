// front-end/shared/db.js

const DB_NAME = "medlux_suite_db";
const DB_VERSION = 8;
const EXPORT_VERSION = 1;

const STORE_EQUIPAMENTOS = "equipamentos";
const STORE_USERS = "users";
const STORE_USUARIOS = "usuarios"; // legado
const STORE_VINCULOS = "vinculos";
const STORE_MEDICOES = "medicoes";
const STORE_OBRAS = "obras";
const STORE_ANEXOS = "anexos";
const STORE_AUDITORIA = "auditoria"; // legado
const STORE_AUDIT_LOG = "audit_log";
const STORE_ERRORS_LOG = "errors_log";
const STORE_CRITERIOS = "criterios";

const nowIso = () => new Date().toISOString();

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeId = (value) => String(value || "").trim().toUpperCase();

const resolveUuid = (record = {}) =>
  record.uuid || record.internal_id || record.user_uuid || "";

// ===========================
// Normalizers / Preparers
// ===========================

const normalizeUserRecord = (record = {}) => {
  const id = record.id || record.user_id || "";
  const id_normalized = record.id_normalized || normalizeId(id);
  const status = record.status || (record.ativo === false ? "INATIVO" : "ATIVO");
  const created_at = record.created_at || record.createdAt || nowIso();
  const updated_at = record.updated_at || record.updatedAt || created_at;
  const pinHash = record.pinHash || record.pin_hash || "";

  return {
    id,
    uuid: resolveUuid(record) || "",
    nome: record.nome || "",
    role: record.role || "",
    status,
    pinHash,
    salt: record.salt || "",
    id_normalized,
    created_at,
    updated_at,
    // aliases p/ compat
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
    uuid: resolveUuid(record) || "",
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
    // aliases
    statusOperacional: statusLocal,
    status: statusLocal,
    localidade: localidadeCidadeUF,
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
    uuid: resolveUuid(record) || id,
    equipamento_id: record.equipamento_id || record.equip_id || "",
    user_id: record.user_id || "",
    inicio,
    fim,
    status,
    termo_pdf: record.termo_pdf || record.termo_cautela_pdf || record.termo || null,
    cpfUsuario: String(record.cpfUsuario || record.cpf_usuario || "").replace(/\D/g, ""),
    observacoes: String(record.observacoes || ""),
    created_at,
    updated_at,
    // aliases
    vinculo_id: id,
    equip_id: record.equip_id || record.equipamento_id || "",
    ativo: status === "ATIVO",
    data_inicio: inicio,
    data_fim: fim,
    termo_cautela_pdf: record.termo_cautela_pdf || record.termo_pdf || null,
    cpf_usuario: String(record.cpf_usuario || record.cpfUsuario || "").replace(/\D/g, "")
  };
};

const normalizeMedicaoRecord = (record = {}) => {
  const id = record.id || record.medicao_id || "";
  const dataHora = record.dataHora || record.data_hora || record.created_at || "";
  const tipoMedicao = record.tipoMedicao || record.tipo_medicao || "";
  const subtipo = record.subtipo || record.subtipo_medicao || "";

  const leiturasRaw = Array.isArray(record.leituras) ? record.leituras : [];
  const leituras = leiturasRaw.map((item) => toNumber(item)).filter((item) => item !== null);

  if (!leituras.length && record.valor !== undefined) {
    const fallback = toNumber(record.valor);
    if (fallback !== null) leituras.push(fallback);
  }

  const computedMedia = leituras.length
    ? leituras.reduce((acc, item) => acc + item, 0) / leituras.length
    : toNumber(record.valor);

  const media = record.media !== undefined ? toNumber(record.media) : computedMedia;
  const media_final = toNumber(record.media_final) ?? media;

  const created_at = record.created_at || record.createdAt || dataHora || nowIso();

  const gps =
    record.gps && typeof record.gps === "object"
      ? record.gps
      : {
          lat: toNumber(record.gps_lat || record.lat || null),
          lng: toNumber(record.gps_lng || record.lng || null),
          accuracy: toNumber(record.gps_accuracy || record.accuracy || null),
          source: record.gps_source || record.gpsSource || ""
        };

  const fotos = Array.isArray(record.fotos) ? record.fotos : [];
  const legenda_por_letra = Array.isArray(record.legenda_por_letra) ? record.legenda_por_letra : [];

  return {
    id,
    uuid: resolveUuid(record) || id,

    equipamento_id: record.equipamento_id || record.equip_id || "",
    user_id: record.user_id || "",
    obra_id: record.obra_id || record.obraId || "",
    relatorio_id: record.relatorio_id || record.relatorioId || record.identificadorRelatorio || "",

    tipoMedicao,
    subtipo,

    leituras,
    media,
    media_final,

    raw_readings: Array.isArray(record.raw_readings)
      ? record.raw_readings.map((item) => toNumber(item)).filter((item) => item !== null)
      : leituras,

    discarded_min: toNumber(record.discarded_min),
    discarded_max: toNumber(record.discarded_max),

    // conformidade (novo modelo)
    minimo: toNumber(record.minimo),
    status_conformidade: record.status_conformidade || "NÃO AVALIADO",
    motivo_status: record.motivo_status || record.motivo_conformidade || "",
    periodo_horizontal: record.periodo_horizontal || record.periodo || "",
    regra_calculo: record.regra_calculo || "",

    // legenda (novo)
    texto_legenda: record.texto_legenda || record.legenda_texto || "",
    legenda_por_letra,
    legenda_estrutura_informada: record.legenda_estrutura_informada !== false,

    // criterio (novo)
    criterio_id: record.criterio_id || "",
    criterio_minimo: toNumber(record.criterio_minimo),
    criterio_fonte: record.criterio_fonte || "",
    criterio_fallback_level: toNumber(record.criterio_fallback_level),

    // campos gerais
    unidade: record.unidade || record.unidade_medida || "",
    dataHora: record.dataHora || record.data_hora || "",
    dataHoraGPS: record.dataHoraGPS || record.data_hora_gps || "",
    enderecoTexto: record.enderecoTexto || record.endereco || "",
    cidadeUF: record.cidadeUF || record.cidade_uf || "",
    rodovia: record.rodovia || "",
    km: record.km || "",
    sentido: record.sentido || "",
    faixa: record.faixa || "",
    tipoDeMarcacao: record.tipoDeMarcacao || record.tipo_marcacao || "",
    identificadorRelatorio:
      record.identificadorRelatorio || record.relatorio_id || record.relatorioId || "",
    estacao: record.estacao || record.estacao_id || "",
    linha: record.linha || "",
    letra: record.letra || "",
    cor: record.cor || "",
    angulo: record.angulo || "",
    posicao: record.posicao || "",
    clima: record.clima || "",
    observacoes: record.observacoes || "",
    data_aplicacao: record.data_aplicacao || "",
    classe_tipo: record.classe_tipo || "",
    elemento_via: record.elemento_via || record.tipoDeMarcacao || record.tipo_marcacao || "",

    gps,
    fotos,

    created_at,

    // aliases p/ compat
    medicao_id: id,
    equip_id: record.equip_id || record.equipamento_id || "",
    tipo_medicao: tipoMedicao,
    valor: record.valor !== undefined ? record.valor : media ?? "",
    data_hora: record.dataHora || record.data_hora || ""
  };
};

const prepareUserRecord = (record = {}) => {
  const normalized = normalizeUserRecord(record);
  const uuid = normalized.uuid || resolveUuid(record) || crypto.randomUUID();
  return {
    ...normalized,
    uuid
  };
};

const prepareEquipamentoRecord = (record = {}) => {
  const normalized = normalizeEquipamentoRecord(record);
  const uuid = normalized.uuid || resolveUuid(record) || crypto.randomUUID();
  return {
    ...normalized,
    uuid,
    statusOperacional: normalized.statusLocal,
    statusLocal: normalized.statusLocal,
    localidadeCidadeUF: normalized.localidadeCidadeUF,
    geometria: normalized.funcao === "HORIZONTAL" ? normalized.geometria : null
  };
};

const prepareVinculoRecord = (record = {}) => {
  const normalized = normalizeVinculoRecord(record);
  const uuid = normalized.uuid || resolveUuid(record) || normalized.id || crypto.randomUUID();
  return {
    ...normalized,
    uuid
  };
};

const prepareMedicaoRecord = (record = {}) => {
  const normalized = normalizeMedicaoRecord(record);
  const uuid = normalized.uuid || resolveUuid(record) || normalized.id || crypto.randomUUID();
  return {
    ...normalized,
    uuid,
    created_at: normalized.created_at || nowIso()
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

const normalizeAuditRecord = (record = {}) => {
  const audit_id = record.audit_id || record.auditoria_id || record.id || record.auditId || crypto.randomUUID();
  const created_at = record.created_at || record.data_hora || record.dataHora || nowIso();

  return {
    ...record,
    audit_id,
    auditoria_id: record.auditoria_id || audit_id,
    created_at,
    data_hora: record.data_hora || created_at
  };
};

const normalizeErrorRecord = (record = {}) => ({
  error_id: record.error_id || record.id || crypto.randomUUID(),
  created_at: record.created_at || record.data_hora || nowIso(),
  module: record.module || "",
  action: record.action || "",
  message: record.message || "",
  stack: record.stack || "",
  context: record.context || null
});

// ✅ MANTER APENAS ESTE normalizeCriterioRecord (NOVO)
const normalizeCriterioRecord = (record = {}) => ({
  id: record.id || crypto.randomUUID(),
  obra_id: String(record.obra_id || record.obraId || "").trim().toUpperCase(),
  subtipo: String(record.subtipo || "").trim().toUpperCase(),
  classe_tipo: String(record.classe_tipo || record.classeTipo || "").trim().toUpperCase(),
  elemento_marcacao: String(record.elemento_marcacao || record.elementoMarcacao || record.tipoDeMarcacao || "").trim().toUpperCase(),
  periodo: String(record.periodo || "").trim().toUpperCase(),
  geom: String(record.geom || record.geometria || "").trim().toUpperCase(),
  minimo: toNumber(record.minimo),
  created_at: record.created_at || nowIso(),
  updated_at: record.updated_at || nowIso()
});

// ===========================
// IndexedDB helpers
// ===========================

const ensureStoreIndexes = (store, indexes = []) => {
  indexes.forEach(({ name, keyPath, options }) => {
    if (!store.indexNames.contains(name)) {
      store.createIndex(name, keyPath, options);
    }
  });
};

const ensureRecordUuids = (store, builder) => {
  const request = store.openCursor();
  request.onsuccess = (event) => {
    const cursor = event.target.result;
    if (!cursor) return;
    const updated = builder(cursor.value, cursor.key);
    if (updated) cursor.update(updated);
    cursor.continue();
  };
};

const openDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const transaction = request.transaction;

      const equipamentosStore = db.objectStoreNames.contains(STORE_EQUIPAMENTOS)
        ? transaction.objectStore(STORE_EQUIPAMENTOS)
        : db.createObjectStore(STORE_EQUIPAMENTOS, { keyPath: "id" });
      ensureStoreIndexes(equipamentosStore, [
        { name: "funcao", keyPath: "funcao", options: { unique: false } },
        { name: "statusOperacional", keyPath: "statusOperacional", options: { unique: false } }
      ]);

      const usersStore = db.objectStoreNames.contains(STORE_USERS)
        ? transaction.objectStore(STORE_USERS)
        : db.createObjectStore(STORE_USERS, { keyPath: "id" });
      ensureStoreIndexes(usersStore, [
        { name: "role", keyPath: "role", options: { unique: false } },
        { name: "status", keyPath: "status", options: { unique: false } }
      ]);

      const vinculosStore = db.objectStoreNames.contains(STORE_VINCULOS)
        ? transaction.objectStore(STORE_VINCULOS)
        : db.createObjectStore(STORE_VINCULOS, { keyPath: "id" });
      ensureStoreIndexes(vinculosStore, [
        { name: "equipamento_id", keyPath: "equipamento_id", options: { unique: false } },
        { name: "user_id", keyPath: "user_id", options: { unique: false } },
        { name: "status", keyPath: "status", options: { unique: false } },
        { name: "by_user_id", keyPath: "user_id", options: { unique: false } },
        { name: "by_equip_id", keyPath: "equipamento_id", options: { unique: false } },
        { name: "by_status", keyPath: "status", options: { unique: false } }
      ]);

      const medicoesStore = db.objectStoreNames.contains(STORE_MEDICOES)
        ? transaction.objectStore(STORE_MEDICOES)
        : db.createObjectStore(STORE_MEDICOES, { keyPath: "id" });
      ensureStoreIndexes(medicoesStore, [
        { name: "equipamento_id", keyPath: "equipamento_id", options: { unique: false } },
        { name: "user_id", keyPath: "user_id", options: { unique: false } },
        { name: "by_equip_id", keyPath: "equipamento_id", options: { unique: false } },
        { name: "by_user_id", keyPath: "user_id", options: { unique: false } },
        { name: "by_obra_id", keyPath: "obra_id", options: { unique: false } },
        { name: "by_relatorio_id", keyPath: "relatorio_id", options: { unique: false } },
        { name: "by_created_at", keyPath: "created_at", options: { unique: false } }
      ]);

      const obrasStore = db.objectStoreNames.contains(STORE_OBRAS)
        ? transaction.objectStore(STORE_OBRAS)
        : db.createObjectStore(STORE_OBRAS, { keyPath: "id" });
      ensureStoreIndexes(obrasStore, [
        { name: "idObra", keyPath: "idObra", options: { unique: false } },
        { name: "cidadeUF", keyPath: "cidadeUF", options: { unique: false } }
      ]);

      const anexosStore = db.objectStoreNames.contains(STORE_ANEXOS)
        ? transaction.objectStore(STORE_ANEXOS)
        : db.createObjectStore(STORE_ANEXOS, { keyPath: "id" });
      ensureStoreIndexes(anexosStore, [
        { name: "medicao_id", keyPath: "medicao_id", options: { unique: false } },
        { name: "tipo", keyPath: "tipo", options: { unique: false } }
      ]);

      const auditoriaStore = db.objectStoreNames.contains(STORE_AUDITORIA)
        ? transaction.objectStore(STORE_AUDITORIA)
        : db.createObjectStore(STORE_AUDITORIA, { keyPath: "auditoria_id" });
      ensureStoreIndexes(auditoriaStore, [
        { name: "entity", keyPath: "entity", options: { unique: false } },
        { name: "data_hora", keyPath: "data_hora", options: { unique: false } }
      ]);

      const auditLogStore = db.objectStoreNames.contains(STORE_AUDIT_LOG)
        ? transaction.objectStore(STORE_AUDIT_LOG)
        : db.createObjectStore(STORE_AUDIT_LOG, { keyPath: "auditoria_id" });
      ensureStoreIndexes(auditLogStore, [
        { name: "entity", keyPath: "entity", options: { unique: false } },
        { name: "data_hora", keyPath: "data_hora", options: { unique: false } },
        { name: "by_created_at", keyPath: "created_at", options: { unique: false } },
        { name: "by_entity", keyPath: "entity_type", options: { unique: false } },
        { name: "by_action", keyPath: "action", options: { unique: false } }
      ]);

      const errorsStore = db.objectStoreNames.contains(STORE_ERRORS_LOG)
        ? transaction.objectStore(STORE_ERRORS_LOG)
        : db.createObjectStore(STORE_ERRORS_LOG, { keyPath: "error_id" });
      ensureStoreIndexes(errorsStore, [
        { name: "by_created_at", keyPath: "created_at", options: { unique: false } },
        { name: "by_module", keyPath: "module", options: { unique: false } },
        { name: "by_action", keyPath: "action", options: { unique: false } }
      ]);

      const criteriosStore = db.objectStoreNames.contains(STORE_CRITERIOS)
        ? transaction.objectStore(STORE_CRITERIOS)
        : db.createObjectStore(STORE_CRITERIOS, { keyPath: "id" });
      ensureStoreIndexes(criteriosStore, [
        { name: "by_obra_id", keyPath: "obra_id", options: { unique: false } },
        { name: "by_subtipo", keyPath: "subtipo", options: { unique: false } },
        { name: "by_updated_at", keyPath: "updated_at", options: { unique: false } }
      ]);

      // Migração legado: usuarios -> users
      if (db.objectStoreNames.contains(STORE_USUARIOS) && db.objectStoreNames.contains(STORE_USERS)) {
        const legacyStore = transaction.objectStore(STORE_USUARIOS);
        const usersStoreTx = transaction.objectStore(STORE_USERS);
        const legacyRequest = legacyStore.getAll();
        legacyRequest.onsuccess = () => {
          (legacyRequest.result || []).forEach((item) => {
            usersStoreTx.put(prepareUserRecord(item));
          });
        };
      }

      // Garantir UUIDs
      ensureRecordUuids(equipamentosStore, (record) => {
        if (record.uuid) return null;
        return { ...record, uuid: record.uuid || crypto.randomUUID() };
      });
      ensureRecordUuids(usersStore, (record) => {
        if (record.uuid) return null;
        return { ...record, uuid: record.uuid || crypto.randomUUID() };
      });
      ensureRecordUuids(vinculosStore, (record) => {
        const cpfUsuario = String(record.cpfUsuario || record.cpf_usuario || "").replace(/\D/g, "");
        const observacoes = String(record.observacoes || "");
        const needsUpdate = !record.uuid || record.cpfUsuario !== cpfUsuario || record.observacoes !== observacoes;
        if (!needsUpdate) return null;
        return {
          ...record,
          uuid: record.uuid || record.id || crypto.randomUUID(),
          cpfUsuario,
          cpf_usuario: cpfUsuario,
          observacoes
        };
      });
      ensureRecordUuids(medicoesStore, (record) => {
        if (!record.created_at) {
          return {
            ...record,
            uuid: record.uuid || record.id || crypto.randomUUID(),
            created_at: record.dataHora || record.data_hora || nowIso()
          };
        }
        if (record.uuid) return null;
        return { ...record, uuid: record.uuid || record.id || crypto.randomUUID() };
      });
      ensureRecordUuids(auditLogStore, (record, key) => {
        const normalized = normalizeAuditRecord({ ...record, auditoria_id: record.auditoria_id || key });
        if (
          normalized.audit_id === record.audit_id &&
          normalized.auditoria_id === record.auditoria_id &&
          normalized.created_at === record.created_at
        ) {
          return null;
        }
        return normalized;
      });

      // Migração legado: auditoria -> audit_log
      if (db.objectStoreNames.contains(STORE_AUDITORIA)) {
        const legacyAuditRequest = auditoriaStore.getAll();
        legacyAuditRequest.onsuccess = () => {
          (legacyAuditRequest.result || []).forEach((item) => {
            auditLogStore.put(normalizeAuditRecord(item));
          });
          auditoriaStore.clear();
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

const requestToPromise = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getAllFromStore = (storeName) =>
  runTransaction([storeName], "readonly", (transaction) => {
    const store = transaction.objectStore(storeName);
    return requestToPromise(store.getAll());
  });

const getByKey = (storeName, key) =>
  runTransaction([storeName], "readonly", (transaction) => {
    const store = transaction.objectStore(storeName);
    return requestToPromise(store.get(key));
  });

const putInStore = (storeName, value) =>
  runTransaction([storeName], "readwrite", (transaction) => {
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

const deleteFromStore = (storeName, key) =>
  runTransaction([storeName], "readwrite", (transaction) => {
    const store = transaction.objectStore(storeName);
    return requestToPromise(store.delete(key));
  });

const clearStore = (storeName) =>
  runTransaction([storeName], "readwrite", (transaction) => {
    const store = transaction.objectStore(storeName);
    return requestToPromise(store.clear());
  });

// ===========================
// API - Equipamentos
// ===========================

const getAllEquipamentos = () =>
  getAllFromStore(STORE_EQUIPAMENTOS).then((items) => (items || []).map(normalizeEquipamentoRecord));

const getEquipamentoById = (id) =>
  getByKey(STORE_EQUIPAMENTOS, id).then((item) => (item ? normalizeEquipamentoRecord(item) : null));

const saveEquipamento = (equipamento) =>
  putInStore(STORE_EQUIPAMENTOS, prepareEquipamentoRecord(equipamento));

const deleteEquipamento = (id) => deleteFromStore(STORE_EQUIPAMENTOS, id);
const clearEquipamentos = () => clearStore(STORE_EQUIPAMENTOS);

const bulkSaveEquipamentos = (items) =>
  runTransaction([STORE_EQUIPAMENTOS], "readwrite", (transaction) => {
    const store = transaction.objectStore(STORE_EQUIPAMENTOS);
    (items || []).forEach((item) => store.put(prepareEquipamentoRecord(item)));
  });

// ===========================
// API - Users/Usuarios
// ===========================

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

// aliases
const getAllUsuarios = () => getAllUsers();
const getUsuarioById = (id) => getUserById(id);
const saveUsuario = (usuario) => saveUser(usuario);
const deleteUsuario = (id) => deleteUser(id);

// ===========================
// API - Vinculos
// ===========================

const getAllVinculos = () =>
  getAllFromStore(STORE_VINCULOS).then((items) => (items || []).map(normalizeVinculoRecord));

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

// ===========================
// API - Medicoes
// ===========================

const getAllMedicoes = () =>
  getAllFromStore(STORE_MEDICOES).then((items) => (items || []).map(normalizeMedicaoRecord));

const saveMedicao = (medicao) => putInStore(STORE_MEDICOES, prepareMedicaoRecord(medicao));
const deleteMedicao = (id) => deleteFromStore(STORE_MEDICOES, id);

const getMedicoesByEquip = async (equipId) => {
  const items = await getAllMedicoes();
  return items.filter((item) => item.equipamento_id === equipId);
};

const getMedicoesByUser = async (userId) => {
  const normalizedUserId = normalizeId(userId);
  const items = await getAllMedicoes();
  return items.filter((item) => normalizeId(item.user_id) === normalizedUserId);
};

// ===========================
// API - Auditoria
// ===========================

const uniqueAuditoria = (items = []) => {
  const map = new Map();
  (items || []).forEach((item) => {
    const key = item.auditoria_id || item.audit_id || item.id;
    if (!key) return;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
};

const dedupeAuditoria = uniqueAuditoria;

const getAllAuditoria = async () => {
  const db = await openDB();
  const storeName = db.objectStoreNames.contains(STORE_AUDIT_LOG) ? STORE_AUDIT_LOG : STORE_AUDITORIA;
  const items = await getAllFromStore(storeName).catch(() => []);
  return uniqueAuditoria(items || []);
};

const saveAuditoria = async (entry) => {
  const db = await openDB();
  const primaryStore = db.objectStoreNames.contains(STORE_AUDIT_LOG) ? STORE_AUDIT_LOG : STORE_AUDITORIA;
  if (!primaryStore) return null;

  const normalized = normalizeAuditRecord(entry);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([primaryStore], "readwrite");
    const store = transaction.objectStore(primaryStore);

    const getRequest = store.get(normalized.auditoria_id);
    getRequest.onsuccess = () => {
      if (getRequest.result) {
        resolve(getRequest.result);
        return;
      }
      const putRequest = store.put(normalized);
      putRequest.onsuccess = () => resolve(normalized);
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

// ===========================
// API - Obras
// ===========================

const getAllObras = () => getAllFromStore(STORE_OBRAS).then((items) => (items || []).map(normalizeObraRecord));

const getObraById = (id) =>
  getByKey(STORE_OBRAS, id).then((item) => (item ? normalizeObraRecord(item) : null));

const saveObra = (obra) => putInStore(STORE_OBRAS, prepareObraRecord(obra));
const deleteObra = (id) => deleteFromStore(STORE_OBRAS, id);

// ===========================
// API - Criterios
// ===========================

const getAllCriterios = () => getAllFromStore(STORE_CRITERIOS).then((items) => (items || []).map(normalizeCriterioRecord));

const saveCriterio = (criterio) => putInStore(STORE_CRITERIOS, normalizeCriterioRecord(criterio));
const deleteCriterio = (id) => deleteFromStore(STORE_CRITERIOS, id);

// ===========================
// API - Errors
// ===========================

const saveErrorLog = (error) => putInStore(STORE_ERRORS_LOG, normalizeErrorRecord(error));

const getAllErrors = () =>
  getAllFromStore(STORE_ERRORS_LOG).then((items) => (items || []).map(normalizeErrorRecord));

const getRecentErrors = async (limit = 30) => {
  const items = await getAllErrors();
  return items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
};

// ===========================
// Stats / Export / Import
// ===========================

const getStoreCounts = async () => {
  const db = await openDB();
  const stores = [
    STORE_EQUIPAMENTOS,
    STORE_USERS,
    STORE_VINCULOS,
    STORE_MEDICOES,
    STORE_OBRAS,
    STORE_ANEXOS,
    STORE_AUDIT_LOG,
    STORE_ERRORS_LOG,
    STORE_CRITERIOS,
    STORE_AUDITORIA
  ].filter((name) => db.objectStoreNames.contains(name));

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, "readonly");
    const counts = {};

    stores.forEach((storeName) => {
      const request = transaction.objectStore(storeName).count();
      request.onsuccess = () => {
        counts[storeName] = request.result || 0;
      };
    });

    transaction.oncomplete = () => resolve(counts);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

const exportSnapshot = async ({ appVersion = "" } = {}) => {
  const [equipamentos, usuarios, vinculos, medicoes, auditoria, obras, criterios] = await Promise.all([
    getAllEquipamentos(),
    getAllUsers(),
    getAllVinculos(),
    getAllMedicoes(),
    getAllAuditoria(),
    getAllObras(),
    getAllCriterios()
  ]);

  return {
    export_version: EXPORT_VERSION,
    schema_version: DB_VERSION,
    created_at: new Date().toISOString(),
    app_version: appVersion || "",
    equipamentos,
    users: usuarios,
    usuarios,
    vinculos,
    medicoes,
    obras,
    audit_log: auditoria,
    criterios
  };
};

const normalizeImportPayload = (payload = {}) => {
  const schemaVersion = Number(payload.schema_version || payload.version || 1);
  return {
    schema_version: Number.isFinite(schemaVersion) ? schemaVersion : 1,
    equipamentos: payload.equipamentos || [],
    users: payload.users || payload.usuarios || [],
    vinculos: payload.vinculos || [],
    medicoes: payload.medicoes || [],
    obras: payload.obras || [],
    audit_log: payload.audit_log || payload.auditoria || [],
    criterios: payload.criterios || []
  };
};

const buildImportPreview = async (payload) => {
  const normalized = normalizeImportPayload(payload);

  const [equipamentos, usuarios, vinculos, medicoes, obras, auditoria, criterios] = await Promise.all([
    getAllEquipamentos(),
    getAllUsers(),
    getAllVinculos(),
    getAllMedicoes(),
    getAllObras(),
    getAllAuditoria(),
    getAllCriterios()
  ]);

  const countById = (existing, incoming, resolver) => {
    const existingMap = new Map((existing || []).map((item) => [resolver(item), item]));
    const seen = new Set();
    let created = 0;
    let updated = 0;

    (incoming || []).forEach((item) => {
      const key = resolver(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      if (existingMap.has(key)) updated += 1;
      else created += 1;
    });

    return { created, updated, ignored: (incoming || []).length - created - updated };
  };

  return {
    schema_version: normalized.schema_version,
    equipamentos: countById(equipamentos, normalized.equipamentos, (item) => item.id),
    users: countById(usuarios, normalized.users, (item) => item.id || item.user_id),
    vinculos: countById(vinculos, normalized.vinculos, (item) => item.id || item.vinculo_id),
    medicoes: countById(medicoes, normalized.medicoes, (item) => item.id || item.medicao_id),
    obras: countById(obras, normalized.obras, (item) => item.id || item.idObra),
    audit_log: countById(auditoria, normalized.audit_log, (item) => item.auditoria_id || item.audit_id),
    criterios: countById(criterios, normalized.criterios, (item) => item.id)
  };
};

const importSnapshot = async (payload) => {
  const normalized = normalizeImportPayload(payload);

  if (normalized.schema_version > DB_VERSION) {
    throw new Error("Versão do schema não suportada.");
  }

  return runTransaction(
    [STORE_EQUIPAMENTOS, STORE_USERS, STORE_VINCULOS, STORE_MEDICOES, STORE_OBRAS, STORE_AUDIT_LOG, STORE_AUDITORIA, STORE_CRITERIOS],
    "readwrite",
    (transaction) => {
      const equipStore = transaction.objectStore(STORE_EQUIPAMENTOS);
      const userStore = transaction.objectStore(STORE_USERS);
      const vincStore = transaction.objectStore(STORE_VINCULOS);
      const medStore = transaction.objectStore(STORE_MEDICOES);
      const obraStore = transaction.objectStore(STORE_OBRAS);
      const criterioStore = transaction.objectStore(STORE_CRITERIOS);

      const auditStore = transaction.objectStore(
        transaction.objectStoreNames.contains(STORE_AUDIT_LOG) ? STORE_AUDIT_LOG : STORE_AUDITORIA
      );

      (normalized.equipamentos || []).forEach((item) => equipStore.put(prepareEquipamentoRecord(item)));
      (normalized.users || []).forEach((item) => userStore.put(prepareUserRecord(item)));
      (normalized.vinculos || []).forEach((item) => vincStore.put(prepareVinculoRecord(item)));
      (normalized.medicoes || []).forEach((item) => medStore.put(prepareMedicaoRecord(item)));
      (normalized.obras || []).forEach((item) => obraStore.put(prepareObraRecord(item)));
      (normalized.criterios || []).forEach((item) => criterioStore.put(normalizeCriterioRecord(item)));

      uniqueAuditoria((normalized.audit_log || []).map(normalizeAuditRecord)).forEach((item) => {
        auditStore.put(item);
      });
    }
  );
};

const clearAllStores = async () => {
  const db = await openDB();
  const stores = [
    STORE_EQUIPAMENTOS,
    STORE_USERS,
    STORE_VINCULOS,
    STORE_MEDICOES,
    STORE_OBRAS,
    STORE_ANEXOS,
    STORE_AUDITORIA,
    STORE_AUDIT_LOG,
    STORE_ERRORS_LOG,
    STORE_CRITERIOS
  ].filter((name) => db.objectStoreNames.contains(name));

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

// ===========================
// Exports
// ===========================

export {
  DB_VERSION,
  EXPORT_VERSION,

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

  getAllCriterios,
  saveCriterio,
  deleteCriterio,

  saveErrorLog,
  getAllErrors,
  getRecentErrors,

  getStoreCounts,
  exportSnapshot,
  importSnapshot,
  normalizeImportPayload,
  buildImportPreview,
  clearAllStores
};
