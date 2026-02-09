import {
  getAllEquipamentos,
  saveEquipamento,
  deleteEquipamento,
  clearEquipamentos,
  bulkSaveEquipamentos,
  exportEquipamentos,
  importEquipamentos
} from "./db.js";
import { seedEquipamentos } from "./seed.js";

const VALIDITY_DAYS = 365;
const DUE_SOON_DAYS = 30;

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
const importFeedback = document.getElementById("importFeedback");
const resetData = document.getElementById("resetData");
const bulkPaste = document.getElementById("bulkPaste");
const importBulk = document.getElementById("importBulk");
const generateAuditPdf = document.getElementById("generateAuditPdf");
const statusMessage = document.getElementById("statusMessage");
const syncStatus = document.getElementById("syncStatus");
const sortButtons = document.querySelectorAll("[data-sort]");

const modal = document.getElementById("equipamentoModal");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const cancelModal = document.getElementById("cancelModal");
const deleteModal = document.getElementById("deleteEquipamento");
const form = document.getElementById("equipamentoForm");
const formHint = document.getElementById("formHint");
const markCalibrated = document.getElementById("markCalibrated");

const formFields = {
  id: document.getElementById("equipId"),
  tipo: document.getElementById("equipTipo"),
  numeroSerie: document.getElementById("equipSerie"),
  modelo: document.getElementById("equipModelo"),
  dataAquisicao: document.getElementById("equipAquisicao"),
  dataCalibracao: document.getElementById("equipCalibracao"),
  dataVencimento: document.getElementById("equipVencimento"),
  responsavelAtual: document.getElementById("equipResponsavel"),
  status: document.getElementById("equipStatus"),
  observacoes: document.getElementById("equipObs")
};

const STATUS_LABELS = {
  ATIVO: "ATIVO",
  EM_CAUTELA: "EM CAUTELA",
  EM_CALIBRACAO: "EM CALIBRAÇÃO",
  MANUTENCAO: "MANUTENÇÃO",
  VENCIDO: "VENCIDO"
};

const STATUS_ORDER = [
  "VENCIDO",
  "EM_CALIBRACAO",
  "MANUTENCAO",
  "EM_CAUTELA",
  "ATIVO"
];

const normalizeText = (value) => String(value || "")
  .trim()
  .replace(/\s+/g, " ");

const normalizeId = (value) => normalizeText(value).toUpperCase();

const normalizeTipo = (value) => {
  const raw = normalizeText(value).toUpperCase();
  if (raw === "HORIZONTAL" || raw === "VERTICAL" || raw === "TACHAS") {
    return raw;
  }
  return "";
};

const normalizeStatus = (value) => {
  const raw = normalizeText(value).toUpperCase();
  const map = {
    "EM CAUTELA": "EM_CAUTELA",
    "EM CALIBRACAO": "EM_CALIBRACAO",
    "EM CALIBRAÇÃO": "EM_CALIBRACAO",
    "MANUTENCAO": "MANUTENCAO",
    "MANUTENÇÃO": "MANUTENCAO"
  };
  const normalized = map[raw] || raw;
  if (STATUS_LABELS[normalized]) return normalized;
  return "ATIVO";
};

const normalizeHeader = (value) => normalizeText(value)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");

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

const addDays = (dateString, days) => {
  if (!dateString) return "";
  const d = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return toISODate(next);
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return "-";
  return `${day}/${month}/${year}`;
};

