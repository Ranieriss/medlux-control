import {
  getAllMedicoes,
  getMedicoesByUser,
  getAllObras,
  getObraById,
  getUserById
} from "../db.js";

const normalizeText = (value) => String(value || "").trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();

const parseDate = (value) => {
  const raw = normalizeText(value);
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("pt-BR");
};

const formatDateOnly = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
};

const resolveMedicaoDate = (medicao) => parseDate(medicao?.created_at || medicao?.dataHora || medicao?.data_hora);

const resolveUserId = (loggedUser) => normalizeText(loggedUser?.id || loggedUser?.user_id);


let pdfLibPromise = null;

const PDF_LIB_URLS = {
  jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  autoTable: "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"
};

const hasJsPdf = () => Boolean(window.jspdf && typeof window.jspdf.jsPDF === "function");

const hasAutoTablePlugin = () => Boolean(window.jspdf?.jsPDF?.prototype?.autoTable || window.jsPDF?.API?.autoTable);

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-medlux-pdf-src="${src}"]`) || document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true" || (src === PDF_LIB_URLS.jspdf && hasJsPdf()) || (src === PDF_LIB_URLS.autoTable && hasAutoTablePlugin())) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Falha ao carregar script: ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset.medluxPdfSrc = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Falha ao carregar script: ${src}`)));
    document.head.appendChild(script);
  });

const ensurePdfLibReady = async () => {
  if (hasJsPdf()) return;

  if (!pdfLibPromise) {
    pdfLibPromise = (async () => {
      await loadScript(PDF_LIB_URLS.jspdf);
      await loadScript(PDF_LIB_URLS.autoTable);
    })().catch((error) => {
      pdfLibPromise = null;
      throw error;
    });
  }

  await pdfLibPromise;

  if (!hasJsPdf()) {
    throw new Error("Biblioteca de PDF não disponível no navegador. Verifique conexão com a internet ou bloqueio de CDN.");
  }
};

const resolvePeriodo = ({ startDate, endDate }) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (startDate && !start) throw new Error("Data inicial inválida.");
  if (endDate && !end) throw new Error("Data final inválida.");

  if (start && !end) return { start, end: new Date(), swapped: false };
  if (!start && end) return { start: null, end, swapped: false };
  if (!start && !end) return { start: null, end: null, swapped: false };

  if (end < start) return { start: end, end: start, swapped: true };
  return { start, end, swapped: false };
};

