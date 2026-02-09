import {
  getAllEquipamentos,
  saveEquipamento,
  deleteEquipamento,
  clearEquipamentos,
  bulkSaveEquipamentos,
  getAllUsuarios,
  saveUsuario,
  deleteUsuario,
  getAllVinculos,
  saveVinculo,
  encerrarVinculo,
  getAllMedicoes,
  saveMedicao,
  getAllObras,
  saveObra,
  deleteObra,
  exportSnapshot,
  importSnapshot,
  clearAllStores,
  saveAuditoria
} from "./db.js";
import { ensureDefaultAdmin, authenticate, updatePin, createUserWithPin, logout, requireAuth } from "../shared/auth.js";

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll("[data-panel]");
const statusCards = document.getElementById("statusCards");
const dueSoonList = document.getElementById("dueSoonList");
const quickSearch = document.getElementById("quickSearch");
const quickResults = document.getElementById("quickResults");
const clearSearch = document.getElementById("clearSearch");
const quickTipoFilters = document.querySelectorAll("[data-filter-type]");
const quickStatusFilters = document.querySelectorAll("[data-filter-status]");
const tableBody = document.getElementById("equipamentosBody");
const tableSearch = document.getElementById("tableSearch");
const typeFilter = document.getElementById("typeFilter");
const statusFilter = document.getElementById("statusFilter");
const pageSizeSelect = document.getElementById("pageSize");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const newEquipamento = document.getElementById("newEquipamento");
const seedButton = document.getElementById("seedEquipamentos");
const exportBackup = document.getElementById("exportBackup");
const exportCsv = document.getElementById("exportCsv");
const importFile = document.getElementById("importFile");
const importBackup = document.getElementById("importBackup");
const importCsvFile = document.getElementById("importCsvFile");
const importCsv = document.getElementById("importCsv");
const importXlsxFile = document.getElementById("importXlsxFile");
const previewXlsx = document.getElementById("previewXlsx");
const importXlsx = document.getElementById("importXlsx");
const xlsxPreview = document.getElementById("xlsxPreview");
const resetData = document.getElementById("resetData");
const bulkPaste = document.getElementById("bulkPaste");
const importBulk = document.getElementById("importBulk");
const generateGlobalPdf = document.getElementById("generateGlobalPdf");
const generateObraPdf = document.getElementById("generateObraPdf");
const obraFilter = document.getElementById("obraFilter");
const relatorioFilter = document.getElementById("relatorioFilter");
const responsavelTecnico = document.getElementById("responsavelTecnico");
const faixaFilter = document.getElementById("faixaFilter");
const linhaFilter = document.getElementById("linhaFilter");
const estacaoFilter = document.getElementById("estacaoFilter");
const obraResumo = document.getElementById("obraResumo");
const statusMessage = document.getElementById("statusMessage");
const syncStatus = document.getElementById("syncStatus");
const sortButtons = document.querySelectorAll("[data-sort]");
const logoutButton = document.getElementById("logoutButton");

const modal = document.getElementById("equipamentoModal");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const cancelModal = document.getElementById("cancelModal");
const deleteModal = document.getElementById("deleteEquipamento");
const form = document.getElementById("equipamentoForm");
const formHint = document.getElementById("formHint");

const usuarioModal = document.getElementById("usuarioModal");
const usuarioTitle = document.getElementById("usuarioTitle");
const closeUsuario = document.getElementById("closeUsuario");
const cancelUsuario = document.getElementById("cancelUsuario");
const usuarioForm = document.getElementById("usuarioForm");
const usuarioHint = document.getElementById("usuarioHint");
const usuariosBody = document.getElementById("usuariosBody");
const newUsuario = document.getElementById("newUsuario");

const vinculoModal = document.getElementById("vinculoModal");
const vinculoTitle = document.getElementById("vinculoTitle");
const closeVinculo = document.getElementById("closeVinculo");
const cancelVinculo = document.getElementById("cancelVinculo");
const vinculoForm = document.getElementById("vinculoForm");
const vinculoHint = document.getElementById("vinculoHint");
const vinculosBody = document.getElementById("vinculosBody");
const newVinculo = document.getElementById("newVinculo");
const vinculoEquip = document.getElementById("vinculoEquip");
const vinculoUser = document.getElementById("vinculoUser");
const vinculoTermo = document.getElementById("vinculoTermo");

const obrasBody = document.getElementById("obrasBody");
const newObra = document.getElementById("newObra");
const obraModal = document.getElementById("obraModal");
const obraTitle = document.getElementById("obraTitle");
const closeObra = document.getElementById("closeObra");
const cancelObra = document.getElementById("cancelObra");
const obraForm = document.getElementById("obraForm");
const obraHint = document.getElementById("obraHint");

const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginHint = document.getElementById("loginHint");

const formFields = {
  id: document.getElementById("equipId"),
  funcao: document.getElementById("equipFuncao"),
  geometria: document.getElementById("equipGeometria"),
  numeroSerie: document.getElementById("equipSerie"),
  modelo: document.getElementById("equipModelo"),
  dataAquisicao: document.getElementById("equipAquisicao"),
  fabricante: document.getElementById("equipFabricante"),
  certificado: document.getElementById("equipCertificado"),
  statusLocal: document.getElementById("equipStatus"),
  calibrado: document.getElementById("equipCalibrado"),
  usuarioAtual: document.getElementById("equipResponsavel"),
  localidadeCidadeUF: document.getElementById("equipLocalidade"),
  dataEntregaUsuario: document.getElementById("equipEntrega"),
  observacoes: document.getElementById("equipObs")
};

const STATUS_ORDER = ["OBRA", "LAB_TINTAS", "DEMONSTRACAO", "VENDIDO", "STAND_BY"];
const FUNCOES = ["HORIZONTAL", "VERTICAL", "TACHAS"];
const GEOMETRIAS = ["15m", "30m"];
const STATUS_LABELS = {
  OBRA: "Obra",
  LAB_TINTAS: "Lab Tintas",
  DEMONSTRACAO: "Demonstração",
  VENDIDO: "Vendido",
  STAND_BY: "Stand-by"
};
const FUNCAO_LABELS = {
  HORIZONTAL: "Horizontal",
  VERTICAL: "Vertical",
  TACHAS: "Tachas"
};

const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ");
const normalizeId = (value) => normalizeText(value).toUpperCase();
const normalizeUserId = (value) => normalizeText(value);
const normalizeUserIdComparable = (value) => normalizeText(value).toUpperCase();

const normalizeFuncao = (value) => {
  const raw = normalizeText(value).toUpperCase();
  return FUNCOES.includes(raw) ? raw : "";
};

const normalizeStatus = (value) => {
  const raw = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  return STATUS_ORDER.includes(raw) ? raw : "STAND_BY";
};

const normalizeCalibrado = (value) => {
  const raw = normalizeText(value).toLowerCase();
  if (value === true || raw === "true" || raw === "sim") return "Sim";
  if (value === false || raw === "false" || raw === "nao" || raw === "não") return "Não";
  return "";
};

const normalizeGeometria = (value, funcao) => {
  const raw = normalizeText(value);
  if (funcao !== "HORIZONTAL") return null;
  return GEOMETRIAS.includes(raw) ? raw : null;
};

const toISODate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const parseDateString = (value) => {
  const raw = normalizeText(value);
  if (!raw) return { value: "", error: "" };
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const iso = toISODate(raw);
    return iso ? { value: iso, error: "" } : { value: "", error: "Data inválida" };
  }
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const iso = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    const normalized = toISODate(iso);
    return normalized ? { value: normalized, error: "" } : { value: "", error: "Data inválida" };
  }
  return { value: "", error: "Data inválida" };
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return "-";
  return `${day}/${month}/${year}`;
};

