import {
  getAllEquipamentos,
  getAllVinculos,
  saveMedicao,
  getMedicoesByUser,
  getAllMedicoes,
  getAllObras,
  saveAuditoria
} from "../shared/db.js";
import { ensureDefaultAdmin, authenticate, logout, requireAuth } from "../shared/auth.js";

const medicaoForm = document.getElementById("medicaoForm");
const medicaoEquip = document.getElementById("medicaoEquip");
const medicaoSubtipo = document.getElementById("medicaoSubtipo");
const medicaoMarcacao = document.getElementById("medicaoMarcacao");
const medicaoLinha = document.getElementById("medicaoLinha");
const medicaoEstacao = document.getElementById("medicaoEstacao");
const medicaoLetra = document.getElementById("medicaoLetra");
const medicaoCor = document.getElementById("medicaoCor");
const medicaoAngulo = document.getElementById("medicaoAngulo");
const medicaoPosicao = document.getElementById("medicaoPosicao");
const obraList = document.getElementById("obraList");
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
const gpsDateTime = document.getElementById("gpsDateTime");
const gpsSource = document.getElementById("gpsSource");
const fotoMedicaoInput = document.getElementById("fotoMedicao");
const fotoLocalInput = document.getElementById("fotoLocal");
const fotoMedicaoInfo = document.getElementById("fotoMedicaoInfo");
const fotoLocalInfo = document.getElementById("fotoLocalInfo");
const clearFotoMedicao = document.getElementById("clearFotoMedicao");
const clearFotoLocal = document.getElementById("clearFotoLocal");

const generateUserPdf = document.getElementById("generateUserPdf");
const userReportObra = document.getElementById("userReportObra");
const userReportStart = document.getElementById("userReportStart");
const userReportEnd = document.getElementById("userReportEnd");

const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginHint = document.getElementById("loginHint");

let activeSession = null;
let equipamentos = [];
let vinculos = [];
let medicoes = [];
let obras = [];

const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ");
const normalizeUserIdComparable = (value) => normalizeText(value).toUpperCase();

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
      .filter((item) => isVinculoAtivo(item) && normalizeUserIdComparable(item.user_id) === normalizeUserIdComparable(activeSession?.id))
      .map((vinculo) => equipamentos.find((item) => item.id === (vinculo.equipamento_id || vinculo.equip_id)))
      .filter(Boolean);
  disponíveis.forEach((equipamento) => {
    const opt = document.createElement("option");
    opt.value = equipamento.id;
    opt.textContent = `${equipamento.id} • ${equipamento?.modelo || "Sem modelo"}`;
    medicaoEquip.appendChild(opt);
  });
};

