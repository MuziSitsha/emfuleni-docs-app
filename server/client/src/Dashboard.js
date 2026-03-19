import { useState } from 'react';
import { Alert, Button, Container, Form, Table } from 'react-bootstrap';
import api from './api';

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaveState({ status: 'idle', message: '' });

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
      return;
    }

    if (cleanedItems.length === 0) {
      setSaveState({
        status: 'error',
        message: 'Add at least one item with a description and quantity.',
      });
      return;
    }

    const endpoint = docType === 'Quotation' ? '/quotations' : '/invoices';
    const safeClientName = trimmedClientName.replace(/\s+/g, '_');
    const generatedFileName = `${docType}_${documentDate}_${safeClientName}.pdf`;

    const payload = {
      clientName: trimmedClientName,
      date: documentDate,
      items: cleanedItems,
      vatApplied: applyVat,
      vatRate: applyVat ? parseNumber(vatRate, 15) : 0,
      discount: parseNumber(discount),
      total: Number(total.toFixed(2)),
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
        <Button variant="secondary" className="mt-3" type="button">
          Generate PDF
        </Button>{' '}
        {docType === 'Quotation' && (
          <Button variant="info" className="mt-3" type="button">
            Print Quotation
          </Button>
        )}
      </Form>
    </Container>
  );
}

export default Dashboard;