const getEquipamentoStatus = (equipamento) => equipamento.statusLocal || equipamento.statusOperacional || equipamento.status || "STAND_BY";
const getEquipamentoLocalidade = (equipamento) => equipamento.localidadeCidadeUF || equipamento.localidade || "";
const formatStatus = (status) => STATUS_LABELS[status] || STATUS_LABELS[normalizeStatus(status)] || "-";
const formatFuncao = (funcao) => FUNCAO_LABELS[funcao] || FUNCAO_LABELS[normalizeFuncao(funcao)] || "-";

const setStatusMessage = (message) => {
  statusMessage.textContent = message;
};

const openModal = (element) => {
  element.classList.add("active");
  element.setAttribute("aria-hidden", "false");
};

const closeModalElement = (element) => {
  element.classList.remove("active");
  element.setAttribute("aria-hidden", "true");
};

let equipamentos = [];
let usuarios = [];
let vinculos = [];
let medicoes = [];
let obras = [];
let editingId = null;
let editingUserId = null;
let editingObraId = null;
let activeSession = null;
let sortState = { key: "id", direction: "asc" };
let currentPage = 1;

const ensureLogin = async () => {
  await ensureDefaultAdmin();
  const session = requireAuth({
    allowRoles: ["ADMIN"],
    onMissing: () => openModal(loginModal),
    onUnauthorized: () => {
      logout();
      window.location.href = "../medlux-reflective-control/index.html";
    }
  });
  if (!session) return null;
  activeSession = session;
  return activeSession;
};

const validateEquipamento = (data) => {
  if (!data.id) return "ID obrigatório.";
  if (!data.funcao) return "Função obrigatória.";
  if (data.funcao === "HORIZONTAL" && !data.geometria) return "Geometria obrigatória para horizontais.";
  return "";
};

const normalizeEquipamento = (data) => {
  const funcao = normalizeFuncao(data.funcao);
  return {
    id: normalizeId(data.id),
    modelo: normalizeText(data.modelo),
    funcao,
    geometria: normalizeGeometria(data.geometria, funcao),
    numeroSerie: normalizeText(data.numeroSerie),
    dataAquisicao: data.dataAquisicao ? parseDateString(data.dataAquisicao).value : "",
    calibrado: normalizeCalibrado(data.calibrado),
    dataCalibracao: data.dataCalibracao ? parseDateString(data.dataCalibracao).value : "",
    numeroCertificado: normalizeText(data.certificado || data.numeroCertificado),
    fabricante: normalizeText(data.fabricante),
    usuarioAtual: normalizeText(data.usuarioAtual || data.usuarioResponsavel),
    usuarioResponsavel: normalizeText(data.usuarioAtual || data.usuarioResponsavel),
    localidadeCidadeUF: normalizeText(data.localidadeCidadeUF || data.localidade),
    dataEntregaUsuario: data.dataEntregaUsuario ? parseDateString(data.dataEntregaUsuario).value : "",
    statusLocal: normalizeStatus(data.statusLocal || data.statusOperacional || data.status || "STAND_BY"),
    observacoes: normalizeText(data.observacoes)
  };
};

const normalizeObra = (data) => ({
  id: normalizeId(data.idObra || data.id),
  idObra: normalizeId(data.idObra || data.id),
  nomeObra: normalizeText(data.nomeObra || data.nome),
  rodovia: normalizeText(data.rodovia),
  kmInicio: normalizeText(data.kmInicio),
  kmFim: normalizeText(data.kmFim),
  cidadeUF: normalizeText(data.cidadeUF),
  concessionariaCliente: normalizeText(data.concessionariaCliente),
  responsavelTecnico: normalizeText(data.responsavelTecnico),
  observacoes: normalizeText(data.observacoes)
});

const validateObra = (obra) => {
  if (!obra.idObra) return "ID da obra obrigatório.";
  if (!obra.nomeObra) return "Nome da obra obrigatório.";
  return "";
};

const loadData = async () => {
  [equipamentos, usuarios, vinculos, medicoes, obras] = await Promise.all([
    getAllEquipamentos(),
    getAllUsuarios(),
    getAllVinculos(),
    getAllMedicoes(),
    getAllObras()
  ]);
};

const getActiveVinculos = () => vinculos.filter((item) => item.status === "ATIVO" || item.ativo);
const getActiveVinculoByEquip = (equipId) => getActiveVinculos()
  .find((item) => (item.equipamento_id || item.equip_id) === equipId) || null;

const renderDashboard = () => {
  statusCards.textContent = "";
  const total = equipamentos.length;
  const byStatus = STATUS_ORDER.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  equipamentos.forEach((equipamento) => {
    const status = getEquipamentoStatus(equipamento);
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  const cards = [
    { label: "Total", value: total },
    ...STATUS_ORDER.map((status) => ({ label: formatStatus(status), value: byStatus[status] || 0 }))
  ];
  cards.forEach((card) => {
    const wrapper = document.createElement("div");
    wrapper.className = "status-card";
    const label = document.createElement("p");
    label.textContent = card.label;
    const value = document.createElement("h3");
    value.textContent = card.value;
    wrapper.append(label, value);
    statusCards.appendChild(wrapper);
  });

  dueSoonList.textContent = "";
  const active = getActiveVinculos();
  if (!active.length) {
    const empty = document.createElement("li");
    empty.textContent = "Nenhum vínculo ativo no momento.";
    dueSoonList.appendChild(empty);
    return;
  }
  active.forEach((vinculo) => {
    const equipamentoId = vinculo.equipamento_id || vinculo.equip_id;
    const equipamento = equipamentos.find((item) => item.id === equipamentoId);
    const usuario = usuarios.find((item) => (item.user_id || item.id) === vinculo.user_id);
    const item = document.createElement("li");
    item.textContent = `${equipamentoId} • ${equipamento?.modelo || "Sem modelo"} • ${usuario?.nome || vinculo.user_id}`;
    dueSoonList.appendChild(item);
  });
};

const matchesSearch = (equipamento, term) => {
  if (!term) return true;
  const text = `${equipamento.id} ${equipamento.modelo} ${equipamento.numeroSerie} ${equipamento.usuarioAtual || equipamento.usuarioResponsavel}`.toLowerCase();
  return text.includes(term);
};

const getFilteredEquipamentos = () => {
  const term = tableSearch.value.trim().toLowerCase();
  const funcao = typeFilter.value;
  const status = statusFilter.value;
  return equipamentos.filter((equipamento) => {
    if (funcao && equipamento.funcao !== funcao) return false;
    if (status && getEquipamentoStatus(equipamento) !== status) return false;
    return matchesSearch(equipamento, term);
  });
};

const sortEquipamentos = (items) => {
  const { key, direction } = sortState;
  const sorted = [...items].sort((a, b) => {
    const aValue = a[key] || "";
    const bValue = b[key] || "";
    if (aValue < bValue) return -1;
    if (aValue > bValue) return 1;
    return 0;
  });
  if (direction === "desc") sorted.reverse();
  return sorted;
};

const renderEquipamentos = () => {
  const filtered = sortEquipamentos(getFilteredEquipamentos());
  const pageSize = Number(pageSizeSelect.value || 25);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  tableBody.textContent = "";
  pageItems.forEach((equipamento) => {
    const row = document.createElement("tr");
    [
      equipamento.id,
      formatFuncao(equipamento.funcao),
      equipamento.modelo || "-",
      equipamento.numeroSerie || "-",
      equipamento.usuarioAtual || equipamento.usuarioResponsavel || "-",
      formatStatus(getEquipamentoStatus(equipamento)),
      getEquipamentoLocalidade(equipamento) || "-"
    ].forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    });

    const actions = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.className = "btn secondary";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => openEditModal(equipamento.id));
    const deleteButton = document.createElement("button");
    deleteButton.className = "btn danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => handleDelete(equipamento.id));
    actions.append(editButton, deleteButton);
    row.appendChild(actions);
    tableBody.appendChild(row);
  });

  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevPage.disabled = currentPage <= 1;
  nextPage.disabled = currentPage >= totalPages;
};

