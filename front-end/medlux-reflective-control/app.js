import {
  getAllEquipamentos,
  getAllVinculos,
  saveMedicao,
  getMedicoesByUser,
  getAllMedicoes,
  getAllObras,
  getAllCriterios
} from "../shared/db.js";

import { ensureDefaultAdmin, authenticate, logout, requireAuth, getSession } from "../shared/auth.js";
import { AUDIT_ACTIONS, buildDiff, logAudit } from "../shared/audit.js";
import { validateMedicao } from "../shared/validation.js";
import { initGlobalErrorHandling, logError } from "../shared/errors.js";
import { sanitizeText } from "../shared/utils.js";

import {
  computeMeasurementStats,
  evaluateMedicao,
  buildConformidadeResumo,
  getMarcacaoConfig
} from "../shared/medicao-utils.js";

const medicaoForm = document.getElementById("medicaoForm");
const medicaoEquip = document.getElementById("medicaoEquip");
const medicaoSubtipo = document.getElementById("medicaoSubtipo");
const medicaoMarcacao = document.getElementById("medicaoMarcacao");
const medicaoLinha = document.getElementById("medicaoLinha");
const medicaoEstacao = document.getElementById("medicaoEstacao");
const medicaoLetra = document.getElementById("medicaoLetra");
const medicaoLegendaTexto = document.getElementById("medicaoLegendaTexto");
const medicaoClasseTipo = document.getElementById("medicaoClasseTipo"); // pode não existir no HTML
const medicaoDataAplicacao = document.getElementById("medicaoDataAplicacao"); // pode não existir no HTML
const medicaoMarcacaoLabel = document.getElementById("medicaoMarcacaoLabel"); // opcional (label antigo)
const legendaPorLetraField = document.getElementById("legendaPorLetraField"); // opcional
const legendaPorLetra = document.getElementById("legendaPorLetra"); // opcional

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
let criterios = [];

initGlobalErrorHandling("medlux-reflective-control");

const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ");
const normalizeUserIdComparable = (value) => normalizeText(value).toUpperCase();

const MAX_PHOTOS_PER_MEDICAO = 6;
const MAX_PHOTO_SIZE = 1.5 * 1024 * 1024;
const PHOTO_MAX_WIDTH = 1600;
const PHOTO_QUALITY = 0.75;

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

  const disponiveis = isAdmin()
    ? equipamentos
    : vinculos
        .filter((item) => isVinculoAtivo(item) && normalizeUserIdComparable(item.user_id) === normalizeUserIdComparable(activeSession?.id))
        .map((vinculoItem) => equipamentos.find((item) => item.id === (vinculoItem.equipamento_id || vinculoItem.equip_id)))
        .filter(Boolean);

  disponiveis.forEach((equipamento) => {
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

const parseLegendaPorLetra = (text) => {
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [letra, raw] = line.split(":");
      const leituras = String(raw || "")
        .split(/[;,\s]+/)
        .map((item) => Number(item.replace(",", ".")))
        .filter((item) => Number.isFinite(item));
      return { letra: String(letra || "").trim().toUpperCase(), leituras };
    })
    .filter((item) => item.letra && item.leituras.length);
};

const fillClasseTipoOptions = () => {
  if (!medicaoClasseTipo) return;

  medicaoClasseTipo.textContent = "";
  const subtipo = String(medicaoSubtipo.value || "").toUpperCase();

  const append = (label, value) => {
    const opt = document.createElement("option");
    opt.textContent = label;
    opt.value = value;
    medicaoClasseTipo.appendChild(opt);
  };

  append("Selecione", "");

  if (subtipo === "VERTICAL") {
    ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"].forEach((item) => append(item, item));
  }
  if (subtipo === "TACHAS") {
    ["I", "II", "III", "IV"].forEach((item) => append(item, item));
  }
};

