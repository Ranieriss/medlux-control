import { getAllMedicoes, getMedicoesByUser } from "../db.js";

const normalizeText = (value) => String(value || "").trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();
const normalizeDateOnly = (value) => {
  const raw = normalizeText(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toSafeText = (value) => String(value ?? "-").replace(/[\u{0080}-\u{FFFF}]/gu, (char) => {
  const map = {
    "Á": "A", "À": "A", "Ã": "A", "Â": "A", "Ä": "A",
    "á": "a", "à": "a", "ã": "a", "â": "a", "ä": "a",
    "É": "E", "È": "E", "Ê": "E", "Ë": "E",
    "é": "e", "è": "e", "ê": "e", "ë": "e",
    "Í": "I", "Ì": "I", "Î": "I", "Ï": "I",
    "í": "i", "ì": "i", "î": "i", "ï": "i",
    "Ó": "O", "Ò": "O", "Õ": "O", "Ô": "O", "Ö": "O",
    "ó": "o", "ò": "o", "õ": "o", "ô": "o", "ö": "o",
    "Ú": "U", "Ù": "U", "Û": "U", "Ü": "U",
    "ú": "u", "ù": "u", "û": "u", "ü": "u",
    "Ç": "C", "ç": "c", "Ñ": "N", "ñ": "n", "°": "o"
  };
  return map[char] || "?";
});

const resolveTimestamp = (medicao) => medicao.created_at || medicao.dataHora || medicao.data_hora || "";
const resolveDateOnly = (medicao) => normalizeDateOnly(resolveTimestamp(medicao));
const resolveSubtipo = (medicao) => normalizeUpper(medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao);

const resolveLeiturasLabel = (medicao) => {
  if (Array.isArray(medicao.leituras) && medicao.leituras.length) return medicao.leituras.join(", ");
  if (medicao.quantidade !== undefined && medicao.quantidade !== null) return String(medicao.quantidade);
  if (medicao.valor !== undefined && medicao.valor !== null && medicao.valor !== "") return String(medicao.valor);
  return "-";
};

const buildSubtypeSummary = (medicoes) => {
  const tracked = ["HORIZONTAL", "VERTICAL", "TACHAS", "PLACA", "LEGENDA"];
  const summary = tracked.reduce((acc, type) => ({ ...acc, [type]: 0 }), {});
  medicoes.forEach((medicao) => {
    const subtipo = resolveSubtipo(medicao);
    if (summary[subtipo] !== undefined) summary[subtipo] += 1;
  });
  return summary;
};

const filterMedicoes = ({ medicoes, userId, obraId, startDate, endDate }) => {
  const userComparable = normalizeUpper(userId);
  const obraComparable = normalizeUpper(obraId);
  const startComparable = normalizeDateOnly(startDate);
  const endComparable = normalizeDateOnly(endDate);

  return medicoes.filter((medicao) => {
    const medicaoUser = normalizeUpper(medicao.user_id);
    if (!medicaoUser || medicaoUser !== userComparable) return false;

    const medicaoObra = normalizeUpper(medicao.obra_id);
    if (obraComparable && medicaoObra !== obraComparable) return false;

    const medicaoDate = resolveDateOnly(medicao);
    if (!medicaoDate) return false;
    if (startComparable && medicaoDate < startComparable) return false;
    if (endComparable && medicaoDate > endComparable) return false;

    return true;
  });
};

export async function generateUserReportPdf({ user, obraId = "", startDate = "", endDate = "" }) {
  const userId = user?.id || user?.user_id || "";
  if (!normalizeText(userId)) {
    const error = new Error("Faça login para gerar o relatório individual.");
    error.code = "AUTH_REQUIRED";
    throw error;
  }
  if (!window.jspdf?.jsPDF) {
    throw new Error("Biblioteca de PDF não disponível no navegador.");
  }

  let medicoes = [];
  try {
    medicoes = await getMedicoesByUser(userId);
  } catch {
    medicoes = await getAllMedicoes();
  }

  const filtered = filterMedicoes({ medicoes, userId, obraId, startDate, endDate });
  if (!filtered.length) return { total: 0 };

  const subtypeSummary = buildSubtypeSummary(filtered);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const now = new Date();

  doc.setFontSize(16);
  doc.text(toSafeText("MEDLUX - Relatorio Individual"), 40, 38);

  doc.setFontSize(10);
  doc.text(toSafeText(`Usuario: ${userId} ${user?.nome ? `- ${user.nome}` : ""}`), 40, 58);
  doc.text(toSafeText(`Gerado em: ${now.toLocaleString("pt-BR")}`), 40, 72);
  doc.text(toSafeText(`Filtros | Obra: ${obraId || "TODAS"} | Inicio: ${startDate || "-"} | Fim: ${endDate || "-"}`), 40, 86);
  doc.text(
    toSafeText(
      `Resumo | Total: ${filtered.length} | HORIZONTAL: ${subtypeSummary.HORIZONTAL} | VERTICAL: ${subtypeSummary.VERTICAL} | ` +
      `TACHAS: ${subtypeSummary.TACHAS} | PLACA: ${subtypeSummary.PLACA} | LEGENDA: ${subtypeSummary.LEGENDA}`
    ),
    40,
    100
  );

  const bodyRows = filtered
    .sort((a, b) => String(resolveTimestamp(b)).localeCompare(String(resolveTimestamp(a))))
    .map((medicao) => [
      toSafeText(resolveTimestamp(medicao) || "-"),
      toSafeText(medicao.obra_id || "-"),
      toSafeText(medicao.equipamento_id || medicao.equip_id || "-"),
      toSafeText(resolveSubtipo(medicao) || "-"),
      toSafeText(resolveLeiturasLabel(medicao)),
      toSafeText(medicao.media ?? "-"),
      toSafeText(medicao.media_final ?? "-"),
      toSafeText(medicao.minimo ?? "-"),
      toSafeText(medicao.status_conformidade || "-"),
      toSafeText(medicao.rodovia || "-"),
      toSafeText(medicao.km || "-"),
      toSafeText(medicao.faixa || "-"),
      toSafeText(medicao.sentido || "-"),
      toSafeText(medicao.cidadeUF || medicao.cidade_uf || "-")
    ]);

  doc.autoTable({
    head: [["Data/Hora", "Obra", "Equip.", "Subtipo", "Leituras", "Media", "Media final", "Minimo", "Status", "Rodovia", "KM", "Faixa", "Sentido", "Cidade/UF"]],
    body: bodyRows,
    startY: 112,
    styles: { fontSize: 7, cellPadding: 2 }
  });

  const fileDate = now.toISOString().slice(0, 10);
  doc.save(`relatorio-individual-${normalizeUpper(userId)}-${fileDate}.pdf`);

  return {
    total: filtered.length,
    subtypeSummary
  };
}