const buildPdfBlob = async ({ loggedUser, obra, obraId, periodo, medicoes }) => {
  await ensurePdfLibReady();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  if (typeof doc.autoTable !== "function") {
    await loadScript(PDF_LIB_URLS.autoTable);
  }
  if (typeof doc.autoTable !== "function") {
    throw new Error("Biblioteca de PDF carregada parcialmente: plugin AutoTable indisponível.");
  }
  const generatedAt = new Date();

  doc.setFontSize(16);
  doc.text("RELATORIO INDIVIDUAL - MEDLUX", 40, 40);

  doc.setFontSize(10);
  const operadorId = resolveUserId(loggedUser) || "-";
  const operadorNome = normalizeText(loggedUser?.nome) || "-";
  doc.text(`Operador: ${operadorNome} (${operadorId})`, 40, 62);

  const obraLabel = obra
    ? `${obra.idObra || obra.id || obraId} - ${obra.nomeObra || obra.nome || "Sem nome"}`
    : obraId;
  doc.text(`Obra: ${obraLabel || "-"}`, 40, 78);

  const rodovia = normalizeText(obra?.rodovia);
  const kmInicio = normalizeText(obra?.kmInicio || obra?.km_inicial || obra?.km);
  const kmFim = normalizeText(obra?.kmFim || obra?.km_final);
  const cidadeUF = normalizeText(obra?.cidadeUF || obra?.cidade_uf);
  const localLabel = [
    rodovia ? `Rodovia: ${rodovia}` : "",
    kmInicio || kmFim ? `KM: ${kmInicio || "-"}${kmFim ? ` -> ${kmFim}` : ""}` : "",
    cidadeUF ? `Cidade/UF: ${cidadeUF}` : ""
  ].filter(Boolean).join(" | ");
  if (localLabel) doc.text(localLabel, 40, 94);

  const periodoLabel = `${formatDateOnly(periodo.start)} a ${formatDateOnly(periodo.end)}`;
  doc.text(`Periodo: ${periodoLabel}`, 40, 110);

  const tableBody = medicoes.map((medicao) => {
    const tipo = normalizeText(medicao.tipoMedicao || medicao.tipo_medicao);
    const subtipo = normalizeText(medicao.subtipo || medicao.subtipo_medicao);
    return [
      formatDateTime(medicao.created_at || medicao.dataHora || medicao.data_hora),
      normalizeText(medicao.equipamento_id || medicao.equip_id) || "-",
      [tipo, subtipo].filter(Boolean).join(" / ") || "-",
      medicao.media_final ?? medicao.media ?? "-",
      normalizeText(medicao.unidade) || "-",
      [normalizeText(medicao.rodovia), normalizeText(medicao.km)].filter(Boolean).join(" / ") || "-",
      normalizeText(medicao.faixa) || "-",
      normalizeText(medicao.sentido) || "-",
      normalizeText(medicao.observacoes) || "-"
    ];
  });

  if (!tableBody.length) {
    doc.setFontSize(11);
    doc.text("Nenhuma medicao encontrada para os filtros informados.", 40, 140);
  } else {
    doc.autoTable({
      startY: 126,
      head: [["Data/Hora", "Equipamento", "Tipo/Subtipo", "Media final", "Unidade", "Rodovia/KM", "Faixa", "Sentido", "Observacoes"]],
      body: tableBody,
      styles: { fontSize: 8, cellPadding: 3 }
    });
  }

  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setFontSize(10);
  doc.text(`Total de medicoes: ${medicoes.length}`, 40, footerY);
  doc.text(`Gerado em: ${generatedAt.toLocaleString("pt-BR")}`, 250, footerY);

  return doc.output("blob");
};

const openPdfBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank", "noopener,noreferrer");

  if (!popup) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export async function generateUserIndividualPdf({ obraId, startDate, endDate, loggedUser }) {
  const normalizedObraId = normalizeUpper(obraId);
  if (!normalizedObraId) throw new Error("Informe a obra para gerar o relatório individual.");

  const userId = resolveUserId(loggedUser);
  if (!userId) throw new Error("Faça login para gerar o relatório individual.");

  const periodo = resolvePeriodo({ startDate, endDate });

  let medicoes = [];
  try {
    medicoes = await getMedicoesByUser(userId);
  } catch {
    medicoes = await getAllMedicoes();
  }

  const userComparable = normalizeUpper(userId);
  const filtradas = (medicoes || [])
    .filter((medicao) => normalizeUpper(medicao.user_id) === userComparable)
    .filter((medicao) => normalizeUpper(medicao.obra_id) === normalizedObraId)
    .filter((medicao) => {
      const data = resolveMedicaoDate(medicao);
      if (!data) return false;
      if (periodo.start && data < periodo.start) return false;
      if (periodo.end && data > periodo.end) return false;
      return true;
    })
    .sort((a, b) => resolveMedicaoDate(a) - resolveMedicaoDate(b));

  const userFromDb = await getUserById(userId);
  const resolvedUser = userFromDb || loggedUser;

  let obra = await getObraById(normalizedObraId);
  if (!obra) {
    const obras = await getAllObras();
    obra = (obras || []).find((item) => normalizeUpper(item.id || item.idObra) === normalizedObraId) || null;
  }

  const blob = await buildPdfBlob({
    loggedUser: resolvedUser,
    obra,
    obraId: normalizedObraId,
    periodo,
    medicoes: filtradas
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  const fileName = `relatorio-individual-${normalizedObraId}-${normalizeUpper(userId)}-${fileDate}.pdf`;
  openPdfBlob(blob, fileName);

  return {
    total: filtradas.length,
    swappedPeriod: periodo.swapped
  };
}