const daysUntil = (dateString) => {
  if (!dateString) return null;
  const today = new Date();
  const target = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const computeStatus = (equipamento) => {
  const vencimento = equipamento.dataVencimento || addDays(equipamento.dataCalibracao, VALIDITY_DAYS);
  if (vencimento) {
    const days = daysUntil(vencimento);
    if (days !== null && days < 0) return "VENCIDO";
  }
  return normalizeStatus(equipamento.status || "ATIVO");
};

const getVencimento = (equipamento) => (
  equipamento.dataVencimento || addDays(equipamento.dataCalibracao, VALIDITY_DAYS)
);

const computeVencimento = (dataCalibracao, fallback) => {
  if (dataCalibracao) return addDays(dataCalibracao, VALIDITY_DAYS);
  if (!fallback) return "";
  return parseDateString(fallback).value;
};

const normalizeEquipamento = (data) => {
  const id = normalizeId(data.id);
  const tipo = normalizeTipo(data.tipo);
  const dataCalibracaoRaw = data.dataCalibracao || data.dataUltimaCalibracao || "";
  const dataCalibracao = dataCalibracaoRaw ? parseDateString(dataCalibracaoRaw).value : "";
  const dataVencimento = computeVencimento(dataCalibracao, data.dataVencimento || data.dataVencimentoCalibracao);
  return {
    id,
    tipo,
    modelo: normalizeText(data.modelo || data.segundoModelo || data["2º Modelo"]),
    numeroSerie: normalizeText(data.numeroSerie || data.numeroDeSerie || data["Nº de série"]),
    dataAquisicao: data.dataAquisicao ? parseDateString(data.dataAquisicao).value : "",
    dataCalibracao,
    dataVencimento,
    status: normalizeStatus(data.status),
    responsavelAtual: data.responsavelAtual
      ? normalizeText(data.responsavelAtual)
      : data.local
        ? normalizeText(data.local)
        : "",
    fabricante: data.fabricante ? normalizeText(data.fabricante) : "",
    certificado: data.certificado ? normalizeText(data.certificado) : "",
    observacoes: data.observacoes ? normalizeText(data.observacoes) : ""
  };
};

const getFilteredEquipamentos = () => {
  const term = tableSearch.value.trim().toLowerCase();
  const tipo = typeFilter.value;
  const status = statusFilter.value;
  return equipamentos.filter((equipamento) => {
    const matchesTerm = !term || [
      equipamento.id,
      equipamento.modelo,
      equipamento.numeroSerie,
      equipamento.responsavelAtual
    ].some((field) => (field || "").toLowerCase().includes(term));
    const statusValue = computeStatus(equipamento);
    const matchesStatus = !status || statusValue === status;
    const matchesTipo = !tipo || equipamento.tipo === tipo;
    return matchesTerm && matchesStatus && matchesTipo;
  });
};

const renderStatusCards = () => {
  statusCards.textContent = "";
  const counts = {
    total: equipamentos.length,
    ativos: 0,
    vencidos: 0,
    cautela: 0,
    calibracao: 0,
    manutencao: 0
  };

  equipamentos.forEach((equipamento) => {
    const status = computeStatus(equipamento);
    if (status === "VENCIDO") counts.vencidos += 1;
    if (status === "EM_CAUTELA") counts.cautela += 1;
    if (status === "EM_CALIBRACAO") counts.calibracao += 1;
    if (status === "MANUTENCAO") counts.manutencao += 1;
    if (status === "ATIVO") counts.ativos += 1;
  });

  const cards = [
    { label: "Total", value: counts.total },
    { label: "Ativos", value: counts.ativos },
    { label: "Em cautela", value: counts.cautela },
    { label: "Em calibração", value: counts.calibracao },
    { label: "Manutenção", value: counts.manutencao },
    { label: "Vencidos", value: counts.vencidos }
  ];

  cards.forEach((cardInfo) => {
    const card = document.createElement("div");
    card.className = "status-card";
    const label = document.createElement("span");
    label.textContent = cardInfo.label;
    const value = document.createElement("strong");
    value.textContent = String(cardInfo.value || 0);
    card.append(label, value);
    statusCards.appendChild(card);
  });
};

const renderDueSoonList = () => {
  dueSoonList.textContent = "";
  const dueSoon = equipamentos
    .map((equipamento) => {
      const vencimento = getVencimento(equipamento);
      return {
        equipamento,
        days: daysUntil(vencimento)
      };
    })
    .filter((item) => item.days !== null && item.days >= 0 && item.days <= DUE_SOON_DAYS)
    .sort((a, b) => a.days - b.days)
    .slice(0, 8);

  if (dueSoon.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Nenhum equipamento vencendo nos próximos 30 dias.";
    dueSoonList.appendChild(empty);
    return;
  }

  dueSoon.forEach(({ equipamento, days }) => {
    const item = document.createElement("li");
    item.textContent = `${equipamento.id} • ${equipamento.modelo || "Sem modelo"} • vence em ${days} dia(s)`;
    dueSoonList.appendChild(item);
  });
};

const renderQuickResults = () => {
  quickResults.textContent = "";
  const term = quickSearch.value.trim().toLowerCase();
  if (!term) {
    const tip = document.createElement("p");
    tip.className = "muted";
    tip.textContent = "Digite para buscar.";
    quickResults.appendChild(tip);
    return;
  }

  const results = equipamentos.filter((equipamento) => [
    equipamento.id,
    equipamento.modelo,
    equipamento.numeroSerie,
    equipamento.responsavelAtual
  ].some((field) => (field || "").toLowerCase().includes(term))).slice(0, 5);

  if (results.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "Nenhum resultado encontrado.";
    quickResults.appendChild(empty);
    return;
  }

  results.forEach((equipamento) => {
    const card = document.createElement("div");
    card.className = "result-card";
    const title = document.createElement("strong");
    title.textContent = `${equipamento.id} • ${equipamento.modelo || "Sem modelo"}`;
    const details = document.createElement("span");
    details.className = "muted";
    details.textContent = `Série ${equipamento.numeroSerie || "-"} • ${equipamento.responsavelAtual || "Sem responsável"}`;
    card.append(title, details);
    quickResults.appendChild(card);
  });
};

const applySort = (items) => {
  const { key, direction } = sortState;
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (key === "id") {
      return a.id.localeCompare(b.id);
    }
    if (key === "dias") {
      const aDays = daysUntil(a.dataVencimento);
      const bDays = daysUntil(b.dataVencimento);
      const aValue = aDays === null ? Number.POSITIVE_INFINITY : aDays;
      const bValue = bDays === null ? Number.POSITIVE_INFINITY : bDays;
      return aValue - bValue;
    }
    if (key === "status") {
      const aStatus = computeStatus(a);
      const bStatus = computeStatus(b);
      const aIndex = STATUS_ORDER.indexOf(aStatus);
      const bIndex = STATUS_ORDER.indexOf(bStatus);
      const safeA = aIndex === -1 ? STATUS_ORDER.length : aIndex;
      const safeB = bIndex === -1 ? STATUS_ORDER.length : bIndex;
      return safeA - safeB;
    }
    return 0;
  });
  if (direction === "desc") sorted.reverse();
  return sorted;
};

