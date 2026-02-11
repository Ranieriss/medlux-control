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
  buildImportPreview,
  clearAllStores,
  getStoreCounts,
  getRecentErrors,
  DB_VERSION,
  getAllCriterios,
  saveAnexo,
  getAnexoById,
  getLatestLaudoByEquipamento,
  exportDiagnosticoCompleto
} from "./db.js";
import { ensureDefaultAdmin, authenticate, updatePin, createUserWithPin, logout, requireAuth, getSession } from "../shared/auth.js";
import { AUDIT_ACTIONS, buildDiff, logAudit } from "../shared/audit.js";
import { validateUser, validateEquipamento, validateVinculo } from "../shared/validation.js";
import { initGlobalErrorHandling, logError } from "../shared/errors.js";
import { getAppVersion, sanitizeText } from "../shared/utils.js";
import { computeMeasurementStats, evaluateMedicao, buildConformidadeResumo, computeLegendaStats } from "../shared/medicao-utils.js";
import { generateUserIndividualPdf } from "./reports/user-report.js";
import { ensurePdfLib, makePdfTableNoWrap } from "../shared/reports/pdf-lib.js";

// normalizarTexto precisa ficar no topo para evitar TDZ na avaliação do módulo.
const normalizarTexto = (value) => String(value || "").trim().replace(/\s+/g, " ");

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
const importPreview = document.getElementById("importPreview");
const verifyIntegrity = document.getElementById("verifyIntegrity");
const resetData = document.getElementById("resetData");
const bulkPaste = document.getElementById("bulkPaste");
const importBulk = document.getElementById("importBulk");
const generateGlobalPdf = document.getElementById("generateGlobalPdf");
const generateObraPdf = document.getElementById("generateObraPdf");
const generateUserPdf = document.getElementById("generateUserPdf");
const userReportObra = document.getElementById("userReportObra");
const obraList = document.getElementById("obraList");
const userReportStart = document.getElementById("userReportStart");
const userReportEnd = document.getElementById("userReportEnd");
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
const equipLaudoInput = document.getElementById("equipLaudo");
const equipLaudoStatus = document.getElementById("equipLaudoStatus");

const usuarioModal = document.getElementById("usuarioModal");
const usuarioTitle = document.getElementById("usuarioTitle");
const closeUsuario = document.getElementById("closeUsuario");
const cancelUsuario = document.getElementById("cancelUsuario");
const usuarioForm = document.getElementById("usuarioForm");
const usuarioHint = document.getElementById("usuarioHint");
const usuariosBody = document.getElementById("usuariosBody");
const newUsuario = document.getElementById("newUsuario");
const usuarioCpf = document.getElementById("usuarioCpf");

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
const vinculoCpf = document.getElementById("vinculoCpf");
const vinculoStatus = document.getElementById("vinculoStatus");
const vinculoObservacoes = document.getElementById("vinculoObservacoes");

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

const diagnosticoPanel = document.getElementById("diagnosticoPanel");
const diagnosticoVersion = document.getElementById("diagnosticoVersion");
const diagnosticoCounts = document.getElementById("diagnosticoCounts");
const diagnosticoErrors = document.getElementById("diagnosticoErrors");
const diagnosticoExport = document.getElementById("diagnosticoExport");