const renderMedicoes = () => {
  medicoesBody.textContent = "";
  medicoes.slice(0, 20).forEach((medicao) => {
    const row = document.createElement("tr");
    const leituras = medicao.leituras || [];
    const qtd = leituras.length || (medicao.valor ? 1 : 0);

    const dataHora = medicao.dataHora || medicao.data_hora;
    const dataLabel = dataHora ? new Date(dataHora).toLocaleString("pt-BR") : "-";

    const mediaCalc = computeMeasurementStats(medicao).media;
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
      cell.textContent = String(text ?? "-");
      row.appendChild(cell);
    });

    medicoesBody.appendChild(row);
  });
};

const loadData = async () => {
  [equipamentos, vinculos, medicoes, obras, criterios] = await Promise.all([
    getAllEquipamentos(),
    getAllVinculos(),
    isAdmin() ? getAllMedicoes() : getMedicoesByUser(activeSession?.id),
    getAllObras(),
    getAllCriterios()
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
  if (!values.length) addLeituraInput();
  else values.forEach((value) => addLeituraInput(value));
  updateMedia();
};

const getLeituras = () =>
  Array.from(leiturasList.querySelectorAll("input")).map((input) => {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : null;
  });

const parseLeituraList = (text) =>
  String(text || "")
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

  const subtipo = String(medicaoSubtipo.value || "").toUpperCase();
  const tipoDeMarcacao = String(medicaoMarcacao?.value || "").trim().toUpperCase();
  const texto_legenda = String(medicaoLegendaTexto?.value || "").trim();
  const legendaEstrutura = legendaPorLetra ? parseLegendaPorLetra(legendaPorLetra.value || "") : [];

  const stats = computeMeasurementStats({
    subtipo,
    tipoDeMarcacao,
    texto_legenda,
    leituras: valid,
    legenda_por_letra: legendaEstrutura
  });

  medicaoMedia.value = stats.media === null ? "" : stats.media.toFixed(2);
};

const toggleField = (input, show) => {
  const field = input?.closest(".field");
  if (field) field.style.display = show ? "" : "none";
  if (!show && input) input.value = "";
};

const updateSubtipoFields = () => {
  const subtipo = String(medicaoSubtipo.value || "").toUpperCase();

  toggleField(medicaoLetra, subtipo === "LEGENDA");
  toggleField(medicaoLegendaTexto, subtipo === "HORIZONTAL" || subtipo === "LEGENDA");
  toggleField(medicaoDataAplicacao, subtipo === "HORIZONTAL");
  toggleField(medicaoCor, subtipo === "PLACA");
  toggleField(medicaoAngulo, subtipo === "PLACA");
  toggleField(medicaoPosicao, subtipo === "PLACA");
  toggleField(medicaoLinha, subtipo === "HORIZONTAL");
  toggleField(medicaoEstacao, subtipo === "HORIZONTAL");

  if (legendaPorLetraField) {
    legendaPorLetraField.style.display = subtipo === "LEGENDA" ? "" : "none";
  }
  if (medicaoMarcacaoLabel) {
    medicaoMarcacaoLabel.textContent = subtipo === "HORIZONTAL" ? "Elemento/Marcação" : "Tipo";
  }

  // Configuração dinâmica do campo “Elemento da via / Tipo”
  const marcacaoLabel = medicaoMarcacao?.closest(".field")?.querySelector("label");
  const marcacaoConfig = getMarcacaoConfig(subtipo);

  if (marcacaoLabel) marcacaoLabel.textContent = marcacaoConfig.label;

  if (medicaoMarcacao) {
    medicaoMarcacao.textContent = "";

    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Selecione";
    medicaoMarcacao.appendChild(first);

    marcacaoConfig.options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      medicaoMarcacao.appendChild(option);
    });
  }

  fillClasseTipoOptions();
  updateMedia();
};

const formatGps = (gps) => {
  if (!gps || gps.lat === null || gps.lng === null) return "-";
  return `${gps.lat}, ${gps.lng}`;
};

const formatLocal = (medicao) => {
  const parts = [medicao.cidadeUF, medicao.enderecoTexto, medicao.rodovia, medicao.km, medicao.sentido, medicao.faixa].filter(Boolean);
  return parts.length ? parts.join(" • ") : "-";
};

const toSafeText = (value) => sanitizeText(value ?? "-");

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Falha ao converter imagem."));
    reader.readAsDataURL(blob);
  });

