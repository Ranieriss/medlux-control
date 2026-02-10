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

import {
  computeMeasurementStats,
  evaluateMedicao,
  getMarcacaoConfig,
  buildConformidadeResumo
} from "../shared/medicao-utils.js";
import { initUserReportFeature, generateUserPdfReport } from "../shared/reports/user-report.js";

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


const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginHint = document.getElementById("loginHint");
const autoTestButton = document.getElementById("runAutoTest");
const autoTestHint = document.getElementById("autoTestHint");

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

const bindEvent = (element, eventName, handler) => {
  if (!element) return;
  element.addEventListener(eventName, handler);
};

const showFeedback = (message, type = "info") => {
  medicaoHint.textContent = message;
  setStatusMessage(message);
  if (type === "error") {
    window.alert(message);
  }
};

const isAdmin = () => activeSession?.role === "ADMIN";

const isVinculoAtivo = (item) => item.status === "ATIVO" || item.ativo === true;


const normalizeEquipId = (item = {}) => normalizeText(item.equipamento_id || item.equip_id || item.id);

const getVisibleEquipamentos = (session, allVinculos = [], allEquipamentos = []) => {
  if (!session) return [];
  if (String(session.role || "").toUpperCase() === "ADMIN") return allEquipamentos;

  const equipPermitidos = new Set(
    allVinculos
      .filter((item) => isVinculoAtivo(item) && normalizeUserIdComparable(item.user_id) === normalizeUserIdComparable(session.id))
      .map((item) => normalizeEquipId(item))
      .filter(Boolean)
  );

  return allEquipamentos.filter((item) => equipPermitidos.has(normalizeEquipId(item)));
};

