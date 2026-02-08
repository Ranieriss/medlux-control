import {
  openDB,
  upsertEquipamento,
  getEquipamento,
  listEquipamentos,
  deleteEquipamento,
  exportBackupJSON,
  importBackupJSON
} from "./db.js";
import { SEED_EQUIPAMENTOS } from "./seed.js";

const tabs = document.querySelectorAll(".tab");
const sections = document.querySelectorAll(".section");

const equipamentosBody = document.getElementById("equipamentosBody");
const equipamentosEmpty = document.getElementById("equipamentosEmpty");
const novoEquipamentoButton = document.getElementById("novoEquipamento");

const totalEquipamentos = document.getElementById("totalEquipamentos");
const statusOk = document.getElementById("statusOk");
const statusAVencer = document.getElementById("statusAVencer");
const statusVencido = document.getElementById("statusVencido");
const statusSem = document.getElementById("statusSem");
const tipoHorizontal = document.getElementById("tipoHorizontal");
const tipoVertical = document.getElementById("tipoVertical");
const tipoTachas = document.getElementById("tipoTachas");

const exportarBackupButton = document.getElementById("exportarBackup");
const importarBackupInput = document.getElementById("importarBackup");
const importarSeedButton = document.getElementById("importarSeed");
const logList = document.getElementById("logList");

const modal = document.getElementById("equipamentoModal");
const modalTitle = document.getElementById("modalTitle");
const fecharModal = document.getElementById("fecharModal");
const cancelarModal = document.getElementById("cancelarModal");
const equipamentoForm = document.getElementById("equipamentoForm");

const formFields = {
  id: document.getElementById("equipId"),
  tipo: document.getElementById("equipTipo"),
  modelo: document.getElementById("equipModelo"),
  modelo1: document.getElementById("equipModelo1"),
  geometria: document.getElementById("equipGeometria"),
  numeroSerie: document.getElementById("equipNumeroSerie"),
  fabricante: document.getElementById("equipFabricante"),
  dataAquisicao: document.getElementById("equipDataAquisicao"),
  calibrado: document.getElementById("equipCalibrado"),
  dataCalibracao: document.getElementById("equipDataCalibracao"),
  numeroCertificado: document.getElementById("equipNumeroCertificado"),
  responsavelLocal: document.getElementById("equipResponsavel"),
  dataEntrega: document.getElementById("equipDataEntrega"),
  statusOperacional: document.getElementById("equipStatusOperacional"),
  observacoes: document.getElementById("equipObservacoes")
};

const LOG_LIMIT = 10;
const actionLog = [];

const addLog = (message) => {
  const timestamp = new Date().toLocaleString("pt-BR");
  actionLog.unshift(`${timestamp} • ${message}`);
  if (actionLog.length > LOG_LIMIT) {
    actionLog.pop();
  }
  renderLog();
};

const renderLog = () => {
  logList.innerHTML = "";
  if (actionLog.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma ação registrada ainda.";
    logList.appendChild(li);
    return;
  }
  actionLog.forEach((entry) => {
    const li = document.createElement("li");
    li.textContent = entry;
    logList.appendChild(li);
  });
};

const setActiveTab = (tab) => {
  tabs.forEach((item) => item.setAttribute("aria-selected", "false"));
  tab.setAttribute("aria-selected", "true");
  const key = tab.dataset.section;
  sections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.section === key);
  });
};

const parseDateISO = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const toISODate = (date) => date.toISOString().slice(0, 10);

const todayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

const diffDays = (target, base) => {
  const diff = target.getTime() - base.getTime();
  return Math.round(diff / 86400000);
};

const calcularStatusCalibracao = (equipamento) => {
  if (!equipamento.calibrado || !equipamento.dataCalibracao) {
    return {
      status: "SEM_CALIBRACAO",
      dataVencimento: null,
      diasParaVencimento: null
    };
  }

  const dataCalibracao = parseDateISO(equipamento.dataCalibracao);
  if (!dataCalibracao) {
    return {
      status: "SEM_CALIBRACAO",
      dataVencimento: null,
      diasParaVencimento: null
    };
  }

  const dataVencimento = addDays(dataCalibracao, 365);
  const diasParaVencimento = diffDays(dataVencimento, todayUTC());
  let status = "OK";

  if (diasParaVencimento < 0) {
    status = "VENCIDO";
  } else if (diasParaVencimento <= 30) {
    status = "A_VENCER";
  }

  return {
    status,
    dataVencimento: toISODate(dataVencimento),
    diasParaVencimento
  };
};

