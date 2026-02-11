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

const parseTimestamp = (value) => {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const toIsoDateTime = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
};

const isPdfDataUrl = (value) => typeof value === "string" && value.startsWith("data:application/pdf;base64,");

const MAX_TERMO_PDF_SIZE = 10 * 1024 * 1024;

const sanitizeTermoPdf = (value, warnings, contextKey) => {
  if (value == null || value === "") return null;
  if (!isPdfDataUrl(value)) {
    warnings.push(`${contextKey}: termo_pdf inválido (tipo/formato); valor ignorado.`);
    return null;
  }
  if (value.length > MAX_TERMO_PDF_SIZE) {
    warnings.push(`${contextKey}: termo_pdf excede tamanho máximo; valor ignorado.`);
    return null;
  }
  return value;
};

const resolveUuid = (record = {}) =>
  record.uuid || record.internal_id || record.user_uuid || "";

// ===========================
// Normalizers / Preparers
// ===========================

const normalizeUserRecord = (record = {}) => {
  const fallbackId = record.uuid || record.user_uuid || "";
  const id = record.id || record.user_id || fallbackId || "";
  const id_normalized = record.id_normalized || normalizeId(id);
  const status = record.status || (record.ativo === false ? "INATIVO" : "ATIVO");
  const created_at = record.created_at || record.createdAt || nowIso();
  const updated_at = record.updated_at || record.updatedAt || created_at;
  const pinHash = record.pinHash || record.pin_hash || "";
  const cpf = String(record.cpf || record.cpf_usuario || "").replace(/\D/g, "");

  return {
    id,
    uuid: resolveUuid(record) || "",
    nome: record.nome || "",
    role: record.role || "",
    status,
    pinHash,
    salt: record.salt || "",
    cpf,
    id_normalized,
    created_at,
    updated_at,
    // aliases p/ compat
    user_id: id,
    ativo: status === "ATIVO",
    pin_hash: pinHash,
    cpf_usuario: cpf
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
    id: record.id || record.uuid || "",
    uuid: resolveUuid(record) || "",
    modelo: record.modelo || "",
    funcao,
    geometria,
    numeroSerie: record.numeroSerie || record.numero_serie || "",
    fabricante: record.fabricante || "",
    dataAquisicao: record.dataAquisicao || record.data_aquisicao || "",
    calibrado,
    dataCalibracao: record.dataCalibracao || record.data_calibracao || "",
    certificadoNumero: certificado,
    numeroCertificado: certificado,
    laudoId: record.laudoId || record.laudo_id || "",
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
    usuarioResponsavel: record.usuarioResponsavel || record.usuario_responsavel || record.usuarioAtual || "",
    certificado: certificado,
    laudo_id: record.laudoId || record.laudo_id || ""
  };
};