const renderEquipamentos = () => {
  medicaoEquip.textContent = "";
  const option = document.createElement("option");
  option.value = "";
  option.textContent = "Selecione";
  medicaoEquip.appendChild(option);

  const disponiveis = getVisibleEquipamentos(activeSession, vinculos, equipamentos);

  disponiveis.forEach((equipamento) => {
    const equipId = normalizeEquipId(equipamento);
    const opt = document.createElement("option");
    opt.value = equipId;
    opt.textContent = `${equipId} • ${equipamento?.modelo || "Sem modelo"}`;
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
  medicoes.sort((a, b) => new Date(b.created_at || b.dataHora || b.data_hora || 0) - new Date(a.created_at || a.dataHora || a.data_hora || 0));
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

const toTrimmedValue = (value) => String(value || "").trim();

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

  const mediaValue = Number(stats?.media);
  medicaoMedia.value = Number.isFinite(mediaValue) ? mediaValue.toFixed(2) : "";
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

const buildMedicaoPayload = ({ data, leituras, subtipo, legendaEstrutura, stats, avaliacao, obra, equip, fotos }) => {
  const now = new Date().toISOString();
  const medicaoId = crypto.randomUUID();
  const relatorioId = normalizeText(data.identificadorRelatorio || "").toUpperCase();

  const gpsLatValue = Number(gpsLat?.value);
  const gpsLngValue = Number(gpsLng?.value);
  const gpsAccValue = Number(gpsAcc?.value);
  const gps = {
    lat: Number.isFinite(gpsLatValue) ? gpsLatValue : null,
    lng: Number.isFinite(gpsLngValue) ? gpsLngValue : null,
    accuracy: Number.isFinite(gpsAccValue) ? gpsAccValue : null,
    source: gpsSource?.value || (Number.isFinite(gpsLatValue) && Number.isFinite(gpsLngValue) ? "MANUAL" : "")
  };

  return {
    id: medicaoId,
    medicao_id: medicaoId,
    equipamento_id: data.equip_id,
    equip_id: data.equip_id,
    equipamento_nome: equip?.modelo || equip?.id || "",
    user_id: activeSession.id,
    user_nome: activeSession.nome || "",
    obra_id: data.obra_id,
    obra_nome: obra?.nomeObra || obra?.nome || "",
    relatorio_id: relatorioId || "",
    identificadorRelatorio: relatorioId || "",
    dataHora: now,
    data_hora: now,
    tipoMedicao: data.tipo_medicao,
    tipo_medicao: data.tipo_medicao,
    subtipo,
    leituras,
    media: stats.media ?? null,
    media_final: stats.media ?? null,
    minFinal: stats.minFinal ?? null,
    maxFinal: stats.maxFinal ?? null,
    raw_readings: stats.rawReadings || leituras,
    discarded_min: stats.discardedMin ?? null,
    discarded_max: stats.discardedMax ?? null,
    regra_calculo: stats.regra || "",
    periodo: avaliacao.periodo || "",
    minimo: avaliacao.minimo ?? null,
    status_conformidade: avaliacao.status || "NÃO AVALIADO",
    motivo_conformidade: avaliacao.motivo || "",
    criterio_id: avaliacao.criterio_id || "",
    criterio_minimo: avaliacao.minimo ?? null,
    criterio_fonte: avaliacao.criterio_fonte || "",
    criterio_fallback_level: avaliacao.criterio_fallback_level ?? null,
    classe_tipo: toTrimmedValue(data.classe_tipo),
    elemento_via: data.tipoDeMarcacao || data.tipo_marcacao || "",
    unidade: toTrimmedValue(data.unidade),
    enderecoTexto: toTrimmedValue(data.enderecoTexto),
    cidadeUF: toTrimmedValue(data.cidadeUF),
    rodovia: toTrimmedValue(data.rodovia),
    km: toTrimmedValue(data.km),
    sentido: toTrimmedValue(data.sentido),
    faixa: toTrimmedValue(data.faixa),
    tipoDeMarcacao: toTrimmedValue(data.tipoDeMarcacao),
    texto_legenda: toTrimmedValue(data.texto_legenda),
    legenda_por_letra: legendaEstrutura,
    data_aplicacao: toTrimmedValue(data.data_aplicacao),
    linha: toTrimmedValue(data.linha),
    estacao: toTrimmedValue(data.estacao),
    letra: toTrimmedValue(data.letra),
    cor: toTrimmedValue(data.cor),
    angulo: toTrimmedValue(data.angulo),
    posicao: toTrimmedValue(data.posicao),
    clima: toTrimmedValue(data.clima),
    observacoes: toTrimmedValue(data.observacoes),
    gps,
    dataHoraGPS: data.dataHoraGPS || "",
    fotos,
    created_at: now
  };
};

const handleMedicaoSubmit = async (event) => {
  event.preventDefault();

  try {
    if (!activeSession?.id) {
      showFeedback("Sessão inválida. Faça login novamente.", "error");
      return;
    }

    const data = Object.fromEntries(new FormData(medicaoForm).entries());
    const leituras = getLeituras().filter((item) => Number.isFinite(item));
    const subtipo = String(data.subtipo || "").toUpperCase();

    if (!leituras.length) {
      showFeedback("Nenhuma leitura válida na lista colada/informada.", "error");
      return;
    }

    const legendaEstrutura = legendaPorLetra ? parseLegendaPorLetra(legendaPorLetra.value || "") : [];
    if (subtipo === "LEGENDA" && legendaEstrutura.length) {
      const invalida = legendaEstrutura.some((item) => item.leituras.length !== 3);
      if (invalida) {
        showFeedback("Na estrutura por letra, cada letra deve ter 3 leituras.", "error");
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
      showFeedback(validation.errors.map((item) => item.message).join(" "), "error");
      return;
    }

    if (!isAdmin()) {
      const vinculoAtivo = vinculos.find(
        (item) =>
          isVinculoAtivo(item) &&
          normalizeEquipId(item) === normalizeText(data.equip_id) &&
          normalizeUserIdComparable(item.user_id) === normalizeUserIdComparable(activeSession.id)
      );
      if (!vinculoAtivo) {
        showFeedback("Equipamento não vinculado ao operador.", "error");
        return;
      }
    }

    const obraId = normalizeText(data.obra_id).toUpperCase();
    data.obra_id = obraId;
    const equip = equipamentos.find((item) => normalizeEquipId(item) === data.equip_id) || null;
    const obra = obras.find((item) => normalizeText(item.idObra || item.id).toUpperCase() === obraId) || null;

    const stats = computeMeasurementStats({
      subtipo,
      tipoDeMarcacao: data.tipoDeMarcacao || data.tipo_marcacao || "",
      texto_legenda: data.texto_legenda || data.legenda_texto || "",
      leituras,
      legenda_por_letra: legendaEstrutura
    });

    if (stats.media === null) {
      showFeedback("Nenhuma leitura válida na lista colada para calcular a média.", "error");
      return;
    }

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
      showFeedback(errors.join(" "), "error");
      return;
    }

    const medicao = buildMedicaoPayload({
      data,
      leituras,
      subtipo,
      legendaEstrutura,
      stats,
      avaliacao,
      obra,
      equip,
      fotos
    });

    await saveMedicao(medicao);

    await logAudit({
      action: AUDIT_ACTIONS.ENTITY_CREATED,
      entity_type: "medicoes",
      entity_id: medicao.id,
      actor_user_id: activeSession?.id || null,
      summary: `Medição registrada para equipamento ${data.equip_id}.`,
      diff: buildDiff(null, medicao, ["id", "equipamento_id", "user_id", "obra_id", "subtipo"])
    });

    await loadData();
    renderMedicoes();

    medicaoForm.reset();
    if (legendaPorLetra) legendaPorLetra.value = "";
    rebuildLeituras();
    updateGpsInputs({ lat: null, lng: null, accuracy: null, source: "", dateTime: "" });
    gpsStatus.textContent = "Sem captura.";
    fotoMedicaoInfo.textContent = "Nenhuma foto selecionada.";
    fotoLocalInfo.textContent = "Nenhuma foto selecionada.";
    updateSubtipoFields();
    showFeedback("Medição registrada com sucesso.");
  } catch (error) {
    console.error("Falha no submit da medição", {
      error,
      user_id: activeSession?.id || null,
      equipamento_id: medicaoEquip?.value || ""
    });
    await logError({
      module: "medlux-reflective-control",
      action: "SAVE_MEDICAO",
      message: error?.message || "Falha inesperada ao registrar medição.",
      stack: error?.stack,
      context: {
        user_id: activeSession?.id || null,
        equipamento_id: medicaoEquip?.value || "",
        obra_id: document.getElementById("medicaoObra")?.value || ""
      }
    });
    showFeedback(error?.message || "Falha ao registrar medição. Verifique os dados e tente novamente.", "error");
  }
};

const runAdminAutoTest = async () => {
  if (!isAdmin()) return;
  if (!autoTestHint) return;
  autoTestHint.textContent = "Executando auto-teste...";

  try {
    const visibleEquipamentos = getVisibleEquipamentos(activeSession, vinculos, equipamentos);
    const equip = visibleEquipamentos[0];
    const obra = obras[0];
    if (!equip || !obra) throw new Error("Auto-teste requer ao menos 1 equipamento e 1 obra cadastrados.");

    const leituras = [110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
    const stats = computeMeasurementStats({ subtipo: "HORIZONTAL", tipoDeMarcacao: "BORDO_DIREITO", leituras });
    const avaliacao = evaluateMedicao({
      medicao: {
        equipamento_id: equip.id,
        equip_id: equip.id,
        obra_id: obra.idObra || obra.id,
        tipo_medicao: "RL",
        subtipo: "HORIZONTAL",
        tipoDeMarcacao: "BORDO_DIREITO",
        leituras
      },
      criterios,
      obra,
      equipamento: equip
    });

    const medicaoTeste = buildMedicaoPayload({
      data: {
        equip_id: equip.id,
        obra_id: normalizeText(obra.idObra || obra.id).toUpperCase(),
        tipo_medicao: "RL",
        subtipo: "HORIZONTAL",
        tipoDeMarcacao: "BORDO_DIREITO",
        identificadorRelatorio: "AUTO-TEST"
      },
      leituras,
      subtipo: "HORIZONTAL",
      legendaEstrutura: [],
      stats,
      avaliacao,
      obra,
      equip,
      fotos: []
    });

    await saveMedicao(medicaoTeste);
    await loadData();
    renderMedicoes();

    const exists = medicoes.some((item) => item.id === medicaoTeste.id || item.medicao_id === medicaoTeste.id);
    if (!exists) throw new Error("Medição de auto-teste foi salva, mas não apareceu no histórico.");

    await generateUserPdfReport({
      obraId: medicaoTeste.obra_id,
      currentUser: activeSession
    });

    const resumo = buildConformidadeResumo(medicoes.slice(0, 10).map((item) => ({ status: item.status_conformidade || "NÃO AVALIADO" })));
    autoTestHint.textContent = `OK: medição salva e histórico atualizado (${resumo.total} itens). Teste do PDF deve ser feito no botão acima.`;
    setStatusMessage("Auto-teste concluído com sucesso.");
  } catch (error) {
    console.error("Falha no auto-teste", error);
    autoTestHint.textContent = `ERRO: ${error?.message || "Falha inesperada"}`;
    setStatusMessage("Auto-teste falhou. Veja detalhes no bloco de diagnóstico.");
  }
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

  if (autoTestButton) autoTestButton.hidden = !isAdmin();
  if (autoTestHint) autoTestHint.textContent = isAdmin() ? "Executa fluxo local de diagnóstico para campo." : "";

  syncStatus.textContent = navigator.onLine ? "Online • IndexedDB" : "Offline pronto • IndexedDB";
};

bindEvent(loginForm, "submit", handleLogin);
bindEvent(medicaoForm, "submit", handleMedicaoSubmit);

bindEvent(addLeituraButton, "click", () => {
  if (leiturasList.querySelectorAll("input").length >= 50) return;
  addLeituraInput();
  updateMedia();
  medicaoHint.textContent = "Campos com * são obrigatórios.";
});

bindEvent(applyLeituraListButton, "click", () => {
  const values = parseLeituraList(leiturasPaste.value || "");
  if (!values.length) {
    medicaoHint.textContent = "Nenhuma leitura válida na lista colada.";
    return;
  }
  rebuildLeituras(values);
  medicaoHint.textContent = "Campos com * são obrigatórios.";
});

bindEvent(gpsCaptureButton, "click", handleCaptureGps);

bindEvent(fotoMedicaoInput, "change", () => updatePhotoInfo(fotoMedicaoInput, fotoMedicaoInfo));
bindEvent(fotoLocalInput, "change", () => updatePhotoInfo(fotoLocalInput, fotoLocalInfo));

bindEvent(clearFotoMedicao, "click", () => {
  fotoMedicaoInput.value = "";
  updatePhotoInfo(fotoMedicaoInput, fotoMedicaoInfo);
});

bindEvent(clearFotoLocal, "click", () => {
  fotoLocalInput.value = "";
  updatePhotoInfo(fotoLocalInput, fotoLocalInfo);
});

[gpsLat, gpsLng, gpsAcc, gpsDateTime].forEach((input) => {
  bindEvent(input, "input", () => {
    if (!gpsSource.value) gpsSource.value = "MANUAL";
  });
});

bindEvent(medicaoSubtipo, "change", updateSubtipoFields);
bindEvent(legendaPorLetra, "input", updateMedia);

bindEvent(logoutButton, "click", () => {
  logout();
  window.location.href = "../index.html";
});

bindEvent(autoTestButton, "click", runAdminAutoTest);

window.addEventListener("online", () => {
  syncStatus.textContent = "Online • IndexedDB";
});
window.addEventListener("offline", () => {
  syncStatus.textContent = "Offline pronto • IndexedDB";
});

initUserReportFeature({
  getCurrentUser: () => activeSession || getSession(),
  onStatusMessage: setStatusMessage,
  onSuccess: async (result) => {
    const user = activeSession || getSession();
    await logAudit({
      action: AUDIT_ACTIONS.PDF_GENERATED,
      entity_type: "relatorios",
      entity_id: result?.obraId || user?.id || "",
      actor_user_id: user?.id || null,
      summary: "PDF individual gerado."
    });
  },
  onError: async (error, context) => {
    const user = activeSession || getSession();
    await logError({
      module: "medlux-reflective-control",
      action: "GENERATE_USER_PDF",
      message: error?.message || "Falha ao gerar PDF individual.",
      stack: error?.stack,
      context: {
        user_id: user?.id || null,
        obraId: context?.obraId || "",
        startDate: context?.startDate || "",
        endDate: context?.endDate || ""
      }
    });
  }
});

initialize();
