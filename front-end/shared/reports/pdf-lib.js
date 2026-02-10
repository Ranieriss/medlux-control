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