const renderQuickSearch = () => {
  const term = quickSearch.value.trim().toLowerCase();
  quickResults.textContent = "";
  if (!term) return;
  const results = equipamentos.filter((equipamento) => matchesSearch(equipamento, term));
  results.slice(0, 6).forEach((equipamento) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "result-card";
    const title = document.createElement("strong");
    title.textContent = `${equipamento.id} • ${equipamento.modelo || "Sem modelo"}`;
    const details = document.createElement("span");
    details.textContent = `Série ${equipamento.numeroSerie || "-"} • ${equipamento.usuarioAtual || equipamento.usuarioResponsavel || "Sem responsável"}`;
    card.append(title, details);
    card.addEventListener("click", () => openEditModal(equipamento.id));
    quickResults.appendChild(card);
  });
};

const renderUsuarios = () => {
  usuariosBody.textContent = "";
  usuarios.forEach((usuario) => {
    const row = document.createElement("tr");
    const statusLabel = (usuario.status || (usuario.ativo ? "ATIVO" : "INATIVO")) === "ATIVO" ? "Ativo" : "Inativo";
    [usuario.user_id || usuario.id, usuario.nome, usuario.role, statusLabel].forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    });
    const actions = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.className = "btn secondary";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => openUsuarioModal(usuario.user_id || usuario.id));
    const resetButton = document.createElement("button");
    resetButton.className = "btn secondary";
    resetButton.type = "button";
    resetButton.textContent = "Resetar PIN";
    resetButton.addEventListener("click", () => handleResetPin(usuario.user_id || usuario.id));
    const deleteButton = document.createElement("button");
    deleteButton.className = "btn danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => handleDeleteUsuario(usuario.user_id || usuario.id));
    actions.append(editButton, resetButton, deleteButton);
    row.appendChild(actions);
    usuariosBody.appendChild(row);
  });
};

const renderVinculos = () => {
  vinculosBody.textContent = "";
  vinculos.forEach((vinculo) => {
    const row = document.createElement("tr");
    const equipamentoId = vinculo.equipamento_id || vinculo.equip_id;
    const equipamento = equipamentos.find((item) => item.id === equipamentoId);
    const usuario = usuarios.find((item) => normalizeUserIdComparable(item.user_id || item.id) === normalizeUserIdComparable(vinculo.user_id));
    const statusLabel = vinculo.status === "ATIVO" || vinculo.ativo ? "Ativo" : "Encerrado";
    const termoLabel = vinculo.termo_pdf || vinculo.termo_cautela_pdf ? "Arquivo anexado" : "-";
    [
      `${equipamentoId}${equipamento?.modelo ? ` • ${equipamento.modelo}` : ""}`,
      `${vinculo.user_id}${usuario?.nome ? ` • ${usuario.nome}` : ""}`,
      formatDate(vinculo.inicio || vinculo.data_inicio),
      statusLabel,
      termoLabel
    ].forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    });
    const actions = document.createElement("td");
    if (vinculo.status === "ATIVO" || vinculo.ativo) {
      const endButton = document.createElement("button");
      endButton.className = "btn secondary";
      endButton.type = "button";
      endButton.textContent = "Encerrar";
      endButton.addEventListener("click", () => handleEncerrarVinculo(vinculo.vinculo_id || vinculo.id));
      actions.appendChild(endButton);
    }
    row.appendChild(actions);
    vinculosBody.appendChild(row);
  });
};

const renderObras = () => {
  obrasBody.textContent = "";
  obras.forEach((obra) => {
    const row = document.createElement("tr");
    const kmLabel = obra.kmInicio || obra.kmFim ? `${obra.kmInicio || "-"} → ${obra.kmFim || "-"}` : "-";
    [
      obra.idObra || obra.id,
      obra.nomeObra || obra.nome || "-",
      obra.rodovia || "-",
      kmLabel,
      obra.cidadeUF || "-",
      obra.concessionariaCliente || "-"
    ].forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    });
    const actions = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.className = "btn secondary";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => openObraModal(obra.id));
    const deleteButton = document.createElement("button");
    deleteButton.className = "btn danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => handleDeleteObra(obra.id));
    actions.append(editButton, deleteButton);
    row.appendChild(actions);
    obrasBody.appendChild(row);
  });
};

const refreshSelectOptions = () => {
  vinculoEquip.textContent = "";
  const emptyEquip = document.createElement("option");
  emptyEquip.value = "";
  emptyEquip.textContent = "Selecione";
  vinculoEquip.appendChild(emptyEquip);
  equipamentos.forEach((equip) => {
    const option = document.createElement("option");
    option.value = equip.id;
    option.textContent = `${equip.id} • ${equip.modelo || "Sem modelo"}`;
    vinculoEquip.appendChild(option);
  });
  vinculoUser.textContent = "";
  const emptyUser = document.createElement("option");
  emptyUser.value = "";
  emptyUser.textContent = "Selecione";
  vinculoUser.appendChild(emptyUser);
  usuarios.filter((user) => user.status === "ATIVO" || user.ativo).forEach((user) => {
    const userId = user.user_id || user.id;
    const option = document.createElement("option");
    option.value = userId;
    option.textContent = `${userId} • ${user.nome}`;
    vinculoUser.appendChild(option);
  });
};

const handleDelete = async (id) => {
  const confirmed = window.confirm(`Excluir equipamento ${id}?`);
  if (!confirmed) return;
  await deleteEquipamento(id);
  await loadData();
  renderAll();
  setStatusMessage(`Equipamento ${id} removido.`);
};

const openEditModal = (id) => {
  const equipamento = equipamentos.find((item) => item.id === id);
  if (!equipamento) return;
  editingId = id;
  const vinculoAtivo = getActiveVinculoByEquip(id);
  modalTitle.textContent = `Editar ${equipamento.id}`;
  formFields.id.value = equipamento.id;
  formFields.id.disabled = true;
  formFields.funcao.value = equipamento.funcao || "";
  formFields.geometria.value = equipamento.geometria || "";
  formFields.numeroSerie.value = equipamento.numeroSerie || "";
  formFields.modelo.value = equipamento.modelo || "";
  formFields.dataAquisicao.value = equipamento.dataAquisicao || "";
  formFields.fabricante.value = equipamento.fabricante || "";
  formFields.certificado.value = equipamento.certificado || equipamento.numeroCertificado || "";
  formFields.statusLocal.value = equipamento.statusLocal || equipamento.statusOperacional || equipamento.status || "STAND_BY";
  formFields.calibrado.value = equipamento.calibrado || "";
  formFields.usuarioAtual.value = vinculoAtivo?.user_id || equipamento.usuarioAtual || equipamento.usuarioResponsavel || "";
  formFields.usuarioAtual.disabled = Boolean(vinculoAtivo);
  formFields.localidadeCidadeUF.value = equipamento.localidadeCidadeUF || equipamento.localidade || "";
  formFields.dataEntregaUsuario.value = equipamento.dataEntregaUsuario || "";
  formFields.observacoes.value = equipamento.observacoes || "";
  formHint.textContent = "Campos com * são obrigatórios.";
  updateGeometriaState();
  openModal(modal);
};

const openNewModal = () => {
  editingId = null;
  modalTitle.textContent = "Novo equipamento";
  form.reset();
  formFields.id.disabled = false;
  formFields.usuarioAtual.disabled = false;
  formFields.statusLocal.value = "STAND_BY";
  formFields.calibrado.value = "Sim";
  formHint.textContent = "Campos com * são obrigatórios.";
  updateGeometriaState();
  openModal(modal);
};

const handleFormSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const resolvedId = data.id || editingId || "";
  const normalized = normalizeEquipamento({ ...data, id: resolvedId });
  const error = validateEquipamento(normalized);
  if (error) {
    formHint.textContent = error;
    return;
  }
  if (!editingId && equipamentos.some((item) => item.id === normalized.id)) {
    formHint.textContent = "ID já existe.";
    return;
  }
  const now = new Date().toISOString();
  const existing = editingId ? equipamentos.find((item) => item.id === editingId) : null;
  const vinculoAtivo = getActiveVinculoByEquip(normalized.id);
  if (vinculoAtivo) {
    normalized.usuarioAtual = vinculoAtivo.user_id;
    normalized.usuarioResponsavel = vinculoAtivo.user_id;
  }
  await saveEquipamento({
    ...normalized,
    created_at: existing?.created_at || now,
    updated_at: now
  });
  await saveAuditoria({
    auditoria_id: crypto.randomUUID(),
    entity: "equipamentos",
    action: editingId ? "update" : "create",
    data_hora: new Date().toISOString(),
    payload: { id: normalized.id, user_id: activeSession?.user_id }
  });
  await loadData();
  renderAll();
  closeModalElement(modal);
  setStatusMessage(editingId ? `Equipamento ${normalized.id} atualizado.` : `Equipamento ${normalized.id} cadastrado.`);
};

const handleUsuarioSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(usuarioForm).entries());
  const userId = normalizeUserId(data.user_id);
  const userIdComparable = normalizeUserIdComparable(userId);
  if (!userId || !data.nome || !data.role) {
    usuarioHint.textContent = "ID, nome e perfil são obrigatórios.";
    return;
  }
  if (!editingUserId && usuarios.some((item) => normalizeUserIdComparable(item.user_id || item.id) === userIdComparable)) {
    usuarioHint.textContent = "ID já existe.";
    return;
  }
  const existing = usuarios.find((item) => normalizeUserIdComparable(item.user_id || item.id) === userIdComparable);
  if (!existing && !data.pin) {
    usuarioHint.textContent = "PIN obrigatório para novo usuário.";
    return;
  }
  const status = data.ativo === "false" ? "INATIVO" : "ATIVO";
  const updated = {
    ...existing,
    user_id: userId,
    id: userId,
    nome: normalizeText(data.nome),
    role: data.role,
    ativo: data.ativo === "true",
    status,
    updated_at: new Date().toISOString(),
    created_at: existing?.created_at || new Date().toISOString()
  };
  if (!existing) {
    await createUserWithPin({ ...updated, pin: data.pin });
  } else if (data.pin) {
    await updatePin(userId, data.pin);
    const refreshed = usuarios.find((item) => item.user_id === userId) || updated;
    await saveUsuario({ ...refreshed, ...updated });
  } else {
    await saveUsuario(updated);
  }
  await loadData();
  renderAll();
  closeModalElement(usuarioModal);
  setStatusMessage(editingUserId ? `Usuário ${userId} atualizado.` : `Usuário ${userId} cadastrado.`);
};

const openUsuarioModal = (userId = "") => {
  usuarioForm.reset();
  usuarioHint.textContent = "Campos com * são obrigatórios.";
  if (!userId) {
    editingUserId = null;
    usuarioTitle.textContent = "Novo usuário";
    usuarioForm.querySelector("#usuarioId").disabled = false;
    openModal(usuarioModal);
    return;
  }
  const usuario = usuarios.find((item) => normalizeUserIdComparable(item.user_id || item.id) === normalizeUserIdComparable(userId));
  if (!usuario) return;
  editingUserId = userId;
  const resolvedUserId = usuario.user_id || usuario.id;
  const isActive = usuario.status ? usuario.status === "ATIVO" : usuario.ativo;
  usuarioTitle.textContent = `Editar ${resolvedUserId}`;
  usuarioForm.querySelector("#usuarioId").value = resolvedUserId;
  usuarioForm.querySelector("#usuarioId").disabled = true;
  usuarioForm.querySelector("#usuarioNome").value = usuario.nome;
  usuarioForm.querySelector("#usuarioRole").value = usuario.role;
  usuarioForm.querySelector("#usuarioAtivo").value = isActive ? "true" : "false";
  usuarioForm.querySelector("#usuarioPin").value = "";
  openModal(usuarioModal);
};

const handleResetPin = async (userId) => {
  const pin = window.prompt("Novo PIN para o usuário:");
  if (!pin) return;
  await updatePin(userId, pin);
  setStatusMessage(`PIN atualizado para ${userId}.`);
};

const handleDeleteUsuario = async (userId) => {
  const confirmed = window.confirm(`Excluir usuário ${userId}?`);
  if (!confirmed) return;
  await deleteUsuario(userId);
  await loadData();
  renderAll();
  setStatusMessage(`Usuário ${userId} removido.`);
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const handleVinculoSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(vinculoForm).entries());
  if (!data.equip_id || !data.user_id || !data.data_inicio) {
    vinculoHint.textContent = "Selecione equipamento, usuário e data.";
    return;
  }
  const termoFile = vinculoTermo.files[0];
  const termo = termoFile ? await fileToBase64(termoFile) : "";
  const now = new Date().toISOString();
  const vinculoId = crypto.randomUUID();
  const vinculo = {
    id: vinculoId,
    vinculo_id: vinculoId,
    equipamento_id: data.equip_id,
    equip_id: data.equip_id,
    user_id: data.user_id,
    inicio: parseDateString(data.data_inicio).value,
    data_inicio: parseDateString(data.data_inicio).value,
    fim: null,
    data_fim: null,
    status: "ATIVO",
    ativo: true,
    termo_pdf: termo,
    termo_cautela_pdf: termo,
    created_at: now,
    updated_at: now
  };
  await saveVinculo(vinculo);
  const equipamento = equipamentos.find((item) => item.id === data.equip_id);
  if (equipamento) {
    await saveEquipamento({
      ...equipamento,
      statusLocal: "OBRA",
      statusOperacional: "OBRA",
      status: "OBRA",
      usuarioAtual: data.user_id,
      usuarioResponsavel: data.user_id
    });
  }
  await loadData();
  renderAll();
  closeModalElement(vinculoModal);
  setStatusMessage("Vínculo cadastrado.");
};

const handleEncerrarVinculo = async (vinculoId) => {
  const confirmed = window.confirm("Encerrar vínculo? O equipamento volta para Stand-by.");
  if (!confirmed) return;
  const encerrado = await encerrarVinculo(vinculoId, new Date().toISOString());
  if (encerrado) {
    const equipamentoId = encerrado.equipamento_id || encerrado.equip_id;
    const equipamento = equipamentos.find((item) => item.id === equipamentoId);
    if (equipamento) {
      await saveEquipamento({
        ...equipamento,
        statusLocal: "STAND_BY",
        statusOperacional: "STAND_BY",
        status: "STAND_BY",
        usuarioAtual: "",
        usuarioResponsavel: ""
      });
    }
  }
  await loadData();
  renderAll();
  setStatusMessage("Vínculo encerrado.");
};

const openVinculoModal = () => {
  vinculoForm.reset();
  vinculoHint.textContent = "Campos com * são obrigatórios.";
  refreshSelectOptions();
  openModal(vinculoModal);
};

