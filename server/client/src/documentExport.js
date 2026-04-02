import html2pdf from 'html2pdf.js/dist/html2pdf.bundle.min.js';

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function loadMarkupIntoIframe(markup) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');

    iframe.style.position = 'fixed';
    iframe.style.right = '-200vw';
    iframe.style.top = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = '0';
    iframe.style.background = '#ffffff';

    const cleanup = () => {
      iframe.onload = null;
      iframe.onerror = null;
    };

    iframe.onload = async () => {
      try {
        const frameDocument = iframe.contentDocument;

        if (!frameDocument) {
          throw new Error('Unable to access iframe document.');
        }

        if (frameDocument.fonts?.ready) {
          await frameDocument.fonts.ready;
        }

        await wait(300);
        cleanup();
        resolve(iframe);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error('Unable to load PDF export frame.'));
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = markup;
  });
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
  const iframe = await loadMarkupIntoIframe(markup);

  try {
    const frameDocument = iframe.contentDocument;

    if (!frameDocument?.body) {
      throw new Error('Unable to prepare document for PDF export.');
    }

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
      .from(frameDocument.body)
      .save();
  } finally {
    document.body.removeChild(iframe);
  }
}
