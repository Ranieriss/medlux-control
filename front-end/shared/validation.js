import { isValidDate } from "./utils.js";

const buildResult = (errors) => ({
  ok: errors.length === 0,
  errors
});

const addError = (errors, field, message) => {
  errors.push({ field, message });
};

const normalizeCpf = (value) => String(value || "").replace(/\D/g, "");

const isValidCpf = (value) => {
  const cpf = normalizeCpf(value);
  if (!cpf) return true;
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base, factor) => {
    let total = 0;
    for (const char of base) {
      total += Number(char) * factor;
      factor -= 1;
    }
    const mod = total % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calcDigit(cpf.slice(0, 9), 10);
  const d2 = calcDigit(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
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
  const nome = String(data.nome || data.modelo || "").trim();
  if (!id) addError(errors, "id", "ID obrigatório.");
  if (!nome) addError(errors, "nome", "Nome/modelo obrigatório.");
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
  const requireObra = data.requireObra === true;
  const errors = [];
  const equipId = String(data.equipamento_id || data.equip_id || "").trim();
  const userId = String(data.user_id || "").trim();
  const obraId = String(data.obra_id || "").trim();
  if (!equipId) addError(errors, "equip_id", "Equipamento obrigatório.");
  if (!userId) addError(errors, "user_id", "Usuário obrigatório.");
  if (requireObra && !obraId) addError(errors, "obra_id", "Obra obrigatória para vínculo.");
  if (!String(data.inicio || data.data_inicio || "").trim()) addError(errors, "data_inicio", "Data de início obrigatória.");
  const status = String(data.status || (data.ativo === false ? "ENCERRADO" : "ATIVO")).trim().toUpperCase();
  if (status && !["ATIVO", "ENCERRADO"].includes(status)) addError(errors, "status", "Status inválido.");

  const cpf = normalizeCpf(data.cpfUsuario || data.cpf_usuario || "");
  if (cpf && !isValidCpf(cpf)) addError(errors, "cpf_usuario", "CPF inválido.");

  const observacoes = String(data.observacoes || "");
  if (observacoes.length > 500) addError(errors, "observacoes", "Observações devem ter até 500 caracteres.");

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
    const tipoMarcacao = String(data.tipoDeMarcacao || "").trim().toUpperCase();
    if (tipoMarcacao === "LEGENDA") {
      const textoLegenda = String(data.texto_legenda || "").trim();
      if (!textoLegenda) addError(errors, "texto_legenda", "Texto da legenda obrigatório.");
      if (leituras.length < 3) addError(errors, "leituras", "Legenda exige pelo menos 3 leituras.");
    } else if (leituras.length < 10) addError(errors, "leituras", "Horizontal exige no mínimo 10 leituras por segmento.");
    if (!String(data.linha || "").trim() || !String(data.estacao || "").trim()) {
      addError(errors, "linha", "Linha e estação obrigatórias.");
    }
  }
  if (subtipo === "VERTICAL" && leituras.length < 1) addError(errors, "leituras", "Vertical exige leituras válidas.");
  if (subtipo === "TACHAS" && leituras.length < 1) addError(errors, "leituras", "Tachas exige leituras válidas.");
  if (subtipo === "LEGENDA") {
    const textoLegenda = String(data.legenda_texto || data.texto_legenda || "").trim();
    if (!textoLegenda) addError(errors, "legenda_texto", "Texto da legenda obrigatório.");
    if (leituras.length < 3) addError(errors, "leituras", "Legenda exige pelo menos 3 leituras.");
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