const openObraModal = (obraId = "") => {
  obraForm.reset();
  obraHint.textContent = "Campos com * são obrigatórios.";
  if (!obraId) {
    editingObraId = null;
    obraTitle.textContent = "Nova obra";
    obraForm.querySelector("#obraId").disabled = false;
    openModal(obraModal);
    return;
  }
  const obra = obras.find((item) => item.id === obraId || item.idObra === obraId);
  if (!obra) return;
  editingObraId = obra.id;
  obraTitle.textContent = `Editar ${obra.idObra || obra.id}`;
  obraForm.querySelector("#obraId").value = obra.idObra || obra.id;
  obraForm.querySelector("#obraId").disabled = true;
  obraForm.querySelector("#obraNome").value = obra.nomeObra || "";
  obraForm.querySelector("#obraRodovia").value = obra.rodovia || "";
  obraForm.querySelector("#obraKmInicio").value = obra.kmInicio || "";
  obraForm.querySelector("#obraKmFim").value = obra.kmFim || "";
  obraForm.querySelector("#obraCidade").value = obra.cidadeUF || "";
  obraForm.querySelector("#obraCliente").value = obra.concessionariaCliente || "";
  obraForm.querySelector("#obraResponsavel").value = obra.responsavelTecnico || "";
  obraForm.querySelector("#obraObs").value = obra.observacoes || "";
  openModal(obraModal);
};

const handleObraSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(obraForm).entries());
  const normalized = normalizeObra({ ...data, id: editingObraId || data.idObra });
  const error = validateObra(normalized);
  if (error) {
    obraHint.textContent = error;
    return;
  }
  const exists = obras.some((item) => item.id === normalized.id && item.id !== editingObraId);
  if (exists) {
    obraHint.textContent = "ID de obra já existe.";
    return;
  }
  const now = new Date().toISOString();
  await saveObra({
    ...normalized,
    created_at: obras.find((item) => item.id === normalized.id)?.created_at || now,
    updated_at: now
  });
  await loadData();
  renderAll();
  closeModalElement(obraModal);
  setStatusMessage(editingObraId ? "Obra atualizada." : "Obra cadastrada.");
};

const handleDeleteObra = async (obraId) => {
  const confirmed = window.confirm(`Excluir obra ${obraId}?`);
  if (!confirmed) return;
  await deleteObra(obraId);
  await loadData();
  renderAll();
  setStatusMessage("Obra removida.");
};

const handleSeed = async () => {
  const now = new Date().toISOString();
  await createUserWithPin({
    id: "ADMIN",
    nome: "Administrador",
    role: "ADMIN",
    status: "ATIVO",
    pin: "2308"
  });
  await createUserWithPin({
    id: "OP001",
    nome: "Operador Exemplo",
    role: "USER",
    status: "ATIVO",
    pin: "4321"
  });
  const seed = [
    {
      id: "MLX-H15-001",
      funcao: "HORIZONTAL",
      geometria: "15m",
      modelo: "MLX-H15",
      numeroSerie: "H15001",
      dataAquisicao: "2023-01-10",
      calibrado: "Sim",
      numeroCertificado: "CERT-2023-01",
      fabricante: "Medlux",
      usuarioAtual: "OP001",
      localidadeCidadeUF: "São Paulo-SP",
      dataEntregaUsuario: "2023-01-12",
      statusLocal: "OBRA"
    },
    {
      id: "MLX-V10-002",
      funcao: "VERTICAL",
      geometria: null,
      modelo: "MLX-V10",
      numeroSerie: "V10002",
      dataAquisicao: "2022-11-05",
      calibrado: "Não",
      numeroCertificado: "",
      fabricante: "Medlux",
      usuarioAtual: "",
      localidadeCidadeUF: "Curitiba-PR",
      dataEntregaUsuario: "",
      statusLocal: "STAND_BY"
    }
  ];
  await bulkSaveEquipamentos(seed.map(normalizeEquipamento));
  await saveVinculo({
    id: crypto.randomUUID(),
    equip_id: "MLX-H15-001",
    equipamento_id: "MLX-H15-001",
    user_id: "OP001",
    inicio: now,
    status: "ATIVO",
    created_at: now
  });
  const leituras = [128, 130, 126];
  const media = leituras.reduce((acc, item) => acc + item, 0) / leituras.length;
  await saveMedicao({
    id: crypto.randomUUID(),
    equipamento_id: "MLX-H15-001",
    equip_id: "MLX-H15-001",
    user_id: "OP001",
    obra_id: "OBRA-001",
    relatorio_id: "REL-2024-001",
    tipoMedicao: "RL",
    tipo_medicao: "RL",
    leituras,
    media,
    unidade: "mcd/m²/lx",
    dataHora: now,
    data_hora: now,
    enderecoTexto: "Rodovia Exemplo, KM 120",
    cidadeUF: "São Paulo-SP",
    rodovia: "SP-330",
    km: "120",
    sentido: "Norte",
    faixa: "Direita",
    clima: "Céu limpo",
    observacoes: "Medição de referência",
    gps: { lat: -23.55052, lng: -46.633308, accuracy: 12, source: "MANUAL" },
    fotos: [],
    created_at: now
  });
  await loadData();
  renderAll();
  setStatusMessage("Dados de exemplo carregados.");
};