const renderTable = () => {
  const filtered = applySort(getFilteredEquipamentos());
  const pageSize = Number(pageSizeSelect.value) || 25;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  tableBody.textContent = "";

  pageItems.forEach((equipamento) => {
    const row = document.createElement("tr");
    const statusValue = computeStatus(equipamento);
    const vencimento = getVencimento(equipamento);
    const days = daysUntil(vencimento);

    const cells = [
      equipamento.id,
      equipamento.tipo,
      equipamento.modelo,
      equipamento.numeroSerie,
      equipamento.responsavelAtual || "-",
      formatDate(equipamento.dataCalibracao),
      formatDate(vencimento),
      days === null ? "-" : String(days),
      statusValue
    ];

    cells.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 8) {
        const pill = document.createElement("span");
        pill.className = "status-pill";
        if (statusValue === "VENCIDO" || statusValue === "MANUTENCAO") {
          pill.classList.add("danger");
        } else if (statusValue === "EM_CALIBRACAO" || statusValue === "EM_CAUTELA") {
          pill.classList.add("warning");
        } else if (statusValue === "ATIVO") {
          pill.classList.add("success");
        }
        pill.textContent = STATUS_LABELS[statusValue] || statusValue;
        cell.appendChild(pill);
      } else {
        cell.textContent = value || "-";
      }
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.className = "btn secondary";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => openEditModal(equipamento.id));

    const duplicateButton = document.createElement("button");
    duplicateButton.className = "btn secondary";
    duplicateButton.type = "button";
    duplicateButton.textContent = "Duplicar";
    duplicateButton.addEventListener("click", () => handleDuplicate(equipamento.id));

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => handleDelete(equipamento.id));

    const actions = document.createElement("div");
    actions.className = "toolbar";
    actions.append(editButton, duplicateButton, deleteButton);
    actionCell.appendChild(actions);
    row.appendChild(actionCell);

    tableBody.appendChild(row);
  });

  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevPage.disabled = currentPage <= 1;
  nextPage.disabled = currentPage >= totalPages;
};

const refreshUI = () => {
  renderStatusCards();
  renderDueSoonList();
  renderQuickResults();
  renderTable();
};

const loadEquipamentos = async () => {
  const items = await getAllEquipamentos();
  equipamentos = items.map((item) => normalizeEquipamento(item));
  refreshUI();
};

const resetForm = () => {
  form.reset();
  formFields.dataVencimento.value = "";
  editingId = null;
  formFields.id.disabled = false;
  deleteModal.classList.add("hidden");
  formHint.textContent = "Campos com * são obrigatórios.";
};

const openModal = () => {
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  formFields.id.focus();
};

const closeModalHandler = () => {
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  resetForm();
};

const openEditModal = (id) => {
  const equipamento = equipamentos.find((item) => item.id === id);
  if (!equipamento) return;
  editingId = id;
  modalTitle.textContent = `Editar ${equipamento.id}`;
  formFields.id.value = equipamento.id;
  formFields.id.disabled = true;
  formFields.tipo.value = equipamento.tipo || "";
  formFields.numeroSerie.value = equipamento.numeroSerie || "";
  formFields.modelo.value = equipamento.modelo || "";
  formFields.dataAquisicao.value = equipamento.dataAquisicao || "";
  formFields.dataCalibracao.value = equipamento.dataCalibracao || "";
  formFields.dataVencimento.value = equipamento.dataVencimento || "";
  formFields.responsavelAtual.value = equipamento.responsavelAtual || "";
  formFields.status.value = normalizeStatus(equipamento.status || "ATIVO");
  formFields.observacoes.value = equipamento.observacoes || "";
  formHint.textContent = "Atualize os campos e pressione salvar.";
  deleteModal.classList.remove("hidden");
  openModal();
};

const openNewModal = () => {
  modalTitle.textContent = "Novo equipamento";
  formFields.id.disabled = false;
  resetForm();
  openModal();
};

const handleDelete = async (id) => {
  const confirmed = window.confirm(`Excluir equipamento ${id}?`);
  if (!confirmed) return false;
  await deleteEquipamento(id);
  await loadEquipamentos();
  setStatusMessage(`Equipamento ${id} removido.`);
  return true;
};

const handleDuplicate = async (id) => {
  const equipamento = equipamentos.find((item) => item.id === id);
  if (!equipamento) return;
  const newId = normalizeId(window.prompt("Novo ID para a cópia:", ""));
  if (!newId) return;
  if (equipamentos.some((item) => item.id === newId)) {
    setStatusMessage("ID já existe, escolha outro.");
    return;
  }
  const duplicated = {
    ...equipamento,
    id: newId
  };
  await saveEquipamento(duplicated);
  await loadEquipamentos();
  setStatusMessage(`Equipamento ${newId} duplicado.`);
};

const handleModalDelete = async () => {
  if (!editingId) return;
  const removed = await handleDelete(editingId);
  if (removed) closeModalHandler();
};

const setStatusMessage = (message) => {
  statusMessage.textContent = message;
};

const handleFormSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const id = normalizeId(data.id);

  if (!id) {
    formHint.textContent = "ID obrigatório.";
    return;
  }

  if (!normalizeTipo(data.tipo)) {
    formHint.textContent = "Tipo obrigatório.";
    return;
  }

  const existing = equipamentos.find((item) => item.id === id);
  if (!editingId && existing) {
    formHint.textContent = "ID já existe.";
    return;
  }

  const dataCalibracao = data.dataCalibracao ? parseDateString(data.dataCalibracao).value : "";
  const equipamento = normalizeEquipamento({
    ...data,
    id,
    tipo: normalizeTipo(data.tipo),
    dataCalibracao,
    dataVencimento: dataCalibracao ? addDays(dataCalibracao, VALIDITY_DAYS) : "",
    status: normalizeStatus(data.status)
  });

  await saveEquipamento(equipamento);
  await loadEquipamentos();
  closeModalHandler();
  setStatusMessage(editingId ? `Equipamento ${id} atualizado.` : `Equipamento ${id} cadastrado.`);
};

const handleCalibrationUpdate = () => {
  const value = formFields.dataCalibracao.value;
  const parsed = value ? parseDateString(value).value : "";
  formFields.dataVencimento.value = parsed ? addDays(parsed, VALIDITY_DAYS) : "";
};

