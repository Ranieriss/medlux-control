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
  exportSnapshot,
  importSnapshot,
  clearAllStores,
  saveAuditoria
} from "./db.js";
import { ensureDefaultAdmin, authenticate, updatePin, createUserWithPin, logout, requireAuth, getSession } from "../shared/auth.js";

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
let editingId = null;
let editingUserId = null;
let activeSession = null;
let sortState = { key: "id", direction: "asc" };
let currentPage = 1;

const ensureLogin = async () => {
  await ensureDefaultAdmin();
  const authorized = requireAuth({
    allowRoles: ["ADMIN"],
    onMissing: () => openModal(loginModal),
    onUnauthorized: () => {
      logout();
      openModal(loginModal);
    }
  });
  if (!authorized) return null;
  activeSession = getSession();
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
    certificado: normalizeText(data.certificado || data.numeroCertificado),
    fabricante: normalizeText(data.fabricante),
    usuarioAtual: normalizeText(data.usuarioAtual || data.usuarioResponsavel),
    localidadeCidadeUF: normalizeText(data.localidadeCidadeUF || data.localidade),
    dataEntregaUsuario: data.dataEntregaUsuario ? parseDateString(data.dataEntregaUsuario).value : "",
    statusLocal: normalizeStatus(data.statusLocal || data.statusOperacional || data.status || "STAND_BY"),
    observacoes: normalizeText(data.observacoes)
  };
};

const loadData = async () => {
  [equipamentos, usuarios, vinculos, medicoes] = await Promise.all([
    getAllEquipamentos(),
    getAllUsuarios(),
    getAllVinculos(),
    getAllMedicoes()
  ]);
};

const getActiveVinculos = () => vinculos.filter((item) => item.status === "ATIVO" || item.ativo);

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
    const usuario = usuarios.find((item) => item.user_id === vinculo.user_id);
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
  formFields.usuarioAtual.value = equipamento.usuarioAtual || equipamento.usuarioResponsavel || "";
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
  formFields.statusLocal.value = "STAND_BY";
  formFields.calibrado.value = "Sim";
  formHint.textContent = "Campos com * são obrigatórios.";
  updateGeometriaState();
  openModal(modal);
};

const handleFormSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const normalized = normalizeEquipamento(data);
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
  const userId = normalizeId(data.user_id);
  if (!userId || !data.nome || !data.role) {
    usuarioHint.textContent = "ID, nome e perfil são obrigatórios.";
    return;
  }
  if (!editingUserId && usuarios.some((item) => (item.user_id || item.id) === userId)) {
    usuarioHint.textContent = "ID já existe.";
    return;
  }
  const existing = usuarios.find((item) => (item.user_id || item.id) === userId);
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
  const usuario = usuarios.find((item) => item.user_id === userId);
  if (!usuario) return;
  editingUserId = userId;
  const userId = usuario.user_id || usuario.id;
  const isActive = usuario.status ? usuario.status === "ATIVO" : usuario.ativo;
  usuarioTitle.textContent = `Editar ${userId}`;
  usuarioForm.querySelector("#usuarioId").value = userId;
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
      await saveEquipamento({ ...equipamento, statusLocal: "STAND_BY", statusOperacional: "STAND_BY", status: "STAND_BY" });
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

