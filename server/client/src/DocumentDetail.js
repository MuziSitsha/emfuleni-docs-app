import { useEffect, useState } from 'react';
import { Alert, Button, Container, Form, Spinner, Table } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from './api';
import {
  deleteLocalDocument,
  getLocalDocument,
  saveLocalDocument,
} from './localDocuments';

function formatDateInput(value) {
  return value ? new Date(value).toISOString().split('T')[0] : '';
}

function documentTypeLabel(type) {
  return type === 'quotation' ? 'Quotation' : 'Invoice';
}

function buildDisplaySubject(document) {
  return String(document.subjectLine || '').trim();
}

function buildPrintMarkup(document, totals) {
  const rows = document.items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description}</td>
          <td>${Number(item.quantity).toFixed(0)}</td>
          <td>R ${Number(item.price).toFixed(2)}</td>
          <td>R ${(Number(item.quantity) * Number(item.price)).toFixed(2)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${document.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #172b4d; }
          .header { display: flex; justify-content: space-between; margin-bottom: 24px; gap: 24px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th, td { border: 1px solid #d5dce6; padding: 10px 12px; text-align: left; }
          th { background: #f4f7fb; }
          .totals { margin-left: auto; width: 320px; }
          .row { display: flex; justify-content: space-between; margin: 8px 0; }
          .grand-total { border-top: 2px solid #172b4d; padding-top: 12px; margin-top: 12px; font-weight: 700; }
        </style>
      </head>
      <body>
        <section class="header">
          <div>
            <h1>Emfuleni Business Lines</h1>
            <p>School Supply Solutions</p>
            <p>Enterprise Number: 2025/119633/07</p>
          </div>
          <div>
            <h2>${documentTypeLabel(document.type)}</h2>
            <p><strong>Reference:</strong> ${document.invoiceNumber}</p>
            <p><strong>Date:</strong> ${document.date}</p>
            <p><strong>Client:</strong> ${document.clientName}</p>
            ${
              buildDisplaySubject(document)
                ? `<p><strong>Subject:</strong> ${buildDisplaySubject(document)}</p>`
                : ''
            }
          </div>
        </section>
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
        <section class="totals">
          <div class="row"><span>Subtotal</span><strong>R ${totals.subtotal.toFixed(2)}</strong></div>
          <div class="row"><span>VAT</span><strong>R ${totals.vatAmount.toFixed(2)}</strong></div>
          <div class="row"><span>Discount</span><strong>R ${totals.discountAmount.toFixed(2)}</strong></div>
          <div class="row grand-total"><span>Total</span><strong>R ${totals.total.toFixed(2)}</strong></div>
        </section>
      </body>
    </html>
  `;
}

function DocumentDetail() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(null);

  useEffect(() => {
    const loadDocument = async () => {
      const localDocument = getLocalDocument(type, id);

      if (localDocument) {
        setForm({
          type,
          storageSource: 'local',
          clientName: localDocument.clientName || '',
          subjectLine: localDocument.subjectLine || '',
          invoiceNumber: localDocument.invoiceNumber || '',
          status: localDocument.status || 'Pending',
          date: formatDateInput(localDocument.date),
          items:
            localDocument.items?.map((item) => ({
              description: item.description || '',
              quantity: item.quantity ?? 1,
              price: item.price ?? 0,
            })) || [{ description: '', quantity: 1, price: 0 }],
          vatApplied: Boolean(localDocument.vatApplied),
          vatRate: localDocument.vatRate ?? 15,
          discount: localDocument.discount ?? 0,
          total: localDocument.total ?? 0,
          fileName: localDocument.fileName || '',
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/documents/${type}/${id}`);
        const document = response.data;

        setForm({
          type,
          storageSource: 'remote',
          clientName: document.clientName || '',
          subjectLine: document.subjectLine || '',
          invoiceNumber: document.invoiceNumber || '',
          status: document.status || 'Pending',
          date: formatDateInput(document.date),
          items:
            document.items?.map((item) => ({
              description: item.description || '',
              quantity: item.quantity ?? 1,
              price: item.price ?? 0,
            })) || [{ description: '', quantity: 1, price: 0 }],
          vatApplied: Boolean(document.vatApplied),
          vatRate: document.vatRate ?? 15,
          discount: document.discount ?? 0,
          total: document.total ?? 0,
          fileName: document.fileName || '',
        });
      } catch (fetchError) {
        setError(
          fetchError.response?.data?.error || 'Unable to load this document.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [id, type]);

  const parseNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((currentForm) => {
      const nextItems = [...currentForm.items];
      nextItems[index] = {
        ...nextItems[index],
        [field]: value,
      };

      return {
        ...currentForm,
        items: nextItems,
      };
    });
  };

  const addItem = () => {
    setForm((currentForm) => ({
      ...currentForm,
      items: [...currentForm.items, { description: '', quantity: 1, price: 0 }],
    }));
  };

  const removeItem = (index) => {
    setForm((currentForm) => ({
      ...currentForm,
      items:
        currentForm.items.length > 1
          ? currentForm.items.filter((_, itemIndex) => itemIndex !== index)
          : currentForm.items,
    }));
  };

  const cleanedItems =
    form?.items
      ?.map((item) => ({
        description: item.description.trim(),
        quantity: parseNumber(item.quantity),
        price: parseNumber(item.price),
      }))
      .filter((item) => item.description && item.quantity > 0) || [];

  const subtotal = cleanedItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  const vatAmount =
    form?.vatApplied ? (subtotal * parseNumber(form.vatRate, 15)) / 100 : 0;
  const discountAmount = (subtotal * parseNumber(form?.discount, 0)) / 100;
  const total = subtotal + vatAmount - discountAmount;

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.clientName.trim()) {
      setError('Please enter a client name.');
      return;
    }

    if (cleanedItems.length === 0) {
      setError('Add at least one item with a description and quantity.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = {
        _id: id,
        clientName: form.clientName.trim(),
        subjectLine: form.subjectLine.trim(),
        invoiceNumber: form.invoiceNumber,
        status: form.status,
        date: form.date,
        items: cleanedItems,
        vatApplied: form.vatApplied,
        vatRate: parseNumber(form.vatRate, 15),
        discount: parseNumber(form.discount, 0),
        total: Number(total.toFixed(2)),
        fileName: form.fileName,
      };

      const document =
        form.storageSource === 'local'
          ? saveLocalDocument(type, payload)
          : (await api.patch(`/documents/${type}/${id}`, payload)).data;

      setForm((currentForm) => ({
        ...currentForm,
        storageSource: form.storageSource,
        clientName: document.clientName,
        subjectLine: document.subjectLine || '',
        invoiceNumber: document.invoiceNumber,
        status: document.status || currentForm.status,
        date: formatDateInput(document.date),
        items: document.items,
        vatApplied: Boolean(document.vatApplied),
        vatRate: document.vatRate ?? 15,
        discount: document.discount ?? 0,
        total: document.total ?? 0,
        fileName: document.fileName || '',
      }));
      setMessage(
        form.storageSource === 'local'
          ? `${documentTypeLabel(type)} updated in history on this device.`
          : `${documentTypeLabel(type)} updated successfully.`
      );
    } catch (saveError) {
      setError(
        saveError.response?.data?.error ||
          'Unable to update the document right now.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete this ${documentTypeLabel(type).toLowerCase()}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError('');
      if (form.storageSource === 'local') {
        deleteLocalDocument(type, id);
      } else {
        await api.delete(`/documents/${type}/${id}`);
      }
      navigate('/history');
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.error ||
          'Unable to delete the document right now.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=980,height=900');

    if (!printWindow) {
      setError('Please allow pop-ups so the print view can open.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(
      buildPrintMarkup(
        {
          ...form,
          type,
          items: cleanedItems,
          total: Number(total.toFixed(2)),
        },
        {
          subtotal: Number(subtotal.toFixed(2)),
          vatAmount: Number(vatAmount.toFixed(2)),
          discountAmount: Number(discountAmount.toFixed(2)),
          total: Number(total.toFixed(2)),
        }
      )
    );
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" />
        <span>Loading document...</span>
      </div>
    );
  }

  if (!form) {
    return <Alert variant="danger">Document not found.</Alert>;
  }

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2>{documentTypeLabel(type)} Detail</h2>
          <p className="mb-0 text-muted">
            Review, edit, print, or delete this saved document.
          </p>
        </div>
        <Button as={Link} to="/history" variant="outline-secondary">
          Back to History
        </Button>
      </div>

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSave}>
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Client Name</Form.Label>
              <Form.Control
                type="text"
                value={form.clientName}
                onChange={(event) => handleChange('clientName', event.target.value)}
              />
            </Form.Group>
          </div>
          <div className="col-md-3">
            <Form.Group>
              <Form.Label>Reference</Form.Label>
              <Form.Control
                type="text"
                value={form.invoiceNumber}
                onChange={(event) => handleChange('invoiceNumber', event.target.value)}
              />
            </Form.Group>
          </div>
          <div className="col-md-3">
            <Form.Group>
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                value={form.date}
                onChange={(event) => handleChange('date', event.target.value)}
              />
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Subject Line</Form.Label>
              <Form.Control
                type="text"
                placeholder="For example Grade 1"
                value={form.subjectLine}
                onChange={(event) => handleChange('subjectLine', event.target.value)}
              />
            </Form.Group>
          </div>
          {type === 'quotation' && (
            <div className="col-md-2">
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={form.status}
                  onChange={(event) => handleChange('status', event.target.value)}
                >
                  <option>Pending</option>
                  <option>Approved</option>
                </Form.Select>
              </Form.Group>
            </div>
          )}
        </div>

        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, index) => (
              <tr key={`${id}-${index}`}>
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
                <td>
                  <Button
                    variant="outline-danger"
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={form.items.length === 1}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <Button type="button" variant="outline-primary" onClick={addItem}>
          + Add Item
        </Button>

        <div className="row g-3 mt-3 mb-3">
          <div className="col-md-3">
            <Form.Check
              type="checkbox"
              label="Apply VAT"
              checked={form.vatApplied}
              onChange={(event) => handleChange('vatApplied', event.target.checked)}
            />
          </div>
          <div className="col-md-3">
            <Form.Group>
              <Form.Label>VAT (%)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={form.vatRate}
                onChange={(event) => handleChange('vatRate', event.target.value)}
                disabled={!form.vatApplied}
              />
            </Form.Group>
          </div>
          <div className="col-md-3">
            <Form.Group>
              <Form.Label>Discount (%)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(event) => handleChange('discount', event.target.value)}
              />
            </Form.Group>
          </div>
        </div>

        <div className="mb-3">
          <h5>Subtotal: R {subtotal.toFixed(2)}</h5>
          <h5>VAT: R {vatAmount.toFixed(2)}</h5>
          <h5>Discount: R {discountAmount.toFixed(2)}</h5>
          <h4>Total: R {total.toFixed(2)}</h4>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Button type="submit" variant="success" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="secondary" onClick={handlePrint}>
            Download PDF
          </Button>
          <Button
            type="button"
            variant="outline-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Document'}
          </Button>
        </div>
      </Form>
    </Container>
  );
}

export default DocumentDetail;
