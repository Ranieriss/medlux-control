const PDF_LIB_ASSETS = {
  jspdf: {
    file: "jspdf.umd.min.js",
    cdn: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
  },
  autoTable: {
    file: "jspdf.plugin.autotable.min.js",
    cdn: "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"
  }
};

let pdfLibPromise = null;

const getJsPdfCtor = () => window.jspdf?.jsPDF || window.jsPDF || null;
const hasJsPdf = () => typeof getJsPdfCtor() === "function";
const hasAutoTablePlugin = () => {
  const jsPdfCtor = getJsPdfCtor();
  return Boolean(
    jsPdfCtor?.API?.autoTable ||
    jsPdfCtor?.prototype?.autoTable ||
    window.jspdf?.autoTable ||
    window.autoTable
  );
};

const candidateSources = (asset) => {
  const pathName = window.location.pathname || "";
  const isFrontEndPath = pathName.includes("/front-end/");
  const prefix = isFrontEndPath ? "../vendor" : "./front-end/vendor";
  return [
    `${prefix}/${asset.file}`,
    `./front-end/vendor/${asset.file}`,
    `../vendor/${asset.file}`,
    `/medlux-control/front-end/vendor/${asset.file}`,
    `/front-end/vendor/${asset.file}`,
    asset.cdn
  ];
};

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-medlux-pdf-src="${src}"]`) || document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true" || existing.readyState === "complete" || existing.readyState === "loaded") {
        existing.dataset.loaded = "true";
        return resolve();
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Falha ao carregar script: ${src}`)), { once: true });

      // Script já pode ter sido carregado antes do bind dos eventos.
      setTimeout(() => {
        if (existing.dataset.loaded === "true") return;
        existing.dataset.loaded = "true";
        resolve();
      }, 0);
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

const loadFirstAvailable = async (sources, checker) => {
  for (const src of [...new Set(sources)]) {
    try {
      await loadScript(src);
      if (checker()) return;
    } catch {
      // ignora e tenta o próximo fallback
    }
  }
  throw new Error("Biblioteca de PDF indisponível.");
};

export async function ensurePdfLib() {
  if (hasJsPdf() && hasAutoTablePlugin()) return;

  if (!pdfLibPromise) {
    pdfLibPromise = (async () => {
      if (!hasJsPdf()) await loadFirstAvailable(candidateSources(PDF_LIB_ASSETS.jspdf), hasJsPdf);
      if (!hasAutoTablePlugin()) await loadFirstAvailable(candidateSources(PDF_LIB_ASSETS.autoTable), hasAutoTablePlugin);
    })().catch((error) => {
      pdfLibPromise = null;
      throw error;
    });
  }

  await pdfLibPromise;

  if (!hasJsPdf() || !hasAutoTablePlugin()) {
    throw new Error("Biblioteca de PDF não disponível no navegador.");
  }
}

export async function getPdfLibReady() {
  await ensurePdfLib();
  return {
    jsPDF: getJsPdfCtor(),
    autoTable: window.autoTable || window.jspdf?.autoTable || null
  };
}

const resolvePageWidth = (doc, margin = 40) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  return Math.max(0, pageWidth - margin * 2);
};

const totalColumnWidth = (columnWidths = []) =>
  (columnWidths || []).reduce((acc, width) => acc + (Number(width) || 0), 0);

export function makePdfTableNoWrap({
  jsPDF,
  orientation = "portrait",
  format = "a4",
  margin = 40,
  startY = 80,
  head = [],
  body = [],
  columnWidths = [],
  pageTitle = "",
  doc: incomingDoc = null,
  styles = {},
  headStyles = {},
  ...rest
} = {}) {
  if (typeof jsPDF !== "function") {
    throw new Error("jsPDF indisponível para geração de tabela PDF.");
  }

  const createDoc = (currentOrientation) => new jsPDF({ orientation: currentOrientation, unit: "pt", format });
  let doc = incomingDoc || createDoc(orientation);
  const colTotal = totalColumnWidth(columnWidths);
  const tryOrientations = orientation === "landscape" ? ["landscape"] : ["portrait", "landscape"];

  for (const currentOrientation of tryOrientations) {
    const testDoc = incomingDoc ? doc : createDoc(currentOrientation);
    const available = resolvePageWidth(testDoc, margin);
    if (!colTotal || colTotal <= available) {
      doc = testDoc;
      break;
    }
    if (currentOrientation === "landscape") {
      doc = testDoc;
    }
  }

  if (pageTitle) {
    doc.setFontSize(12);
    doc.text(pageTitle, margin, startY - 10);
  }

  const baseSizes = [styles?.fontSize || 10, 9, 8];
  const paddings = [styles?.cellPadding ?? 3, 2, 1.5, 1];
  const availableWidth = resolvePageWidth(doc, margin);
  const scale = colTotal > 0 && colTotal > availableWidth ? availableWidth / colTotal : 1;
  const scaledColumnWidths = columnWidths.length
    ? Object.fromEntries(columnWidths.map((width, index) => [index, { cellWidth: Math.max(24, Math.floor((Number(width) || 40) * scale)) }]))
    : undefined;

  const tableStyles = {
    fontSize: baseSizes[0],
    cellPadding: paddings[0],
    overflow: "ellipsize",
    lineWidth: 0.1,
    ...styles
  };

  if (colTotal > availableWidth) {
    tableStyles.fontSize = baseSizes[baseSizes.length - 1];
    tableStyles.cellPadding = paddings[paddings.length - 1];
  }

  doc.autoTable({
    startY,
    margin: { left: margin, right: margin },
    head,
    body,
    styles: tableStyles,
    headStyles: {
      halign: "center",
      valign: "middle",
      overflow: "ellipsize",
      ...headStyles
    },
    columnStyles: scaledColumnWidths,
    ...rest
  });

  return doc;
}
