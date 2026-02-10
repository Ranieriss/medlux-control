import { sanitizeText } from "./utils.js";

const HORIZONTAL_MARKING_OPTIONS = ["BORDO_DIREITO", "BORDO_ESQUERDO", "EIXO_DIREITO", "EIXO_ESQUERDO", "ZEBRADO", "CANALIZACAO", "SETA", "LEGENDA"];
const VERTICAL_CLASS_OPTIONS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const TACHAS_CLASS_OPTIONS = ["I", "II", "III", "IV"];

const toNum = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const safeUpper = (value) => String(value || "").trim().toUpperCase();

const average = (values = []) => {
  const valid = values.map((item) => toNum(item)).filter((item) => item !== null);
  if (!valid.length) return null;
  return valid.reduce((acc, val) => acc + val, 0) / valid.length;
};

const computeLegendaStats = (medicao = {}) => {
  const subtipo = safeUpper(medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao);
  if (subtipo !== "HORIZONTAL" && subtipo !== "LEGENDA") return null;
  const isLegenda = safeUpper(medicao.tipoDeMarcacao || medicao.tipo_marcacao || medicao.elemento_via) === "LEGENDA" || subtipo === "LEGENDA";
  if (!isLegenda) return null;

  if (Array.isArray(medicao.legenda_por_letra) && medicao.legenda_por_letra.length) {
    const medias = medicao.legenda_por_letra.map((item) => ({
      letra: sanitizeText(item.letra || "?"),
      leituras: Array.isArray(item.leituras) ? item.leituras.map((n) => toNum(n)).filter((n) => n !== null) : [],
      media: toNum(item.media)
    }));
    return {
      possuiEstrutura: true,
      textoLegenda: medicao.texto_legenda || medicao.textoLegenda || "",
      letras: medias,
      mediaFinal: average(medias.map((item) => item.media))
    };
  }

  const textoLegenda = String(medicao.texto_legenda || medicao.textoLegenda || "").trim();
  const chars = textoLegenda.replace(/\s+/g, "").split("").filter(Boolean);
  const leituras = Array.isArray(medicao.leituras) ? medicao.leituras.map((n) => toNum(n)).filter((n) => n !== null) : [];
  if (!chars.length || leituras.length < chars.length * 3) {
    return {
      possuiEstrutura: false,
      textoLegenda,
      letras: [],
      mediaFinal: average(leituras)
    };
  }
  const letras = chars.map((char, index) => {
    const slice = leituras.slice(index * 3, (index + 1) * 3);
    return {
      letra: sanitizeText(char),
      leituras: slice,
      media: average(slice)
    };
  });
  return {
    possuiEstrutura: true,
    textoLegenda,
    letras,
    mediaFinal: average(letras.map((item) => item.media))
  };
};