const validateImportItem = (item, index, errors) => {
  if (!item.id) {
    errors.push(`Linha ${index + 1}: ID obrigatório.`);
    return false;
  }
  if (!item.tipo) {
    errors.push(`Linha ${index + 1}: Tipo inválido.`);
    return false;
  }
  return true;
};

const buildImportFeedback = (errors) => {
  importFeedback.textContent = "";
  if (!errors.length) return;
  const title = document.createElement("p");
  title.textContent = "Ocorreram erros na importação:";
  importFeedback.appendChild(title);
  const list = document.createElement("ul");
  list.className = "list";
  errors.slice(0, 8).forEach((error) => {
    const item = document.createElement("li");
    item.textContent = error;
    list.appendChild(item);
  });
  importFeedback.appendChild(list);
};

const handleImportJSON = async () => {
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

  const items = Array.isArray(payload) ? payload : payload.equipamentos;
  if (!Array.isArray(items)) {
    setStatusMessage("Formato inválido de backup.");
    return;
  }

  const errors = [];
  const normalized = items
    .map((item, index) => {
      const dataAquisicao = item?.dataAquisicao ? parseDateString(item.dataAquisicao) : { value: "", error: "" };
      const dataCalibracao = item?.dataCalibracao || item?.dataUltimaCalibracao
        ? parseDateString(item.dataCalibracao || item.dataUltimaCalibracao)
        : { value: "", error: "" };
      if (dataAquisicao.error) errors.push(`Linha ${index + 1}: Data de aquisição inválida.`);
      if (dataCalibracao.error) errors.push(`Linha ${index + 1}: Data de calibração inválida.`);
      const normalizedItem = normalizeEquipamento({
        ...(item || {}),
        dataAquisicao: dataAquisicao.value,
        dataCalibracao: dataCalibracao.value,
        dataUltimaCalibracao: dataCalibracao.value
      });
      if (!validateImportItem(normalizedItem, index, errors)) return null;
      return normalizedItem;
    })
    .filter(Boolean);

  if (errors.length) {
    buildImportFeedback(errors);
    setStatusMessage("Importação cancelada. Revise os erros listados.");
    return;
  }

  const mode = document.querySelector("input[name='importMode']:checked")?.value || "merge";
  if (mode === "replace") {
    const confirmed = window.confirm("Substituir todos os dados atuais?");
    if (!confirmed) return;
    await clearEquipamentos();
  }

  await importEquipamentos(normalized);
  await loadEquipamentos();
  setStatusMessage("Backup importado com sucesso.");
  importFile.value = "";
  buildImportFeedback([]);
};

const detectDelimiter = (line) => {
  if (line.includes("\t")) return "\t";
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
};

const parseDelimited = (text) => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const delimiter = detectDelimiter(lines[0]);

  const parseLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map((value) => value.trim());
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows, delimiter };
};

const mapRowsToEntries = (headers, rows) => {
  const headerMap = headers.map((header) => normalizeHeader(header));
  const hasHeader = headerMap.some((header) => header.includes("identificacao") || header.includes("funcao"));
  const defaultHeaders = [
    "identificacao",
    "funcao",
    "numerodeserie",
    "datadeaquisicao",
    "datadecalibracao",
    "local",
    "2modelo"
  ];

  const effectiveHeaders = hasHeader ? headerMap : defaultHeaders;
  const effectiveRows = hasHeader ? rows : [headers, ...rows];

  const fieldMap = {
    identificacao: "id",
    id: "id",
    funcao: "tipo",
    tipo: "tipo",
    funcaoequipamento: "tipo",
    numerodeserie: "numeroSerie",
    ndeserie: "numeroSerie",
    nserie: "numeroSerie",
    numeroserie: "numeroSerie",
    datadeaquisicao: "dataAquisicao",
    dataaquisicao: "dataAquisicao",
    datadecalibracao: "dataCalibracao",
    datacalibracao: "dataCalibracao",
    ultimacalibracao: "dataCalibracao",
    local: "responsavelAtual",
    responsavel: "responsavelAtual",
    fabricante: "fabricante",
    "2modelo": "modelo",
    segundomodelo: "modelo",
    modelo: "modelo",
    certificado: "certificado",
    ncertificado: "certificado",
    nocertificado: "certificado",
    numerocertificado: "certificado"
  };

  return effectiveRows.map((values) => {
    const entry = {};
    values.forEach((value, index) => {
      const headerKey = effectiveHeaders[index];
      const field = fieldMap[headerKey];
      if (!field) return;
      entry[field] = value;
    });
    return entry;
  });
};

const normalizeImportRows = (rows, errors) => rows
  .map((row, index) => {
    const item = {
      id: normalizeId(row.id),
      tipo: normalizeTipo(row.tipo),
      modelo: normalizeText(row.modelo),
      numeroSerie: normalizeText(row.numeroSerie),
      dataAquisicao: row.dataAquisicao,
      dataCalibracao: row.dataCalibracao,
      responsavelAtual: normalizeText(row.responsavelAtual),
      fabricante: normalizeText(row.fabricante),
      certificado: normalizeText(row.certificado),
      status: normalizeStatus(row.status)
    };

    const aq = row.dataAquisicao ? parseDateString(row.dataAquisicao) : { value: "", error: "" };
    const cal = row.dataCalibracao ? parseDateString(row.dataCalibracao) : { value: "", error: "" };
    if (aq.error) errors.push(`Linha ${index + 1}: Data de aquisição inválida.`);
    if (cal.error) errors.push(`Linha ${index + 1}: Data de calibração inválida.`);

    const normalizedItem = normalizeEquipamento({
      ...item,
      dataAquisicao: aq.value,
      dataCalibracao: cal.value
    });

    if (!validateImportItem(normalizedItem, index, errors)) return null;
    return normalizedItem;
  })
  .filter(Boolean);