const handleExportBackup = async () => {
  const payload = await exportSnapshot();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `medlux-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
};

const handleImportBackup = async () => {
  if (!importFile.files.length) {
    setStatusMessage("Selecione um arquivo JSON para importar.");
    return;
  }
  const file = importFile.files[0];
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    setStatusMessage("JSON inválido.");
    return;
  }
  const mode = document.querySelector("input[name='importMode']:checked")?.value || "merge";
  if (mode === "replace") {
    await clearAllStores();
  }
  await importSnapshot(payload);
  await loadData();
  renderAll();
  setStatusMessage("Importação concluída.");
};

const mapHeaders = (headers) => headers.map((header) => normalizeText(header)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, ""));

const buildEquipamentoFromRow = (row, rowIndex) => {
  const errors = [];
  const funcao = normalizeFuncao(row.funcao || row.funcaoequipamento || row.tipo);
  const aquisicao = parseDateString(row.dataaquisicao);
  const entrega = parseDateString(row.dataentregausuario);
  if (row.dataaquisicao && aquisicao.error) errors.push("Data de aquisição inválida");
  if (row.dataentregausuario && entrega.error) errors.push("Data de entrega inválida");
  const equipamento = normalizeEquipamento({
    id: row.id || row.identificacao,
    modelo: row.modelo,
    funcao,
    geometria: row.geometria,
    numeroSerie: row.numeroserie || row.numerodeserie || row.ndeserie,
    dataAquisicao: aquisicao.value,
    calibrado: row.calibracao || row.calibrado,
    numeroCertificado: row.ndocertificado || row.numerocertificado || row.ncertificado,
    fabricante: row.fabricante,
    usuarioAtual: row.usuario || row.usuarioresponsavel,
    localidadeCidadeUF: row.localidadecidadeuf || row.localidade,
    dataEntregaUsuario: entrega.value,
    statusLocal: row.status,
    observacoes: row.observacoes
  });
  const baseError = validateEquipamento(equipamento);
  if (baseError) errors.push(baseError);
  return { equipamento, errors, rowIndex };
};

const summarizeImportErrors = (invalidRows) => invalidRows
  .slice(0, 3)
  .map((item) => `Linha ${item.rowIndex}: ${item.errors.join(", ")}`)
  .join(" | ");

const parseXlsx = async () => {
  if (!importXlsxFile.files.length) return [];
  const file = importXlsxFile.files[0];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const [headerRow, ...rows] = raw;
  if (!headerRow) return [];
  const headers = mapHeaders(headerRow);
  return rows
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
};

const buildPreview = (items) => {
  xlsxPreview.textContent = "";
  if (!items.length) {
    xlsxPreview.textContent = "Nenhum dado para pré-visualizar.";
    return;
  }
  const table = document.createElement("table");
  table.className = "table";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  ["ID", "Função", "Modelo", "Série", "Status"].forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  table.appendChild(head);
  const body = document.createElement("tbody");
  items.slice(0, 10).forEach((item) => {
    const row = document.createElement("tr");
    [item.id, formatFuncao(item.funcao), item.modelo || "-", item.numeroSerie || "-", formatStatus(getEquipamentoStatus(item))].forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    });
    body.appendChild(row);
  });
  table.appendChild(body);
  xlsxPreview.appendChild(table);
};

const handlePreviewXlsx = async () => {
  const rows = await parseXlsx();
  const mapped = rows.map((row, index) => buildEquipamentoFromRow(row, index + 2));
  const invalid = mapped.filter((item) => item.errors.length);
  if (invalid.length) {
    const details = summarizeImportErrors(invalid);
    setStatusMessage(`Pré-visualização com ${invalid.length} linha(s) inválida(s). ${details}`);
  }
  buildPreview(mapped.map((item) => item.equipamento));
};

const handleImportXlsx = async () => {
  const rows = await parseXlsx();
  if (!rows.length) {
    setStatusMessage("Nenhum dado encontrado no Excel.");
    return;
  }
  const mapped = rows.map((row, index) => buildEquipamentoFromRow(row, index + 2));
  const invalid = mapped.filter((item) => item.errors.length);
  if (invalid.length) {
    const details = summarizeImportErrors(invalid);
    setStatusMessage(`Existem ${invalid.length} linha(s) inválida(s) no Excel. ${details}`);
    return;
  }
  const normalized = mapped.map((item) => item.equipamento);
  const mode = document.querySelector("input[name='importXlsxMode']:checked")?.value || "merge";
  if (mode === "replace") {
    await clearEquipamentos();
  }
  await bulkSaveEquipamentos(normalized);
  await loadData();
  renderAll();
  setStatusMessage("Importação Excel concluída.");
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => String(value || "").trim())) rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((value) => String(value || "").trim())) rows.push(row);
  }
  return rows;
};

const parseDelimited = (text, delimiter) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = mapHeaders(lines[0].split(delimiter));
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
};

const escapeCsvValue = (value) => {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
};

const handleImportBulk = async () => {
  const text = bulkPaste.value.trim();
  if (!text) {
    setStatusMessage("Cole os dados para importar.");
    return;
  }
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows = parseDelimited(text, delimiter);
  const mapped = rows.map((row, index) => buildEquipamentoFromRow(row, index + 2));
  const invalid = mapped.filter((item) => item.errors.length);
  if (invalid.length) {
    const details = summarizeImportErrors(invalid);
    setStatusMessage(`Existem ${invalid.length} linha(s) inválida(s) na importação em lote. ${details}`);
    return;
  }
  await bulkSaveEquipamentos(mapped.map((item) => item.equipamento));
  await loadData();
  renderAll();
  setStatusMessage("Importação em lote concluída.");
};

const handleImportCsv = async () => {
  if (!importCsvFile.files.length) {
    setStatusMessage("Selecione um CSV.");
    return;
  }
  const text = await importCsvFile.files[0].text();
  const csvRows = parseCsv(text);
  if (!csvRows.length) {
    setStatusMessage("Nenhuma linha encontrada no CSV.");
    return;
  }
  const headers = mapHeaders(csvRows[0]);
  const rows = csvRows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  const mapped = rows.map((row, index) => buildEquipamentoFromRow(row, index + 2));
  const invalid = mapped.filter((item) => item.errors.length);
  if (invalid.length) {
    const details = summarizeImportErrors(invalid);
    setStatusMessage(`Existem ${invalid.length} linha(s) inválida(s) no CSV. ${details}`);
    return;
  }
  await bulkSaveEquipamentos(mapped.map((item) => item.equipamento));
  await loadData();
  renderAll();
  setStatusMessage("CSV importado.");
};

const handleExportCsv = () => {
  const headers = [
    "id",
    "modelo",
    "funcao",
    "geometria",
    "numeroSerie",
    "dataAquisicao",
    "calibrado",
    "dataCalibracao",
    "numeroCertificado",
    "fabricante",
    "usuarioResponsavel",
    "localidadeCidadeUF",
    "dataEntregaUsuario",
    "statusLocal",
    "observacoes"
  ];
  const rows = equipamentos.map((equipamento) => headers.map((header) => escapeCsvValue(equipamento[header] ?? equipamento.usuarioAtual ?? "")));
  const csv = [headers.map(escapeCsvValue).join(","), ...rows.map((row) => row.join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `medlux-equipamentos-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
};

const handleReset = async () => {
  const confirmed = window.confirm("Deseja remover todos os dados locais?");
  if (!confirmed) return;
  await clearAllStores();
  await loadData();
  renderAll();
  setStatusMessage("Dados locais removidos.");
};

const formatGps = (gps) => {
  if (!gps || gps.lat === null || gps.lng === null) return "-";
  const acc = gps.accuracy ? `±${gps.accuracy}m` : "-";
  return `${gps.lat}, ${gps.lng} (${acc})`;
};

const formatLocal = (medicao) => {
  const parts = [medicao.cidadeUF, medicao.enderecoTexto, medicao.rodovia, medicao.km, medicao.sentido, medicao.faixa].filter(Boolean);
  return parts.length ? parts.join(" • ") : "-";
};

const calculateMedia = (medicao) => {
  const leituras = (medicao.leituras || []).map((value) => Number(value)).filter((value) => Number.isFinite(value));
  if (!leituras.length) {
    const fallback = Number(medicao.valor);
    return Number.isFinite(fallback) ? fallback : null;
  }
  const tipo = String(medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao || "").trim().toUpperCase();
  if (tipo === "HORIZONTAL") {
    if (leituras.length < 3) return null;
    const sorted = [...leituras].sort((a, b) => a - b);
    const trimmed = sorted.length >= 3 ? sorted.slice(1, sorted.length - 1) : sorted;
    if (!trimmed.length) return null;
    return trimmed.reduce((acc, item) => acc + item, 0) / trimmed.length;
  }
  return leituras.reduce((acc, item) => acc + item, 0) / leituras.length;
};

const formatMedia = (medicao) => {
  const media = calculateMedia(medicao);
  return media === null ? "-" : media.toFixed(2);
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Falha ao converter imagem."));
  reader.readAsDataURL(blob);
});