const updatePhotoInfo = (input, target) => {
  const count = input.files?.length || 0;
  target.textContent = count ? `${count} foto(s) selecionada(s) (máx. ${MAX_PHOTOS_PER_MEDICAO}).` : "Nenhuma foto selecionada.";
};

const compressImage = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > PHOTO_MAX_WIDTH) {
          height = Math.round((height * PHOTO_MAX_WIDTH) / width);
          width = PHOTO_MAX_WIDTH;
        } else if (height > PHOTO_MAX_WIDTH) {
          width = Math.round((width * PHOTO_MAX_WIDTH) / height);
          height = PHOTO_MAX_WIDTH;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const outputType = file.type === "image/png" ? "image/jpeg" : (file.type || "image/jpeg");
        canvas.toBlob((blob) => resolve({ blob: blob || file, width, height }), outputType, PHOTO_QUALITY);
      };
      img.onerror = () => reject(new Error("Falha ao carregar imagem."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });

const collectFotos = async () => {
  const fotos = [];
  const errors = [];

  const addFiles = async (files, tipo) => {
    for (const file of Array.from(files || [])) {
      if (fotos.length >= MAX_PHOTOS_PER_MEDICAO) {
        errors.push(`Limite de ${MAX_PHOTOS_PER_MEDICAO} fotos atingido.`);
        break;
      }
      try {
        const { blob, width, height } = await compressImage(file);
        if (blob.size > MAX_PHOTO_SIZE) {
          errors.push(`Foto ${file.name} excede ${(MAX_PHOTO_SIZE / (1024 * 1024)).toFixed(1)}MB após compressão.`);
          continue;
        }
        fotos.push({
          id: crypto.randomUUID(),
          name: file.name,
          mime: blob.type || file.type || "image/jpeg",
          size: blob.size,
          width,
          height,
          created_at: new Date().toISOString(),
          blob,
          tipo
        });
      } catch (error) {
        errors.push(`Falha ao processar ${file.name}.`);
        await logError({
          module: "medlux-reflective-control",
          action: "COMPRESS_FOTO",
          message: error.message,
          stack: error.stack,
          context: { name: file.name, type: file.type }
        });
      }
    }
  };

  await addFiles(fotoMedicaoInput.files, "MEDICAO");
  await addFiles(fotoLocalInput.files, "LOCAL");
  return { fotos, errors };
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
      window.location.href = "../index.html";
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
  const leituras = getLeituras();
  const subtipo = String(data.subtipo || "").toUpperCase();

  const legendaEstrutura = legendaPorLetra ? parseLegendaPorLetra(legendaPorLetra.value || "") : [];
  if (subtipo === "LEGENDA" && legendaEstrutura.length) {
    const invalida = legendaEstrutura.some((item) => item.leituras.length !== 3);
    if (invalida) {
      medicaoHint.textContent = "Na estrutura por letra, cada letra deve ter 3 leituras.";
      return;
    }
  }

  const validation = validateMedicao({
    ...data,
    equipamento_id: data.equip_id,
    user_id: activeSession?.id,
    leituras,
    subtipo
  });

  if (!validation.ok) {
    medicaoHint.textContent = validation.errors.map((item) => item.message).join(" ");
    return;
  }

  if (!isAdmin()) {
    const vinculoAtivo = vinculos.find(
      (item) =>
        isVinculoAtivo(item) &&
        (item.equipamento_id || item.equip_id) === data.equip_id &&
        normalizeUserIdComparable(item.user_id) === normalizeUserIdComparable(activeSession.id)
    );
    if (!vinculoAtivo) {
      medicaoHint.textContent = "Equipamento não vinculado ao operador.";
      return;
    }
  }

  const obraId = normalizeText(data.obra_id).toUpperCase();
  const equip = equipamentos.find((item) => item.id === data.equip_id) || null;
  const obra = obras.find((item) => (item.idObra || item.id) === obraId) || null;

  const stats = computeMeasurementStats({
    subtipo,
    tipoDeMarcacao: data.tipoDeMarcacao || data.tipo_marcacao || "",
    texto_legenda: data.texto_legenda || data.legenda_texto || "",
    leituras,
    legenda_por_letra: legendaEstrutura
  });

  const avaliacao = evaluateMedicao({
    medicao: {
      ...data,
      subtipo,
      obra_id: obraId,
      leituras,
      data_aplicacao: data.data_aplicacao || data.dataAplikacao || ""
    },
    criterios,
    obra,
    equipamento: equip
  });

  if (avaliacao.status === "NÃO AVALIADO") {
    medicaoHint.textContent = "Critério não configurado — ficará como NÃO AVALIADO.";
  }

  const { fotos, errors } = await collectFotos();
  if (errors.length) {
    medicaoHint.textContent = errors.join(" ");
    return;
  }

  const now = new Date().toISOString();
  const medicaoId = crypto.randomUUID();
  const relatorioId = normalizeText(data.identificadorRelatorio || "").toUpperCase();

  const gpsLatValue = Number(gpsLat.value);
  const gpsLngValue = Number(gpsLng.value);
  const gpsAccValue = Number(gpsAcc.value);
  const gps = {
    lat: Number.isFinite(gpsLatValue) ? gpsLatValue : null,
    lng: Number.isFinite(gpsLngValue) ? gpsLngValue : null,
    accuracy: Number.isFinite(gpsAccValue) ? gpsAccValue : null,
    source: gpsSource.value || (Number.isFinite(gpsLatValue) && Number.isFinite(gpsLngValue) ? "MANUAL" : "")
  };

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
    media: stats.media ?? "",
    media_final: stats.media ?? "",
    raw_readings: stats.rawReadings || leituras,
    discarded_min: stats.discardedMin ?? null,
    discarded_max: stats.discardedMax ?? null,
    regra_calculo: stats.regra || "",

    // Campos de conformidade (auto)
    periodo: avaliacao.periodo || "",
    minimo: avaliacao.minimo ?? null,
    status_conformidade: avaliacao.status || "NÃO AVALIADO",
    motivo_conformidade: avaliacao.motivo || "",
    criterio_id: avaliacao.criterio_id || "",
    criterio_minimo: avaliacao.minimo ?? null,
    criterio_fonte: avaliacao.criterio_fonte || "",
    criterio_fallback_level: avaliacao.criterio_fallback_level ?? null,

    // Campos de classificação/contexto
    classe_tipo: data.classe_tipo || "",
    elemento_via: data.tipoDeMarcacao || data.tipo_marcacao || "",

    unidade: data.unidade || "",
    enderecoTexto: data.enderecoTexto || "",
    cidadeUF: data.cidadeUF || "",
    rodovia: data.rodovia || "",
    km: data.km || "",
    sentido: data.sentido || "",
    faixa: data.faixa || "",
    tipoDeMarcacao: data.tipoDeMarcacao || "",
    texto_legenda: data.texto_legenda || "",
    legenda_por_letra: legendaEstrutura,

    data_aplicacao: data.data_aplicacao || "",
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

  try {
    await saveMedicao(medicao);
  } catch (error) {
    await logError({
      module: "medlux-reflective-control",
      action: "SAVE_MEDICAO",
      message: "Falha ao salvar medição com fotos no IndexedDB.",
      stack: error.stack,
      context: { medicao_id: medicaoId, fotos: fotos.length }
    });
    window.alert("Falha ao salvar fotos no IndexedDB. Tente remover algumas fotos e salvar novamente.");
    return;
  }

  await logAudit({
    action: AUDIT_ACTIONS.ENTITY_CREATED,
    entity_type: "medicoes",
    entity_id: medicaoId,
    actor_user_id: activeSession?.id || null,
    summary: `Medição registrada para equipamento ${data.equip_id}.`,
    diff: buildDiff(null, medicao, ["id", "equipamento_id", "user_id", "obra_id", "subtipo"])
  });

  medicoes = isAdmin() ? await getAllMedicoes() : await getMedicoesByUser(activeSession.id);

  renderMedicoes();
  medicaoForm.reset();
  if (legendaPorLetra) legendaPorLetra.value = "";
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
  doc.text(toSafeText("Relatório Individual MEDLUX"), 40, 40);

  doc.setFontSize(10);
  doc.text(toSafeText(`Operador: ${activeSession.nome} (${activeSession.id})`), 40, 58);
  doc.text(toSafeText(`Gerado em: ${now.toLocaleString("pt-BR")}`), 40, 72);
  doc.text(toSafeText(`Obra: ${obraValue || "Todas"}`), 40, 86);
  doc.text(toSafeText(`Período: ${userReportStart.value || "-"} → ${userReportEnd.value || "-"}`), 40, 100);

  const avaliacoes = filtered.map((medicao) => {
    const equip = equipamentos.find((item) => item.id === (medicao.equipamento_id || medicao.equip_id)) || null;
    const obra = obras.find((item) => (item.idObra || item.id) === medicao.obra_id) || null;
    return evaluateMedicao({ medicao, criterios, obra, equipamento: equip });
  });

  const resumo = buildConformidadeResumo(avaliacoes);

  doc.text(
    toSafeText(
      `Resumo: Total ${resumo.total} | Conformes ${resumo.conformes} | ` +
        `Não conformes ${resumo.naoConformes} | Não avaliadas ${resumo.naoAvaliadas} | ` +
        `% conformidade ${resumo.pctConformidade.toFixed(2)}%`
    ),
    40,
    114
  );

  const rows = filtered.map((medicao, index) => {
    const av = avaliacoes[index];
    return [
      toSafeText(medicao.id || medicao.medicao_id),
      toSafeText(medicao.obra_id || "-"),
      toSafeText(medicao.equipamento_id || medicao.equip_id),
      toSafeText(medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao),
      toSafeText(av.periodo || "-"),
      toSafeText(av.media === null ? "-" : av.media.toFixed(2)),
      toSafeText(av.minimo === null ? "-" : av.minimo),
      toSafeText(av.status),
      toSafeText(av.motivo || "-"),
      toSafeText(formatLocal(medicao)),
      toSafeText(formatGps(medicao.gps)),
      toSafeText(medicao.dataHora || medicao.data_hora)
    ];
  });

  doc.autoTable({
    head: [[
      "ID",
      "Obra",
      "Equip.",
      "Subtipo",
      "Período",
      "MÉDIA",
      "Mínimo",
      "Status",
      "Motivo",
      "Local",
      "GPS",
      "Data/Hora"
    ]],
    body: rows,
    startY: 124,
    styles: { fontSize: 7 }
  });

  const fotos = filtered.flatMap((medicao) => medicao.fotos || []);
  if (fotos.length) {
    let cursorY = (doc.lastAutoTable?.finalY || 124) + 20;
    doc.setFontSize(12);
    doc.text(toSafeText("Anexos (miniaturas)"), 40, cursorY);
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
      } catch {
        // ignora miniaturas que falharem
      }
    }
  }

  doc.save(`relatorio-individual-${activeSession.id}-${now.toISOString().slice(0, 10)}.pdf`);

  await logAudit({
    action: AUDIT_ACTIONS.PDF_GENERATED,
    entity_type: "relatorios",
    entity_id: activeSession.id,
    actor_user_id: activeSession.id,
    summary: "PDF individual gerado."
  });
};

const initialize = async () => {
  await ensureDefaultAdmin();

  const authorized = requireAuth({
    allowRoles: ["USER", "OPERADOR", "ADMIN"],
    onMissing: () => openModal(loginModal),
    onUnauthorized: () => {
      window.location.href = "../index.html";
    }
  });

  rebuildLeituras();
  updateSubtipoFields();

  if (!authorized) return;

  activeSession = getSession();
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
if (legendaPorLetra) legendaPorLetra.addEventListener("input", updateMedia);

logoutButton.addEventListener("click", () => {
  logout();
  window.location.href = "../index.html";
});

generateUserPdf.addEventListener("click", buildUserPdf);

window.addEventListener("online", () => {
  syncStatus.textContent = "Online • IndexedDB";
});
window.addEventListener("offline", () => {
  syncStatus.textContent = "Offline pronto • IndexedDB";
});

initialize();