const badgeClass = (status) => {
  switch (status) {
    case "OK":
      return "status-ok";
    case "A_VENCER":
      return "status-warning";
    case "VENCIDO":
      return "status-danger";
    default:
      return "status-neutral";
  }
};

const formatValue = (value) => (value === null || value === "" ? "-" : value);

const renderEquipamentos = (equipamentos) => {
  equipamentosBody.innerHTML = "";
  equipamentosEmpty.style.display = equipamentos.length ? "none" : "block";

  equipamentos
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((equipamento) => {
      const { status, dataVencimento, diasParaVencimento } = calcularStatusCalibracao(equipamento);
      const tr = document.createElement("tr");

      if (status === "VENCIDO") {
        tr.classList.add("alert");
      }

      tr.innerHTML = `
        <td>${equipamento.id}</td>
        <td>${equipamento.tipo}</td>
        <td>${equipamento.modelo}</td>
        <td>${formatValue(equipamento.numeroSerie)}</td>
        <td>${formatValue(equipamento.responsavelLocal)}</td>
        <td>${formatValue(equipamento.dataCalibracao)}</td>
        <td>${formatValue(dataVencimento)}</td>
        <td>${diasParaVencimento ?? "-"}</td>
        <td><span class="status-badge ${badgeClass(status)}">${status}</span></td>
        <td>${formatValue(equipamento.statusOperacional)}</td>
        <td class="actions">
          <button class="button" type="button" data-action="edit" data-id="${equipamento.id}">Editar</button>
          <button class="button" type="button" data-action="delete" data-id="${equipamento.id}">Excluir</button>
        </td>
      `;

      equipamentosBody.appendChild(tr);
    });
};

const renderDashboard = (equipamentos) => {
  const stats = {
    OK: 0,
    A_VENCER: 0,
    VENCIDO: 0,
    SEM_CALIBRACAO: 0
  };

  const tipos = {
    Horizontal: 0,
    Vertical: 0,
    Tachas: 0
  };

  equipamentos.forEach((equipamento) => {
    const { status } = calcularStatusCalibracao(equipamento);
    stats[status] += 1;
    if (tipos[equipamento.tipo] !== undefined) {
      tipos[equipamento.tipo] += 1;
    }
  });

  totalEquipamentos.textContent = equipamentos.length;
  statusOk.textContent = stats.OK;
  statusAVencer.textContent = stats.A_VENCER;
  statusVencido.textContent = stats.VENCIDO;
  statusSem.textContent = stats.SEM_CALIBRACAO;
  tipoHorizontal.textContent = tipos.Horizontal;
  tipoVertical.textContent = tipos.Vertical;
  tipoTachas.textContent = tipos.Tachas;
};

const refreshUI = async () => {
  const equipamentos = await listEquipamentos();
  renderEquipamentos(equipamentos);
  renderDashboard(equipamentos);
};

const resetForm = () => {
  equipamentoForm.reset();
  formFields.statusOperacional.value = "ATIVO";
  formFields.id.readOnly = false;
  equipamentoForm.dataset.editing = "";
};

const openModal = (equipamento) => {
  if (equipamento) {
    modalTitle.textContent = `Editar ${equipamento.id}`;
    formFields.id.value = equipamento.id;
    formFields.tipo.value = equipamento.tipo;
    formFields.modelo.value = equipamento.modelo;
    formFields.modelo1.value = equipamento.modelo1 ?? "";
    formFields.geometria.value = equipamento.geometria ?? "";
    formFields.numeroSerie.value = equipamento.numeroSerie ?? "";
    formFields.fabricante.value = equipamento.fabricante ?? "";
    formFields.dataAquisicao.value = equipamento.dataAquisicao ?? "";
    formFields.calibrado.checked = Boolean(equipamento.calibrado);
    formFields.dataCalibracao.value = equipamento.dataCalibracao ?? "";
    formFields.numeroCertificado.value = equipamento.numeroCertificado ?? "";
    formFields.responsavelLocal.value = equipamento.responsavelLocal ?? "";
    formFields.dataEntrega.value = equipamento.dataEntrega ?? "";
    formFields.statusOperacional.value = equipamento.statusOperacional ?? "ATIVO";
    formFields.observacoes.value = equipamento.observacoes ?? "";
    equipamentoForm.dataset.editing = equipamento.id;
    formFields.id.readOnly = true;
  } else {
    modalTitle.textContent = "Novo equipamento";
    resetForm();
  }

  modal.showModal();
};