const getArrayBuffer = (file) => {
  if (file.arrayBuffer) {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

const parseExcelDateValue = (value) => {
  if (value === null || value === undefined || value === "") return { value: "", error: "" };
  if (value instanceof Date) {
    const iso = toISODate(value);
    return iso ? { value: iso, error: "" } : { value: "", error: "Data inválida" };
  }
  if (typeof value === "number" && Number.isFinite(value) && window.XLSX?.SSF?.parse_date_code) {
    const parsed = window.XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      const iso = toISODate(date);
      return iso ? { value: iso, error: "" } : { value: "", error: "Data inválida" };
    }
    return { value: "", error: "Data inválida" };
  }
  return parseDateString(value);
};

const EXCEL_HEADER_MAP = {
  identificacao: "id",
  id: "id",
  funcao: "tipo",
  funcaoequipamento: "tipo",
  tipo: "tipo",
  "2modelo": "modelo",
  "2omodelo": "modelo",
  segundomodelo: "modelo",
  modelo: "modelo",
  numerodeserie: "numeroSerie",
  numeroserie: "numeroSerie",
  ndeserie: "numeroSerie",
  nserie: "numeroSerie",
  datadeaquisicao: "dataAquisicao",
  dataaquisicao: "dataAquisicao",
  datadecalibracao: "dataCalibracao",
  datacalibracao: "dataCalibracao",
  dataultimacalibracao: "dataCalibracao",
  ultimacalibracao: "dataCalibracao",
  fabricante: "fabricante",
  local: "responsavelAtual",
  responsavelatual: "responsavelAtual",
  responsavel: "responsavelAtual",
  certificado: "certificado",
  ncertificado: "certificado",
  nocertificado: "certificado",
  numerocertificado: "certificado"
};

const mapExcelRows = (rows) => {
  const headers = (rows[0] || []).map((header) => normalizeHeader(header));
  const mappedRows = rows
    .slice(1)
    .filter((row) => row.some((cell) => normalizeText(cell)))
    .map((row) => {
      const entry = {};
      row.forEach((cell, index) => {
        const field = EXCEL_HEADER_MAP[headers[index]];
        if (!field) return;
        entry[field] = cell;
      });
      return entry;
    });
  return { headers, mappedRows };
};

const normalizeExcelRows = (rows, warnings, errors) => rows
  .map((row, index) => {
    const aq = parseExcelDateValue(row.dataAquisicao);
    const cal = parseExcelDateValue(row.dataCalibracao);
    if (aq.error) warnings.push(`Linha ${index + 1}: Data de aquisição inválida.`);
    if (cal.error) warnings.push(`Linha ${index + 1}: Data de calibração inválida.`);
    const normalizedItem = normalizeEquipamento({
      id: normalizeId(row.id),
      tipo: normalizeTipo(row.tipo),
      modelo: normalizeText(row.modelo),
      numeroSerie: normalizeText(row.numeroSerie),
      dataAquisicao: aq.value,
      dataCalibracao: cal.value,
      dataUltimaCalibracao: cal.value,
      responsavelAtual: normalizeText(row.responsavelAtual),
      fabricante: normalizeText(row.fabricante),
      certificado: normalizeText(row.certificado)
    });

    if (!validateImportItem(normalizedItem, index, errors)) return null;
    return normalizedItem;
  })
  .filter(Boolean);

const renderXlsxPreview = (state) => {
  xlsxPreview.textContent = "";
  importXlsx.disabled = true;
  if (!state) return;

  const header = document.createElement("div");
  header.className = "preview-header";
  const title = document.createElement("strong");
  title.textContent = `Pré-visualização: ${state.fileName}`;
  const summary = document.createElement("span");
  summary.className = "muted";
  summary.textContent = `Linhas válidas: ${state.validRows.length} de ${state.totalRows}`;
  header.append(title, summary);
  xlsxPreview.appendChild(header);

  if (state.duplicates.length) {
    const dup = document.createElement("p");
    dup.className = "warning-text";
    dup.textContent = `Encontramos ${state.duplicates.length} ID(s) já cadastrados. Escolha mesclar ou substituir tudo.`;
    xlsxPreview.appendChild(dup);
  }

  if (state.errors.length) {
    const errorBlock = document.createElement("div");
    errorBlock.className = "preview-errors";
    const errorTitle = document.createElement("p");
    errorTitle.textContent = "Campos obrigatórios ausentes:";
    const errorList = document.createElement("ul");
    errorList.className = "list";
    state.errors.slice(0, 6).forEach((error) => {
      const item = document.createElement("li");
      item.textContent = error;
      errorList.appendChild(item);
    });
    errorBlock.append(errorTitle, errorList);
    xlsxPreview.appendChild(errorBlock);
  }

  if (state.warnings.length) {
    const warnBlock = document.createElement("div");
    warnBlock.className = "preview-warnings";
    const warnTitle = document.createElement("p");
    warnTitle.textContent = "Avisos de datas ou colunas:";
    const warnList = document.createElement("ul");
    warnList.className = "list";
    state.warnings.slice(0, 6).forEach((warning) => {
      const item = document.createElement("li");
      item.textContent = warning;
      warnList.appendChild(item);
    });
    warnBlock.append(warnTitle, warnList);
    xlsxPreview.appendChild(warnBlock);
  }

  const previewTable = document.createElement("table");
  previewTable.className = "table preview-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const headers = [
    "Identificação",
    "Tipo",
    "Modelo",
    "Nº Série",
    "Fabricante",
    "Responsável",
    "Últ. calibração",
    "Vencimento",
    "Certificado"
  ];
  headers.forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  previewTable.appendChild(thead);

  const tbody = document.createElement("tbody");
  state.validRows.slice(0, 5).forEach((item) => {
    const row = document.createElement("tr");
    const vencimento = getVencimento(item);
    const cells = [
      item.id,
      item.tipo,
      item.modelo,
      item.numeroSerie,
      item.fabricante || "-",
      item.responsavelAtual || "-",
      formatDate(item.dataCalibracao),
      formatDate(vencimento),
      item.certificado || "-"
    ];
    cells.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value || "-";
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  previewTable.appendChild(tbody);
  xlsxPreview.appendChild(previewTable);

  importXlsx.disabled = state.validRows.length === 0;
};

const handlePreviewXlsx = async () => {
  if (!importXlsxFile.files.length) {
    setStatusMessage("Selecione um arquivo Excel (.xlsx) para importar.");
    return;
  }
  if (!window.XLSX) {
    setStatusMessage("Biblioteca XLSX não carregada.");
    return;
  }
  const file = importXlsxFile.files[0];
  try {
    const buffer = await getArrayBuffer(file);
    const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (!rows.length) {
      setStatusMessage("Planilha vazia.");
      return;
    }

    const { headers, mappedRows } = mapExcelRows(rows);
    const warnings = [];
    const errors = [];
    if (!headers.some((header) => EXCEL_HEADER_MAP[header] === "id")) {
      warnings.push("Coluna de Identificação não encontrada.");
    }
    if (!headers.some((header) => EXCEL_HEADER_MAP[header] === "tipo")) {
      warnings.push("Coluna de Função/Tipo não encontrada.");
    }

    const normalized = normalizeExcelRows(mappedRows, warnings, errors);
    const duplicates = normalized.filter((item) => equipamentos.some((existing) => existing.id === item.id));
    xlsxState = {
      fileName: file.name,
      totalRows: mappedRows.length,
      validRows: normalized,
      warnings,
      errors,
      duplicates
    };
    renderXlsxPreview(xlsxState);
    setStatusMessage("Pré-visualização concluída.");
  } catch (error) {
    setStatusMessage("Falha ao ler o Excel. Verifique o arquivo.");
  }
};

const mergeEquipamento = (existing, incoming) => {
  const merged = { ...existing };
  Object.entries(incoming).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      merged[key] = value;
    }
  });
  return merged;
};