const formFields = {
  id: document.getElementById("equipId"),
  funcao: document.getElementById("equipFuncao"),
  geometria: document.getElementById("equipGeometria"),
  numeroSerie: document.getElementById("equipSerie"),
  modelo: document.getElementById("equipModelo"),
  dataAquisicao: document.getElementById("equipAquisicao"),
  fabricante: document.getElementById("equipFabricante"),
  certificado: document.getElementById("equipCertificado"),
  dataCalibracao: document.getElementById("equipDataCalibracao"),
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

const normalizeText = normalizarTexto;
const normalizeId = (value) => normalizeText(value).toUpperCase();
const normalizeUserId = (value) => normalizeText(value);
const normalizeUserIdComparable = (value) => normalizeText(value).toUpperCase();
const importDebugEnabled = window.location.hostname === "localhost" || window.localStorage.getItem("medlux:debugImport") === "1";

const debugImportLog = (...args) => {
  if (!importDebugEnabled) return;
  console.debug("[medlux-import]", ...args);
};

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

const parseCalibrationDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const raw = normalizeText(value);
  if (!raw) return null;

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(`${year}-${month}-${day}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    if (date.getDate() !== Number(day) || date.getMonth() + 1 !== Number(month) || date.getFullYear() !== Number(year)) return null;
    return date;
  }

  const isoDate = new Date(raw);
  return Number.isNaN(isoDate.getTime()) ? null : isoDate;
};

function calcDiasParaRecalibrar(equip) {
  const dateValue = [
    equip?.dataUltimaCalibracao,
    equip?.ultimaCalibracao,
    equip?.dataCalibracao,
    equip?.calibracao,
    equip?.calibracaoUltima,
    equip?.calibracaoData,
    equip?.lastCalibration
  ].find((value) => normalizeText(value) || value instanceof Date || typeof value === "number");

  const calibrationDate = parseCalibrationDate(dateValue);
  if (!calibrationDate) return { status: "sem-data" };

  const vencimento = new Date(calibrationDate);
  vencimento.setDate(vencimento.getDate() + 365);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diasRestantes = Math.ceil((vencimento.getTime() - Date.now()) / msPerDay);

  if (diasRestantes < 0) return { status: "vencido", diasRestantes };
  if (diasRestantes < 30) return { status: "warning", diasRestantes };
  return { status: "ok", diasRestantes };
}


const getCalibrationBadgeStatus = (equipamento) => {
  const recalibracao = calcDiasParaRecalibrar(equipamento);
  if (recalibracao.status === "vencido") return "danger";
  if (recalibracao.status === "warning") return "warning";
  return "";
};


const readPdfFile = async (file) => {
  if (!file) return null;
  if (file.type !== "application/pdf") throw new Error("Anexe um arquivo PDF válido.");
  const buffer = await file.arrayBuffer();
  return new Blob([buffer], { type: "application/pdf" });
};

const openPdfBlob = (blob) => {
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return true;
};

const getLaudoById = async (laudoId) => {
  if (!laudoId) return null;
  return getAnexoById(laudoId);
};

const saveLaudoEquipamento = async (equipamentoId, file) => {
  const blob = await readPdfFile(file);
  const id = crypto.randomUUID();
  await saveAnexo({
    id,
    tipo: "LAUDO_EQUIPAMENTO",
    equipamentoId,
    filename: file.name,
    mime: "application/pdf",
    size: file.size,
    createdAt: new Date().toISOString(),
    data: blob
  });
  return id;
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

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const formatCpf = (value) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

const isValidCpf = (value) => {
  const cpf = onlyDigits(value);
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

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return "-";
  return `${day}/${month}/${year}`;
};

const formatDateTimeLocal = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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
let editingVinculoId = null;
let obras = [];
let criterios = [];
let editingId = null;
let editingUserId = null;
let editingObraId = null;
let activeSession = null;
let sortState = { key: "id", direction: "asc" };
let currentPage = 1;
let currentLaudoMeta = null;

initGlobalErrorHandling("medlux-control");

const ensureLogin = async () => {
  await ensureDefaultAdmin();
  const authorized = requireAuth({
    allowRoles: ["ADMIN"],
    onMissing: () => openModal(loginModal),
    onUnauthorized: () => {
      logout();
      window.location.href = "../medlux-reflective-control/index.html";
    }
  });
  if (!authorized) return null;
  activeSession = getSession();
  return activeSession;
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
    certificadoNumero: normalizeText(data.certificado || data.certificadoNumero || data.numeroCertificado),
    numeroCertificado: normalizeText(data.certificado || data.certificadoNumero || data.numeroCertificado),
    laudoId: normalizeText(data.laudoId),
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
  if (!obra.rodovia) return "Rodovia obrigatória.";
  if (!obra.kmInicio) return "KM inicial obrigatório.";
  if (!obra.concessionariaCliente) return "Cliente obrigatório.";
  if (!obra.responsavelTecnico) return "Responsável técnico obrigatório.";
  return "";
};

const loadData = async () => {
  [equipamentos, usuarios, vinculos, medicoes, obras, criterios] = await Promise.all([
    getAllEquipamentos(),
    getAllUsuarios(),
    getAllVinculos(),
    getAllMedicoes(),
    getAllObras(),
    getAllCriterios()
  ]);
};

const loadInitialData = async () => {
  await loadData();
};

const safeRender = () => {
  try {
    renderAll();
  } catch (error) {
    console.error("Falha ao renderizar UI após import.", error);
  }
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
    const idCell = document.createElement("td");
    idCell.textContent = equipamento.id;
    const calibrationBadgeStatus = getCalibrationBadgeStatus(equipamento);
    if (calibrationBadgeStatus) {
      const badge = document.createElement("span");
      badge.className = calibrationBadgeStatus === "danger" ? "badge-danger" : "badge-warning";
      badge.textContent = calibrationBadgeStatus === "danger" ? "Calibração vencida" : "Recalibrar em breve";
      badge.style.marginLeft = "8px";
      idCell.appendChild(badge);
    }
    row.appendChild(idCell);

    [
      formatFuncao(equipamento.funcao),
      equipamento.modelo || "-",
      equipamento.numeroSerie || "-",
      null,
      equipamento.usuarioAtual || equipamento.usuarioResponsavel || "-",
      formatStatus(getEquipamentoStatus(equipamento)),
      getEquipamentoLocalidade(equipamento) || "-"
    ].forEach((text, index) => {

      const cell = document.createElement("td");
      if (index === 3) {
        const recalibracao = calcDiasParaRecalibrar(equipamento);
        cell.className = "recalibracao-cell";
        if (recalibracao.status === "sem-data") {
          cell.textContent = "—";
        } else if (recalibracao.status === "vencido") {
          const badge = document.createElement("span");
          badge.className = "badge-danger";
          badge.textContent = "VENCIDO";
          cell.appendChild(badge);
        } else if (recalibracao.status === "warning") {
          const badge = document.createElement("span");
          badge.className = "badge-warning";
          badge.textContent = `${recalibracao.diasRestantes} dias`;
          cell.appendChild(badge);
        } else {
          cell.textContent = String(recalibracao.diasRestantes);
        }
      } else {
        cell.textContent = text;
      }
      row.appendChild(cell);
    });

    const laudoCell = document.createElement("td");
    const laudoBtn = document.createElement("button");
    laudoBtn.className = "btn secondary";
    laudoBtn.type = "button";
    laudoBtn.textContent = "Ver laudo";
    laudoBtn.disabled = true;
    getLatestLaudoByEquipamento(equipamento.id).then((laudo) => {
      if (!laudo?.blob) return;
      laudoBtn.disabled = false;
      laudoBtn.title = laudo.filename || "Laudo";
      laudoBtn.addEventListener("click", () => {
        const url = URL.createObjectURL(laudo.blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      });
    });
    laudoCell.appendChild(laudoBtn);
    row.appendChild(laudoCell);

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
    const vinculoId = vinculo.vinculo_id || vinculo.id;
    const equipamentoId = vinculo.equipamento_id || vinculo.equip_id;
    const equipamento = equipamentos.find((item) => item.id === equipamentoId);
    const usuario = usuarios.find((item) => normalizeUserIdComparable(item.user_id || item.id) === normalizeUserIdComparable(vinculo.user_id));
    const statusLabel = vinculo.status === "ATIVO" || vinculo.ativo ? "Ativo" : "Encerrado";

    [
      `${equipamentoId}${equipamento?.modelo ? ` • ${equipamento.modelo}` : ""}`,
      `${vinculo.user_id}${usuario?.nome ? ` • ${usuario.nome}` : ""}`,
      formatDate(vinculo.inicio || vinculo.data_inicio),
      statusLabel
    ].forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    });

    const termoCell = document.createElement("td");
    if (vinculo.termo_pdf || vinculo.termo_cautela_pdf) {
      const termoLink = document.createElement("a");
      termoLink.href = "#";
      termoLink.className = "termo-link";
      termoLink.textContent = "Arquivo anexado";
      termoLink.addEventListener("click", async (event) => {
        event.preventDefault();
        await openTermoAnexado(vinculoId);
      });
      termoCell.appendChild(termoLink);
    } else {
      termoCell.textContent = "-";
    }
    row.appendChild(termoCell);
    const actions = document.createElement("td");
    if (vinculo.status === "ATIVO" || vinculo.ativo) {
      const endButton = document.createElement("button");
      endButton.className = "btn secondary";
      endButton.type = "button";
      endButton.textContent = "Encerrar";
      endButton.addEventListener("click", () => handleEncerrarVinculo(vinculoId));
      actions.appendChild(endButton);
    } else {
      actions.textContent = "-";
    }
    row.appendChild(actions);

    const editCell = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.className = "btn secondary";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => openVinculoModal(vinculoId));
    editCell.appendChild(editButton);
    row.appendChild(editCell);

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

  if (obraList) {
    obraList.textContent = "";
    obras.forEach((obra) => {
      const option = document.createElement("option");
      const obraId = (obra.idObra || obra.id || "").toString().trim().toUpperCase();
      if (!obraId) return;
      option.value = obraId;
      option.label = `${obraId} • ${obra.nomeObra || obra.nome || ""}`;
      obraList.appendChild(option);
    });
  }
};

const handleDelete = async (id) => {
  const confirmed = window.confirm(`Excluir equipamento ${id}?`);
  if (!confirmed) return;
  const existing = equipamentos.find((item) => item.id === id);
  await deleteEquipamento(id);
  await logAudit({
    action: AUDIT_ACTIONS.ENTITY_DELETED,
    entity_type: "equipamentos",
    entity_id: id,
    actor_user_id: activeSession?.user_id || null,
    summary: `Equipamento ${id} removido.`,
    diff: buildDiff(existing, null, ["id", "statusLocal", "funcao", "modelo", "numeroSerie"])
  });
  await loadData();
  renderAll();
  setStatusMessage(`Equipamento ${id} removido.`);
};

const renderLaudoStatus = (meta) => {
  currentLaudoMeta = meta ? { ...meta } : null;
  if (!equipLaudoStatus) return;
  equipLaudoStatus.textContent = "";
  if (!currentLaudoMeta?.id && !currentLaudoMeta?.blob) {
    equipLaudoStatus.textContent = "Nenhum laudo anexado.";
    return;
  }
  const label = document.createElement("span");
  label.textContent = "Arquivo anexado: ";
  const link = document.createElement("button");
  link.type = "button";
  link.className = "laudo-link";
  link.textContent = currentLaudoMeta.filename || "Visualizar PDF";
  link.addEventListener("click", async () => {
    if (currentLaudoMeta?.blob) {
      openPdfBlob(currentLaudoMeta.blob);
      return;
    }
    const laudo = await getLaudoById(currentLaudoMeta.id);
    if (!laudo?.blob) {
      setStatusMessage("Sem laudo anexado");
      return;
    }
    openPdfBlob(laudo.blob);
  });
  equipLaudoStatus.append(label, link);
};

const openLaudoIfExists = async (laudoMeta) => {
  if (laudoMeta?.blob) return openPdfBlob(laudoMeta.blob);
  if (!laudoMeta?.id) {
    setStatusMessage("Sem laudo anexado");
    return false;
  }
  const laudo = await getLaudoById(laudoMeta.id);
  if (!laudo?.blob) {
    setStatusMessage("Sem laudo anexado");
    return false;
  }
  return openPdfBlob(laudo.blob);
};

const openEditModal = async (id) => {
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
  formFields.certificado.value = equipamento.certificadoNumero || equipamento.certificado || equipamento.numeroCertificado || "";
  formFields.dataCalibracao.value = equipamento.dataCalibracao || "";
  formFields.statusLocal.value = equipamento.statusLocal || equipamento.statusOperacional || equipamento.status || "STAND_BY";
  formFields.calibrado.value = equipamento.calibrado || "";
  formFields.usuarioAtual.value = vinculoAtivo?.user_id || equipamento.usuarioAtual || equipamento.usuarioResponsavel || "";
  formFields.usuarioAtual.disabled = false;
  formFields.usuarioAtual.readOnly = true;
  formFields.localidadeCidadeUF.value = equipamento.localidadeCidadeUF || equipamento.localidade || "";
  formFields.dataEntregaUsuario.value = equipamento.dataEntregaUsuario || "";
  formFields.observacoes.value = equipamento.observacoes || "";
  formHint.textContent = "Campos com * são obrigatórios.";
  if (equipLaudoInput) equipLaudoInput.value = "";
  const laudoId = equipamento.laudoId || "";
  if (laudoId) {
    const laudo = await getLaudoById(laudoId);
    renderLaudoStatus(laudo ? { id: laudo.id, filename: laudo.filename } : null);
  } else {
    renderLaudoStatus(null);
  }
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
  if (equipLaudoInput) equipLaudoInput.value = "";
  if (formFields.dataCalibracao) formFields.dataCalibracao.value = "";
  renderLaudoStatus(null);
  updateGeometriaState();
  openModal(modal);
};

const handleFormSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const resolvedId = data.id || editingId || "";
  const normalized = normalizeEquipamento({ ...data, id: resolvedId });
  const validation = validateEquipamento(normalized);
  if (!validation.ok) {
    formHint.textContent = validation.errors.map((item) => item.message).join(" ");
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
  const laudoFile = equipLaudoInput?.files?.[0] || null;
  let laudoId = existing?.laudoId || "";
  if (laudoFile) {
    try {
      laudoId = await saveLaudoEquipamento(normalized.id, laudoFile);
    } catch (error) {
      formHint.textContent = error.message || "Falha ao anexar PDF.";
      return;
    }
  }
  await saveEquipamento({
    ...normalized,
    laudoId,
    created_at: existing?.created_at || now,
    updated_at: now
  });
  await logAudit({
    action: editingId ? AUDIT_ACTIONS.ENTITY_UPDATED : AUDIT_ACTIONS.ENTITY_CREATED,
    entity_type: "equipamentos",
    entity_id: normalized.id,
    actor_user_id: activeSession?.user_id || null,
    summary: editingId ? `Equipamento ${normalized.id} atualizado.` : `Equipamento ${normalized.id} criado.`,
    diff: buildDiff(existing, normalized, ["id", "statusLocal", "funcao", "modelo", "numeroSerie"])
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
  const cpfDigits = onlyDigits(data.cpf || "");
  const validation = validateUser({ ...data, id: userId, user_id: userId });
  if (!validation.ok) {
    usuarioHint.textContent = validation.errors.map((item) => item.message).join(" ");
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
  if (!existing && !cpfDigits) {
    usuarioHint.textContent = "CPF obrigatório para novo usuário.";
    return;
  }
  if (cpfDigits && !isValidCpf(cpfDigits)) {
    usuarioHint.textContent = "CPF inválido. Informe um CPF válido com 11 dígitos.";
    return;
  }
  const status = data.ativo === "false" ? "INATIVO" : "ATIVO";
  const updated = {
    ...existing,
    user_id: userId,
    id: userId,
    nome: normalizeText(data.nome),
    role: data.role,
    cpf: cpfDigits || (existing?.cpf || ""),
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
  await logAudit({
    action: existing ? AUDIT_ACTIONS.ENTITY_UPDATED : AUDIT_ACTIONS.ENTITY_CREATED,
    entity_type: "users",
    entity_id: userId,
    actor_user_id: activeSession?.user_id || null,
    summary: existing ? `Usuário ${userId} atualizado.` : `Usuário ${userId} criado.`,
    diff: buildDiff(existing, updated, ["id", "role", "status", "nome"])
  });
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
    usuarioCpf.required = true;
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
  usuarioCpf.required = false;
  usuarioForm.querySelector("#usuarioNome").value = usuario.nome;
  usuarioForm.querySelector("#usuarioRole").value = usuario.role;
  usuarioForm.querySelector("#usuarioCpf").value = formatCpf(usuario.cpf || "");
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
  const existing = usuarios.find((item) => normalizeUserIdComparable(item.user_id || item.id) === normalizeUserIdComparable(userId));
  await deleteUsuario(userId);
  await logAudit({
    action: AUDIT_ACTIONS.ENTITY_DELETED,
    entity_type: "users",
    entity_id: userId,
    actor_user_id: activeSession?.user_id || null,
    summary: `Usuário ${userId} removido.`,
    diff: buildDiff(existing, null, ["id", "role", "status", "nome"])
  });
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

const dataUrlToBlob = (dataUrl) => {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  const [meta, content] = dataUrl.split(",");
  if (!meta || !content) return null;
  const mimeMatch = meta.match(/^data:(.*?);base64$/);
  const mimeType = mimeMatch?.[1] || "application/pdf";
  const binary = atob(content);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
};

const buildTermoBlob = (vinculo = {}) => {
  const termo = vinculo.termo_pdf || vinculo.termo_cautela_pdf;
  if (!termo) return null;
  if (termo instanceof Blob) return termo;
  if (typeof termo === "string") {
    if (termo.startsWith("data:")) return dataUrlToBlob(termo);
    return new Blob([termo], { type: "application/pdf" });
  }
  if (termo?.buffer) {
    return new Blob([termo], { type: termo.type || "application/pdf" });
  }
  if (termo?.content && termo?.mimeType) {
    if (typeof termo.content === "string" && termo.content.startsWith("data:")) return dataUrlToBlob(termo.content);
    if (typeof termo.content === "string") {
      const binary = atob(termo.content);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      return new Blob([bytes], { type: termo.mimeType });
    }
  }
  return null;
};

const openTermoAnexado = async (vinculoId) => {
  const vinculo = vinculos.find((item) => item.id === vinculoId || item.vinculo_id === vinculoId);
  if (!vinculo) {
    vinculoHint.textContent = "Vínculo não encontrado.";
    return;
  }
  const termoBlob = buildTermoBlob(vinculo);
  if (!termoBlob) {
    setStatusMessage("Nenhum arquivo anexado");
    return;
  }
  const objectUrl = URL.createObjectURL(termoBlob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 3 * 60 * 1000);
};

const handleVinculoSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(vinculoForm).entries());
  const cpfUsuario = onlyDigits(data.cpf_usuario || "");
  const observacoes = String(data.observacoes || "").trim().slice(0, 500);

  const validation = validateVinculo({
    equipamento_id: data.equip_id,
    equip_id: data.equip_id,
    user_id: data.user_id,
    inicio: data.data_inicio,
    data_inicio: data.data_inicio
  });
  if (!validation.ok) {
    vinculoHint.textContent = validation.errors.map((item) => item.message).join(" ");
    return;
  }

  const selectedUser = usuarios.find((item) => normalizeUserIdComparable(item.user_id || item.id) === normalizeUserIdComparable(data.user_id));
  const isNovoUsuario = !selectedUser;
  if (isNovoUsuario && !cpfUsuario) {
    vinculoHint.textContent = "CPF do usuário é obrigatório para novo usuário.";
    return;
  }
  if (cpfUsuario && !isValidCpf(cpfUsuario)) {
    vinculoHint.textContent = "CPF inválido. Informe um CPF válido com 11 dígitos.";
    return;
  }

  const termoFile = vinculoTermo.files[0];
  const now = new Date().toISOString();
  const parsedInicio = parseDateString(data.data_inicio).value;
  const normalizedStatus = String(data.status || "ATIVO").toUpperCase() === "ENCERRADO" ? "ENCERRADO" : "ATIVO";
  const existing = editingVinculoId
    ? vinculos.find((item) => item.id === editingVinculoId || item.vinculo_id === editingVinculoId)
    : null;
  const termo = termoFile
    ? await fileToBase64(termoFile)
    : existing?.termo_pdf || existing?.termo_cautela_pdf || "";
  const vinculoId = editingVinculoId || crypto.randomUUID();
  const vinculo = {
    id: vinculoId,
    vinculo_id: vinculoId,
    equipamento_id: data.equip_id,
    equip_id: data.equip_id,
    user_id: data.user_id,
    inicio: parsedInicio,
    data_inicio: parsedInicio,
    fim: normalizedStatus === "ENCERRADO" ? (existing?.fim || existing?.data_fim || now) : null,
    data_fim: normalizedStatus === "ENCERRADO" ? (existing?.fim || existing?.data_fim || now) : null,
    status: normalizedStatus,
    ativo: normalizedStatus === "ATIVO",
    termo_pdf: termo,
    termo_cautela_pdf: termo,
    cpfUsuario,
    observacoes,
    created_at: existing?.created_at || now,
    updated_at: now
  };

  await saveVinculo(vinculo);
  await logAudit({
    action: editingVinculoId ? AUDIT_ACTIONS.ENTITY_UPDATED : AUDIT_ACTIONS.ENTITY_CREATED,
    entity_type: "vinculos",
    entity_id: vinculoId,
    actor_user_id: activeSession?.user_id || null,
    summary: editingVinculoId
      ? `Vínculo ${vinculoId} atualizado.`
      : `Vínculo criado para equipamento ${data.equip_id}.`,
    diff: buildDiff(existing || null, vinculo, ["id", "equipamento_id", "user_id", "status", "inicio", "cpfUsuario", "observacoes"])
  });

  const equipamento = equipamentos.find((item) => item.id === data.equip_id);
  if (equipamento && (vinculo.status === "ATIVO" || vinculo.ativo)) {
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
  setStatusMessage(editingVinculoId ? "Vínculo atualizado." : "Vínculo cadastrado.");
};

const handleEncerrarVinculo = async (vinculoId) => {
  const confirmed = window.confirm("Encerrar vínculo? O equipamento volta para Stand-by.");
  if (!confirmed) return;
  const existing = vinculos.find((item) => item.id === vinculoId || item.vinculo_id === vinculoId);
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
  await logAudit({
    action: AUDIT_ACTIONS.ENTITY_UPDATED,
    entity_type: "vinculos",
    entity_id: vinculoId,
    actor_user_id: activeSession?.user_id || null,
    summary: `Vínculo ${vinculoId} encerrado.`,
    diff: buildDiff(existing, encerrado, ["id", "equipamento_id", "user_id", "status", "fim"])
  });
};

const openVinculoModal = (vinculoId = "") => {
  vinculoForm.reset();
  refreshSelectOptions();
  vinculoHint.textContent = "Campos com * são obrigatórios.";
  editingVinculoId = null;

  if (!vinculoId) {
    vinculoTitle.textContent = "Novo vínculo";
    vinculoCpf.required = false;
    vinculoStatus.value = "ATIVO";
    openModal(vinculoModal);
    return;
  }

  const vinculo = vinculos.find((item) => item.id === vinculoId || item.vinculo_id === vinculoId);
  if (!vinculo) return;

  editingVinculoId = vinculo.id || vinculo.vinculo_id;
  vinculoTitle.textContent = `Editar vínculo ${editingVinculoId}`;
  vinculoEquip.value = vinculo.equipamento_id || vinculo.equip_id || "";
  vinculoUser.value = vinculo.user_id || "";
  vinculoForm.querySelector("#vinculoInicio").value = toISODate(vinculo.inicio || vinculo.data_inicio);
  vinculoStatus.value = vinculo.status === "ENCERRADO" || vinculo.ativo === false ? "ENCERRADO" : "ATIVO";
  vinculoCpf.value = formatCpf(vinculo.cpfUsuario || "");
  vinculoObservacoes.value = String(vinculo.observacoes || "");
  vinculoCpf.required = false;
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
  const existing = obras.find((item) => item.id === normalized.id);
  await saveObra({
    ...normalized,
    created_at: existing?.created_at || now,
    updated_at: now
  });
  await logAudit({
    action: existing ? AUDIT_ACTIONS.ENTITY_UPDATED : AUDIT_ACTIONS.ENTITY_CREATED,
    entity_type: "obras",
    entity_id: normalized.id,
    actor_user_id: activeSession?.user_id || null,
    summary: existing ? `Obra ${normalized.id} atualizada.` : `Obra ${normalized.id} criada.`,
    diff: buildDiff(existing, normalized, ["id", "nomeObra", "cidadeUF"])
  });
  await loadData();
  renderAll();
  closeModalElement(obraModal);
  setStatusMessage(editingObraId ? "Obra atualizada." : "Obra cadastrada.");
};

const handleDeleteObra = async (obraId) => {
  const confirmed = window.confirm(`Excluir obra ${obraId}?`);
  if (!confirmed) return;
  const existing = obras.find((item) => item.id === obraId || item.idObra === obraId);
  await deleteObra(obraId);
  await logAudit({
    action: AUDIT_ACTIONS.ENTITY_DELETED,
    entity_type: "obras",
    entity_id: obraId,
    actor_user_id: activeSession?.user_id || null,
    summary: `Obra ${obraId} removida.`,
    diff: buildDiff(existing, null, ["id", "nomeObra", "cidadeUF"])
  });
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
  const payload = await exportSnapshot({ appVersion: getAppVersion() });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `medlux-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  await logAudit({
    action: AUDIT_ACTIONS.EXPORT_JSON,
    entity_type: "backup",
    entity_id: "export",
    actor_user_id: activeSession?.user_id || null,
    summary: "Exportação JSON concluída."
  });
};

const renderImportPreview = (preview) => {
  if (!importPreview) return;
  const parts = [
    `Equipamentos: ${preview.equipamentos.total_incoming} (${preview.equipamentos.created} novos / ${preview.equipamentos.updated} atualizados)`,
    `Usuários: ${preview.users.total_incoming} (${preview.users.created} novos / ${preview.users.updated} atualizados)`,
    `Vínculos: ${preview.vinculos.total_incoming} (${preview.vinculos.created} novos / ${preview.vinculos.updated} atualizados)`,
    `Medições: ${preview.medicoes.total_incoming} (${preview.medicoes.created} novos / ${preview.medicoes.updated} atualizados)`,
    `Obras: ${preview.obras.total_incoming} (${preview.obras.created} novas / ${preview.obras.updated} atualizadas)`,
    `Auditoria: ${preview.audit_log.total_incoming} (${preview.audit_log.created} novos / ${preview.audit_log.updated} atualizados)`
  ];
  const warningText = preview.warnings?.length ? ` • Avisos: ${preview.warnings.length}` : "";
  importPreview.textContent = `Prévia: ${parts.join(" • ")}${warningText}`;
};

const getImportTotals = (preview) => {
  const sections = ["equipamentos", "users", "vinculos", "medicoes", "obras", "audit_log", "criterios"];
  return sections.reduce(
    (acc, key) => {
      const bucket = preview?.[key] || {};
      acc.created += bucket.created || 0;
      acc.updated += bucket.updated || 0;
      acc.total += bucket.total_incoming || 0;
      return acc;
    },
    { created: 0, updated: 0, total: 0 }
  );
};

const runIntegrityChecks = async () => {
  const counts = await getStoreCounts();
  const issues = [];
  if (!counts.equipamentos) issues.push("Nenhum equipamento cadastrado.");
  if (!counts.users) issues.push("Nenhum usuário cadastrado.");
  if (!counts.vinculos) issues.push("Nenhum vínculo cadastrado.");
  const summary = issues.length
    ? `Integridade: ${issues.length} alerta(s) (${issues.join(" ")})`
    : "Integridade: OK. Stores essenciais com dados.";
  setStatusMessage(summary);
  alert(summary);
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
    alert("Não foi possível importar: JSON inválido.");
    console.error("Falha ao fazer parse do backup JSON.", error);
    await logError({ module: "medlux-control", action: "IMPORT_JSON_PARSE", message: error.message, stack: error.stack });
    return;
  }

  debugImportLog("Arquivo de backup carregado", { filename: file.name, size: file.size });

  let preview;
  try {
    preview = await buildImportPreview(payload);
    debugImportLog("Prévia de importação", preview);
    renderImportPreview(preview);
  } catch (error) {
    const message = error?.message || "Falha ao gerar prévia do import.";
    setStatusMessage(message);
    alert(message);
    console.error("Erro na prévia do backup.", error);
    await logError({ module: "medlux-control", action: "IMPORT_PREVIEW", message: error.message, stack: error.stack });
    return;
  }
  const mode = document.querySelector("input[name='importMode']:checked")?.value || "merge";
  if (mode === "replace") {
    await clearAllStores();
  }
  let result;
  try {
    result = await importSnapshot(payload);
    debugImportLog("Resultado da importação", result);
  } catch (error) {
    const message = error?.message || "Falha ao importar backup.";
    setStatusMessage(message);
    alert(message);
    console.error("Falha ao importar backup JSON.", error);
    await logError({ module: "medlux-control", action: "IMPORT_JSON", message: error.message, stack: error.stack });
    return;
  }
  const totals = getImportTotals(result?.preview || preview);
  await logAudit({
    action: AUDIT_ACTIONS.IMPORT_SNAPSHOT || "IMPORT_SNAPSHOT",
    entity_type: "backup",
    entity_id: "import",
    actor_user_id: activeSession?.user_id || null,
    summary: `Importação JSON (${mode === "replace" ? "substituir" : "mesclar"}) concluída. ${totals.total} registros processados.`,
    context: { mode, totals, warnings: result?.warnings || [] }
  });
  if ((result?.warnings || []).length) {
    await logError({
      module: "medlux-control",
      action: "IMPORT_JSON_WARNING",
      message: `Importação com ${result.warnings.length} aviso(s).`,
      context: { warnings: result.warnings.slice(0, 20) }
    });
  }
  await loadInitialData();
  safeRender();
  const okMessage = `Importação concluída: ${totals.total} registros (${totals.created} novos / ${totals.updated} atualizados).`;
  setStatusMessage(okMessage);
  alert(okMessage);
};

