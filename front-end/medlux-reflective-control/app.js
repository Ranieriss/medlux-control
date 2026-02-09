import {
  getAllEquipamentos,
  getAllVinculos,
  saveMedicao,
  getMedicoesByUser,
  getAllMedicoes,
  saveAuditoria
} from "../shared/db.js";
import { ensureDefaultAdmin, authenticate, logout, requireAuth } from "../shared/auth.js";

const medicaoForm = document.getElementById("medicaoForm");
const medicaoEquip = document.getElementById("medicaoEquip");
const medicoesBody = document.getElementById("medicoesBody");
const medicaoHint = document.getElementById("medicaoHint");
const statusMessage = document.getElementById("statusMessage");
const syncStatus = document.getElementById("syncStatus");
const leituraQtd = document.getElementById("medicaoQtd");
const leiturasList = document.getElementById("leiturasList");
const medicaoMedia = document.getElementById("medicaoMedia");
const logoutButton = document.getElementById("logoutButton");

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

const isAdmin = () => activeSession?.role === "ADMIN";

const isVinculoAtivo = (item) => item.status === "ATIVO" || item.ativo === true;

const renderEquipamentos = () => {
  medicaoEquip.textContent = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "Selecione";
  medicaoEquip.appendChild(option);
  const disponíveis = isAdmin()
    ? equipamentos
    : vinculos
      .filter((item) => isVinculoAtivo(item) && item.user_id === activeSession?.id)
      .map((vinculo) => equipamentos.find((item) => item.id === (vinculo.equipamento_id || vinculo.equip_id)))
      .filter(Boolean);
  disponíveis.forEach((equipamento) => {
    const opt = document.createElement("option");
    opt.value = equipamento.id;
    opt.textContent = `${equipamento.id} • ${equipamento?.modelo || "Sem modelo"}`;
    medicaoEquip.appendChild(opt);
  });
};

const renderMedicoes = () => {
  medicoesBody.textContent = "";
  medicoes.slice(0, 20).forEach((medicao) => {
    const row = document.createElement("tr");
    const leituras = medicao.leituras || [];
    const qtd = leituras.length || (medicao.valor ? 1 : 0);
    const dataHora = medicao.dataHora || medicao.data_hora;
    const dataLabel = dataHora ? new Date(dataHora).toLocaleString("pt-BR") : "-";
    [
      medicao.equipamento_id || medicao.equip_id,
      medicao.tipoMedicao || medicao.tipo_medicao,
      medicao.media ?? medicao.valor ?? "-",
      qtd,
      dataLabel
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
    isAdmin() ? getAllMedicoes() : getMedicoesByUser(activeSession?.id)
  ]);
};

const rebuildLeituras = (quantidade) => {
  leiturasList.textContent = "";
  for (let index = 1; index <= quantidade; index += 1) {
    const wrapper = document.createElement("div");
    wrapper.className = "reading-item";
    const label = document.createElement("label");
    label.textContent = `Leitura ${index}`;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.required = true;
    input.addEventListener("input", updateMedia);
    wrapper.append(label, input);
    leiturasList.appendChild(wrapper);
  }
  updateMedia();
};

const getLeituras = () => Array.from(leiturasList.querySelectorAll("input")).map((input) => {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
});

const updateMedia = () => {
  const leituras = getLeituras();
  const valid = leituras.filter((item) => item !== null);
  if (!valid.length) {
    medicaoMedia.value = "";
    return;
  }
  const media = valid.reduce((acc, item) => acc + item, 0) / valid.length;
  medicaoMedia.value = media.toFixed(2);
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
    loginHint.textContent = "Perfil não autorizado.";
    logout();
    return;
  }
  const vinculosAtivos = await getAllVinculos();
  if (result.session.role === "OPERADOR") {
    const possuiVinculo = vinculosAtivos.some((item) => isVinculoAtivo(item) && item.user_id === result.session.id);
    if (!possuiVinculo) {
      loginHint.textContent = "Sem vínculo ativo";
      logout();
      return;
    }
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
  const quantidade = Number(data.quantidade_leituras || leituraQtd.value);
  if (!data.equip_id || !data.tipo_medicao || !quantidade) {
    medicaoHint.textContent = "Preencha todos os campos obrigatórios.";
    return;
  }
  const leituras = getLeituras();
  if (leituras.length !== quantidade || leituras.some((item) => item === null)) {
    medicaoHint.textContent = "Preencha todas as leituras.";
    return;
  }
  if (!isAdmin()) {
    const vinculoAtivo = vinculos.find((item) => isVinculoAtivo(item) && (item.equipamento_id || item.equip_id) === data.equip_id && item.user_id === activeSession.id);
    if (!vinculoAtivo) {
      medicaoHint.textContent = "Equipamento não vinculado ao operador.";
      return;
    }
  }
  const media = leituras.reduce((acc, item) => acc + item, 0) / leituras.length;
  const now = new Date().toISOString();
  const medicaoId = crypto.randomUUID();
  const medicao = {
    id: medicaoId,
    medicao_id: medicaoId,
    equipamento_id: data.equip_id,
    equip_id: data.equip_id,
    user_id: activeSession.id,
    dataHora: now,
    data_hora: now,
    tipoMedicao: data.tipo_medicao,
    tipo_medicao: data.tipo_medicao,
    leituras,
    media,
    observacoes: data.observacoes || "",
    created_at: now
  };
  await saveMedicao(medicao);
  await saveAuditoria({
    auditoria_id: crypto.randomUUID(),
    entity: "medicoes",
    action: "create",
    data_hora: now,
    payload: { equip_id: data.equip_id, user_id: activeSession.id }
  });
  medicoes = isAdmin() ? await getAllMedicoes() : await getMedicoesByUser(activeSession.id);
  renderMedicoes();
  medicaoForm.reset();
  leituraQtd.value = "10";
  rebuildLeituras(10);
  setStatusMessage("Medição registrada com sucesso.");
};

const initialize = async () => {
  await ensureDefaultAdmin();
  activeSession = requireAuth({
    allowRoles: ["OPERADOR", "ADMIN"],
    onMissing: () => openModal(loginModal),
    onUnauthorized: () => { window.location.href = "../index.html"; }
  });
  rebuildLeituras(Number(leituraQtd.value));
  if (!activeSession) return;
  await loadData();
  renderEquipamentos();
  renderMedicoes();
  syncStatus.textContent = navigator.onLine ? "Online • IndexedDB" : "Offline pronto • IndexedDB";
};

loginForm.addEventListener("submit", handleLogin);
medicaoForm.addEventListener("submit", handleMedicaoSubmit);
leituraQtd.addEventListener("change", (event) => {
  const quantidade = Math.max(1, Math.min(50, Number(event.target.value || 1)));
  leituraQtd.value = quantidade;
  rebuildLeituras(quantidade);
});
logoutButton.addEventListener("click", () => {
  logout();
  window.location.href = "../index.html";
});

window.addEventListener("online", () => { syncStatus.textContent = "Online • IndexedDB"; });
window.addEventListener("offline", () => { syncStatus.textContent = "Offline pronto • IndexedDB"; });

initialize();
