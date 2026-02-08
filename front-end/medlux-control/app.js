const DB_NAME = "medlux_control_db";
const DB_VERSION = 1;
const STORE_NAME = "equipamentos";

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
const seedEquipamentos = document.getElementById("seedEquipamentos");
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
  status: document.getElementById("equipStatus"),
  dataUltimaCalibracao: document.getElementById("equipCalibracao"),
  dataVencimentoCalibracao: document.getElementById("equipVencimento"),
  responsavelAtual: document.getElementById("equipResponsavel"),
  observacoes: document.getElementById("equipObs")
};

let equipamentos = [];
let currentPage = 1;
let editingId = null;

const STATUS_OPTIONS = ["ATIVO", "EM CAUTELA", "EM CALIBRAÇÃO", "MANUTENÇÃO", "VENCIDO"];

const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "id" });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const withStore = async (mode, callback) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = callback(store);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
};

const getAllEquipamentos = () => withStore("readonly", (store) => {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
});

const saveEquipamento = (equipamento) => withStore("readwrite", (store) => store.put(equipamento));
const deleteEquipamento = (id) => withStore("readwrite", (store) => store.delete(id));
const clearEquipamentos = () => withStore("readwrite", (store) => store.clear());

const setStatusMessage = (message) => {
  statusMessage.textContent = message;
};

const toISODate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const addOneYear = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  const next = new Date(d);
  next.setFullYear(d.getFullYear() + 1);
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
  const target = new Date(dateString + "T00:00:00");
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const computedStatus = (equipamento) => {
  const days = daysUntil(equipamento.dataVencimentoCalibracao);
  if (days !== null && days < 0) {
    return "VENCIDO";
  }
  return equipamento.status || "ATIVO";
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
    const statusValue = computedStatus(equipamento);
    const matchesStatus = !status || statusValue === status;
    return matchesTerm && matchesStatus;
  });
};

const renderStatusCards = () => {
  statusCards.textContent = "";
  const counts = STATUS_OPTIONS.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});
  equipamentos.forEach((equipamento) => {
    const status = computedStatus(equipamento);
    if (counts[status] !== undefined) {
      counts[status] += 1;
    }
  });

  STATUS_OPTIONS.forEach((status) => {
    const card = document.createElement("div");
    card.className = "status-card";
    const label = document.createElement("span");
    label.textContent = status;
    const value = document.createElement("strong");
    value.textContent = String(counts[status] || 0);
    card.append(label, value);
    statusCards.appendChild(card);
  });
};

