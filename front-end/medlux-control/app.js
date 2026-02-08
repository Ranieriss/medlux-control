import {
  getAllEquipamentos,
  saveEquipamento,
  deleteEquipamento,
  clearEquipamentos,
  bulkSaveEquipamentos
} from "./db.js";
import { seedEquipamentos } from "./seed.js";

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll("[data-panel]");
const statusCards = document.getElementById("statusCards");
const upcomingList = document.getElementById("upcomingList");
const quickSearch = document.getElementById("quickSearch");
const quickResults = document.getElementById("quickResults");
const clearSearch = document.getElementById("clearSearch");
const tableBody = document.getElementById("equipamentosBody");
const tableSearch = document.getElementById("tableSearch");
const statusFilter = document.getElementById("statusFilter");
const pageSizeSelect = document.getElementById("pageSize");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const newEquipamento = document.getElementById("newEquipamento");
const seedButton = document.getElementById("seedEquipamentos");
const exportBackup = document.getElementById("exportBackup");
const importFile = document.getElementById("importFile");
const importBackup = document.getElementById("importBackup");
const resetData = document.getElementById("resetData");
const statusMessage = document.getElementById("statusMessage");
const syncStatus = document.getElementById("syncStatus");

const modal = document.getElementById("equipamentoModal");
const modalTitle = document.getElementById("modalTitle");
const closeModal = document.getElementById("closeModal");
const cancelModal = document.getElementById("cancelModal");
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
  certificado: document.getElementById("equipCertificado"),
  fabricante: document.getElementById("equipFabricante"),
  responsavelAtual: document.getElementById("equipResponsavel"),
  situacaoManual: document.getElementById("equipSituacao"),
  observacoes: document.getElementById("equipObs")
};

const STATUS_LABELS = {
  ATIVO: "ATIVO",
  EM_CAUTELA: "EM CAUTELA",
  EM_CALIBRACAO: "EM CALIBRAÇÃO",
  MANUTENCAO: "MANUTENÇÃO",
  VENCIDO: "VENCIDO"
};

const normalizeTipo = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "HORIZONTAL" || raw === "VERTICAL" || raw === "TACHAS") {
    return raw;
  }
  return "";
};

const normalizeSituacao = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  const map = {
    "EM CALIBRAÇÃO": "EM_CALIBRACAO",
    "EM CALIBRACAO": "EM_CALIBRACAO",
    "EM CAUTELA": "EM_CAUTELA",
    "MANUTENÇÃO": "MANUTENCAO",
    "MANUTENCAO": "MANUTENCAO"
  };
  if (raw === "ATIVO") return "ATIVO";
  if (raw === "EM_CALIBRACAO" || raw === "EM_CAUTELA" || raw === "MANUTENCAO") return raw;
  if (map[raw]) return map[raw];
  return "ATIVO";
};

let equipamentos = [];
let currentPage = 1;
let editingId = null;

const setStatusMessage = (message) => {
  statusMessage.textContent = message;
};

const toISODate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const addDays = (dateString, days) => {
  if (!dateString) return "";
  const d = new Date(dateString + "T00:00:00");
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
  const days = daysUntil(equipamento.dataVencimento);
  if (days !== null && days < 0) {
    return "VENCIDO";
  }
  if (equipamento.situacaoManual === "EM_CALIBRACAO") return "EM_CALIBRACAO";
  if (equipamento.situacaoManual === "EM_CAUTELA") return "EM_CAUTELA";
  if (equipamento.situacaoManual === "MANUTENCAO") return "MANUTENCAO";
  return "ATIVO";
};

const normalizeEquipamento = (data) => {
  const id = String(data.id || "").trim().toUpperCase();
  const tipo = normalizeTipo(data.tipo);
  const dataCalibracao = data.dataCalibracao ? toISODate(data.dataCalibracao) : "";
  const dataVencimento = dataCalibracao ? addDays(dataCalibracao, 365) : "";
  return {
    id,
    tipo,
    modelo: String(data.modelo || "").trim(),
    numeroSerie: String(data.numeroSerie || "").trim(),
    dataAquisicao: data.dataAquisicao ? toISODate(data.dataAquisicao) : "",
    dataCalibracao,
    dataVencimento,
    certificado: data.certificado ? String(data.certificado).trim() : "",
    fabricante: data.fabricante ? String(data.fabricante).trim() : "",
    responsavelAtual: data.responsavelAtual ? String(data.responsavelAtual).trim() : "",
    situacaoManual: normalizeSituacao(data.situacaoManual),
    observacoes: data.observacoes ? String(data.observacoes).trim() : ""
  };
};

const getFilteredEquipamentos = () => {
  const term = tableSearch.value.trim().toLowerCase();
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
    return matchesTerm && matchesStatus;
  });
};