const handleImportXlsx = async () => {
  if (!xlsxState || !xlsxState.validRows.length) {
    setStatusMessage("Pré-visualize o Excel antes de importar.");
    return;
  }
  const mode = document.querySelector("input[name='importXlsxMode']:checked")?.value || "merge";
  if (mode === "replace") {
    const confirmed = window.confirm("Substituir todos os dados atuais?");
    if (!confirmed) return;
    await clearEquipamentos();
  }

  const existingMap = new Map(equipamentos.map((item) => [item.id, item]));
  const payload = xlsxState.validRows.map((item) => {
    if (mode === "merge" && existingMap.has(item.id)) {
      return mergeEquipamento(existingMap.get(item.id), item);
    }
    return item;
  });

  await bulkSaveEquipamentos(payload);
  await loadEquipamentos();
  setStatusMessage("Excel importado com sucesso.");
  importXlsxFile.value = "";
  xlsxState = null;
  renderXlsxPreview(null);
};

const formatDateTime = (date) => {
  const locale = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
  return locale.format(date);
};

const buildAuditSummary = () => {
  const summary = {
    total: equipamentos.length,
    ativos: 0,
    aVencer: 0,
    vencidos: 0,
    cautela: 0,
    calibracao: 0,
    manutencao: 0
  };

  equipamentos.forEach((equipamento) => {
    const status = computeStatus(equipamento);
    const vencimento = getVencimento(equipamento);
    const days = daysUntil(vencimento);
    if (status === "VENCIDO") summary.vencidos += 1;
    if (status === "EM_CAUTELA") summary.cautela += 1;
    if (status === "EM_CALIBRACAO") summary.calibracao += 1;
    if (status === "MANUTENCAO") summary.manutencao += 1;
    if (status === "ATIVO") summary.ativos += 1;
    if (days !== null && days >= 0 && days <= DUE_SOON_DAYS) summary.aVencer += 1;
  });

  return summary;
};

const sortForAudit = (items) => {
  const sorted = [...items];
  sorted.sort((a, b) => {
    const aStatus = computeStatus(a);
    const bStatus = computeStatus(b);
    const aVencimento = getVencimento(a);
    const bVencimento = getVencimento(b);
    const aDays = daysUntil(aVencimento);
    const bDays = daysUntil(bVencimento);
    const aGroup = aStatus === "VENCIDO" ? 0 : (aDays !== null && aDays <= DUE_SOON_DAYS ? 1 : 2);
    const bGroup = bStatus === "VENCIDO" ? 0 : (bDays !== null && bDays <= DUE_SOON_DAYS ? 1 : 2);
    if (aGroup !== bGroup) return aGroup - bGroup;
    const aValue = aDays === null ? Number.POSITIVE_INFINITY : aDays;
    const bValue = bDays === null ? Number.POSITIVE_INFINITY : bDays;
    if (aValue !== bValue) return aValue - bValue;
    return a.id.localeCompare(b.id);
  });
  return sorted;
};