const renderUpcoming = () => {
  upcomingList.textContent = "";
  const upcoming = equipamentos
    .map((equipamento) => ({
      equipamento,
      days: daysUntil(equipamento.dataVencimentoCalibracao)
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

  const results = equipamentos.filter((equipamento) => {
    return [
      equipamento.id,
      equipamento.modelo,
      equipamento.numeroSerie
    ].some((field) => (field || "").toLowerCase().includes(term));
  }).slice(0, 5);

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

    const cells = [
      equipamento.id,
      equipamento.tipo,
      equipamento.modelo,
      equipamento.numeroSerie,
      equipamento.status,
      formatDate(equipamento.dataUltimaCalibracao),
      formatDate(equipamento.dataVencimentoCalibracao),
      equipamento.responsavelAtual || "-"
    ];

    cells.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 4) {
        const statusValue = computedStatus(equipamento);
        const pill = document.createElement("span");
        pill.className = "status-pill";
        if (statusValue === "VENCIDO") {
          pill.classList.add("danger");
        } else if (statusValue === "EM CALIBRAÇÃO") {
          pill.classList.add("warning");
        } else if (statusValue === "ATIVO") {
          pill.classList.add("success");
        }
        pill.textContent = statusValue;
        cell.appendChild(pill);
        const days = daysUntil(equipamento.dataVencimentoCalibracao);
        if (days !== null && days < 0 && equipamento.status !== "VENCIDO") {
          const note = document.createElement("div");
          note.className = "muted";
          note.textContent = "Ajustado automaticamente";
          cell.appendChild(note);
        }
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
  formFields.dataVencimentoCalibracao.value = "";
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
  formFields.status.value = equipamento.status || "ATIVO";
  formFields.dataUltimaCalibracao.value = equipamento.dataUltimaCalibracao || "";
  formFields.dataVencimentoCalibracao.value = equipamento.dataVencimentoCalibracao || "";
  formFields.responsavelAtual.value = equipamento.responsavelAtual || "";
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
  const id = data.id.trim().toUpperCase();
  if (!id) {
    formHint.textContent = "Identificação é obrigatória.";
    return;
  }

  if (!data.tipo || !data.numeroSerie || !data.modelo) {
    formHint.textContent = "Preencha os campos obrigatórios.";
    return;
  }

  const existing = equipamentos.find((item) => item.id === id);
  if (!editingId && existing) {
    formHint.textContent = "Identificação já cadastrada.";
    return;
  }

  const isEditing = Boolean(editingId);
  const calibracao = data.dataUltimaCalibracao ? toISODate(data.dataUltimaCalibracao) : "";
  const vencimento = calibracao ? addOneYear(calibracao) : "";

  const equipamento = {
    id,
    tipo: data.tipo,
    numeroSerie: data.numeroSerie.trim(),
    modelo: data.modelo.trim(),
    dataAquisicao: data.dataAquisicao ? toISODate(data.dataAquisicao) : "",
    status: data.status || "ATIVO",
    dataUltimaCalibracao: calibracao,
    dataVencimentoCalibracao: vencimento,
    responsavelAtual: data.responsavelAtual ? data.responsavelAtual.trim() : "",
    observacoes: data.observacoes ? data.observacoes.trim() : ""
  };

  await saveEquipamento(equipamento);
  await loadEquipamentos();
  closeModalHandler();
  setStatusMessage(isEditing ? `Equipamento ${id} atualizado.` : `Equipamento ${id} cadastrado.`);
};

const handleCalibrationUpdate = () => {
  const value = formFields.dataUltimaCalibracao.value;
  formFields.dataVencimentoCalibracao.value = value ? addOneYear(value) : "";
};

const handleQuickSearch = () => {
  renderQuickResults();
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

  await clearEquipamentos();
  for (const item of items) {
    if (item && item.id) {
      await saveEquipamento({
        id: String(item.id).trim().toUpperCase(),
        tipo: item.tipo || "Horizontal",
        numeroSerie: item.numeroSerie || "",
        modelo: item.modelo || "",
        dataAquisicao: item.dataAquisicao || "",
        status: item.status || "ATIVO",
        dataUltimaCalibracao: item.dataUltimaCalibracao || "",
        dataVencimentoCalibracao: item.dataVencimentoCalibracao || "",
        responsavelAtual: item.responsavelAtual || "",
        observacoes: item.observacoes || ""
      });
    }
  }
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
  link.download = `medlux-backup-${new Date().toISOString().slice(0,10)}.json`;
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

const seedData = async () => {
  const confirmed = window.confirm("Carregar dados de exemplo? Isso adiciona registros ao banco.");
  if (!confirmed) return;
  const sample = [
    {
      id: "RH01",
      tipo: "Horizontal",
      numeroSerie: "HX-8321",
      modelo: "MTLX-300",
      dataAquisicao: "2022-01-12",
      status: "ATIVO",
      dataUltimaCalibracao: "2024-02-15",
      dataVencimentoCalibracao: addOneYear("2024-02-15"),
      responsavelAtual: "Donevir",
      observacoes: "Em operação padrão."
    },
    {
      id: "RV02",
      tipo: "Vertical",
      numeroSerie: "VX-2210",
      modelo: "MTLX-280",
      dataAquisicao: "2021-08-05",
      status: "EM CAUTELA",
      dataUltimaCalibracao: "2023-11-01",
      dataVencimentoCalibracao: addOneYear("2023-11-01"),
      responsavelAtual: "Leonardo",
      observacoes: "Retirado para obras." 
    },
    {
      id: "RT03",
      tipo: "Tachas",
      numeroSerie: "TX-901",
      modelo: "MTLX-150",
      dataAquisicao: "2020-03-20",
      status: "MANUTENÇÃO",
      dataUltimaCalibracao: "2023-05-20",
      dataVencimentoCalibracao: addOneYear("2023-05-20"),
      responsavelAtual: "Cesar",
      observacoes: "Aguardando reparo no sensor." 
    },
    {
      id: "RH04",
      tipo: "Horizontal",
      numeroSerie: "HX-4433",
      modelo: "MTLX-310",
      dataAquisicao: "2022-11-11",
      status: "ATIVO",
      dataUltimaCalibracao: "2024-01-10",
      dataVencimentoCalibracao: addOneYear("2024-01-10"),
      responsavelAtual: "Equipe Norte",
      observacoes: "Reserva estratégica." 
    },
    {
      id: "RV05",
      tipo: "Vertical",
      numeroSerie: "VX-3002",
      modelo: "MTLX-290",
      dataAquisicao: "2021-06-18",
      status: "EM CALIBRAÇÃO",
      dataUltimaCalibracao: "2024-03-02",
      dataVencimentoCalibracao: addOneYear("2024-03-02"),
      responsavelAtual: "Laboratório",
      observacoes: "Processo em andamento." 
    },
    {
      id: "RT06",
      tipo: "Tachas",
      numeroSerie: "TX-404",
      modelo: "MTLX-160",
      dataAquisicao: "2023-09-07",
      status: "ATIVO",
      dataUltimaCalibracao: "2024-04-12",
      dataVencimentoCalibracao: addOneYear("2024-04-12"),
      responsavelAtual: "Sandra",
      observacoes: "Equipamento recém-calibrado." 
    }
  ];

  for (const item of sample) {
    await saveEquipamento(item);
  }
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
  formFields.dataUltimaCalibracao.value = today;
  handleCalibrationUpdate();
});
formFields.dataUltimaCalibracao.addEventListener("change", handleCalibrationUpdate);

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

quickSearch.addEventListener("input", handleQuickSearch);
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

seedEquipamentos.addEventListener("click", seedData);
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