const computeMeasurementStats = (medicaoInput = {}) => {
  const medicao = medicaoInput && typeof medicaoInput === "object" ? medicaoInput : {};
  const subtipo = safeUpper(medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao);
  const tipoDeMarcacao = safeUpper(medicao.tipoDeMarcacao || medicao.tipo_marcacao || medicao.elemento_via);
  const values = Array.isArray(medicao.leituras)
    ? medicao.leituras.map((value) => toNum(value)).filter((value) => value !== null)
    : [];
  const quantidade = values.length || (toNum(medicao.valor) !== null ? 1 : 0);
  const legenda = computeLegendaStats(medicao);
  const buildStats = ({ media = null, minimo = null, maximo = null, discardedMin = null, discardedMax = null, regra = "Média simples" } = {}) => ({
    subtipo,
    media,
    minimo,
    maximo,
    quantidade,
    quantidadeLeituras: quantidade,
    rawReadings: values,
    discardedMin,
    discardedMax,
    regra
  });

  const isLegenda = subtipo === "LEGENDA" || tipoDeMarcacao === "LEGENDA";
  const legendaMedia = toNum(legenda?.mediaFinal);

  if (isLegenda && legendaMedia !== null) {
    return buildStats({
      media: legendaMedia,
      regra: legenda?.possuiEstrutura
        ? "Legenda: média por letra (3 leituras por letra) + média final"
        : "Legenda: estrutura por letra não informada; média simples"
    });
  }

  if (isLegenda) {
    if (values.length) {
      return buildStats({ media: average(values), regra: "Legenda: fallback para média simples das leituras" });
    }
    return buildStats({ media: null, regra: "Legenda sem leituras válidas" });
  }

  if (!values.length) {
    return buildStats({
      media: toNum(medicao.media) ?? toNum(medicao.valor),
      discardedMin: toNum(medicao.discarded_min),
      discardedMax: toNum(medicao.discarded_max),
      regra: "Sem leituras válidas"
    });
  }
  if (subtipo === "HORIZONTAL") {
    if (values.length < 10) {
      return buildStats({ media: null, regra: "Horizontal exige no mínimo 10 leituras" });
    }
    const sorted = [...values].sort((a, b) => a - b);
    const discardedMin = sorted[0];
    const discardedMax = sorted[sorted.length - 1];
    const trimmed = sorted.slice(1, sorted.length - 1);
    return buildStats({
      media: average(trimmed),
      discardedMin,
      discardedMax,
      regra: "Horizontal: descarta maior e menor e calcula média das restantes"
    });
  }
  return buildStats({
    media: average(values),
    regra: subtipo === "VERTICAL" ? "Vertical: média simples" : (subtipo === "TACHAS" ? "Tachas: média simples" : "Média simples")
  });
};

/*
Casos esperados (sanity checks):
- computeMeasurementStats(null) => { media: null, quantidade: 0, ... }
- computeMeasurementStats({ subtipo: "LEGENDA", tipoDeMarcacao: "LEGENDA" }) => não lança erro e retorna media null
- computeMeasurementStats({ leituras: [100, 120] }).media => 110
*/

const resolvePeriodoHorizontal = (medicao = {}, obra = null) => {
  const subtipo = safeUpper(medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao);
  if (subtipo !== "HORIZONTAL") return "-";
  const dataBase = medicao.data_aplicacao || medicao.dataAplicacao || obra?.data_aplicacao || obra?.dataAplicacao || obra?.data_inicio_obra || obra?.dataInicioObra || medicao.data_inicio_obra || medicao.dataInicioObra;
  if (!dataBase) return "Não informado";
  const start = new Date(dataBase);
  const med = new Date(medicao.dataHora || medicao.data_hora || medicao.created_at || Date.now());
  if (Number.isNaN(start.getTime()) || Number.isNaN(med.getTime())) return "Não informado";
  const diffDays = (med - start) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return "Não informado";
  if (diffDays <= 15) return "Inicial";
  return "Residual";
};

const normalizeCriterion = (item = {}) => ({
  id: item.id || crypto.randomUUID(),
  obra_id: String(item.obra_id || item.obraId || "").trim().toUpperCase(),
  subtipo: safeUpper(item.subtipo),
  classe_tipo: safeUpper(item.classe_tipo || item.classeTipo || item.tipo_medicao),
  elemento_marcacao: safeUpper(item.elemento_marcacao || item.elementoMarcacao || item.tipoDeMarcacao || item.elemento_via),
  periodo: safeUpper(item.periodo),
  geom: safeUpper(item.geom || item.geometria),
  minimo: toNum(item.minimo),
  created_at: item.created_at || new Date().toISOString()
});

