import { isValidDate } from "./utils.js";

const buildResult = (errors) => ({
  ok: errors.length === 0,
  errors
});

const addError = (errors, field, message) => {
  errors.push({ field, message });
};

const validateUser = (data = {}) => {
  const errors = [];
  const id = String(data.id || data.user_id || "").trim();
  if (!id) addError(errors, "user_id", "ID obrigatório.");
  if (!String(data.nome || "").trim()) addError(errors, "nome", "Nome obrigatório.");
  const role = String(data.role || "").trim().toUpperCase();
  if (!role) addError(errors, "role", "Perfil obrigatório.");
  if (role && !["ADMIN", "USER", "OPERADOR"].includes(role)) {
    addError(errors, "role", "Perfil inválido.");
  }
  const status = String(data.status || (data.ativo === false ? "INATIVO" : "ATIVO")).trim().toUpperCase();
  if (status && !["ATIVO", "INATIVO"].includes(status)) {
    addError(errors, "status", "Status inválido.");
  }
  return buildResult(errors);
};

const validateEquipamento = (data = {}) => {
  const errors = [];
  const id = String(data.id || "").trim();
  if (!id) addError(errors, "id", "ID obrigatório.");
  const funcao = String(data.funcao || "").trim().toUpperCase();
  if (!funcao) addError(errors, "funcao", "Função obrigatória.");
  if (funcao && !["HORIZONTAL", "VERTICAL", "TACHAS"].includes(funcao)) {
    addError(errors, "funcao", "Função inválida.");
  }
  if (funcao === "HORIZONTAL" && !String(data.geometria || "").trim()) {
    addError(errors, "geometria", "Geometria obrigatória para horizontais.");
  }
  if (data.dataAquisicao && !isValidDate(data.dataAquisicao)) {
    addError(errors, "dataAquisicao", "Data de aquisição inválida.");
  }
  if (data.dataCalibracao && !isValidDate(data.dataCalibracao)) {
    addError(errors, "dataCalibracao", "Data de calibração inválida.");
  }
  return buildResult(errors);
};

const validateVinculo = (data = {}) => {
  const errors = [];
  const equipId = String(data.equipamento_id || data.equip_id || "").trim();
  const userId = String(data.user_id || "").trim();
  if (!equipId) addError(errors, "equip_id", "Equipamento obrigatório.");
  if (!userId) addError(errors, "user_id", "Usuário obrigatório.");
  if (!String(data.inicio || data.data_inicio || "").trim()) addError(errors, "data_inicio", "Data de início obrigatória.");
  const status = String(data.status || (data.ativo === false ? "ENCERRADO" : "ATIVO")).trim().toUpperCase();
  if (status && !["ATIVO", "ENCERRADO"].includes(status)) addError(errors, "status", "Status inválido.");
  return buildResult(errors);
};

const validateMedicao = (data = {}) => {
  const errors = [];
  if (!String(data.equipamento_id || data.equip_id || "").trim()) addError(errors, "equip_id", "Equipamento obrigatório.");
  if (!String(data.user_id || "").trim()) addError(errors, "user_id", "Usuário obrigatório.");
  if (!String(data.obra_id || "").trim()) addError(errors, "obra_id", "Obra obrigatória.");
  if (!String(data.tipoMedicao || data.tipo_medicao || "").trim()) addError(errors, "tipo_medicao", "Tipo de medição obrigatório.");
  const subtipo = String(data.subtipo || data.subtipo_medicao || data.tipoMedicao || data.tipo_medicao || "")
    .trim()
    .toUpperCase();
  if (!subtipo) addError(errors, "subtipo", "Subtipo obrigatório.");
  if (data.dataHora && !isValidDate(data.dataHora)) addError(errors, "dataHora", "Data/hora inválida.");
  const leituras = Array.isArray(data.leituras) ? data.leituras : [];
  if (!leituras.length || leituras.some((value) => value === null || value === "" || Number.isNaN(Number(value)))) {
    addError(errors, "leituras", "Leituras inválidas.");
  }
  if (subtipo === "HORIZONTAL") {
    if (leituras.length !== 10) addError(errors, "leituras", "Horizontal exige 10 leituras.");
    if (!String(data.linha || "").trim() || !String(data.estacao || "").trim()) {
      addError(errors, "linha", "Linha e estação obrigatórias.");
    }
  }
  if (subtipo === "VERTICAL" && leituras.length !== 5) addError(errors, "leituras", "Vertical exige 5 leituras.");
  if (subtipo === "LEGENDA") {
    if (leituras.length !== 3) addError(errors, "leituras", "Legenda exige 3 leituras.");
    if (!String(data.letra || "").trim()) addError(errors, "letra", "Letra obrigatória.");
  }
  if (subtipo === "PLACA") {
    if (leituras.length !== 5) addError(errors, "leituras", "Placa exige 5 leituras.");
    if (!String(data.cor || "").trim() || !String(data.angulo || "").trim()) {
      addError(errors, "cor", "Cor e ângulo obrigatórios.");
    }
  }
  return buildResult(errors);
};

export {
  validateUser,
  validateEquipamento,
  validateVinculo,
  validateMedicao
};