const renderStatusCards = () => {
  statusCards.textContent = "";
  const counts = {
    total: equipamentos.length,
    ativos: 0,
    vencidos: 0,
    cautela: 0
  };

  equipamentos.forEach((equipamento) => {
    const status = computeStatus(equipamento);
    if (status === "VENCIDO") counts.vencidos += 1;
    if (status === "EM_CAUTELA") counts.cautela += 1;
    if (status === "ATIVO") counts.ativos += 1;
  });

  const cards = [
    { label: "Total", value: counts.total },
    { label: "Ativos", value: counts.ativos },
    { label: "Vencidos", value: counts.vencidos },
    { label: "Em cautela", value: counts.cautela }
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

const renderUpcoming = () => {
  upcomingList.textContent = "";
  const upcoming = equipamentos
    .map((equipamento) => ({
      equipamento,
      days: daysUntil(equipamento.dataVencimento)
    }))
    .filter((item) => item.days !== null && item.days >= 0 && item.days <= 30)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Nenhum equipamento vencendo nos próximos 30 dias.";
    upcomingList.appendChild(empty);
    return;
  }

  upcoming.forEach(({ equipamento, days }) => {
    const item = document.createElement("li");
    item.textContent = `${equipamento.id} • ${equipamento.modelo} • vence em ${days} dia(s)`;
    upcomingList.appendChild(item);
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
    equipamento.numeroSerie
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
    title.textContent = `${equipamento.id} • ${equipamento.modelo}`;
    const details = document.createElement("span");
    details.className = "muted";
    details.textContent = `Série ${equipamento.numeroSerie || "-"} • ${equipamento.responsavelAtual || "Sem responsável"}`;
    card.append(title, details);
    quickResults.appendChild(card);
  });
};

const renderTable = () => {
  const filtered = getFilteredEquipamentos();
  const pageSize = Number(pageSizeSelect.value) || 25;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  tableBody.textContent = "";

  pageItems.forEach((equipamento) => {
    const row = document.createElement("tr");
    const statusValue = computeStatus(equipamento);

    const cells = [
      equipamento.id,
      equipamento.tipo,
      equipamento.modelo,
      equipamento.numeroSerie,
      equipamento.responsavelAtual || "-",
      statusValue,
      formatDate(equipamento.dataVencimento)
    ];

    cells.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 5) {
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

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () => handleDelete(equipamento.id));

    const actions = document.createElement("div");
    actions.className = "toolbar";
    actions.append(editButton, deleteButton);
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
  renderUpcoming();
  renderQuickResults();
  renderTable();
};

const loadEquipamentos = async () => {
  equipamentos = await getAllEquipamentos();
  refreshUI();
};

const resetForm = () => {
  form.reset();
  formFields.dataVencimento.value = "";
  editingId = null;
  formFields.id.disabled = false;
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
  formFields.certificado.value = equipamento.certificado || "";
  formFields.fabricante.value = equipamento.fabricante || "";
  formFields.responsavelAtual.value = equipamento.responsavelAtual || "";
  formFields.situacaoManual.value = equipamento.situacaoManual || "ATIVO";
  formFields.observacoes.value = equipamento.observacoes || "";
  formHint.textContent = "Atualize os campos e pressione salvar.";
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
  if (!confirmed) return;
  await deleteEquipamento(id);
  await loadEquipamentos();
  setStatusMessage(`Equipamento ${id} removido.`);
};

const handleFormSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const id = String(data.id || "").trim().toUpperCase();

  if (!id) {
    formHint.textContent = "Identificação é obrigatória.";
    return;
  }

  if (!normalizeTipo(data.tipo) || !data.numeroSerie || !data.modelo) {
    formHint.textContent = "Preencha os campos obrigatórios.";
    return;
  }

  const existing = equipamentos.find((item) => item.id === id);
  if (!editingId && existing) {
    formHint.textContent = "Identificação já cadastrada.";
    return;
  }

  const equipamento = normalizeEquipamento({
    ...data,
    id,
    tipo: normalizeTipo(data.tipo),
    situacaoManual: normalizeSituacao(data.situacaoManual)
  });

  await saveEquipamento(equipamento);
  await loadEquipamentos();
  closeModalHandler();
  setStatusMessage(editingId ? `Equipamento ${id} atualizado.` : `Equipamento ${id} cadastrado.`);
};

const handleCalibrationUpdate = () => {
  const value = formFields.dataCalibracao.value;
  formFields.dataVencimento.value = value ? addDays(value, 365) : "";
};

const handleImport = async () => {
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

  const confirmed = window.confirm("Importar backup vai substituir todos os dados atuais. Deseja continuar?");
  if (!confirmed) return;

  const normalized = items
    .map((item) => normalizeEquipamento(item || {}))
    .filter((item) => item.id);

  await clearEquipamentos();
  await bulkSaveEquipamentos(normalized);
  await loadEquipamentos();
  setStatusMessage("Backup importado com sucesso.");
  importFile.value = "";
};

const handleExport = () => {
  const payload = {
    generatedAt: new Date().toISOString(),
    equipamentos
  };
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

form.addEventListener("submit", handleFormSubmit);
closeModal.addEventListener("click", closeModalHandler);
cancelModal.addEventListener("click", closeModalHandler);
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

[tableSearch, statusFilter, pageSizeSelect].forEach((input) => {
  input.addEventListener("input", () => {
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

seedButton.addEventListener("click", handleSeed);
exportBackup.addEventListener("click", handleExport);
importBackup.addEventListener("click", handleImport);
resetData.addEventListener("click", handleReset);

window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);

setupTabs();
updateOnlineStatus();
registerServiceWorker();
loadEquipamentos();
renderQuickResults();