const normalizeVinculoRecord = (record = {}) => {
  const id = record.id || record.uuid || record.vinculo_id || "";
  const status = record.status || (record.ativo === false ? "ENCERRADO" : "ATIVO");
  const inicio = toIsoDateTime(record.inicio || record.data_inicio) || "";
  const fim = toIsoDateTime(record.fim || record.data_fim) || "";
  const ativo = record.ativo === true
    || String(record.ativo || "").toLowerCase() === "true"
    || (String(status).toUpperCase() === "ATIVO" && !fim);
  const statusNormalized = ativo ? "ATIVO" : "ENCERRADO";
  const created_at = record.created_at || record.createdAt || nowIso();
  const updated_at = record.updated_at || record.updatedAt || created_at;

  return {
    id,
    uuid: resolveUuid(record) || id,
    equipamento_id: record.equipamento_id || record.equip_id || "",
    user_id: record.user_id || "",
    inicio,
    fim,
    status: statusNormalized,
    termo_pdf: record.termo_pdf || record.termo_cautela_pdf || record.termo || null,
    cpfUsuario: String(record.cpfUsuario || record.cpf_usuario || "").replace(/\D/g, ""),
    observacoes: String(record.observacoes || ""),
    created_at,
    updated_at,
    // aliases
    vinculo_id: id,
    equip_id: record.equip_id || record.equipamento_id || "",
    ativo,
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
  const posicao_tipo = String(record.posicao_tipo || record.posicaoTipo || record.posicao || "").trim().toUpperCase();
  const legenda_char_index = Number.isInteger(record.legenda_char_index)
    ? record.legenda_char_index
    : toNumber(record.legenda_char_index ?? record.legendaCharIndex);

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
    posicao_tipo,
    legenda_texto: record.legenda_texto || record.texto_legenda || "",
    legenda_char_index: Number.isFinite(legenda_char_index) ? Number(legenda_char_index) : null,
    legenda_char: record.legenda_char || record.letra || "",
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
  const id = normalized.id || uuid;
  return {
    ...normalized,
    id,
    user_id: id,
    id_normalized: normalized.id_normalized || normalizeId(id),
    uuid
  };
};

const prepareEquipamentoRecord = (record = {}) => {
  const normalized = normalizeEquipamentoRecord(record);
  const uuid = normalized.uuid || resolveUuid(record) || crypto.randomUUID();
  const id = normalized.id || uuid;
  return {
    ...normalized,
    id,
    uuid,
    statusOperacional: normalized.statusLocal,
    statusLocal: normalized.statusLocal,
    localidadeCidadeUF: normalized.localidadeCidadeUF,
    geometria: normalized.funcao === "HORIZONTAL" ? normalized.geometria : null,
    certificadoNumero: normalized.certificadoNumero || normalized.numeroCertificado || "",
    laudoId: normalized.laudoId || ""
  };
};

const prepareVinculoRecord = (record = {}) => {
  const normalized = normalizeVinculoRecord(record);
  const uuid = normalized.uuid || resolveUuid(record) || normalized.id || record.vinculo_id || crypto.randomUUID();
  const id = normalized.id || uuid;
  return {
    ...normalized,
    id,
    vinculo_id: id,
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
        const cpf = String(record.cpf || record.cpf_usuario || "").replace(/\D/g, "");
        const needsUpdate = !record.uuid || record.cpf !== cpf || record.cpf_usuario !== cpf;
        if (!needsUpdate) return null;
        return {
          ...record,
          uuid: record.uuid || crypto.randomUUID(),
          cpf,
          cpf_usuario: cpf
        };
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
// API - Anexos (laudos/termos)
// ===========================

const getAllAnexos = () => getAllFromStore(STORE_ANEXOS);

const saveAnexo = (anexo) =>
  putInStore(STORE_ANEXOS, {
    id: anexo.id || crypto.randomUUID(),
    equipamento_id: anexo.equipamento_id || anexo.equipamentoId || anexo.equipId || anexo.target_id || null,
    medicao_id: anexo.medicao_id || null,
    tipo: anexo.tipo || "ANEXO",
    filename: anexo.filename || anexo.name || "arquivo",
    mime: anexo.mime || anexo.type || "application/octet-stream",
    size: Number(anexo.size || anexo.file_size || 0),
    created_at: anexo.created_at || anexo.createdAt || nowIso(),
    blob: anexo.blob || anexo.data || null
  });

const getAnexoById = async (anexoId) => {
  if (!anexoId) return null;
  return getByKey(STORE_ANEXOS, anexoId);
};

const getAnexosByEquipamento = async (equipamentoId) => {
  const normalizedId = String(equipamentoId || "").trim().toUpperCase();
  const all = await getAllFromStore(STORE_ANEXOS);
  return (all || []).filter((item) => String(item.equipamento_id || "").trim().toUpperCase() === normalizedId);
};

const getLatestLaudoByEquipamento = async (equipamentoId) => {
  const anexos = await getAnexosByEquipamento(equipamentoId);
  const laudos = anexos.filter((item) => String(item.tipo || "").toUpperCase().includes("LAUDO"));
  laudos.sort((a, b) => parseTimestamp(b.created_at) - parseTimestamp(a.created_at));
  return laudos[0] || null;
};

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

const DIAGNOSTIC_SAMPLE_LIMIT = 8;
const DIAGNOSTIC_LOG_LIMIT = 50;

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const maskValue = (value) => {
  if (value == null) return value;
  const raw = String(value).trim();
  if (!raw) return "";
  if (raw.includes("@")) {
    const [name, domain = ""] = raw.split("@");
    const safeName = name ? `${name[0]}***` : "***";
    const safeDomain = domain ? `${domain[0]}***` : "***";
    return `${safeName}@${safeDomain}`;
  }
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return `${words[0]} ${"*".repeat(Math.max(3, words.length - 1))}`;
  }
  if (raw.length <= 2) return `${raw[0] || ""}*`;
  return `${raw.slice(0, 2)}***`;
};

const sanitizeRecord = (record) => {
  if (!isObject(record)) return record;

  const maskedKeyPattern = /(nome|name|email|mail|telefone|phone|celular|cpf|documento|senha|pin|password|salt|token)/i;

  const sanitizeValue = (key, value) => {
    if (Array.isArray(value)) {
      return value.slice(0, DIAGNOSTIC_SAMPLE_LIMIT).map((item) => sanitizeValue(key, item));
    }
    if (isObject(value)) {
      return Object.entries(value).reduce((acc, [nestedKey, nestedValue]) => {
        acc[nestedKey] = sanitizeValue(nestedKey, nestedValue);
        return acc;
      }, {});
    }
    if (maskedKeyPattern.test(key)) return maskValue(value);
    return value;
  };

  return Object.entries(record).reduce((acc, [key, value]) => {
    acc[key] = sanitizeValue(key, value);
    return acc;
  }, {});
};

const getSessionSnapshot = (providedSession) => {
  const readSessionFromStorage = () => {
    const keys = Object.keys(sessionStorage || {});
    const sessionKey = keys.find((key) => key.toLowerCase().includes("session")) || "medlux_session";
    const raw = sessionStorage.getItem(sessionKey);
    if (!raw) return { session: null, key: sessionKey };
    try {
      return { session: JSON.parse(raw), key: sessionKey };
    } catch (_error) {
      return { session: null, key: sessionKey };
    }
  };

  const storageSnapshot = typeof sessionStorage !== "undefined" ? readSessionFromStorage() : { session: null, key: "" };
  const session = providedSession || storageSnapshot.session || null;
  const rawSessionKeys = Object.keys(session || {});
  const roleDetected = String(session?.role || session?.perfil || session?.cargo || "").toUpperCase() || "UNKNOWN";
  const isAdminDetected =
    session?.isAdmin === true
    || roleDetected === "ADMIN"
    || String(session?.perfil || "").toUpperCase() === "ADMIN";

  return {
    session,
    payload: {
      userId: session?.id || session?.user_id || session?.userId || null,
      usernameMasked: maskValue(session?.nome || session?.name || session?.username || ""),
      isAdminDetected,
      roleDetected,
      rawSessionKeys,
      sessionStorageKey: storageSnapshot.key
    }
  };
};

const detectKeysInRecords = (records = [], candidates = []) => {
  const found = new Set();

  const walk = (value) => {
    if (!isObject(value) && !Array.isArray(value)) return;
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item));
      return;
    }
    Object.entries(value).forEach(([key, nestedValue]) => {
      if (candidates.some((candidate) => key.toLowerCase() === candidate.toLowerCase())) found.add(key);
      walk(nestedValue);
    });
  };

  records.forEach((item) => walk(item));
  return [...found];
};

