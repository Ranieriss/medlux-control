import {
  getAllEquipamentos,
  getAllVinculos,
  saveMedicao,
  getMedicoesByUser,
  getAllMedicoes,
  saveAuditoria
} from "../shared/db.js";
import { ensureDefaultAdmin, authenticate, logout, requireAuth, getSession } from "../shared/auth.js";

const medicaoForm = document.getElementById("medicaoForm");
const medicaoEquip = document.getElementById("medicaoEquip");
const medicoesBody = document.getElementById("medicoesBody");
const medicaoHint = document.getElementById("medicaoHint");
const statusMessage = document.getElementById("statusMessage");
const syncStatus = document.getElementById("syncStatus");
const leiturasList = document.getElementById("leiturasList");
const addLeituraButton = document.getElementById("addLeitura");
const applyLeituraListButton = document.getElementById("applyLeituraList");
const leiturasPaste = document.getElementById("leiturasPaste");
const medicaoMedia = document.getElementById("medicaoMedia");
const logoutButton = document.getElementById("logoutButton");
const gpsCaptureButton = document.getElementById("captureGps");
const gpsStatus = document.getElementById("gpsStatus");
const gpsLat = document.getElementById("gpsLat");
const gpsLng = document.getElementById("gpsLng");
const gpsAcc = document.getElementById("gpsAcc");
const gpsSource = document.getElementById("gpsSource");
const fotoMedicaoInput = document.getElementById("fotoMedicao");
const fotoLocalInput = document.getElementById("fotoLocal");
const fotoMedicaoInfo = document.getElementById("fotoMedicaoInfo");
const fotoLocalInfo = document.getElementById("fotoLocalInfo");

const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginHint = document.getElementById("loginHint");

let activeSession = null;
let equipamentos = [];
let vinculos = [];
let medicoes = [];

const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ");

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
      medicao.obra_id || "-",
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

const addLeituraInput = (value = "") => {
  const index = leiturasList.querySelectorAll(".reading-item").length + 1;
  const wrapper = document.createElement("div");
  wrapper.className = "reading-item";
  const label = document.createElement("label");
  label.textContent = `Leitura ${index}`;
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.01";
  input.required = true;
  input.value = value;
  input.addEventListener("input", updateMedia);
  wrapper.append(label, input);
  leiturasList.appendChild(wrapper);
};

const rebuildLeituras = (values = []) => {
  leiturasList.textContent = "";
  if (!values.length) {
    addLeituraInput();
  } else {
    values.forEach((value) => addLeituraInput(value));
  }
  updateMedia();
};

const getLeituras = () => Array.from(leiturasList.querySelectorAll("input")).map((input) => {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
});

const parseLeituraList = (text) => text
  .split(/[;\n\r,\t ]+/)
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => Number(item.replace(",", ".")))
  .filter((value) => Number.isFinite(value));

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

const updatePhotoInfo = (input, target) => {
  const count = input.files?.length || 0;
  target.textContent = count ? `${count} foto(s) selecionada(s).` : "Nenhuma foto selecionada.";
};

const compressImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 1600;
      let { width, height } = img;
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob || file),
        file.type || "image/jpeg",
        0.75
      );
    };
    img.onerror = () => reject(new Error("Falha ao carregar imagem."));
    img.src = reader.result;
  };
  reader.onerror = () => reject(new Error("Falha ao ler imagem."));
  reader.readAsDataURL(file);
});

const collectFotos = async () => {
  const fotos = [];
  const addFiles = async (files, tipo) => {
    for (const file of Array.from(files || [])) {
      try {
        const blob = await compressImage(file);
        fotos.push({
          name: file.name,
          mime: blob.type || file.type || "image/jpeg",
          blob,
          tipo
        });
      } catch (error) {
        // Ignora falhas de compressão
      }
    }
  };
  await addFiles(fotoMedicaoInput.files, "MEDICAO");
  await addFiles(fotoLocalInput.files, "LOCAL");
  return fotos;
};