const buildGlobalPdf = async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const now = new Date();
  const title = "Relatório Global MEDLUX";
  doc.setFontSize(16);
  doc.text(title, 40, 40);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${now.toLocaleString("pt-BR")}`, 40, 58);
  doc.text(`Auditor: ${activeSession?.nome || "-"} (${activeSession?.id || activeSession?.user_id || "-"})`, 40, 72);

  const equipamentoRows = equipamentos.map((equipamento) => [
    equipamento.id,
    formatFuncao(equipamento.funcao),
    equipamento.geometria || "-",
    equipamento.modelo || "-",
    equipamento.numeroSerie || "-",
    equipamento.fabricante || "-",
    equipamento.usuarioAtual || equipamento.usuarioResponsavel || "-",
    getEquipamentoLocalidade(equipamento) || "-",
    formatStatus(getEquipamentoStatus(equipamento)),
    equipamento.calibrado || "-",
    equipamento.numeroCertificado || equipamento.certificado || "-"
  ]);

  doc.autoTable({
    head: [["ID", "Função", "Geom.", "Modelo", "Série", "Fabricante", "Usuário", "Localidade", "Status", "Calibração", "Certificado"]],
    body: equipamentoRows,
    startY: 90,
    styles: { fontSize: 8 }
  });

  let cursorY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text("Histórico de vínculos", 40, cursorY);
  const vinculoRows = vinculos.map((vinculo) => [
    vinculo.equipamento_id || vinculo.equip_id,
    vinculo.user_id,
    formatDate(vinculo.inicio || vinculo.data_inicio),
    vinculo.fim || vinculo.data_fim ? formatDate(vinculo.fim || vinculo.data_fim) : "Ativo",
    vinculo.termo_pdf || vinculo.termo_cautela_pdf ? "Sim" : "Não"
  ]);
  doc.autoTable({
    head: [["Equipamento", "Usuário", "Início", "Fim", "Termo"]],
    body: vinculoRows,
    startY: cursorY + 10,
    styles: { fontSize: 8 }
  });

  cursorY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text("Histórico de medições", 40, cursorY);
  const medicaoRows = medicoes.map((medicao) => {
    const leituras = medicao.leituras || [];
    const quantidade = leituras.length || (medicao.valor ? 1 : 0);
    const anexos = (medicao.fotos || []).length ? "Anexo" : "-";
    return [
      medicao.id || medicao.medicao_id || "-",
      medicao.dataHora || medicao.data_hora || "-",
      medicao.user_id || "-",
      medicao.equipamento_id || medicao.equip_id,
      medicao.obra_id || "-",
      medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao,
      formatMedia(medicao),
      quantidade,
      formatLocal(medicao),
      formatGps(medicao.gps),
      anexos
    ];
  });
  doc.autoTable({
    head: [["ID", "Data/Hora", "Usuário", "Equip.", "Obra", "Tipo/Subtipo", "Média", "N Leituras", "Local", "GPS", "Anexos"]],
    body: medicaoRows,
    startY: cursorY + 10,
    styles: { fontSize: 8 }
  });

  let anexosY = doc.lastAutoTable.finalY + 20;
  const anexos = medicoes.flatMap((medicao) => medicao.fotos || []);
  if (anexos.length) {
    doc.setFontSize(12);
    doc.text("Anexos (miniaturas)", 40, anexosY);
    anexosY += 10;
    const thumbSize = 90;
    let x = 40;
    let y = anexosY + 10;
    for (const foto of anexos.slice(0, 9)) {
      try {
        const dataUrl = await blobToDataUrl(foto.blob);
        const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        doc.addImage(dataUrl, format, x, y, thumbSize, thumbSize);
        x += thumbSize + 10;
        if (x + thumbSize > 560) {
          x = 40;
          y += thumbSize + 16;
        }
        if (y + thumbSize > 760) {
          doc.addPage();
          x = 40;
          y = 60;
        }
      } catch (error) {
        // Ignore photo failures
      }
    }
  }

  doc.save(`auditoria-global-medlux-${now.toISOString().slice(0, 10)}.pdf`);
};

const buildObraPdf = async () => {
  const obraValue = normalizeText(obraFilter.value).toUpperCase();
  const relatorioValue = normalizeText(relatorioFilter.value).toUpperCase();
  const faixaValue = normalizeText(faixaFilter.value).toUpperCase();
  const linhaValue = normalizeText(linhaFilter.value).toUpperCase();
  const estacaoValue = normalizeText(estacaoFilter.value).toUpperCase();
  if (!obraValue && !relatorioValue) {
    setStatusMessage("Informe uma obra ou ID de relatório para gerar o PDF.");
    return;
  }
  const filtradas = medicoes.filter((medicao) => {
    const matchObra = obraValue ? (medicao.obra_id || "").toUpperCase() === obraValue : true;
    const relatorioId = medicao.identificadorRelatorio || medicao.relatorio_id || "";
    const matchRelatorio = relatorioValue ? relatorioId.toUpperCase() === relatorioValue : true;
    const matchFaixa = faixaValue ? normalizeText(medicao.faixa).toUpperCase() === faixaValue : true;
    const matchLinha = linhaValue ? normalizeText(medicao.linha).toUpperCase() === linhaValue : true;
    const matchEstacao = estacaoValue ? normalizeText(medicao.estacao).toUpperCase() === estacaoValue : true;
    return matchObra && matchRelatorio && matchFaixa && matchLinha && matchEstacao;
  });
  if (!filtradas.length) {
    setStatusMessage("Nenhuma medição encontrada para o filtro informado.");
    return;
  }

  const obra = obras.find((item) => normalizeId(item.idObra || item.id) === obraValue) || null;
  const identificador = relatorioValue || filtradas[0].identificadorRelatorio || filtradas[0].relatorio_id || "-";
  const datas = filtradas.map((item) => new Date(item.dataHora || item.data_hora)).filter((d) => !Number.isNaN(d.getTime()));
  const periodo = datas.length
    ? `${datas.reduce((min, d) => (d < min ? d : min)).toLocaleDateString("pt-BR")} → ${datas.reduce((max, d) => (d > max ? d : max)).toLocaleDateString("pt-BR")}`
    : "-";

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const now = new Date();
  doc.setFontSize(18);
  doc.text("Relatório por Obra MEDLUX", 40, 40);
  doc.setFontSize(11);
  doc.text(`Identificador: ${identificador}`, 40, 64);
  doc.text(`Obra: ${obraValue || "-"}`, 40, 80);
  doc.text(`Gerado em: ${now.toLocaleString("pt-BR")}`, 40, 96);
  doc.text(`Período: ${periodo}`, 40, 112);
  doc.text(`Responsável técnico: ${responsavelTecnico.value || obra?.responsavelTecnico || activeSession?.nome || "-"}`, 40, 128);

  let currentY = 148;
  if (obra) {
    doc.setFontSize(10);
    doc.text(`Nome: ${obra.nomeObra || "-"}`, 40, currentY);
    doc.text(`Rodovia: ${obra.rodovia || "-"} • KM ${obra.kmInicio || "-"} → ${obra.kmFim || "-"}`, 40, currentY + 14);
    doc.text(`Cidade/UF: ${obra.cidadeUF || "-"} • Cliente: ${obra.concessionariaCliente || "-"}`, 40, currentY + 28);
    currentY += 44;
  }

  if (obraResumo.value) {
    doc.setFontSize(10);
    doc.text("Resumo:", 40, currentY);
    const resumoLines = doc.splitTextToSize(obraResumo.value, 520);
    doc.text(resumoLines, 40, currentY + 14);
    currentY += 14 + resumoLines.length * 12;
  }

  const primeiroGps = filtradas.find((item) => item.gps?.lat !== null && item.gps?.lng !== null);
  if (primeiroGps) {
    const link = `https://www.google.com/maps?q=${primeiroGps.gps.lat},${primeiroGps.gps.lng}`;
    doc.setFontSize(10);
    const linkY = currentY + 14;
    if (doc.textWithLink) {
      doc.textWithLink("Abrir mapa da obra (Google Maps)", 40, linkY, { url: link });
    } else {
      doc.text(`Mapa: ${link}`, 40, linkY);
    }
    currentY = linkY + 16;
  }

  const resumoStart = currentY + 10;
  doc.setFontSize(12);
  doc.text("Resumo das medições", 40, resumoStart);
  const resumoRows = filtradas.map((medicao) => [
    medicao.id || medicao.medicao_id,
    medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao,
    `${medicao.linha || "-"} • Est. ${medicao.estacao || "-"}`,
    formatMedia(medicao),
    (medicao.leituras || []).length || 1,
    formatLocal(medicao),
    medicao.dataHora || medicao.data_hora
  ]);
  doc.autoTable({
    head: [["ID", "Subtipo", "Linha/Estação", "Média", "N Leituras", "Local", "Data/Hora"]],
    body: resumoRows,
    startY: resumoStart + 10,
    styles: { fontSize: 8 }
  });

  let cursorY = doc.lastAutoTable.finalY + 20;
  const agrupado = filtradas.reduce((acc, medicao) => {
    const chave = String(medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao || "OUTROS").toUpperCase();
    const media = calculateMedia(medicao);
    if (!acc[chave]) acc[chave] = { count: 0, sum: 0 };
    if (media !== null) {
      acc[chave].count += 1;
      acc[chave].sum += media;
    }
    return acc;
  }, {});
  const resumoStats = Object.entries(agrupado).map(([chave, data]) => [
    chave,
    data.count,
    data.count ? (data.sum / data.count).toFixed(2) : "-"
  ]);
  if (resumoStats.length) {
    doc.setFontSize(12);
    doc.text("Resumo estatístico por subtipo", 40, cursorY);
    doc.autoTable({
      head: [["Subtipo", "Qtd.", "Média geral"]],
      body: resumoStats,
      startY: cursorY + 10,
      styles: { fontSize: 8 }
    });
    cursorY = doc.lastAutoTable.finalY + 20;
  }

  const legendas = filtradas.filter((medicao) => String(medicao.subtipo || "").toUpperCase() === "LEGENDA");
  if (legendas.length) {
    const letras = legendas.reduce((acc, medicao) => {
      const letra = medicao.letra || "-";
      const media = calculateMedia(medicao);
      if (!acc[letra]) acc[letra] = { count: 0, sum: 0 };
      if (media !== null) {
        acc[letra].count += 1;
        acc[letra].sum += media;
      }
      return acc;
    }, {});
    const rows = Object.entries(letras).map(([letra, data]) => [
      letra,
      data.count,
      data.count ? (data.sum / data.count).toFixed(2) : "-"
    ]);
    doc.setFontSize(12);
    doc.text("Legendas por letra", 40, cursorY);
    doc.autoTable({
      head: [["Letra", "Qtd.", "Média"]],
      body: rows,
      startY: cursorY + 10,
      styles: { fontSize: 8 }
    });
    cursorY = doc.lastAutoTable.finalY + 20;
  }

  doc.setFontSize(12);
  doc.text("Fotos da obra", 40, cursorY);
  cursorY += 10;
  const fotos = filtradas.flatMap((medicao) => medicao.fotos || []);
  const limitFotos = fotos.slice(0, 12);
  const thumbSize = 110;
  let x = 40;
  let y = cursorY + 10;
  for (const foto of limitFotos) {
    try {
      const dataUrl = await blobToDataUrl(foto.blob);
      const format = dataUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(dataUrl, format, x, y, thumbSize, thumbSize);
      x += thumbSize + 12;
      if (x + thumbSize > 560) {
        x = 40;
        y += thumbSize + 20;
      }
      if (y + thumbSize > 760) {
        doc.addPage();
        x = 40;
        y = 60;
      }
    } catch (error) {
      // Ignore failed photos
    }
  }

  doc.save(`obra-${obraValue || relatorioValue}-${now.toISOString().slice(0, 10)}.pdf`);
};