const toTimestamp = (value) => {
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
};

const computeCalibrationStatus = (equipamento) => {
  const calibrationDate = equipamento?.dataCalibracao || equipamento?.data_calibracao;
  const baseTs = toTimestamp(calibrationDate);
  if (!baseTs) return null;

  const expirationTs = baseTs + (365 * 24 * 60 * 60 * 1000);
  const daysRemaining = Math.ceil((expirationTs - Date.now()) / (24 * 60 * 60 * 1000));

  return {
    equipamentoId: equipamento?.id || equipamento?.equipamento_id || equipamento?.equipId || null,
    diasRestantes: daysRemaining,
    vencimentoISO: new Date(expirationTs).toISOString()
  };
};

const getDbSchema = async (db) => {
  const stores = [...db.objectStoreNames];
  return new Promise((resolve, reject) => {
    if (!stores.length) {
      resolve({ stores: [] });
      return;
    }

    const transaction = db.transaction(stores, "readonly");
    const schemaStores = stores.map((storeName) => {
      const store = transaction.objectStore(storeName);
      return {
        name: store.name,
        keyPath: store.keyPath,
        autoIncrement: store.autoIncrement,
        indexes: [...store.indexNames].map((indexName) => {
          const index = store.index(indexName);
          return {
            name: index.name,
            keyPath: index.keyPath,
            unique: index.unique,
            multiEntry: index.multiEntry
          };
        })
      };
    });

    transaction.oncomplete = () => resolve({ stores: schemaStores });
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

const exportDiagnosticoCompleto = async ({ appModule = "medlux-control", appVersion = "", visibleEquipamentosInUI = [], session = null } = {}) => {
  try {
    const db = await openDB();
    const [
      counts,
      dbSchema,
      equipamentos,
      vinculos,
      users,
      medicoes,
      criterios,
      obras,
      anexos,
      recentErrors,
      auditEntries
    ] = await Promise.all([
      getStoreCounts(),
      getDbSchema(db),
      getAllFromStore(STORE_EQUIPAMENTOS),
      getAllFromStore(STORE_VINCULOS),
      getAllFromStore(STORE_USERS),
      getAllFromStore(STORE_MEDICOES),
      getAllFromStore(STORE_CRITERIOS),
      getAllFromStore(STORE_OBRAS),
      getAllFromStore(STORE_ANEXOS),
      getRecentErrors(DIAGNOSTIC_LOG_LIMIT),
      getAllAuditoria()
    ]);

    const { session: sessionRaw, payload: sessionPayload } = getSessionSnapshot(session);

    const userIdComparable = String(sessionRaw?.id || sessionRaw?.user_id || "").trim().toUpperCase();
    const activeLinks = (vinculos || []).filter((item) => String(item.status || "").toUpperCase() === "ATIVO" || item.ativo === true);
    const currentUserAllowedEquipamentos = sessionPayload.isAdminDetected
      ? (equipamentos || []).map((item) => item.id).filter(Boolean)
      : activeLinks
        .filter((item) => String(item.user_id || item.usuarioId || "").trim().toUpperCase() === userIdComparable)
        .map((item) => item.equipamento_id || item.equip_id || item.equipId)
        .filter(Boolean);

    const calibrationStates = (equipamentos || []).map((item) => computeCalibrationStatus(item)).filter(Boolean);
    const expired = calibrationStates.filter((item) => item.diasRestantes < 0);
    const expiringSoon = calibrationStates.filter((item) => item.diasRestantes >= 0 && item.diasRestantes < 30);

    const laudoAttachments = (anexos || [])
      .filter((item) => {
        const tipo = String(item.tipo || "").toUpperCase();
        return tipo.includes("LAUDO") || tipo.includes("LAUDO_EQUIPAMENTO");
      })
      .map((item) => ({
        equipamentoId: item.equipamento_id || item.equipId || item.equip_id || item.target_id || null,
        filename: item.filename || item.nome || item.name || "",
        size: item.size || item.file_size || null,
        created_at: item.created_at || item.createdAt || null
      }));

    const laudosByEquip = new Map();
    laudoAttachments.forEach((item) => {
      if (!item.equipamentoId) return;
      if (!laudosByEquip.has(item.equipamentoId)) laudosByEquip.set(item.equipamentoId, []);
      laudosByEquip.get(item.equipamentoId).push(item);
    });

    const equipamentosComLaudo = [...laudosByEquip.values()].flat();
    const equipamentosSemLaudo = (equipamentos || [])
      .map((item) => item.id)
      .filter((id) => id && !laudosByEquip.has(id));

    const visibleNormalized = (visibleEquipamentosInUI || []).map((item) => String(item).trim()).filter(Boolean);
    const violations = [];
    visibleNormalized.forEach((equipId) => {
      if (!sessionPayload.isAdminDetected && !currentUserAllowedEquipamentos.includes(equipId)) {
        violations.push({ type: "RBAC_EQUIPAMENTO_VISIVEL_NAO_ATRIBUIDO", details: { equipamentoId: equipId } });
      }
    });

    const keyRecords = [...(users || []), ...(vinculos || []), ...(medicoes || []), ...(equipamentos || [])].slice(0, 50);

    return {
      diagnostic_version: "1.0",
      created_at: new Date().toISOString(),
      app_version: appVersion || "",
      db_version: DB_VERSION,
      app_module: appModule,
      module: appModule,
      env: {
        url: typeof window !== "undefined" ? window.location.href : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        language: typeof navigator !== "undefined" ? navigator.language : "",
        timezoneOffsetMin: new Date().getTimezoneOffset()
      },
      session: sessionPayload,
      db_schema: dbSchema,
      counts,
      key_detection: {
        user_role_keys_found: detectKeysInRecords(keyRecords, ["role", "isAdmin", "perfil", "cargo"]),
        vinculo_user_keys_found: detectKeysInRecords(keyRecords, ["usuarioId", "userId", "user_id", "idUsuario"]),
        vinculo_equip_keys_found: detectKeysInRecords(keyRecords, ["equipamentoId", "equipId", "equipamento_id", "equip_id"]),
        medicao_position_keys_found: detectKeysInRecords(keyRecords, ["posicao_tipo", "posicao", "linha", "estacao", "tipoDeMarcacao"])
      },
      samples: {
        users: (users || []).slice(0, DIAGNOSTIC_SAMPLE_LIMIT).map((item) => sanitizeRecord(item)),
        vinculos: (vinculos || []).slice(0, DIAGNOSTIC_SAMPLE_LIMIT).map((item) => sanitizeRecord(item)),
        equipamentos: (equipamentos || []).slice(0, DIAGNOSTIC_SAMPLE_LIMIT).map((item) => sanitizeRecord(item)),
        medicoes: (medicoes || []).slice(0, DIAGNOSTIC_SAMPLE_LIMIT).map((item) => sanitizeRecord(item)),
        criterios: (criterios || []).slice(0, DIAGNOSTIC_SAMPLE_LIMIT).map((item) => sanitizeRecord(item)),
        anexos: (anexos || []).slice(0, DIAGNOSTIC_SAMPLE_LIMIT).map((item) => sanitizeRecord(item)),
        obras: (obras || []).slice(0, DIAGNOSTIC_SAMPLE_LIMIT).map((item) => sanitizeRecord(item)),
        audit_log: (auditEntries || []).slice(0, DIAGNOSTIC_SAMPLE_LIMIT).map((item) => sanitizeRecord(item))
      },
      rbac_check: {
        currentUserAllowedEquipamentos,
        visibleEquipamentosInUI: visibleNormalized,
        violations
      },
      calibration_summary: {
        expiringSoon,
        expired,
        stats: {
          total: calibrationStates.length,
          expiringSoonCount: expiringSoon.length,
          expiredCount: expired.length
        }
      },
      laudos_summary: {
        equipamentosComLaudo,
        equipamentosSemLaudo
      },
      errors: (recentErrors || []).slice(0, DIAGNOSTIC_LOG_LIMIT).map((item) => ({
        created_at: item.created_at,
        module: item.module,
        action: item.action,
        message: item.message,
        stackTop: String(item.stack || "").split("\n")[0] || "",
        context: sanitizeRecord(item.context || item.extra || {})
      })),
      audit_tail: (auditEntries || [])
        .sort((a, b) => new Date(b.created_at || b.data_hora || 0) - new Date(a.created_at || a.data_hora || 0))
        .slice(0, DIAGNOSTIC_LOG_LIMIT)
        .map((item) => ({
          at: item.created_at || item.data_hora || null,
          actorId: item.actor_user_id || item.user_id || null,
          action: item.action || item.acao || null,
          targetType: item.entity_type || item.entity || null,
          targetId: item.entity_id || item.target_id || null
        }))
    };
  } catch (error) {
    console.error("Falha em exportDiagnosticoCompleto", error);
    throw error;
  }
};

const exportSnapshot = async ({ appVersion = "" } = {}) => {
  const [equipamentos, usuarios, vinculos, medicoes, auditoria, obras, criterios, anexos] = await Promise.all([
    getAllEquipamentos(),
    getAllUsers(),
    getAllVinculos(),
    getAllMedicoes(),
    getAllAuditoria(),
    getAllObras(),
    getAllCriterios(),
    getAllAnexos()
  ]);

  const data = {
    equipamentos,
    users: usuarios,
    usuarios,
    vinculos,
    medicoes,
    obras,
    audit_log: auditoria,
    criterios,
    anexos
  };

  return {
    export_version: EXPORT_VERSION,
    schema_version: DB_VERSION,
    created_at: new Date().toISOString(),
    app_version: appVersion || "",
    data,
    ...data
  };
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const resolveImportKey = (item = {}, candidates = []) => {
  for (const candidate of candidates) {
    const value = item?.[candidate];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
};

const dedupeByMostRecent = (items = [], keyResolver) => {
  const map = new Map();
  items.forEach((item) => {
    const key = keyResolver(item);
    if (!key) return;
    const current = map.get(key);
    if (!current) {
      map.set(key, item);
      return;
    }
    const currentTs = parseTimestamp(current.updated_at || current.created_at);
    const incomingTs = parseTimestamp(item.updated_at || item.created_at);
    if (incomingTs >= currentTs) map.set(key, item);
  });
  return [...map.values()];
};

const normalizeImportPayload = (payload = {}) => {
  const warnings = [];
  const source = payload?.data && typeof payload.data === "object" ? { ...payload, ...payload.data } : payload;
  const schemaVersion = Number(source.schema_version || source.version || payload.schema_version || payload.version || 0);
  const exportVersion = Number(source.export_version || payload.export_version || 0);

  const rawUsers = [...asArray(source.users), ...asArray(source.usuarios)];
  const users = dedupeByMostRecent(rawUsers, (item = {}) => {
    const normalizedId = normalizeId(item.id_normalized || item.id || item.user_id || item.uuid);
    return normalizedId || resolveImportKey(item, ["uuid", "user_uuid"]);
  });

  const vinculos = asArray(source.vinculos).map((item = {}, index) => {
    const contextKey = `vinculo[${index}]`;
    const termo_pdf = sanitizeTermoPdf(item.termo_pdf ?? item.termo_cautela_pdf ?? item.termo, warnings, contextKey);
    return {
      ...item,
      id: item.id || item.uuid || item.vinculo_id || "",
      equipamento_id: item.equipamento_id || item.equip_id || "",
      inicio: toIsoDateTime(item.inicio || item.data_inicio) || "",
      fim: toIsoDateTime(item.fim || item.data_fim) || "",
      termo_pdf
    };
  });

  return {
    export_version: Number.isFinite(exportVersion) ? exportVersion : 0,
    schema_version: Number.isFinite(schemaVersion) ? schemaVersion : 0,
    equipamentos: asArray(source.equipamentos),
    users,
    vinculos,
    medicoes: asArray(source.medicoes),
    obras: asArray(source.obras),
    audit_log: asArray(source.audit_log || source.auditoria),
    criterios: asArray(source.criterios),
    anexos: asArray(source.anexos),
    warnings
  };
};

const validateImportPayload = (normalized = {}) => {
  if (!normalized || typeof normalized !== "object") {
    throw new Error("Backup inválido: payload ausente ou malformado.");
  }
};

const applyLegacyImportDefaults = (normalized = {}) => {
  const schema = Number(normalized.schema_version);
  return {
    ...normalized,
    export_version: normalized.export_version || "legacy",
    schema_version: Number.isFinite(schema) && schema > 0 ? schema : DB_VERSION
  };
};

const buildImportPreview = async (payload) => {
  const normalized = applyLegacyImportDefaults(normalizeImportPayload(payload));
  validateImportPayload(normalized);

  const [equipamentos, usuarios, vinculos, medicoes, obras, auditoria, criterios, anexos] = await Promise.all([
    getAllEquipamentos(),
    getAllUsers(),
    getAllVinculos(),
    getAllMedicoes(),
    getAllObras(),
    getAllAuditoria(),
    getAllCriterios(),
    getAllAnexos()
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

    return {
      total_incoming: (incoming || []).length,
      created,
      updated,
      ignored: (incoming || []).length - created - updated
    };
  };

  return {
    export_version: normalized.export_version,
    schema_version: normalized.schema_version,
    equipamentos: countById(equipamentos, normalized.equipamentos, (item) => item.id || item.uuid),
    users: countById(usuarios, normalized.users, (item) => item.id || item.uuid || item.user_id),
    vinculos: countById(vinculos, normalized.vinculos, (item) => item.id || item.uuid || item.vinculo_id),
    medicoes: countById(medicoes, normalized.medicoes, (item) => item.id || item.medicao_id),
    obras: countById(obras, normalized.obras, (item) => item.id || item.idObra),
    audit_log: countById(auditoria, normalized.audit_log, (item) => item.auditoria_id || item.audit_id),
    criterios: countById(criterios, normalized.criterios, (item) => item.id),
    anexos: countById(anexos, normalized.anexos, (item) => item.id),
    warnings: normalized.warnings
  };
};

const importSnapshot = async (payload) => {
  const normalized = applyLegacyImportDefaults(normalizeImportPayload(payload));
  validateImportPayload(normalized);

  if (normalized.schema_version > DB_VERSION) {
    throw new Error("Versão do schema não suportada.");
  }

  const preview = await buildImportPreview(payload);

  await runTransaction(
    [STORE_EQUIPAMENTOS, STORE_USERS, STORE_VINCULOS, STORE_MEDICOES, STORE_OBRAS, STORE_ANEXOS, STORE_AUDIT_LOG, STORE_AUDITORIA, STORE_CRITERIOS],
    "readwrite",
    (transaction) => {
      const equipStore = transaction.objectStore(STORE_EQUIPAMENTOS);
      const userStore = transaction.objectStore(STORE_USERS);
      const vincStore = transaction.objectStore(STORE_VINCULOS);
      const medStore = transaction.objectStore(STORE_MEDICOES);
      const obraStore = transaction.objectStore(STORE_OBRAS);
      const criterioStore = transaction.objectStore(STORE_CRITERIOS);
      const anexosStore = transaction.objectStore(STORE_ANEXOS);

      const auditStore = transaction.objectStore(
        transaction.objectStoreNames.contains(STORE_AUDIT_LOG) ? STORE_AUDIT_LOG : STORE_AUDITORIA
      );

      (normalized.equipamentos || []).forEach((item) => equipStore.put(prepareEquipamentoRecord(item)));
      (normalized.users || []).forEach((item) => userStore.put(prepareUserRecord(item)));
      (normalized.vinculos || []).forEach((item) => vincStore.put(prepareVinculoRecord(item)));
      (normalized.medicoes || []).forEach((item) => medStore.put(prepareMedicaoRecord(item)));
      (normalized.obras || []).forEach((item) => obraStore.put(prepareObraRecord(item)));
      (normalized.criterios || []).forEach((item) => criterioStore.put(normalizeCriterioRecord(item)));
      (normalized.anexos || []).forEach((item) => anexosStore.put({ ...item, id: item.id || crypto.randomUUID() }));

      uniqueAuditoria((normalized.audit_log || []).map(normalizeAuditRecord)).forEach((item) => {
        auditStore.put(item);
      });
    }
  );

  return {
    preview,
    warnings: normalized.warnings
  };
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

  getAllAnexos,
  getAnexoById,
  saveAnexo,
  getAnexosByEquipamento,
  getLatestLaudoByEquipamento,

  getAllCriterios,
  saveCriterio,
  deleteCriterio,

  saveErrorLog,
  getAllErrors,
  getRecentErrors,

  getStoreCounts,
  exportDiagnosticoCompleto,
  exportSnapshot,
  importSnapshot,
  normalizeImportPayload,
  buildImportPreview,
  clearAllStores
};
