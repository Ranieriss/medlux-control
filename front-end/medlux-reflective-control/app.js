import {
  getAllEquipamentos,
  getAllVinculos,
  saveMedicao,
  getMedicoesByUser,
  saveAuditoria
} from "../shared/db.js";
import { ensureDefaultAdmin, authenticate, getSession } from "../shared/auth.js";

const medicaoForm = document.getElementById("medicaoForm");
const medicaoEquip = document.getElementById("medicaoEquip");
const medicoesBody = document.getElementById("medicoesBody");
const medicaoHint = document.getElementById("medicaoHint");
const statusMessage = document.getElementById("statusMessage");
const syncStatus = document.getElementById("syncStatus");

const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginHint = document.getElementById("loginHint");

let activeSession = null;
let equipamentos = [];
let vinculos = [];
let medicoes = [];

const openModal = (element) => {
  element.classList.add("active");
  element.setAttribute("aria-hidden", "false");
};

const closeModal = (element) => {
  element.classList.remove("active");
  element.setAttribute("aria-hidden", "true");
};

const setStatusMessage = (message) => {
  statusMessage.textContent = message;
};

const renderEquipamentos = () => {
  medicaoEquip.textContent = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "Selecione";
  medicaoEquip.appendChild(option);
  const vinculados = vinculos.filter((item) => item.ativo && item.user_id === activeSession?.user_id);
  vinculados.forEach((vinculo) => {
    const equipamento = equipamentos.find((item) => item.id === vinculo.equip_id);
    const opt = document.createElement("option");
    opt.value = vinculo.equip_id;
    opt.textContent = `${vinculo.equip_id} • ${equipamento?.modelo || "Sem modelo"}`;
    medicaoEquip.appendChild(opt);
  });
};

const renderMedicoes = () => {
  medicoesBody.textContent = "";
  medicoes.slice(0, 20).forEach((medicao) => {
    const row = document.createElement("tr");
    [
      medicao.equip_id,
      medicao.tipo_medicao,
      medicao.valor,
      new Date(medicao.data_hora).toLocaleString("pt-BR")
    ].forEach((text) => {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.appendChild(cell);
    });
    medicoesBody.appendChild(row);
  });
};

const loadData = async () => {
  [equipamentos, vinculos, medicoes] = await Promise.all([
    getAllEquipamentos(),
    getAllVinculos(),
    getMedicoesByUser(activeSession?.user_id)
  ]);
};

const handleLogin = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm).entries());
  const result = await authenticate(data.user_id.toUpperCase(), data.pin);
  if (!result.success) {
    loginHint.textContent = result.message;
    return;
  }
  if (result.session.role !== "OPERADOR" && result.session.role !== "ADMIN") {
    loginHint.textContent = "Apenas operadores podem registrar medições.";
    return;
  }
  activeSession = result.session;
  closeModal(loginModal);
  await loadData();
  renderEquipamentos();
  renderMedicoes();
  setStatusMessage(`Bem-vindo, ${activeSession.nome}.`);
};

const handleMedicaoSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(medicaoForm).entries());
  if (!data.equip_id || !data.tipo_medicao || !data.valor) {
    medicaoHint.textContent = "Preencha todos os campos obrigatórios.";
    return;
  }
  const vinculoAtivo = vinculos.find((item) => item.ativo && item.equip_id === data.equip_id && item.user_id === activeSession.user_id);
  if (!vinculoAtivo) {
    medicaoHint.textContent = "Equipamento não vinculado ao operador.";
    return;
  }
  const medicao = {
    medicao_id: crypto.randomUUID(),
    equip_id: data.equip_id,
    user_id: activeSession.user_id,
    data_hora: new Date().toISOString(),
    tipo_medicao: data.tipo_medicao,
    valor: data.valor,
    observacoes: data.observacoes || ""
  };
  await saveMedicao(medicao);
  await saveAuditoria({
    auditoria_id: crypto.randomUUID(),
    entity: "medicoes",
    action: "create",
    data_hora: new Date().toISOString(),
    payload: { equip_id: data.equip_id, user_id: activeSession.user_id }
  });
  medicoes = await getMedicoesByUser(activeSession.user_id);
  renderMedicoes();
  medicaoForm.reset();
  setStatusMessage("Medição registrada com sucesso.");
};

const initialize = async () => {
  await ensureDefaultAdmin();
  activeSession = getSession();
  if (!activeSession) {
    openModal(loginModal);
    return;
  }
  await loadData();
  renderEquipamentos();
  renderMedicoes();
  syncStatus.textContent = navigator.onLine ? "Online • IndexedDB" : "Offline pronto • IndexedDB";
};

loginForm.addEventListener("submit", handleLogin);
medicaoForm.addEventListener("submit", handleMedicaoSubmit);

window.addEventListener("online", () => { syncStatus.textContent = "Online • IndexedDB"; });
window.addEventListener("offline", () => { syncStatus.textContent = "Offline pronto • IndexedDB"; });

initialize();