const mapHeaders = (headers) => headers.map((header) => normalizeText(header)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, ""));

const REQUIRED_EQUIP_HEADERS = ["id", "funcao", "modelo"];

const validateImportHeaders = (headers = []) => {
  const missing = REQUIRED_EQUIP_HEADERS.filter((field) => !headers.includes(field));
  if (missing.length) {
    return `Cabeçalhos ausentes: ${missing.join(", ")}.`;
  }
  return "";
};

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
  const validation = validateEquipamento(equipamento);
  if (!validation.ok) errors.push(...validation.errors.map((item) => item.message));
  return { equipamento, errors, rowIndex };
};

const summarizeImportErrors = (invalidRows) => invalidRows
  .slice(0, 3)
  .map((item) => `Linha ${item.rowIndex}: ${item.errors.join(", ")}`)
  .join(" | ");

const parseXlsx = async () => {
  if (!importXlsxFile.files.length) return { rows: [], headerError: "" };
  const file = importXlsxFile.files[0];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
  const [headerRow, ...rows] = raw;
  if (!headerRow) return { rows: [], headerError: "Planilha sem cabeçalho." };
  const headers = mapHeaders(headerRow);
  const headerError = validateImportHeaders(headers);
  const mapped = rows
    .filter((row) => row.some((cell) => String(cell || "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  return { rows: mapped, headerError };
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
  const { rows, headerError } = await parseXlsx();
  if (headerError) {
    setStatusMessage(headerError);
    return;
  }
  const mapped = rows.map((row, index) => buildEquipamentoFromRow(row, index + 2));
  const invalid = mapped.filter((item) => item.errors.length);
  if (invalid.length) {
    const details = summarizeImportErrors(invalid);
    setStatusMessage(`Pré-visualização com ${invalid.length} linha(s) inválida(s). ${details}`);
  }
  buildPreview(mapped.map((item) => item.equipamento));
};

const handleImportXlsx = async () => {
  const { rows, headerError } = await parseXlsx();
  if (headerError) {
    setStatusMessage(headerError);
    return;
  }
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
  await logAudit({
    action: AUDIT_ACTIONS.IMPORT_XLSX,
    entity_type: "equipamentos",
    entity_id: "xlsx",
    actor_user_id: activeSession?.user_id || null,
    summary: `Importação XLSX (${mode === "replace" ? "substituir" : "mesclar"}).`
  });
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
  if (!rows.length) {
    setStatusMessage("Nenhum dado encontrado na importação em lote.");
    return;
  }
  const headerError = validateImportHeaders(Object.keys(rows[0] || {}));
  if (headerError) {
    setStatusMessage(headerError);
    return;
  }
  const mapped = rows.map((row, index) => buildEquipamentoFromRow(row, index + 2));
  const invalid = mapped.filter((item) => item.errors.length);
  if (invalid.length) {
    const details = summarizeImportErrors(invalid);
    setStatusMessage(`Existem ${invalid.length} linha(s) inválida(s) na importação em lote. ${details}`);
    return;
  }
  await bulkSaveEquipamentos(mapped.map((item) => item.equipamento));
  await logAudit({
    action: AUDIT_ACTIONS.IMPORT_CSV,
    entity_type: "equipamentos",
    entity_id: "bulk",
    actor_user_id: activeSession?.user_id || null,
    summary: "Importação em lote concluída."
  });
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
  const headerError = validateImportHeaders(headers);
  if (headerError) {
    setStatusMessage(headerError);
    return;
  }
  const rows = csvRows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  const mapped = rows.map((row, index) => buildEquipamentoFromRow(row, index + 2));
  const invalid = mapped.filter((item) => item.errors.length);
  if (invalid.length) {
    const details = summarizeImportErrors(invalid);
    setStatusMessage(`Existem ${invalid.length} linha(s) inválida(s) no CSV. ${details}`);
    return;
  }
  await bulkSaveEquipamentos(mapped.map((item) => item.equipamento));
  await logAudit({
    action: AUDIT_ACTIONS.IMPORT_CSV,
    entity_type: "equipamentos",
    entity_id: "csv",
    actor_user_id: activeSession?.user_id || null,
    summary: "Importação CSV concluída."
  });
  await loadData();
  renderAll();
  setStatusMessage("CSV importado.");
};

const handleExportCsv = async () => {
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
  await logAudit({
    action: AUDIT_ACTIONS.EXPORT_CSV,
    entity_type: "equipamentos",
    entity_id: "csv",
    actor_user_id: activeSession?.user_id || null,
    summary: "Exportação CSV concluída."
  });
};

const handleReset = async () => {
  const confirmed = window.confirm("Deseja remover todos os dados locais?");
  if (!confirmed) return;
  await clearAllStores();
  await logAudit({
    action: AUDIT_ACTIONS.ENTITY_DELETED,
    entity_type: "system",
    entity_id: "reset",
    actor_user_id: activeSession?.user_id || null,
    summary: "Reset do IndexedDB executado."
  });
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

const calculateMedia = (medicao) => computeMeasurementStats(medicao).media;


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

const toSafeText = (value) => sanitizeText(value ?? "-");
const resolveUserName = (userId) => {
  const normalized = normalizeUserIdComparable(userId || "");
  if (!normalized) return "-";
  const user = usuarios.find((item) => normalizeUserIdComparable(item.id || item.user_id) === normalized);
  return user?.nome || userId || "-";
};

const buildGlobalPdf = async () => {
  await ensurePdfLib();
  const { jsPDF } = window.jspdf;
  let doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const now = new Date();
  const title = "Relatório Global MEDLUX";
  doc.setFontSize(16);
  doc.text(toSafeText(title), 40, 40);
  doc.setFontSize(10);
  doc.text(toSafeText(`Gerado em: ${now.toLocaleString("pt-BR")}`), 40, 58);
  doc.text(
    toSafeText(`Auditor: ${activeSession?.nome || "-"} (${activeSession?.id || activeSession?.user_id || "-"})`),
    40,
    72
  );

  const equipamentoRows = equipamentos.map((equipamento) => [
    toSafeText(equipamento.id),
    toSafeText(formatFuncao(equipamento.funcao)),
    toSafeText(equipamento.geometria || "-"),
    toSafeText(equipamento.modelo || "-"),
    toSafeText(equipamento.numeroSerie || "-"),
    toSafeText(equipamento.fabricante || "-"),
    toSafeText(equipamento.usuarioAtual || equipamento.usuarioResponsavel || "-"),
    toSafeText(getEquipamentoLocalidade(equipamento) || "-"),
    toSafeText(formatStatus(getEquipamentoStatus(equipamento))),
    toSafeText(equipamento.calibrado || "-"),
    toSafeText(equipamento.numeroCertificado || equipamento.certificado || "-")
  ]);

  doc = makePdfTableNoWrap({
    jsPDF,
    doc,
    startY: 90,
    head: [["ID", "Função", "Geom.", "Modelo", "Série", "Fabric.", "Usuário", "Localidade", "Status", "Calib.", "Cert."]],
    body: equipamentoRows,
    columnWidths: [58, 58, 44, 68, 58, 62, 90, 120, 52, 52, 76]
  });

  let cursorY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text(toSafeText("Histórico de vínculos"), 40, cursorY);
  const vinculoRows = vinculos.map((vinculo) => [
    toSafeText(vinculo.equipamento_id || vinculo.equip_id),
    toSafeText(`${resolveUserName(vinculo.user_id)} (${vinculo.user_id || "-"})`),
    toSafeText(formatDateTimeLocal(vinculo.inicio || vinculo.data_inicio)),
    toSafeText(vinculo.fim || vinculo.data_fim ? formatDateTimeLocal(vinculo.fim || vinculo.data_fim) : "Ativo"),
    toSafeText(vinculo.termo_pdf || vinculo.termo_cautela_pdf ? "Sim" : "Não")
  ]);
  doc = makePdfTableNoWrap({
    jsPDF,
    doc,
    startY: cursorY + 18,
    head: [["Equipamento", "Usuário", "Início", "Fim", "Termo"]],
    body: vinculoRows,
    columnWidths: [90, 180, 110, 110, 52]
  });

  cursorY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(12);
  doc.text(toSafeText("Histórico de medições"), 40, cursorY);
const avaliacoes = medicoes.map((medicao) => {
  const equipamento =
    equipamentos.find((item) => item.id === (medicao.equipamento_id || medicao.equip_id)) || null;
  const obra =
    obras.find((item) => (item.idObra || item.id) === medicao.obra_id) || null;

  return evaluateMedicao({ medicao, criterios, obra, equipamento });
});

const resumoConformidade = buildConformidadeResumo(avaliacoes);

doc.setFontSize(10);
doc.text(
  toSafeText(
    `Resumo executivo: Total ${resumoConformidade.total} | ` +
    `Conformes ${resumoConformidade.conformes} | ` +
    `Não conformes ${resumoConformidade.naoConformes} | ` +
    `Não avaliadas ${resumoConformidade.naoAvaliadas} | ` +
    `% conformidade ${resumoConformidade.pctConformidade.toFixed(2)}%`
  ),
  40,
  cursorY + 14
);

const medicaoRows = medicoes.map((medicao, index) => {
  const avaliacao = avaliacoes[index];
  const quantidade = avaliacao.quantidadeLeituras || 0;
  const subtipo = medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao;

  return [
    index + 1,
    toSafeText(formatDateTimeLocal(medicao.dataHora || medicao.data_hora || medicao.created_at)),
    toSafeText(subtipo),
    toSafeText(medicao.tipoMedicao || medicao.tipo_medicao || "-"),
    toSafeText(medicao.tipoDeMarcacao || "-"),
    toSafeText(avaliacao.periodo || "-"),
    quantidade,
    toSafeText(avaliacao.media === null ? "-" : avaliacao.media.toFixed(2)),
    toSafeText(avaliacao.minimo === null ? "-" : avaliacao.minimo),
    toSafeText(avaliacao.status),
    toSafeText(`${resolveUserName(medicao.user_id)} (${medicao.user_id || "-"})`),
    toSafeText(medicao.obra_id || "-"),
    toSafeText(`${medicao.rodovia || "-"} / ${medicao.km || "-"}`),
    toSafeText(medicao.cidadeUF || "-")
  ];
});

doc = makePdfTableNoWrap({
  jsPDF,
  doc,
  head: [[
    "Nº",
    "Data/Hora",
    "Subtipo",
    "Classe/Tipo",
    "Elemento/Marcação",
    "Período",
    "Qtd",
    "MÉDIA",
    "Mínimo",
    "Status",
    "Operador",
    "Obra",
    "Rodovia/KM",
    "Cidade/UF"
  ]],
  body: medicaoRows,
  startY: cursorY + 24,
  columnWidths: [24, 82, 48, 50, 64, 42, 28, 44, 46, 54, 100, 58, 86, 72],
  styles: { fontSize: 8, cellPadding: 2 }
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
  await logAudit({
    action: AUDIT_ACTIONS.PDF_GENERATED,
    entity_type: "relatorios",
    entity_id: "global",
    actor_user_id: activeSession?.user_id || null,
    summary: "PDF global gerado."
  });
};

const buildObraPdf = async () => {
  await ensurePdfLib();
  const obraValue = normalizeText(obraFilter.value).toUpperCase();
  const relatorioValue = normalizeText(relatorioFilter.value).toUpperCase();
  const faixaValue = normalizeText(faixaFilter.value).toUpperCase();
  const linhaValue = normalizeText(linhaFilter.value).toUpperCase();
  const estacaoValue = normalizeText(estacaoFilter.value).toUpperCase();
  if (!obraValue && !relatorioValue) {
    setStatusMessage("Informe uma obra ou ID de relatório para gerar o PDF.");
    return;
  }
  if (userReportStart?.value && userReportEnd?.value && new Date(userReportEnd.value) < new Date(userReportStart.value)) {
    setStatusMessage("Período inválido: data final deve ser maior ou igual à data inicial.");
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
  if (obraValue && !obra) {
    setStatusMessage("Obra informada não encontrada para geração do relatório.");
    return;
  }
  const identificador = relatorioValue || filtradas[0].identificadorRelatorio || filtradas[0].relatorio_id || "-";
  const datas = filtradas.map((item) => new Date(item.dataHora || item.data_hora)).filter((d) => !Number.isNaN(d.getTime()));
  const periodo = datas.length
    ? `${datas.reduce((min, d) => (d < min ? d : min)).toLocaleDateString("pt-BR")} até ${datas.reduce((max, d) => (d > max ? d : max)).toLocaleDateString("pt-BR")}`
    : "-";

  const { jsPDF } = window.jspdf;
  let doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const now = new Date();
  doc.setFontSize(18);
  doc.text(toSafeText("Relatório por Obra MEDLUX"), 40, 40);
  doc.setFontSize(11);
  doc.text(toSafeText(`Identificador: ${identificador}`), 40, 64);
  doc.text(toSafeText(`Obra: ${obraValue || "-"}`), 40, 80);
  doc.text(toSafeText(`Gerado em: ${now.toLocaleString("pt-BR")}`), 40, 96);
  doc.text(toSafeText(`Período: ${periodo}`), 40, 112);
  doc.text(
    toSafeText(`Responsável técnico: ${responsavelTecnico.value || obra?.responsavelTecnico || activeSession?.nome || "-"}`),
    40,
    128
  );

  let currentY = 148;
  if (obra) {
    doc.setFontSize(10);
    doc.text(toSafeText(`Nome: ${obra.nomeObra || "-"}`), 40, currentY);
    doc.text(toSafeText(`Rodovia: ${obra.rodovia || "-"} • KM ${obra.kmInicio || "-"} → ${obra.kmFim || "-"}`), 40, currentY + 14);
    doc.text(toSafeText(`Cidade/UF: ${obra.cidadeUF || "-"} • Cliente: ${obra.concessionariaCliente || "-"}`), 40, currentY + 28);
    currentY += 44;
  }

  if (obraResumo.value) {
    doc.setFontSize(10);
    doc.text(toSafeText("Resumo:"), 40, currentY);
    const resumoLines = doc.splitTextToSize(toSafeText(obraResumo.value), 520);
    doc.text(resumoLines, 40, currentY + 14);
    currentY += 14 + resumoLines.length * 12;
  }

  const primeiroGps = filtradas.find((item) => item.gps?.lat !== null && item.gps?.lng !== null);
  if (primeiroGps) {
    const link = `https://www.google.com/maps?q=${primeiroGps.gps.lat},${primeiroGps.gps.lng}`;
    doc.setFontSize(10);
    const linkY = currentY + 14;
    if (doc.textWithLink) {
      doc.textWithLink(toSafeText("Abrir mapa da obra (Google Maps)"), 40, linkY, { url: link });
    } else {
      doc.text(toSafeText(`Mapa: ${link}`), 40, linkY);
    }
    currentY = linkY + 16;
  }

  const resumoStart = currentY + 10;
  doc.setFontSize(12);
  doc.text(toSafeText("Resumo das medições"), 40, resumoStart);
  const resumoRows = filtradas.map((medicao) => {
    const equipamento = equipamentos.find((item) => item.id === (medicao.equipamento_id || medicao.equip_id)) || null;
    const avaliacao = evaluateMedicao({ medicao, criterios, obra, equipamento });
    return [
      toSafeText(medicao.id || medicao.medicao_id),
      toSafeText(medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao),
      toSafeText(`${medicao.linha || "-"} • Est. ${medicao.estacao || "-"}`),
      toSafeText(avaliacao.periodo || "-"),
      toSafeText(avaliacao.media === null ? "-" : avaliacao.media.toFixed(2)),
      toSafeText(avaliacao.minimo === null ? "-" : avaliacao.minimo),
      toSafeText(avaliacao.status),
      toSafeText(avaliacao.motivo || "-"),
      (medicao.leituras || []).length || 1,
      toSafeText(formatLocal(medicao)),
      toSafeText(formatDateTimeLocal(medicao.dataHora || medicao.data_hora || medicao.created_at))
    ];
  });
  doc = makePdfTableNoWrap({
    jsPDF,
    doc,
    head: [["ID", "Subtipo", "Linha/Estação", "Período", "Média", "Mínimo", "Status", "Motivo", "N Leituras", "Local", "Data/Hora"]],
    body: resumoRows,
    startY: resumoStart + 10,
    columnWidths: [54, 58, 78, 48, 42, 42, 56, 110, 46, 166, 96],
    styles: { fontSize: 8, cellPadding: 2 }
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
    doc.text(toSafeText("Resumo estatístico por subtipo"), 40, cursorY);
    doc = makePdfTableNoWrap({
      jsPDF,
      doc,
      head: [["Subtipo", "Qtd.", "Média geral"]],
      body: resumoStats,
      startY: cursorY + 10,
      columnWidths: [110, 80, 120]
    });
    cursorY = doc.lastAutoTable.finalY + 20;
  }

  const legendas = filtradas.filter((medicao) => String(medicao.tipoDeMarcacao || "").toUpperCase() === "LEGENDA");
  if (legendas.length) {
    const rows = [];
    legendas.forEach((medicao) => {
      const detalhe = computeLegendaStats(medicao);
      if (!detalhe?.letras?.length) {
        rows.push([toSafeText(medicao.id || medicao.medicao_id), "-", "estrutura por letra não informada", toSafeText(formatMedia(medicao))]);
        return;
      }
      detalhe.letras.forEach((letra) => {
        rows.push([
          toSafeText(medicao.id || medicao.medicao_id),
          toSafeText(letra.letra),
          toSafeText((letra.leituras || []).join(", ")),
          toSafeText(letra.media === null ? "-" : letra.media.toFixed(2))
        ]);
      });
      const mediaLegenda = Number(detalhe?.mediaFinal);
      rows.push([
        toSafeText(medicao.id || medicao.medicao_id),
        "Média final",
        "-",
        toSafeText(Number.isFinite(mediaLegenda) ? mediaLegenda.toFixed(2) : "-")
      ]);
    });
    doc.setFontSize(12);
    doc.text(toSafeText("Média por letra (LEGENDA)"), 40, cursorY);
    doc = makePdfTableNoWrap({
      jsPDF,
      doc,
      head: [["Medição", "Letra", "Leituras", "Média"]],
      body: rows,
      startY: cursorY + 10,
      columnWidths: [84, 60, 220, 70]
    });
    cursorY = doc.lastAutoTable.finalY + 20;
  }

  doc.setFontSize(12);
  doc.text(toSafeText("Fotos da obra"), 40, cursorY);
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
  await logAudit({
    action: AUDIT_ACTIONS.PDF_GENERATED,
    entity_type: "relatorios",
    entity_id: obraValue || relatorioValue || "obra",
    actor_user_id: activeSession?.user_id || null,
    summary: "PDF por obra gerado."
  });
};


const buildUserPdf = async () => {
  const user = activeSession || getSession();
  if (!user) {
    setStatusMessage("Faça login para gerar o relatório individual.");
    return;
  }

  const obraId = (userReportObra?.value || "").trim().toUpperCase();
  const startDate = userReportStart?.value || "";
  const endDate = userReportEnd?.value || "";

  try {
    const result = await generateUserIndividualPdf({ obraId, startDate, endDate, loggedUser: user });
    if (!result.total) {
      setStatusMessage("Nenhuma medição encontrada para os filtros informados.");
      return;
    }
    setStatusMessage(result.swappedPeriod ? "PDF gerado com sucesso (período ajustado automaticamente)." : "PDF gerado com sucesso.");
    await logAudit({
      action: AUDIT_ACTIONS.PDF_GENERATED,
      entity_type: "relatorios",
      entity_id: user.id || user.user_id || "",
      actor_user_id: user.id || user.user_id || null,
      summary: "PDF individual gerado."
    });
  } catch (error) {
    setStatusMessage(error?.message || "Falha ao gerar PDF individual.");
    await logError({
      module: "medlux-control",
      action: "GENERATE_USER_PDF",
      message: error?.message || "Falha ao gerar PDF individual.",
      stack: error?.stack,
      context: { user_id: user?.id || user?.user_id || null, obraId, startDate, endDate }
    });
  }
};

const renderAll = () => {
  renderDashboard();
  renderEquipamentos();
  renderQuickSearch();
  renderUsuarios();
  renderVinculos();
  renderObras();
  refreshSelectOptions();
  void renderDiagnostico();
};

const renderDiagnostico = async () => {
  if (!diagnosticoPanel) return;
  if (activeSession?.role !== "ADMIN") {
    diagnosticoPanel.hidden = true;
    return;
  }
  diagnosticoPanel.hidden = false;
  diagnosticoVersion.textContent = `App ${getAppVersion()} • DB ${DB_VERSION}`;
  try {
    const counts = await getStoreCounts();
    diagnosticoCounts.textContent = "";
    Object.entries(counts).forEach(([store, total]) => {
      const row = document.createElement("li");
      row.textContent = `${store}: ${total}`;
      diagnosticoCounts.appendChild(row);
    });
    const errors = await getRecentErrors(30);
    diagnosticoErrors.textContent = "";
    if (!errors.length) {
      const empty = document.createElement("li");
      empty.textContent = "Sem erros recentes.";
      diagnosticoErrors.appendChild(empty);
      return;
    }
    errors.forEach((item) => {
      const row = document.createElement("li");
      row.textContent = `[${new Date(item.created_at).toLocaleString("pt-BR")}] ${item.module}: ${item.message}`;
      diagnosticoErrors.appendChild(row);
    });
  } catch (error) {
    diagnosticoCounts.textContent = "Falha ao carregar diagnóstico.";
  }
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

const handleLaudoInputChange = () => {
  const file = equipLaudoInput?.files?.[0] || null;
  if (!file) {
    renderLaudoStatus(currentLaudoMeta);
    return;
  }
  if (file.type !== "application/pdf") {
    equipLaudoInput.value = "";
    setStatusMessage("Anexe apenas arquivos PDF.");
    return;
  }
  const blob = new Blob([file], { type: "application/pdf" });
  renderLaudoStatus({ id: currentLaudoMeta?.id || "", filename: file.name, blob });
};

const handleCalibradoChange = async () => {
  if (formFields.calibrado.value !== "Sim") return;
  await openLaudoIfExists(currentLaudoMeta);
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
formFields.calibrado.addEventListener("change", () => { void handleCalibradoChange(); });
if (equipLaudoInput) equipLaudoInput.addEventListener("change", handleLaudoInputChange);

newUsuario.addEventListener("click", () => openUsuarioModal());
closeUsuario.addEventListener("click", () => closeModalElement(usuarioModal));
cancelUsuario.addEventListener("click", () => closeModalElement(usuarioModal));
usuarioForm.addEventListener("submit", handleUsuarioSubmit);

usuarioCpf.addEventListener("input", (event) => {
  event.target.value = formatCpf(event.target.value);
});

vinculoCpf.addEventListener("input", (event) => {
  const digits = onlyDigits(event.target.value).slice(0, 11);
  event.target.value = formatCpf(digits);
});

newVinculo.addEventListener("click", openVinculoModal);
closeVinculo.addEventListener("click", () => { editingVinculoId = null; closeModalElement(vinculoModal); });
cancelVinculo.addEventListener("click", () => { editingVinculoId = null; closeModalElement(vinculoModal); });
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
importFile.addEventListener("change", async () => {
  if (!importFile.files.length) return;
  try {
    const text = await importFile.files[0].text();
    const payload = JSON.parse(text);
    const preview = await buildImportPreview(payload);
    renderImportPreview(preview);
  } catch (error) {
    setStatusMessage("Falha ao ler o JSON para prévia.");
    console.error("Falha ao ler JSON de importação.", error);
    await logError({ module: "medlux-control", action: "IMPORT_PREVIEW_FILE", message: error.message, stack: error.stack });
  }
});
if (previewXlsx) previewXlsx.addEventListener("click", handlePreviewXlsx);
if (importXlsx) importXlsx.addEventListener("click", handleImportXlsx);
if (importCsv) importCsv.addEventListener("click", handleImportCsv);
if (importBulk) importBulk.addEventListener("click", handleImportBulk);
if (exportCsv) exportCsv.addEventListener("click", handleExportCsv);
if (verifyIntegrity) verifyIntegrity.addEventListener("click", () => { void runIntegrityChecks(); });
resetData.addEventListener("click", handleReset);

generateGlobalPdf.addEventListener("click", buildGlobalPdf);
generateObraPdf.addEventListener("click", buildObraPdf);
if (generateUserPdf) generateUserPdf.addEventListener("click", buildUserPdf);
if (diagnosticoExport) {
  diagnosticoExport.addEventListener("click", async () => {
    try {
      const visibleEquipamentosInUI = [...document.querySelectorAll("#vinculoEquip option")]
        .map((option) => option.value)
        .filter((value) => value && value !== "");

      const payload = await exportDiagnosticoCompleto({
        appModule: "medlux-control",
        appVersion: getAppVersion(),
        session: getSession(),
        visibleEquipamentosInUI
      });

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `diagnostico-turbo-medlux-control-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setStatusMessage("Diagnóstico Turbo exportado com sucesso.");
    } catch (error) {
      setStatusMessage("Falha ao exportar diagnóstico completo.");
      await logError({ module: "medlux-control", action: "EXPORT_DIAGNOSTICO_COMPLETO", message: error?.message || "Erro desconhecido", stack: error?.stack });
    }
  });
}

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
