import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';

function parseMarkup(markup) {
  const parser = new DOMParser();
  return parser.parseFromString(markup, 'text/html');
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForRender() {
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  await wait(250);
}

function buildExportContainer(markup) {
  const parsedDocument = parseMarkup(markup);
  const exportRoot = document.createElement('div');
  const styles = Array.from(parsedDocument.querySelectorAll('style'))
    .map((node) => node.textContent || '')
    .join('\n');

  exportRoot.setAttribute('data-pdf-export-root', 'true');
  exportRoot.style.position = 'fixed';
  exportRoot.style.left = '0';
  exportRoot.style.top = '0';
  exportRoot.style.width = '210mm';
  exportRoot.style.minHeight = '297mm';
  exportRoot.style.padding = '0';
  exportRoot.style.margin = '0';
  exportRoot.style.background = '#ffffff';
  exportRoot.style.opacity = '0.01';
  exportRoot.style.pointerEvents = 'none';
  exportRoot.style.zIndex = '2147483647';
  exportRoot.style.overflow = 'hidden';

  if (styles) {
    const styleTag = document.createElement('style');
    styleTag.textContent = styles;
    exportRoot.appendChild(styleTag);
  }

  const content = document.createElement('div');
  content.innerHTML = parsedDocument.body?.innerHTML || markup;
  exportRoot.appendChild(content);

  return exportRoot;
}

export function openPrintWindow(markup, onBlocked) {
  const printWindow = window.open('', '_blank', 'width=980,height=900');

  if (!printWindow) {
    onBlocked?.();
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(markup);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 300);

  return true;
}

export async function downloadPdfFromMarkup(markup, fileName) {
  const exportContainer = buildExportContainer(markup);
  document.body.appendChild(exportContainer);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    await waitForRender();

    await html2pdf()
      .set({
        filename: fileName,
        margin: [8, 8, 8, 8],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      })
      .from(exportContainer)
      .save();
  } finally {
    document.body.removeChild(exportContainer);
  }
}
