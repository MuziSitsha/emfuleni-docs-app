import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DEFAULT_COMPANY_DETAILS = {
  name: 'Emfuleni Business Lines',
  tagline: 'School Supply Solutions',
  registration: 'Enterprise Number: 2025/119633/07',
  location: [
    '1207 Fa-Hua Avenue, Culturapark',
    'Bronkhorstspruit, 1020, Gauteng',
    'emfulenibusiness@outlook.com',
  ],
};

function formatCurrency(value) {
  return `R ${Number(value || 0).toFixed(2)}`;
}

function formatDisplayDate(value) {
  return new Date(value).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function documentTypeLabel(type) {
  return String(type || '').toLowerCase() === 'quotation' ? 'Quotation' : 'Invoice';
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

export async function downloadDocumentPdf({
  document,
  fileName,
  totals,
  companyDetails = DEFAULT_COMPANY_DETAILS,
}) {
  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const rightColumnX = 128;
  const topY = 18;
  const lineHeight = 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(companyDetails.name, 14, topY);

  pdf.setFontSize(9);
  pdf.setTextColor(76, 111, 140);
  pdf.text(companyDetails.tagline, 14, topY + 7);

  pdf.setTextColor(23, 43, 77);
  pdf.setFont('helvetica', 'normal');
  pdf.text(companyDetails.registration, 14, topY + 13);

  companyDetails.location.forEach((line, index) => {
    pdf.text(line, 14, topY + 18 + index * lineHeight);
  });

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(documentTypeLabel(document.type).toUpperCase(), rightColumnX, topY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  const metaLines = [
    `Reference: ${document.invoiceNumber || ''}`,
    `Date: ${formatDisplayDate(document.date)}`,
    `Client: ${document.clientName || ''}`,
  ];

  if (document.subjectLine) {
    metaLines.push(`Subject: ${document.subjectLine}`);
  }

  metaLines.forEach((line, index) => {
    const wrappedLines = pdf.splitTextToSize(line, pageWidth - rightColumnX - 14);
    pdf.text(wrappedLines, rightColumnX, topY + 8 + index * 6);
  });

  autoTable(pdf, {
    startY: 52,
    head: [['#', 'Description', 'Qty', 'Unit Price', 'Line Total']],
    body: [
      ...document.items.map((item, index) => [
        String(index + 1),
        item.description || '',
        String(Number(item.quantity || 0).toFixed(0)),
        formatCurrency(item.price),
        formatCurrency(Number(item.quantity || 0) * Number(item.price || 0)),
      ]),
      [
        {
          content: 'Items Total',
          colSpan: 4,
          styles: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] },
        },
        {
          content: formatCurrency(totals.subtotal),
          styles: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        },
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 3,
      textColor: [23, 43, 77],
      lineColor: [213, 220, 230],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [244, 247, 251],
      textColor: [23, 43, 77],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 84 },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  const tableBottomY = pdf.lastAutoTable?.finalY || 100;
  const totalsX = 130;
  const totalsStartY = tableBottomY + 12;
  const totalsRows = [
    ['Subtotal', formatCurrency(totals.subtotal)],
    [
      `VAT${document.vatApplied ? ` (${Number(document.vatRate || 0).toFixed(0)}%)` : ''}`,
      formatCurrency(totals.vatAmount),
    ],
    [
      `Discount${Number(document.discount || 0) ? ` (${Number(document.discount).toFixed(0)}%)` : ''}`,
      formatCurrency(totals.discountAmount),
    ],
  ];

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  totalsRows.forEach(([label, value], index) => {
    const rowY = totalsStartY + index * 6;
    pdf.text(label, totalsX, rowY);
    pdf.text(value, pageWidth - 14, rowY, { align: 'right' });
  });

  const totalY = totalsStartY + totalsRows.length * 6 + 4;
  pdf.setDrawColor(23, 43, 77);
  pdf.line(totalsX, totalY - 3, pageWidth - 14, totalY - 3);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('Total', totalsX, totalY + 3);
  pdf.text(formatCurrency(totals.total), pageWidth - 14, totalY + 3, {
    align: 'right',
  });

  pdf.save(fileName);
}