const renderObrasList = () => {
  obraList.textContent = "";
  obras.forEach((obra) => {
    const option = document.createElement("option");
    option.value = obra.idObra || obra.id;
    option.textContent = `${obra.idObra || obra.id} • ${obra.nomeObra || obra.nome || ""}`;
    obraList.appendChild(option);
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
    const mediaCalc = calculateMediaFromLeituras(leituras, medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao);
    const mediaLabel = mediaCalc !== null ? mediaCalc.toFixed(2) : (medicao.media ?? medicao.valor ?? "-");
    [
      medicao.obra_id || "-",
      medicao.equipamento_id || medicao.equip_id,
      medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao,
      mediaLabel,
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
  [equipamentos, vinculos, medicoes, obras] = await Promise.all([
    getAllEquipamentos(),
    getAllVinculos(),
    isAdmin() ? getAllMedicoes() : getMedicoesByUser(activeSession?.id),
    getAllObras()
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

const calculateMediaFromLeituras = (leituras, subtipo) => {
  const valores = leituras.filter((item) => Number.isFinite(item));
  if (!valores.length) return null;
  const tipo = String(subtipo || "").trim().toUpperCase();
  if (tipo === "HORIZONTAL") {
    if (valores.length < 3) return null;
    const sorted = [...valores].sort((a, b) => a - b);
    const trimmed = sorted.length >= 3 ? sorted.slice(1, sorted.length - 1) : sorted;
    if (!trimmed.length) return null;
    return trimmed.reduce((acc, item) => acc + item, 0) / trimmed.length;
  }
  return valores.reduce((acc, item) => acc + item, 0) / valores.length;
};

const updateMedia = () => {
  const leituras = getLeituras();
  const valid = leituras.filter((item) => item !== null);
  if (!valid.length) {
    medicaoMedia.value = "";
    return;
  }
  const media = calculateMediaFromLeituras(valid, medicaoSubtipo.value);
  medicaoMedia.value = media === null ? "" : media.toFixed(2);
};

const toggleField = (input, show) => {
  const field = input?.closest(".field");
  if (field) field.style.display = show ? "" : "none";
  if (!show && input) input.value = "";
};

const updateSubtipoFields = () => {
  const subtipo = String(medicaoSubtipo.value || "").toUpperCase();
  toggleField(medicaoLetra, subtipo === "LEGENDA");
  toggleField(medicaoCor, subtipo === "PLACA");
  toggleField(medicaoAngulo, subtipo === "PLACA");
  toggleField(medicaoPosicao, subtipo === "PLACA");
  toggleField(medicaoLinha, subtipo === "HORIZONTAL");
  toggleField(medicaoEstacao, subtipo === "HORIZONTAL");
  updateMedia();
};

const formatGps = (gps) => {
  if (!gps || gps.lat === null || gps.lng === null) return "-";
  return `${gps.lat}, ${gps.lng}`;
};

const formatLocal = (medicao) => {
  const parts = [medicao.cidadeUF, medicao.rodovia, medicao.km, medicao.sentido, medicao.faixa].filter(Boolean);
  return parts.length ? parts.join(" • ") : "-";
};

const formatMediaLabel = (medicao) => {
  const media = calculateMediaFromLeituras(medicao.leituras || [], medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao);
  return media === null ? (medicao.media ?? medicao.valor ?? "-") : media.toFixed(2);
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Falha ao converter imagem."));
  reader.readAsDataURL(blob);
});

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

const updateGpsInputs = ({ lat, lng, accuracy, source, dateTime }) => {
  gpsLat.value = lat ?? "";
  gpsLng.value = lng ?? "";
  gpsAcc.value = accuracy ?? "";
  gpsDateTime.value = dateTime ?? "";
  gpsSource.value = source || "";
};

const handleLogin = async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(loginForm).entries());
  const result = await authenticate(data.user_id, data.pin);
  if (!result.success) {
    loginHint.textContent = result.message;
    return;
  }
  if (!["USER", "OPERADOR", "ADMIN"].includes(result.session.role)) {
    loginHint.textContent = "Perfil não autorizado.";
    logout();
    return;
  }
  const vinculosAtivos = await getAllVinculos();
  if (["USER", "OPERADOR"].includes(result.session.role)) {
    const possuiVinculo = vinculosAtivos.some(
      (item) => isVinculoAtivo(item) && normalizeUserIdComparable(item.user_id) === normalizeUserIdComparable(result.session.id)
    );
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
  renderObrasList();
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
      updateGpsInputs({
        lat: latitude.toFixed(6),
        lng: longitude.toFixed(6),
        accuracy: Math.round(accuracy),
        source: "AUTO",
        dateTime: new Date().toISOString().slice(0, 16)
      });
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
  if (!data.equip_id || !data.tipo_medicao || !data.obra_id || !data.subtipo) {
    medicaoHint.textContent = "Preencha todos os campos obrigatórios.";
    return;
  }
  const leituras = getLeituras();
  if (!leituras.length || leituras.some((item) => item === null)) {
    medicaoHint.textContent = "Informe as leituras corretamente.";
    return;
  }
  const subtipo = String(data.subtipo || "").toUpperCase();
  if (subtipo === "HORIZONTAL" && leituras.length !== 10) {
    medicaoHint.textContent = "Horizontal exige exatamente 10 leituras por estação.";
    return;
  }
  if (subtipo === "HORIZONTAL" && (!data.linha || !data.estacao)) {
    medicaoHint.textContent = "Horizontal exige linha e estação.";
    return;
  }
  if (subtipo === "LEGENDA" && leituras.length !== 3) {
    medicaoHint.textContent = "Legenda exige 3 leituras por letra.";
    return;
  }
  if (subtipo === "LEGENDA" && !data.letra) {
    medicaoHint.textContent = "Informe a letra da legenda.";
    return;
  }
  if (subtipo === "PLACA" && leituras.length !== 5) {
    medicaoHint.textContent = "Placa exige 5 leituras por cor e ângulo.";
    return;
  }
  if (subtipo === "PLACA" && (!data.cor || !data.angulo)) {
    medicaoHint.textContent = "Placa exige cor e ângulo.";
    return;
  }
  if (!isAdmin()) {
    const vinculoAtivo = vinculos.find(
      (item) => isVinculoAtivo(item)
        && (item.equipamento_id || item.equip_id) === data.equip_id
        && normalizeUserIdComparable(item.user_id) === normalizeUserIdComparable(activeSession.id)
    );
    if (!vinculoAtivo) {
      medicaoHint.textContent = "Equipamento não vinculado ao operador.";
      return;
    }
  }
  const media = calculateMediaFromLeituras(leituras, subtipo);
  const now = new Date().toISOString();
  const medicaoId = crypto.randomUUID();
  const obraId = normalizeText(data.obra_id).toUpperCase();
  const relatorioId = normalizeText(data.identificadorRelatorio).toUpperCase();
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
    identificadorRelatorio: relatorioId || "",
    dataHora: now,
    data_hora: now,
    tipoMedicao: data.tipo_medicao,
    tipo_medicao: data.tipo_medicao,
    subtipo,
    leituras,
    media: media ?? "",
    unidade: data.unidade || "",
    enderecoTexto: data.enderecoTexto || "",
    cidadeUF: data.cidadeUF || "",
    rodovia: data.rodovia || "",
    km: data.km || "",
    sentido: data.sentido || "",
    faixa: data.faixa || "",
    tipoDeMarcacao: data.tipoDeMarcacao || "",
    linha: data.linha || "",
    estacao: data.estacao || "",
    letra: data.letra || "",
    cor: data.cor || "",
    angulo: data.angulo || "",
    posicao: data.posicao || "",
    clima: data.clima || "",
    observacoes: data.observacoes || "",
    gps,
    dataHoraGPS: data.dataHoraGPS || "",
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
  updateGpsInputs({ lat: null, lng: null, accuracy: null, source: "", dateTime: "" });
  gpsStatus.textContent = "Sem captura.";
  fotoMedicaoInfo.textContent = "Nenhuma foto selecionada.";
  fotoLocalInfo.textContent = "Nenhuma foto selecionada.";
  updateSubtipoFields();
  setStatusMessage("Medição registrada com sucesso.");
};

const buildUserPdf = async () => {
  if (!activeSession) return;
  const obraValue = normalizeText(userReportObra.value).toUpperCase();
  const startDate = userReportStart.value ? new Date(`${userReportStart.value}T00:00:00`) : null;
  const endDate = userReportEnd.value ? new Date(`${userReportEnd.value}T23:59:59`) : null;
  const filtered = medicoes.filter((medicao) => {
    const matchUser = normalizeUserIdComparable(medicao.user_id) === normalizeUserIdComparable(activeSession.id);
    const matchObra = obraValue ? (medicao.obra_id || "").toUpperCase() === obraValue : true;
    const medicaoDate = new Date(medicao.dataHora || medicao.data_hora);
    const matchStart = startDate ? medicaoDate >= startDate : true;
    const matchEnd = endDate ? medicaoDate <= endDate : true;
    return matchUser && matchObra && matchStart && matchEnd;
  });
  if (!filtered.length) {
    setStatusMessage("Nenhuma medição encontrada para o relatório individual.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const now = new Date();
  doc.setFontSize(16);
  doc.text("Relatório Individual MEDLUX", 40, 40);
  doc.setFontSize(10);
  doc.text(`Operador: ${activeSession.nome} (${activeSession.id})`, 40, 58);
  doc.text(`Gerado em: ${now.toLocaleString("pt-BR")}`, 40, 72);
  doc.text(`Obra: ${obraValue || "Todas"}`, 40, 86);
  doc.text(`Período: ${userReportStart.value || "-"} → ${userReportEnd.value || "-"}`, 40, 100);

  const rows = filtered.map((medicao) => [
    medicao.id || medicao.medicao_id,
    medicao.obra_id || "-",
    medicao.equipamento_id || medicao.equip_id,
    medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao,
    formatMediaLabel(medicao),
    formatLocal(medicao),
    formatGps(medicao.gps),
    medicao.dataHora || medicao.data_hora
  ]);

  doc.autoTable({
    head: [["ID", "Obra", "Equip.", "Subtipo", "Média", "Local", "GPS", "Data/Hora"]],
    body: rows,
    startY: 120,
    styles: { fontSize: 8 }
  });

  const fotos = filtered.flatMap((medicao) => medicao.fotos || []);
  if (fotos.length) {
    let cursorY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(12);
    doc.text("Anexos (miniaturas)", 40, cursorY);
    cursorY += 10;
    const thumbSize = 90;
    let x = 40;
    let y = cursorY + 10;
    for (const foto of fotos.slice(0, 8)) {
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
        // Ignore failed photos
      }
    }
  }

  doc.save(`relatorio-individual-${activeSession.id}-${now.toISOString().slice(0, 10)}.pdf`);
};

const initialize = async () => {
  await ensureDefaultAdmin();
  const session = requireAuth({
    allowRoles: ["USER", "OPERADOR", "ADMIN"],
    onMissing: () => openModal(loginModal),
    onUnauthorized: () => { window.location.href = "../index.html"; }
  });
  rebuildLeituras();
  updateSubtipoFields();
  if (!session) return;
  activeSession = session;
  await loadData();
  if (["USER", "OPERADOR"].includes(activeSession.role)) {
    const possuiVinculo = vinculos.some(
      (item) => isVinculoAtivo(item) && normalizeUserIdComparable(item.user_id) === normalizeUserIdComparable(activeSession.id)
    );
    if (!possuiVinculo) {
      logout();
      window.location.href = "../index.html";
      return;
    }
  }
  renderEquipamentos();
  renderObrasList();
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
clearFotoMedicao.addEventListener("click", () => {
  fotoMedicaoInput.value = "";
  updatePhotoInfo(fotoMedicaoInput, fotoMedicaoInfo);
});
clearFotoLocal.addEventListener("click", () => {
  fotoLocalInput.value = "";
  updatePhotoInfo(fotoLocalInput, fotoLocalInfo);
});
[gpsLat, gpsLng, gpsAcc, gpsDateTime].forEach((input) => {
  input.addEventListener("input", () => {
    if (!gpsSource.value) gpsSource.value = "MANUAL";
  });
});
medicaoSubtipo.addEventListener("change", updateSubtipoFields);
logoutButton.addEventListener("click", () => {
  logout();
  window.location.href = "../index.html";
});
generateUserPdf.addEventListener("click", buildUserPdf);

window.addEventListener("online", () => { syncStatus.textContent = "Online • IndexedDB"; });
window.addEventListener("offline", () => { syncStatus.textContent = "Offline pronto • IndexedDB"; });

initialize();