const handleGenerateAuditPdf = () => {
  if (!window.jspdf?.jsPDF) {
    setStatusMessage("Biblioteca jsPDF não carregada.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const totalPagesLabel = "{total_pages_count_string}";
  const createdAt = new Date();
  const appVersion = document.querySelector("meta[name='app-version']")?.content || "";

  doc.setFontSize(16);
  doc.text("RELATÓRIO DE AUDITORIA - MEDLUX CONTROL", 40, 50);
  doc.setFontSize(11);
  doc.text(`Gerado em: ${formatDateTime(createdAt)}`, 40, 70);
  if (appVersion) {
    doc.text(`Versão: ${appVersion}`, 40, 88);
  }

  const summary = buildAuditSummary();
  const summaryLines = [
    `Total: ${summary.total}`,
    `ATIVO: ${summary.ativos}`,
    `A VENCER (<=${DUE_SOON_DAYS} dias): ${summary.aVencer}`,
    `VENCIDO: ${summary.vencidos}`,
    `EM CAUTELA: ${summary.cautela}`,
    `EM CALIBRAÇÃO: ${summary.calibracao}`,
    `MANUTENÇÃO: ${summary.manutencao}`
  ];
  let summaryY = appVersion ? 110 : 98;
  summaryLines.forEach((line, index) => {
    doc.text(line, 40 + (index % 2) * 260, summaryY + Math.floor(index / 2) * 18);
  });

  const tableItems = sortForAudit(equipamentos);
  const bodyRows = tableItems.map((equipamento) => {
    const vencimento = getVencimento(equipamento);
    const days = daysUntil(vencimento);
    const status = computeStatus(equipamento);
    return [
      equipamento.id,
      equipamento.tipo,
      equipamento.modelo || "-",
      equipamento.numeroSerie || "-",
      equipamento.fabricante || "-",
      equipamento.responsavelAtual || "-",
      formatDate(equipamento.dataCalibracao),
      formatDate(vencimento),
      days === null ? "-" : String(days),
      STATUS_LABELS[status] || status,
      equipamento.certificado || "-"
    ];
  });

  doc.autoTable({
    startY: summaryY + 50,
    head: [[
      "Identificação",
      "Tipo",
      "Modelo",
      "Nº Série",
      "Fabricante",
      "Responsável",
      "Últ. calibração",
      "Vencimento",
      "Dias p/ vencer",
      "Status final",
      "Certificado"
    ]],
    body: bodyRows,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 38, 76] },
    didDrawPage: (data) => {
      const pageNumber = doc.internal.getNumberOfPages();
      doc.setFontSize(9);
      doc.text(
        `Página ${pageNumber} de ${totalPagesLabel}`,
        data.settings.margin.left,
        doc.internal.pageSize.getHeight() - 20
      );
      doc.text(
        formatDateTime(createdAt),
        doc.internal.pageSize.getWidth() - data.settings.margin.right - 120,
        doc.internal.pageSize.getHeight() - 20
      );
    }
  });

  if (typeof doc.putTotalPages === "function") {
    doc.putTotalPages(totalPagesLabel);
  }

  doc.save(`medlux-auditoria-${createdAt.toISOString().slice(0, 10)}.pdf`);
  setStatusMessage("PDF de auditoria gerado.");
};

const handleImportCSV = async () => {
  if (!importCsvFile.files.length) {
    setStatusMessage("Selecione um arquivo CSV para importar.");
    return;
  }
  const text = await importCsvFile.files[0].text();
  const { headers, rows } = parseDelimited(text);
  if (!rows.length && !headers.length) {
    setStatusMessage("CSV vazio ou inválido.");
    return;
  }

  const errors = [];
  const entries = mapRowsToEntries(headers, rows);
  const normalized = normalizeImportRows(entries, errors);

  if (errors.length) {
    buildImportFeedback(errors);
    setStatusMessage("Importação CSV cancelada. Revise os erros listados.");
    return;
  }

  await bulkSaveEquipamentos(normalized);
  await loadEquipamentos();
  setStatusMessage("CSV importado com sucesso.");
  importCsvFile.value = "";
  buildImportFeedback([]);
};

const handleImportBulk = async () => {
  const text = bulkPaste.value.trim();
  if (!text) {
    setStatusMessage("Cole uma tabela (CSV ou TSV) para importar.");
    return;
  }

  const { headers, rows } = parseDelimited(text);
  if (!rows.length && !headers.length) {
    setStatusMessage("Texto vazio ou inválido.");
    return;
  }

  const errors = [];
  const entries = mapRowsToEntries(headers, rows);
  const normalized = normalizeImportRows(entries, errors);

  if (errors.length) {
    buildImportFeedback(errors);
    setStatusMessage("Importação cancelada. Revise os erros listados.");
    return;
  }

  await bulkSaveEquipamentos(normalized);
  await loadEquipamentos();
  setStatusMessage("Importação em lote concluída.");
  bulkPaste.value = "";
  buildImportFeedback([]);
};

const handleExport = async () => {
  const payload = await exportEquipamentos();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `medlux-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setStatusMessage("Backup exportado.");
};

const handleExportCsv = () => {
  const items = applySort(getFilteredEquipamentos());
  const header = [
    "Identificação",
    "Tipo",
    "2º Modelo",
    "Nº de série",
    "Data de aquisição",
    "Data de calibração",
    "Vencimento calibração",
    "Dias para vencimento",
    "Status",
    "Responsável",
    "Observações"
  ];

  const rows = items.map((equipamento) => {
    const vencimento = getVencimento(equipamento);
    const days = daysUntil(vencimento);
    const values = [
      equipamento.id,
      equipamento.tipo,
      equipamento.modelo,
      equipamento.numeroSerie,
      formatDate(equipamento.dataAquisicao),
      formatDate(equipamento.dataCalibracao),
      formatDate(vencimento),
      days === null ? "" : String(days),
      computeStatus(equipamento),
      equipamento.responsavelAtual,
      equipamento.observacoes
    ];
    return values.map((value) => {
      const raw = String(value || "");
      if (raw.includes("\"") || raw.includes(",") || raw.includes("\n")) {
        return `"${raw.replace(/\"/g, '""')}"`;
      }
      return raw;
    }).join(",");
  });

  const content = [header.join(","), ...rows].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `medlux-equipamentos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setStatusMessage("CSV exportado com sucesso.");
};