const updateGpsInputs = ({ lat, lng, accuracy, source }) => {
  gpsLat.value = lat ?? "";
  gpsLng.value = lng ?? "";
  gpsAcc.value = accuracy ?? "";
  gpsSource.value = source || "";
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

const handleCaptureGps = () => {
  gpsStatus.textContent = "Capturando localização...";
  if (!navigator.geolocation) {
    gpsStatus.textContent = "Geolocalização não suportada. Preencha manualmente.";
    updateGpsInputs({ source: "MANUAL" });
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      updateGpsInputs({ lat: latitude.toFixed(6), lng: longitude.toFixed(6), accuracy: Math.round(accuracy), source: "AUTO" });
      gpsStatus.textContent = "GPS capturado automaticamente.";
    },
    (error) => {
      gpsStatus.textContent = `Falha ao capturar GPS: ${error.message}. Preencha manualmente.`;
      updateGpsInputs({ source: "MANUAL" });
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

const handleMedicaoSubmit = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(medicaoForm).entries());
  if (!data.equip_id || !data.tipo_medicao || !data.obra_id) {
    medicaoHint.textContent = "Preencha todos os campos obrigatórios.";
    return;
  }
  const leituras = getLeituras();
  if (!leituras.length || leituras.some((item) => item === null)) {
    medicaoHint.textContent = "Informe as leituras corretamente.";
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
  const obraId = normalizeText(data.obra_id).toUpperCase();
  const relatorioId = normalizeText(data.relatorio_id).toUpperCase();
  const gpsLatValue = Number(gpsLat.value);
  const gpsLngValue = Number(gpsLng.value);
  const gpsAccValue = Number(gpsAcc.value);
  const gps = {
    lat: Number.isFinite(gpsLatValue) ? gpsLatValue : null,
    lng: Number.isFinite(gpsLngValue) ? gpsLngValue : null,
    accuracy: Number.isFinite(gpsAccValue) ? gpsAccValue : null,
    source: gpsSource.value || (Number.isFinite(gpsLatValue) && Number.isFinite(gpsLngValue) ? "MANUAL" : "")
  };
  const fotos = await collectFotos();
  const medicao = {
    id: medicaoId,
    medicao_id: medicaoId,
    equipamento_id: data.equip_id,
    equip_id: data.equip_id,
    user_id: activeSession.id,
    obra_id: obraId,
    relatorio_id: relatorioId || "",
    dataHora: now,
    data_hora: now,
    tipoMedicao: data.tipo_medicao,
    tipo_medicao: data.tipo_medicao,
    leituras,
    media,
    unidade: data.unidade || "",
    enderecoTexto: data.enderecoTexto || "",
    cidadeUF: data.cidadeUF || "",
    rodovia: data.rodovia || "",
    km: data.km || "",
    sentido: data.sentido || "",
    faixa: data.faixa || "",
    clima: data.clima || "",
    observacoes: data.observacoes || "",
    gps,
    fotos,
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
  rebuildLeituras();
  updateGpsInputs({ lat: null, lng: null, accuracy: null, source: "" });
  gpsStatus.textContent = "Sem captura.";
  fotoMedicaoInfo.textContent = "Nenhuma foto selecionada.";
  fotoLocalInfo.textContent = "Nenhuma foto selecionada.";
  setStatusMessage("Medição registrada com sucesso.");
};

const initialize = async () => {
  await ensureDefaultAdmin();
  const authorized = requireAuth({
    allowRoles: ["OPERADOR", "ADMIN"],
    onMissing: () => openModal(loginModal),
    onUnauthorized: () => { window.location.href = "../index.html"; }
  });
  rebuildLeituras();
  if (!authorized) return;
  activeSession = getSession();
  await loadData();
  renderEquipamentos();
  renderMedicoes();
  syncStatus.textContent = navigator.onLine ? "Online • IndexedDB" : "Offline pronto • IndexedDB";
};

loginForm.addEventListener("submit", handleLogin);
medicaoForm.addEventListener("submit", handleMedicaoSubmit);
addLeituraButton.addEventListener("click", () => {
  if (leiturasList.querySelectorAll("input").length >= 50) return;
  addLeituraInput();
  updateMedia();
  medicaoHint.textContent = "Campos com * são obrigatórios.";
});
applyLeituraListButton.addEventListener("click", () => {
  const values = parseLeituraList(leiturasPaste.value || "");
  if (!values.length) {
    medicaoHint.textContent = "Nenhuma leitura válida na lista colada.";
    return;
  }
  rebuildLeituras(values);
  medicaoHint.textContent = "Campos com * são obrigatórios.";
});
gpsCaptureButton.addEventListener("click", handleCaptureGps);
fotoMedicaoInput.addEventListener("change", () => updatePhotoInfo(fotoMedicaoInput, fotoMedicaoInfo));
fotoLocalInput.addEventListener("change", () => updatePhotoInfo(fotoLocalInput, fotoLocalInfo));
[gpsLat, gpsLng, gpsAcc].forEach((input) => {
  input.addEventListener("input", () => {
    if (!gpsSource.value) gpsSource.value = "MANUAL";
  });
});
logoutButton.addEventListener("click", () => {
  logout();
  window.location.href = "../index.html";
});

window.addEventListener("online", () => { syncStatus.textContent = "Online • IndexedDB"; });
window.addEventListener("offline", () => { syncStatus.textContent = "Offline pronto • IndexedDB"; });

initialize();
