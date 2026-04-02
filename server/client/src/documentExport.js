import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';

function parseMarkup(markup) {
  const parser = new DOMParser();
  return parser.parseFromString(markup, 'text/html');
}

function buildExportContainer(markup) {
  const parsedDocument = parseMarkup(markup);
  const container = document.createElement('div');
  const styles = Array.from(parsedDocument.querySelectorAll('style'))
    .map((node) => node.textContent || '')
    .join('\n');

  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.style.background = '#ffffff';
  container.style.zIndex = '-1';

  if (styles) {
    const styleTag = document.createElement('style');
    styleTag.textContent = styles;
    container.appendChild(styleTag);
  }

  const content = document.createElement('div');
  content.innerHTML = parsedDocument.body?.innerHTML || markup;
  container.appendChild(content);

  return container;
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