const handleReset = async () => {
  const confirmed = window.confirm("Isso vai apagar todos os dados locais. Continuar?");
  if (!confirmed) return;
  await clearEquipamentos();
  await loadEquipamentos();
  setStatusMessage("Dados locais apagados.");
};

const handleSeed = async () => {
  const confirmed = window.confirm("Carregar dados de exemplo? Isso adiciona registros ao banco.");
  if (!confirmed) return;
  const sample = seedEquipamentos().map((item) => normalizeEquipamento(item));
  await bulkSaveEquipamentos(sample);
  await loadEquipamentos();
  setStatusMessage("Dados de exemplo carregados.");
};

const updateQuickFilterButtons = (buttons, value, attribute) => {
  buttons.forEach((button) => {
    const buttonValue = button.getAttribute(attribute) || "";
    button.classList.toggle("active", buttonValue === value);
  });
};

const applyQuickFilters = (typeValue, statusValue) => {
  if (typeValue !== undefined) typeFilter.value = typeValue;
  if (statusValue !== undefined) statusFilter.value = statusValue;
  updateQuickFilterButtons(quickTipoFilters, typeFilter.value, "data-filter-type");
  updateQuickFilterButtons(quickStatusFilters, statusFilter.value, "data-filter-status");
  currentPage = 1;
  renderTable();
};

const updateSortIndicator = () => {
  sortButtons.forEach((item) => item.removeAttribute("data-direction"));
  const active = Array.from(sortButtons).find((item) => item.getAttribute("data-sort") === sortState.key);
  if (active) active.setAttribute("data-direction", sortState.direction);
};

const setupTabs = () => {
  const setActiveTab = (tab) => {
    tabs.forEach((item) => item.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    const key = tab.dataset.section;
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.panel !== key;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveTab(tab));
  });
};

const registerServiceWorker = () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setStatusMessage("Falha ao registrar Service Worker.");
    });
  }
};

const updateOnlineStatus = () => {
  syncStatus.textContent = navigator.onLine ? "Online • IndexedDB" : "Offline pronto • IndexedDB";
};

let equipamentos = [];
let currentPage = 1;
let editingId = null;
let sortState = { key: "id", direction: "asc" };
let xlsxState = null;

importXlsx.disabled = true;

form.addEventListener("submit", handleFormSubmit);
closeModal.addEventListener("click", closeModalHandler);
cancelModal.addEventListener("click", closeModalHandler);
deleteModal.addEventListener("click", handleModalDelete);
newEquipamento.addEventListener("click", openNewModal);
markCalibrated.addEventListener("click", () => {
  const today = toISODate(new Date());
  formFields.dataCalibracao.value = today;
  handleCalibrationUpdate();
});
formFields.dataCalibracao.addEventListener("change", handleCalibrationUpdate);

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModalHandler();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("active")) {
    closeModalHandler();
  }
});

quickSearch.addEventListener("input", renderQuickResults);
clearSearch.addEventListener("click", () => {
  quickSearch.value = "";
  renderQuickResults();
});

[tableSearch, statusFilter, typeFilter, pageSizeSelect].forEach((input) => {
  input.addEventListener("input", () => {
    updateQuickFilterButtons(quickTipoFilters, typeFilter.value, "data-filter-type");
    updateQuickFilterButtons(quickStatusFilters, statusFilter.value, "data-filter-status");
    currentPage = 1;
    renderTable();
  });
});

prevPage.addEventListener("click", () => {
  currentPage = Math.max(1, currentPage - 1);
  renderTable();
});

nextPage.addEventListener("click", () => {
  currentPage += 1;
  renderTable();
});

quickTipoFilters.forEach((button) => {
  button.addEventListener("click", () => {
    applyQuickFilters(button.getAttribute("data-filter-type") || "", undefined);
  });
});

quickStatusFilters.forEach((button) => {
  button.addEventListener("click", () => {
    applyQuickFilters(undefined, button.getAttribute("data-filter-status") || "");
  });
});

sortButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.getAttribute("data-sort");
    if (!key) return;
    if (sortState.key === key) {
      sortState = { key, direction: sortState.direction === "asc" ? "desc" : "asc" };
    } else {
      sortState = { key, direction: "asc" };
    }
    updateSortIndicator();
    renderTable();
  });
});

seedButton.addEventListener("click", handleSeed);
exportBackup.addEventListener("click", handleExport);
exportCsv.addEventListener("click", handleExportCsv);
importBackup.addEventListener("click", handleImportJSON);
importCsv.addEventListener("click", handleImportCSV);
importBulk.addEventListener("click", handleImportBulk);
resetData.addEventListener("click", handleReset);
previewXlsx.addEventListener("click", handlePreviewXlsx);
importXlsx.addEventListener("click", handleImportXlsx);
importXlsxFile.addEventListener("change", handlePreviewXlsx);
generateAuditPdf.addEventListener("click", handleGenerateAuditPdf);

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

setupTabs();
updateOnlineStatus();
registerServiceWorker();
applyQuickFilters("", "");
updateSortIndicator();
loadEquipamentos();
renderQuickResults();