const closeModal = () => {
  modal.close();
  resetForm();
};

const collectFormData = () => {
  const geometriaValue = formFields.geometria.value.trim();
  const dataCalibracao = formFields.dataCalibracao.value || null;
  const calibrado = formFields.calibrado.checked;

  return {
    id: formFields.id.value.trim(),
    tipo: formFields.tipo.value,
    modelo: formFields.modelo.value.trim(),
    modelo1: formFields.modelo1.value.trim(),
    geometria: geometriaValue === "" ? null : Number(geometriaValue),
    numeroSerie: formFields.numeroSerie.value.trim(),
    fabricante: formFields.fabricante.value.trim(),
    dataAquisicao: formFields.dataAquisicao.value || "",
    calibrado,
    dataCalibracao: calibrado ? dataCalibracao : null,
    numeroCertificado: formFields.numeroCertificado.value.trim(),
    responsavelLocal: formFields.responsavelLocal.value.trim(),
    dataEntrega: formFields.dataEntrega.value || null,
    observacoes: formFields.observacoes.value.trim(),
    statusOperacional: formFields.statusOperacional.value || "ATIVO"
  };
};

const handleFormSubmit = async (event) => {
  event.preventDefault();
  const equipamento = collectFormData();

  if (!equipamento.id || !equipamento.tipo || !equipamento.modelo) {
    alert("Preencha Identificação, Tipo e Modelo.");
    return;
  }

  await upsertEquipamento(equipamento);
  addLog(`Equipamento ${equipamento.id} salvo.`);
  closeModal();
  await refreshUI();
};

const handleTableClick = async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const { action, id } = button.dataset;
  if (!action || !id) return;

  if (action === "edit") {
    const equipamento = await getEquipamento(id);
    if (equipamento) {
      openModal(equipamento);
    }
  }

  if (action === "delete") {
    const confirmar = confirm(`Excluir equipamento ${id}?`);
    if (!confirmar) return;
    await deleteEquipamento(id);
    addLog(`Equipamento ${id} excluído.`);
    await refreshUI();
  }
};

const handleExportBackup = async () => {
  const jsonString = await exportBackupJSON();
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `medlux-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  addLog("Backup exportado.");
};

const handleImportBackup = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const confirmar = confirm("Importar backup irá substituir todos os dados locais. Deseja continuar?");
  if (!confirmar) {
    event.target.value = "";
    return;
  }

  const jsonString = await file.text();
  try {
    await importBackupJSON(jsonString);
    addLog("Backup importado com sucesso.");
    await refreshUI();
  } catch (error) {
    alert(error.message);
  } finally {
    event.target.value = "";
  }
};

const handleImportSeed = async () => {
  const equipamentos = await listEquipamentos();
  if (equipamentos.length > 0) {
    alert("O seed só pode ser importado quando não há registros no banco.");
    return;
  }

  for (const equipamento of SEED_EQUIPAMENTOS) {
    await upsertEquipamento(equipamento);
  }

  addLog("Seed importado com sucesso.");
  await refreshUI();
};

const init = async () => {
  await openDB();
  renderLog();
  await refreshUI();
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab));
});

novoEquipamentoButton.addEventListener("click", () => openModal());
fecharModal.addEventListener("click", closeModal);
cancelarModal.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

equipamentoForm.addEventListener("submit", handleFormSubmit);
equipamentosBody.addEventListener("click", handleTableClick);
exportarBackupButton.addEventListener("click", handleExportBackup);
importarBackupInput.addEventListener("change", handleImportBackup);
importarSeedButton.addEventListener("click", handleImportSeed);

init();
