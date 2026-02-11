import {
  getAllMedicoes,
  getAllEquipamentos,
  getAllObras,
  getAllUsers,
  getUserById
} from "../db.js";
import { getPdfLibReady } from "./pdf-lib.js";

const normalizeText = (value) => String(value || "").trim();
const normalizeUpper = (value) => normalizeText(value).toUpperCase();

const parseDayStart = (value) => {
  const raw = normalizeText(value);
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDayEnd = (value) => {
  const raw = normalizeText(value);
  if (!raw) return null;
  const date = new Date(`${raw}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveTimestamp = (medicao = {}) => medicao.created_at || medicao.dataHora || medicao.data_hora || "";

const resolveDate = (medicao) => {
  const raw = resolveTimestamp(medicao);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
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

const toFixedSafe = (value, digits = 2) => {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "-";
};

const textSafe = (value) => normalizeText(value) || "-";

const resolveConformidadeResumo = (medicoes = []) => {
  const total = medicoes.length;
  if (!total) return { conformes: 0, naoConformes: 0, naoAvaliadas: 0, pctConformes: 0, pctNaoConformes: 0, pctNaoAvaliadas: 0 };

  let conformes = 0;
  let naoConformes = 0;
  let naoAvaliadas = 0;

  medicoes.forEach((item) => {
    const status = normalizeUpper(item.status_conformidade);
    if (status === "CONFORME") conformes += 1;
    else if (status === "NÃO CONFORME" || status === "NAO CONFORME") naoConformes += 1;
    else naoAvaliadas += 1;
  });

  return {
    conformes,
    naoConformes,
    naoAvaliadas,
    pctConformes: (conformes / total) * 100,
    pctNaoConformes: (naoConformes / total) * 100,
    pctNaoAvaliadas: (naoAvaliadas / total) * 100
  };
};

const resolveCurrentUser = async (currentUser) => {
  const sessionId = normalizeText(currentUser?.id || currentUser?.user_id);
  if (!sessionId) throw new Error("Faça login para gerar o relatório individual.");

  const fallbackUser = {
    ...(currentUser || {}),
    id: sessionId,
    user_id: sessionId,
    role: normalizeUpper(currentUser?.role)
  };

  const userFromDb = (await getUserById(sessionId)) || null;
  if (userFromDb) {
    return {
      ...userFromDb,
      ...fallbackUser,
      role: normalizeUpper(fallbackUser.role || userFromDb.role)
    };
  }

  const users = await getAllUsers();
  const found = users.find((item) => normalizeUpper(item.id || item.user_id) === normalizeUpper(sessionId)) || null;
  if (found) {
    return {
      ...found,
      ...fallbackUser,
      role: normalizeUpper(fallbackUser.role || found.role)
    };
  }

  return fallbackUser;
};

const filterMedicoes = ({ medicoes, obraId, startDate, endDate, userId, canSeeAll }) => {
  const obraComparable = normalizeUpper(obraId);
  const userComparable = normalizeUpper(userId);
  const start = parseDayStart(startDate);
  const end = parseDayEnd(endDate);

  if (startDate && !start) throw new Error("Data inicial inválida.");
  if (endDate && !end) throw new Error("Data final inválida.");
  if (start && end && end < start) throw new Error("Data final deve ser maior ou igual à data inicial.");

  return (medicoes || []).filter((medicao) => {
    if (!canSeeAll && normalizeUpper(medicao.user_id) !== userComparable) return false;
    if (obraComparable && normalizeUpper(medicao.obra_id) !== obraComparable) return false;

    const date = resolveDate(medicao);
    if (!date) return false;
    if (start && date < start) return false;
    if (end && date > end) return false;
    return true;
  });
};

export async function generateUserPdfReport({ obraId, startDate, endDate, currentUser }) {
  const normalizedObraId = normalizeUpper(obraId);
  if (startDate && !parseDayStart(startDate)) throw new Error("Data inicial inválida.");
  if (endDate && !parseDayEnd(endDate)) throw new Error("Data final inválida.");

  const pdfRuntime = await getPdfLibReady();

  const user = await resolveCurrentUser(currentUser);
  const userId = normalizeText(user?.id || user?.user_id);
  const canSeeAll = normalizeUpper(user?.role) === "ADMIN";

  const [medicoes, equipamentos, obras] = await Promise.all([getAllMedicoes(), getAllEquipamentos(), getAllObras()]);
  const filtradas = filterMedicoes({
    medicoes,
    obraId: normalizedObraId,
    startDate,
    endDate,
    userId,
    canSeeAll
  }).sort((a, b) => resolveDate(a) - resolveDate(b));

  const obra = normalizedObraId
    ? obras.find((item) => normalizeUpper(item.id || item.idObra) === normalizedObraId) || null
    : null;

  if (!filtradas.length) {
    throw new Error("Nenhuma medição encontrada para os filtros informados.");
  }

  const medias = filtradas.map((item) => Number(item.media_final ?? item.media)).filter((item) => Number.isFinite(item));
  const mediaGeral = medias.length ? medias.reduce((acc, item) => acc + item, 0) / medias.length : null;
  const conformidade = resolveConformidadeResumo(filtradas);

  const jsPDF = pdfRuntime?.jsPDF;
  if (typeof jsPDF !== "function") {
    throw new Error("Biblioteca de PDF indisponível.");
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const autoTable = doc.autoTable || pdfRuntime?.autoTable || window.autoTable;
  if (typeof autoTable !== "function") {
    throw new Error("Biblioteca de PDF indisponível.");
  }
  const generatedAt = new Date();

  doc.setFontSize(16);
  doc.text("MEDLUX - Relatorio Individual", 40, 36);

  doc.setFontSize(10);
  doc.text(`Operador: ${canSeeAll ? "ADMIN (visão abrangente)" : `${textSafe(userId)} - ${textSafe(user?.nome)}`}`, 40, 56);
  doc.text(`Obra: ${normalizedObraId || "TODAS"} - ${textSafe(obra?.nomeObra || obra?.nome || "Visão consolidada")}`, 40, 70);
  doc.text(
    `Rodovia: ${textSafe(obra?.rodovia)} | Cidade/UF: ${textSafe(obra?.cidadeUF || obra?.cidade_uf)}`,
    40,
    84
  );
  doc.text(`Periodo: ${formatDateOnly(parseDayStart(startDate))} a ${formatDateOnly(parseDayEnd(endDate))}`, 40, 98);
  doc.text(`Gerado em: ${generatedAt.toLocaleString("pt-BR")}`, 40, 112);

  {
    const rows = filtradas.map((medicao) => {
      const equipamento = equipamentos.find((item) => item.id === (medicao.equipamento_id || medicao.equip_id));
      const posicao = textSafe(medicao.posicao_tipo || medicao.posicao || "—");
      return [
        formatDateTime(resolveTimestamp(medicao)),
        textSafe(medicao.equipamento_id || medicao.equip_id),
        textSafe(medicao.subtipo || medicao.tipoMedicao || medicao.tipo_medicao),
        posicao,
        toFixedSafe(medicao.media_final ?? medicao.media),
        textSafe(medicao.minimo ?? medicao.criterio_minimo),
        textSafe(medicao.status_conformidade),
        textSafe(equipamento?.modelo)
      ];
    });

    autoTable.call(doc, {
      startY: 126,
      head: [["Data/Hora", "Equipamento", "Subtipo", "Posição / Referência", "Média", "Mínimo/Critério", "Status", "Modelo"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, overflow: "ellipsize", lineWidth: 0.1 },
      headStyles: { halign: "center", valign: "middle", overflow: "ellipsize" },
      columnStyles: {
        0: { cellWidth: 82 },
        1: { cellWidth: 62 },
        2: { cellWidth: 52 },
        3: { cellWidth: 86 },
        4: { cellWidth: 44 },
        5: { cellWidth: 64 },
        6: { cellWidth: 58 },
        7: { cellWidth: 120 }
      }
    });
  }

  const footerY = doc.internal.pageSize.getHeight() - 34;
  doc.setFontSize(10);
  doc.text(
    `Resumo: ${filtradas.length} medicao(oes) | Media geral: ${toFixedSafe(mediaGeral)} | Conforme: ${conformidade.pctConformes.toFixed(1)}% | Nao conforme: ${conformidade.pctNaoConformes.toFixed(1)}% | Nao avaliada: ${conformidade.pctNaoAvaliadas.toFixed(1)}%`,
    40,
    footerY
  );

  const fileDate = generatedAt.toISOString().slice(0, 10);
  const fileName = `relatorio-individual-${normalizedObraId || "TODAS"}-${normalizeUpper(userId)}-${fileDate}.pdf`;

  // Correção crítica para GitHub Pages/PWA: tenta abrir o PDF em nova aba e mantém fallback de download.
  const blobUrl = doc.output("bloburl");
  const popup = window.open(blobUrl, "_blank", "noopener,noreferrer");
  if (!popup) {
    doc.save(fileName);
  }

  return {
    total: filtradas.length,
    fileName,
    userId,
    obraId: normalizedObraId,
    canSeeAll
  };
}

export function initUserReportFeature({
  basePath = "",
  getCurrentUser,
  onStatusMessage = () => {},
  onError = async () => {},
  onSuccess = async () => {}
} = {}) {
  void basePath;
  const button = document.getElementById("generateUserPdf");
  const obraInput = document.getElementById("userReportObra");
  const startInput = document.getElementById("userReportStart");
  const endInput = document.getElementById("userReportEnd");

  if (!button || !obraInput || !startInput || !endInput) return () => {};

  const handleClick = async () => {
    const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;

    try {
      onStatusMessage("Gerando PDF individual...");
      const result = await generateUserPdfReport({
        obraId: obraInput.value,
        startDate: startInput.value,
        endDate: endInput.value,
        currentUser
      });

      onStatusMessage("PDF individual gerado com sucesso.");

      await onSuccess(result);
    } catch (error) {
      console.error("Falha ao gerar relatório individual", error);
      onStatusMessage(`PDF indisponível: ${error?.message || "Falha ao gerar PDF individual."}`);
      await onError(error, {
        obraId: obraInput.value,
        startDate: startInput.value,
        endDate: endInput.value,
        currentUser
      });
    }
  };

  button.addEventListener("click", handleClick);

  return () => {
    button.removeEventListener("click", handleClick);
  };
}
