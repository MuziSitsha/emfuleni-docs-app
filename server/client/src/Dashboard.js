import { useState } from 'react';
import { Alert, Button, Container, Form, Table } from 'react-bootstrap';
import api from './api';

const COMPANY_DETAILS = {
  name: 'Emfuleni Business Lines',
  tagline: 'School Supply Solutions',
  registration: 'Enterprise Number: 2025/119633/07',
  location: [
    '1207 Fa-Hua Avenue, Culturapark',
    'Bronkhorstspruit, 1020, Gauteng',
    'emfulenibusiness@outlook.com',
  ],
};

function formatDisplayDate(value) {
  return new Date(value).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function Dashboard() {
  const [docType, setDocType] = useState('Invoice');
  const [clientName, setClientName] = useState('');
  const [documentDate, setDocumentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [items, setItems] = useState([{ description: '', quantity: 1, price: 0 }]);
  const [applyVat, setApplyVat] = useState(false);
  const [vatRate, setVatRate] = useState(15);
  const [discount, setDiscount] = useState(0);
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' });

  const parseNumber = (value, fallback = 0) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  };

  const handleItemChange = (index, field, value) => {
    const nextItems = [...items];
    nextItems[index][field] = value;
    setItems(nextItems);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, price: 0 }]);
  };

  const resetForm = () => {
    setClientName('');
    setDocumentDate(new Date().toISOString().split('T')[0]);
    setItems([{ description: '', quantity: 1, price: 0 }]);
    setApplyVat(false);
    setVatRate(15);
    setDiscount(0);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + parseNumber(item.quantity) * parseNumber(item.price),
    0
  );
  const vatAmount = applyVat ? (subtotal * parseNumber(vatRate, 15)) / 100 : 0;
  const discountAmount = (subtotal * parseNumber(discount)) / 100;
  const total = subtotal + vatAmount - discountAmount;

  const buildDraftDocument = () => {
    const trimmedClientName = clientName.trim();
    const cleanedItems = items
      .map((item) => ({
        description: item.description.trim(),
        quantity: parseNumber(item.quantity),
        price: parseNumber(item.price),
      }))
      .filter((item) => item.description && item.quantity > 0);

    if (!trimmedClientName) {
      setSaveState({ status: 'error', message: 'Please enter a client name.' });
      return null;
    }

    if (cleanedItems.length === 0) {
      setSaveState({
        status: 'error',
        message: 'Add at least one item with a description and quantity.',
      });
      return null;
    }

    const invoicePrefix = docType === 'Quotation' ? 'QTN' : 'INV';

    return {
      type: docType,
      clientName: trimmedClientName,
      date: documentDate,
      invoiceNumber: `${invoicePrefix}-${Date.now()}`,
      items: cleanedItems,
      subtotal: Number(subtotal.toFixed(2)),
      vatApplied: applyVat,
      vatRate: applyVat ? parseNumber(vatRate, 15) : 0,
      vatAmount: Number(vatAmount.toFixed(2)),
      discount: parseNumber(discount),
      discountAmount: Number(discountAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  };

  const buildPrintMarkup = (document) => {
    const rows = document.items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>R ${Number(item.price).toFixed(2)}</td>
            <td>R ${(item.quantity * item.price).toFixed(2)}</td>
          </tr>
        `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${document.type} ${document.invoiceNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 32px;
              color: #172b4d;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              margin-bottom: 28px;
            }
            .company h1 {
              margin: 0 0 6px;
              font-size: 28px;
            }
            .company p,
            .meta p {
              margin: 4px 0;
            }
            .tagline {
              color: #4c6f8c;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              font-size: 12px;
              font-weight: 700;
            }
            .doc-title {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 12px;
              text-align: right;
            }
            .meta {
              text-align: right;
            }
            .section {
              margin-bottom: 24px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            th,
            td {
              border: 1px solid #d0d7e2;
              padding: 10px 12px;
              text-align: left;
            }
            th {
              background: #f4f7fb;
            }
            .totals {
              margin-left: auto;
              width: 320px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
            }
            .grand-total {
              font-size: 20px;
              font-weight: 700;
              border-top: 2px solid #172b4d;
              padding-top: 12px;
              margin-top: 12px;
            }
            @media print {
              body {
                margin: 18px;
              }
            }
          </style>
        </head>
        <body>
          <section class="header">
            <div class="company">
              <h1>${COMPANY_DETAILS.name}</h1>
              <p class="tagline">${COMPANY_DETAILS.tagline}</p>
              <p>${COMPANY_DETAILS.registration}</p>
              ${COMPANY_DETAILS.location.map((line) => `<p>${line}</p>`).join('')}
            </div>
            <div class="meta">
              <div class="doc-title">${document.type.toUpperCase()}</div>
              <p><strong>Reference:</strong> ${document.invoiceNumber}</p>
              <p><strong>Date:</strong> ${formatDisplayDate(document.date)}</p>
              <p><strong>Client:</strong> ${document.clientName}</p>
            </div>
          </section>

          <section class="section">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>

          <section class="totals">
            <div class="totals-row"><span>Subtotal</span><strong>R ${document.subtotal.toFixed(2)}</strong></div>
            <div class="totals-row"><span>VAT${document.vatApplied ? ` (${document.vatRate}%)` : ''}</span><strong>R ${document.vatAmount.toFixed(2)}</strong></div>
            <div class="totals-row"><span>Discount${document.discount ? ` (${document.discount}%)` : ''}</span><strong>R ${document.discountAmount.toFixed(2)}</strong></div>
            <div class="totals-row grand-total"><span>Total</span><strong>R ${document.total.toFixed(2)}</strong></div>
          </section>
        </body>
      </html>
    `;
  };

  const openPrintableDocument = (mode) => {
    const draftDocument = buildDraftDocument();

    if (!draftDocument) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=980,height=900');

    if (!printWindow) {
      setSaveState({
        status: 'error',
        message: 'Please allow pop-ups so the document can open for printing.',
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintMarkup(draftDocument));
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);

    setSaveState({
      status: 'success',
      message:
        mode === 'pdf'
          ? 'Print dialog opened. Choose "Save as PDF" in your browser to download the document.'
          : `${draftDocument.type} opened in the print dialog.`,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveState({ status: 'idle', message: '' });

    const draftDocument = buildDraftDocument();

    if (!draftDocument) {
      return;
    }

    const endpoint = docType === 'Quotation' ? '/quotations' : '/invoices';
    const safeClientName = draftDocument.clientName.replace(/\s+/g, '_');
    const generatedFileName = `${docType}_${documentDate}_${safeClientName}.pdf`;

    const payload = {
      clientName: draftDocument.clientName,
      invoiceNumber: draftDocument.invoiceNumber,
      status: docType === 'Quotation' ? 'Pending' : undefined,
      date: draftDocument.date,
      items: draftDocument.items,
      vatApplied: draftDocument.vatApplied,
      vatRate: draftDocument.vatRate,
      discount: draftDocument.discount,
      total: draftDocument.total,
      fileName: generatedFileName,
    };

    try {
      setSaveState({ status: 'saving', message: '' });
      await api.post(endpoint, payload);
      setSaveState({
        status: 'success',
        message: `${docType} saved successfully to the backend.`,
      });
      resetForm();
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || 'Unable to save the document right now.';
      setSaveState({ status: 'error', message: errorMessage });
    }
  };

  return (
    <Container className="mt-4">
      <h2>Create New {docType}</h2>
      <div className="mb-3">
        <Button
          variant={docType === 'Invoice' ? 'primary' : 'outline-primary'}
          onClick={() => setDocType('Invoice')}
          type="button"
        >
          Invoice
        </Button>{' '}
        <Button
          variant={docType === 'Quotation' ? 'primary' : 'outline-primary'}
          onClick={() => setDocType('Quotation')}
          type="button"
        >
          Quotation
        </Button>
      </div>

      {saveState.status === 'success' && (
        <Alert variant="success">{saveState.message}</Alert>
      )}
      {saveState.status === 'error' && (
        <Alert variant="danger">{saveState.message}</Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Client Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter client name"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Date</Form.Label>
          <Form.Control
            type="date"
            value={documentDate}
            onChange={(event) => setDocumentDate(event.target.value)}
          />
        </Form.Group>

        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>
                  <Form.Control
                    type="text"
                    value={item.description}
                    onChange={(event) =>
                      handleItemChange(index, 'description', event.target.value)
                    }
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(event) =>
                      handleItemChange(index, 'quantity', event.target.value)
                    }
                  />
                </td>
                <td>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.price}
                    onChange={(event) =>
                      handleItemChange(index, 'price', event.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Button
          variant="outline-primary"
          className="mb-3"
          onClick={addItem}
          type="button"
        >
          + Add Item
        </Button>

        <Form.Group className="mb-3">
          <Form.Check
            type="checkbox"
            label="Apply VAT"
            checked={applyVat}
            onChange={(event) => setApplyVat(event.target.checked)}
          />
        </Form.Group>

        {applyVat && (
          <Form.Group className="mb-3">
            <Form.Label>VAT (%)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={vatRate}
              onChange={(event) => setVatRate(parseNumber(event.target.value))}
            />
          </Form.Group>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Discount (%)</Form.Label>
          <Form.Control
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(event) => setDiscount(parseNumber(event.target.value))}
          />
        </Form.Group>

        <h5>Subtotal: R {subtotal.toFixed(2)}</h5>
        <h5>VAT: R {vatAmount.toFixed(2)}</h5>
        <h5>Discount: R {discountAmount.toFixed(2)}</h5>
        <h4>Total: R {total.toFixed(2)}</h4>

        <Button
          variant="success"
          className="mt-3"
          type="submit"
          disabled={saveState.status === 'saving'}
        >
          {saveState.status === 'saving' ? 'Saving...' : `Save ${docType}`}
        </Button>{' '}
        <Button
          variant="secondary"
          className="mt-3"
          type="button"
          onClick={() => openPrintableDocument('pdf')}
        >
          Generate PDF
        </Button>{' '}
        {docType === 'Quotation' && (
          <Button
            variant="info"
            className="mt-3"
            type="button"
            onClick={() => openPrintableDocument('print')}
          >
            Print Quotation
          </Button>
        )}
      </Form>
    </Container>
  );
}

export default Dashboard;