const getMinCriterion = ({ criterios = [], subtipo = "", classe_tipo = "", elemento_marcacao = "", periodo = "", obra_id = "", geom = "" } = {}) => {
  const target = {
    obra_id: String(obra_id || "").trim().toUpperCase(),
    subtipo: safeUpper(subtipo),
    classe_tipo: safeUpper(classe_tipo),
    elemento_marcacao: safeUpper(elemento_marcacao),
    periodo: safeUpper(periodo),
    geom: safeUpper(geom)
  };
  const normalized = (criterios || []).map(normalizeCriterion).filter((item) => item.minimo !== null);
  const candidates = normalized.filter((item) => {
    if (item.obra_id && target.obra_id && item.obra_id !== target.obra_id) return false;
    if (item.subtipo && target.subtipo && item.subtipo !== target.subtipo) return false;
    if (item.classe_tipo && target.classe_tipo && item.classe_tipo !== target.classe_tipo) return false;
    if (item.elemento_marcacao && target.elemento_marcacao && item.elemento_marcacao !== target.elemento_marcacao) return false;
    if (item.periodo && target.periodo && item.periodo !== target.periodo) return false;
    if (item.geom && target.geom && item.geom !== target.geom) return false;
    return true;
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const scoreA = [a.obra_id, a.subtipo, a.classe_tipo, a.elemento_marcacao, a.periodo, a.geom].filter(Boolean).length;
    const scoreB = [b.obra_id, b.subtipo, b.classe_tipo, b.elemento_marcacao, b.periodo, b.geom].filter(Boolean).length;
    return scoreB - scoreA;
  });
  return candidates[0].minimo;
};

const evaluateMedicao = ({ medicao = {}, criterios = [], obra = null, equipamento = null } = {}) => {
  const stats = computeMeasurementStats(medicao);
  const periodo = resolvePeriodoHorizontal(medicao, obra);
  const minimo = getMinCriterion({
    criterios,
    subtipo: stats.subtipo,
    classe_tipo: medicao.tipoMedicao || medicao.tipo_medicao,
    elemento_marcacao: medicao.tipoDeMarcacao || medicao.tipo_marcacao || medicao.elemento_via,
    periodo,
    obra_id: medicao.obra_id,
    geom: equipamento?.geometria || medicao.geometria
  });
  if (minimo === null || stats.media === null) {
    return { ...stats, minimo, status: "NÃO AVALIADO", motivo: "Critério não configurado para esta combinação", periodo };
  }
  if (stats.media >= minimo) {
    return { ...stats, minimo, status: "CONFORME", motivo: "", periodo };
  }
  return { ...stats, minimo, status: "NÃO CONFORME", motivo: "Média abaixo do mínimo", periodo };
};

const buildConformidadeResumo = (avaliacoes = []) => {
  const conformes = avaliacoes.filter((item) => item.status === "CONFORME").length;
  const naoConformes = avaliacoes.filter((item) => item.status === "NÃO CONFORME").length;
  const naoAvaliadas = avaliacoes.filter((item) => item.status === "NÃO AVALIADO").length;
  const denominador = conformes + naoConformes;
  const pct = denominador ? (conformes / denominador) * 100 : 0;
  return { total: avaliacoes.length, conformes, naoConformes, naoAvaliadas, pctConformidade: pct };
};

const getMarcacaoConfig = (subtipo = "") => {
  const tipo = safeUpper(subtipo);
  if (tipo === "VERTICAL") return { label: "Tipo de Película", options: VERTICAL_CLASS_OPTIONS };
  if (tipo === "TACHAS") return { label: "Tipo de Lente Refletiva", options: TACHAS_CLASS_OPTIONS };
  return { label: "Elemento da via", options: HORIZONTAL_MARKING_OPTIONS };
};

export {
  HORIZONTAL_MARKING_OPTIONS,
  VERTICAL_CLASS_OPTIONS,
  TACHAS_CLASS_OPTIONS,
  computeMeasurementStats,
  computeLegendaStats,
  resolvePeriodoHorizontal,
  normalizeCriterion,
  getMinCriterion,
  evaluateMedicao,
  buildConformidadeResumo,
  getMarcacaoConfig
};