const handleSeed = async () => {
  const now = new Date().toISOString();
  await createUserWithPin({
    id: "ADMIN",
    nome: "Administrador",
    role: "ADMIN",
    status: "ATIVO",
    pin: "1234"
  });
  await createUserWithPin({
    id: "OP001",
    nome: "Operador Exemplo",
    role: "OPERADOR",
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
      certificado: "CERT-2023-01",
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
      certificado: "",
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
  const funcao = normalizeFuncao(row.funcao || row.funcaoequipamento || row.tipo || row.funcaoequipamento);
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
    certificado: row.ndocertificado || row.numerocertificado || row.ncertificado,
    fabricante: row.fabricante,
    usuarioAtual: row.usuario,
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
  items.slice(0, 8).forEach((item) => {
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

const parseDelimited = (text, delimiter) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = mapHeaders(lines[0].split(delimiter));
  return lines.slice(1).map((line) => {
    const values = line.split(delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
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
  const rows = parseDelimited(text, ",");
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
    "certificado",
    "fabricante",
    "usuarioAtual",
    "localidadeCidadeUF",
    "dataEntregaUsuario",
    "statusLocal",
    "observacoes"
  ];
  const rows = equipamentos.map((equipamento) => headers.map((header) => String(equipamento[header] ?? "")).join(";"));
  const csv = [headers.join(";"), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
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
  const parts = [medicao.cidadeUF, medicao.enderecoTexto, medicao.rodovia, medicao.km].filter(Boolean);
  return parts.length ? parts.join(" • ") : "-";
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
    equipamento.certificado || equipamento.numeroCertificado || "-"
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
    return [
      medicao.obra_id || "-",
      medicao.relatorio_id || "-",
      medicao.equipamento_id || medicao.equip_id,
      medicao.user_id,
      medicao.tipoMedicao || medicao.tipo_medicao,
      medicao.media ?? medicao.valor ?? "-",
      quantidade,
      formatLocal(medicao),
      formatGps(medicao.gps),
      medicao.dataHora || medicao.data_hora
    ];
  });
  doc.autoTable({
    head: [["Obra", "Relatório", "Equip.", "Usuário", "Tipo", "Valor (Média)", "N Leituras", "Local", "GPS", "Data/Hora"]],
    body: medicaoRows,
    startY: cursorY + 10,
    styles: { fontSize: 8 }
  });

  doc.save(`auditoria-global-medlux-${now.toISOString().slice(0, 10)}.pdf`);
};

const buildObraPdf = async () => {
  const obraValue = normalizeText(obraFilter.value).toUpperCase();
  const relatorioValue = normalizeText(relatorioFilter.value).toUpperCase();
  if (!obraValue && !relatorioValue) {
    setStatusMessage("Informe uma obra ou ID de relatório para gerar o PDF.");
    return;
  }
  const filtradas = medicoes.filter((medicao) => {
    const matchObra = obraValue ? (medicao.obra_id || "").toUpperCase() === obraValue : true;
    const matchRelatorio = relatorioValue ? (medicao.relatorio_id || "").toUpperCase() === relatorioValue : true;
    return matchObra && matchRelatorio;
  });
  if (!filtradas.length) {
    setStatusMessage("Nenhuma medição encontrada para o filtro informado.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const now = new Date();
  doc.setFontSize(18);
  doc.text("Relatório por Obra MEDLUX", 40, 40);
  doc.setFontSize(11);
  doc.text(`Obra: ${obraValue || "-"}`, 40, 64);
  doc.text(`Relatório: ${relatorioValue || "-"}`, 40, 80);
  doc.text(`Gerado em: ${now.toLocaleString("pt-BR")}`, 40, 96);
  doc.text(`Responsável técnico: ${responsavelTecnico.value || activeSession?.nome || "-"}`, 40, 112);
  let currentY = 130;
  if (obraResumo.value) {
    doc.text("Resumo:", 40, currentY);
    doc.setFontSize(10);
    const resumoLines = doc.splitTextToSize(obraResumo.value, 520);
    doc.text(resumoLines, 40, currentY + 16);
    currentY += 16 + resumoLines.length * 12;
  }

  const primeiroGps = filtradas.find((item) => item.gps?.lat !== null && item.gps?.lng !== null);
  if (primeiroGps) {
    const link = `https://www.openstreetmap.org/?mlat=${primeiroGps.gps.lat}&mlon=${primeiroGps.gps.lng}#map=18/${primeiroGps.gps.lat}/${primeiroGps.gps.lng}`;
    doc.setFontSize(10);
    const linkY = currentY + 14;
    if (doc.textWithLink) {
      doc.textWithLink("Abrir mapa da obra", 40, linkY, { url: link });
    } else {
      doc.text(`Mapa: ${link}`, 40, linkY);
    }
    currentY = linkY + 16;
  }

  const resumoStart = currentY + 10;
  doc.setFontSize(12);
  doc.text("Resumo das medições", 40, resumoStart);
  const resumoRows = filtradas.map((medicao) => [
    medicao.equipamento_id || medicao.equip_id,
    medicao.tipoMedicao || medicao.tipo_medicao,
    medicao.media ?? medicao.valor ?? "-",
    (medicao.leituras || []).length || 1,
    formatLocal(medicao),
    medicao.dataHora || medicao.data_hora
  ]);
  doc.autoTable({
    head: [["Equip.", "Tipo", "Valor (Média)", "N Leituras", "Local", "Data/Hora"]],
    body: resumoRows,
    startY: resumoStart + 10,
    styles: { fontSize: 8 }
  });

  let cursorY = doc.lastAutoTable.finalY + 20;
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
  refreshSelectOptions();
};

const handleLogin = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm).entries());
  const result = await authenticate(normalizeId(data.user_id), data.pin);
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