const renderAll = () => {
  renderDashboard();
  renderEquipamentos();
  renderQuickSearch();
  renderUsuarios();
  renderVinculos();
  renderObras();
  refreshSelectOptions();
};

const handleLogin = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm).entries());
  const result = await authenticate(data.user_id, data.pin);
  if (!result.success) {
    loginHint.textContent = result.message;
    return;
  }
  if (result.session.role !== "ADMIN") {
    loginHint.textContent = "Acesso restrito ao ADMIN.";
    logout();
    window.location.href = "../medlux-reflective-control/index.html";
    return;
  }
  activeSession = result.session;
  closeModalElement(loginModal);
  await loadData();
  renderAll();
  setStatusMessage(`Bem-vindo, ${activeSession.nome}.`);
};

const handleTabs = (event) => {
  const { section } = event.target.dataset;
  if (!section) return;
  tabs.forEach((tab) => tab.setAttribute("aria-selected", tab === event.target ? "true" : "false"));
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== section;
  });
};

const handleQuickFilter = (event, group) => {
  const { filterType, filterStatus } = event.target.dataset;
  if (group === "type") {
    quickTipoFilters.forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");
    typeFilter.value = filterType;
  }
  if (group === "status") {
    quickStatusFilters.forEach((btn) => btn.classList.remove("active"));
    event.target.classList.add("active");
    statusFilter.value = filterStatus;
  }
  renderEquipamentos();
};

const handleSort = (event) => {
  const key = event.currentTarget.dataset.sort;
  if (!key) return;
  if (sortState.key === key) {
    sortState.direction = sortState.direction === "asc" ? "desc" : "asc";
  } else {
    sortState.key = key;
    sortState.direction = "asc";
  }
  renderEquipamentos();
};

const updateGeometriaState = () => {
  const funcao = formFields.funcao.value;
  const isHorizontal = funcao === "HORIZONTAL";
  formFields.geometria.disabled = !isHorizontal;
  const geometryField = formFields.geometria.closest(".field");
  if (geometryField) geometryField.style.display = isHorizontal ? "" : "none";
  if (!isHorizontal) formFields.geometria.value = "";
};

const initialize = async () => {
  await ensureLogin();
  if (!activeSession) return;
  await loadData();
  renderAll();
  syncStatus.textContent = navigator.onLine ? "Online • IndexedDB" : "Offline pronto • IndexedDB";
};

newEquipamento.addEventListener("click", openNewModal);
closeModal.addEventListener("click", () => closeModalElement(modal));
cancelModal.addEventListener("click", () => closeModalElement(modal));
deleteModal.addEventListener("click", () => handleDelete(editingId));
form.addEventListener("submit", handleFormSubmit);
formFields.funcao.addEventListener("change", updateGeometriaState);

newUsuario.addEventListener("click", () => openUsuarioModal());
closeUsuario.addEventListener("click", () => closeModalElement(usuarioModal));
cancelUsuario.addEventListener("click", () => closeModalElement(usuarioModal));
usuarioForm.addEventListener("submit", handleUsuarioSubmit);

newVinculo.addEventListener("click", openVinculoModal);
closeVinculo.addEventListener("click", () => closeModalElement(vinculoModal));
cancelVinculo.addEventListener("click", () => closeModalElement(vinculoModal));
vinculoForm.addEventListener("submit", handleVinculoSubmit);

newObra.addEventListener("click", () => openObraModal());
closeObra.addEventListener("click", () => closeModalElement(obraModal));
cancelObra.addEventListener("click", () => closeModalElement(obraModal));
obraForm.addEventListener("submit", handleObraSubmit);

loginForm.addEventListener("submit", handleLogin);
logoutButton.addEventListener("click", () => {
  logout();
  window.location.href = "../index.html";
});

seedButton.addEventListener("click", handleSeed);
exportBackup.addEventListener("click", handleExportBackup);
importBackup.addEventListener("click", handleImportBackup);
previewXlsx.addEventListener("click", handlePreviewXlsx);
importXlsx.addEventListener("click", handleImportXlsx);
importCsv.addEventListener("click", handleImportCsv);
importBulk.addEventListener("click", handleImportBulk);
exportCsv.addEventListener("click", handleExportCsv);
resetData.addEventListener("click", handleReset);

generateGlobalPdf.addEventListener("click", buildGlobalPdf);
generateObraPdf.addEventListener("click", buildObraPdf);

quickSearch.addEventListener("input", renderQuickSearch);
clearSearch.addEventListener("click", () => {
  quickSearch.value = "";
  renderQuickSearch();
});

tableSearch.addEventListener("input", () => {
  currentPage = 1;
  renderEquipamentos();
});

[typeFilter, statusFilter, pageSizeSelect].forEach((element) => {
  element.addEventListener("change", () => {
    currentPage = 1;
    renderEquipamentos();
  });
});

prevPage.addEventListener("click", () => {
  currentPage = Math.max(1, currentPage - 1);
  renderEquipamentos();
});
nextPage.addEventListener("click", () => {
  currentPage += 1;
  renderEquipamentos();
});

sortButtons.forEach((button) => button.addEventListener("click", handleSort));

quickTipoFilters.forEach((button) => {
  button.addEventListener("click", (event) => handleQuickFilter(event, "type"));
});

quickStatusFilters.forEach((button) => {
  button.addEventListener("click", (event) => handleQuickFilter(event, "status"));
});

tabs.forEach((tab) => tab.addEventListener("click", handleTabs));

window.addEventListener("online", () => { syncStatus.textContent = "Online • IndexedDB"; });
window.addEventListener("offline", () => { syncStatus.textContent = "Offline pronto • IndexedDB"; });

initialize();
