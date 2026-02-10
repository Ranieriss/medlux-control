const normalizeUpper = (value) => String(value || "").trim().toUpperCase();

const parseIsoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const calculateMediaDetails = (subtipo, leituras = [], legendaEstrutura = null) => {
  const tipo = normalizeUpper(subtipo);
  const valores = (Array.isArray(leituras) ? leituras : [])
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
  const result = {
    media: null,
    discarded_min: null,
    discarded_max: null,
    quantidade: valores.length,
    legenda_por_letra: [],
    legenda_estrutura_informada: true
  };
  if (!valores.length) return result;

  if (tipo === "HORIZONTAL") {
    if (valores.length < 10) return result;
    const sorted = [...valores].sort((a, b) => a - b);
    result.discarded_min = sorted[0];
    result.discarded_max = sorted[sorted.length - 1];
    const trimmed = sorted.slice(1, sorted.length - 1);
    if (!trimmed.length) return result;
    result.media = trimmed.reduce((acc, item) => acc + item, 0) / trimmed.length;
    return result;
  }

  if (tipo === "LEGENDA") {
    if (Array.isArray(legendaEstrutura) && legendaEstrutura.length) {
      const medias = legendaEstrutura.map((item) => {
        const letterVals = (item.leituras || []).map(Number).filter(Number.isFinite);
        const mediaLetra = letterVals.length ? letterVals.reduce((a, b) => a + b, 0) / letterVals.length : null;
        return { letra: item.letra || "-", media: mediaLetra };
      });
      result.legenda_por_letra = medias;
      const valid = medias.map((item) => item.media).filter(Number.isFinite);
      result.media = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
      return result;
    }
    result.legenda_estrutura_informada = false;
  }

  result.media = valores.reduce((acc, item) => acc + item, 0) / valores.length;
  return result;
};

const resolvePeriodo = ({ subtipo, data_medicao, data_aplicacao }) => {
  if (normalizeUpper(subtipo) !== "HORIZONTAL") return null;
  const medicaoDate = parseIsoDate(data_medicao);
  const aplicacaoDate = parseIsoDate(data_aplicacao);
  if (!medicaoDate || !aplicacaoDate) return "NÃO INFORMADO";
  const diff = Math.floor((medicaoDate - aplicacaoDate) / (1000 * 60 * 60 * 24));
  if (diff <= 15) return "INICIAL";
  return "RESIDUAL";
};

const evaluateConformidade = ({ media, criterio }) => {
  if (!criterio || !Number.isFinite(Number(criterio.minimo_exigido))) {
    return {
      status: "NÃO AVALIADO",
      motivo: "Critério não configurado",
      minimo: null
    };
  }
  const minimo = Number(criterio.minimo_exigido);
  if (!Number.isFinite(media)) {
    return {
      status: "NÃO AVALIADO",
      motivo: "Média não disponível",
      minimo
    };
  }
  if (media >= minimo) {
    return { status: "CONFORME", motivo: "", minimo };
  }
  return {
    status: "NÃO CONFORME",
    motivo: "Média abaixo do mínimo",
    minimo
  };
};

const resolveCriterio = ({ criterios = [], obra, subtipo, periodo, classe_tipo, elemento }) => {
  const obraN = normalizeUpper(obra);
  const subtipoN = normalizeUpper(subtipo);
  const periodoN = normalizeUpper(periodo);
  const classeN = normalizeUpper(classe_tipo);
  const elementoN = normalizeUpper(elemento);
  const only = (matcher) => criterios.find((item) => matcher(item));
  const base = (item) => normalizeUpper(item.obra) === obraN && normalizeUpper(item.subtipo) === subtipoN;
  const periodoOk = (item) => !item.periodo || normalizeUpper(item.periodo) === periodoN;

  const exact = only((item) => base(item)
      && periodoOk(item)
      && normalizeUpper(item.classe_tipo) === classeN
      && normalizeUpper(item.elemento) === elementoN);
  if (exact) return { criterio: exact, fallback_level: 1 };

  const semElemento = only((item) => base(item)
      && periodoOk(item)
      && normalizeUpper(item.classe_tipo) === classeN
      && !normalizeUpper(item.elemento));
  if (semElemento) return { criterio: semElemento, fallback_level: 2 };

  const semClasse = only((item) => base(item)
      && periodoOk(item)
      && !normalizeUpper(item.classe_tipo)
      && !normalizeUpper(item.elemento));
  if (semClasse) return { criterio: semClasse, fallback_level: 3 };

  const geral = only((item) => base(item) && !item.periodo && !item.classe_tipo && !item.elemento);
  if (geral) return { criterio: geral, fallback_level: 4 };

  return { criterio: null, fallback_level: null };
};

const buildConformidadeResumo = (medicoes = []) => {
  const totalConformes = medicoes.filter((item) => item.status_conformidade === "CONFORME").length;
  const totalNaoConformes = medicoes.filter((item) => item.status_conformidade === "NÃO CONFORME").length;
  const totalNaoAvaliado = medicoes.filter((item) => item.status_conformidade === "NÃO AVALIADO").length;
  const denom = totalConformes + totalNaoConformes;
  const pct = denom ? (totalConformes / denom) * 100 : 0;
  return { totalConformes, totalNaoConformes, totalNaoAvaliado, pct };
};

export {
  calculateMediaDetails,
  resolvePeriodo,
  evaluateConformidade,
  resolveCriterio,
  buildConformidadeResumo
};
