import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Container,
  Form,
  Spinner,
  Table,
} from 'react-bootstrap';
import api from './api';

function PaymentRecorder() {
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [form, setForm] = useState({
    clientName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError('');

      const [paymentsResponse, clientsResponse] = await Promise.all([
        api.get('/payments'),
        api.get('/clients'),
      ]);

      setPayments(paymentsResponse.data);
      setClients(clientsResponse.data);
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.error ||
          'Unable to load payments from the backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setEditingId('');
    setForm({
      clientName: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      notes: '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = {
        ...form,
        amount: Number(form.amount),
      };

      if (editingId) {
        await api.patch(`/payments/${editingId}`, payload);
        setMessage(`Payment updated for ${form.clientName.trim()}.`);
      } else {
        await api.post('/payments', payload);
        setMessage(`Payment saved for ${form.clientName.trim()}.`);
      }

      resetForm();
      await loadPayments();
    } catch (saveError) {
      setError(
        saveError.response?.data?.error ||
          'Unable to save the payment right now.'
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (payment) => {
    setEditingId(payment._id);
    setError('');
    setMessage('');
    setForm({
      clientName: payment.clientName,
      amount: String(payment.amount),
      date: new Date(payment.date).toISOString().split('T')[0],
      reference: payment.reference || '',
      notes: payment.notes || '',
    });
  };

  const deletePayment = async (payment) => {
    const confirmed = window.confirm(
      `Delete payment of R ${Number(payment.amount).toFixed(2)} for ${payment.clientName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(payment._id);
      setError('');
      setMessage('');
      await api.delete(`/payments/${payment._id}`);
      if (editingId === payment._id) {
        resetForm();
      }
      setMessage(`Payment deleted for ${payment.clientName}.`);
      await loadPayments();
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.error ||
          'Unable to delete the payment right now.'
      );
    } finally {
      setDeletingId('');
    }
  };

  return (
    <Container className="mt-4">
      <h2>Payment Recorder</h2>

      {loading && (
        <div className="d-flex align-items-center gap-2 mb-3">
          <Spinner animation="border" size="sm" />
          <span>Loading payments...</span>
        </div>
      )}

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Client Name</Form.Label>
          <Form.Control
            list="clients-list"
            type="text"
            placeholder="Enter client name"
            value={form.clientName}
            onChange={(event) => handleChange('clientName', event.target.value)}
          />
          <datalist id="clients-list">
            {clients.map((client) => (
              <option key={client._id} value={client.name} />
            ))}
          </datalist>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Payment Amount</Form.Label>
          <Form.Control
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter amount"
            value={form.amount}
            onChange={(event) => handleChange('amount', event.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Payment Date</Form.Label>
          <Form.Control
            type="date"
            value={form.date}
            onChange={(event) => handleChange('date', event.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Reference</Form.Label>
          <Form.Control
            type="text"
            placeholder="Receipt number or EFT reference"
            value={form.reference}
            onChange={(event) => handleChange('reference', event.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Notes</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Optional notes"
            value={form.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
          />
        </Form.Group>

        <Button variant="success" className="mt-3" type="submit" disabled={saving}>
          {saving ? 'Saving...' : editingId ? 'Update Payment' : 'Record Payment'}
        </Button>
        {editingId && (
          <Button
            variant="outline-secondary"
            className="mt-3 ms-2"
            type="button"
            onClick={resetForm}
          >
            Cancel Editing
          </Button>
        )}
      </Form>

      <Table striped bordered hover className="mt-4">
        <thead>
          <tr>
            <th>Client</th>
            <th>Date</th>
            <th>Amount</th>
            <th>Reference</th>
            <th>Notes</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {!loading && payments.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center">
                No payments recorded yet.
              </td>
            </tr>
          )}
          {payments.map((payment) => (
            <tr key={payment._id}>
              <td>{payment.clientName}</td>
              <td>{new Date(payment.date).toISOString().split('T')[0]}</td>
              <td>R {Number(payment.amount).toFixed(2)}</td>
              <td>{payment.reference || 'Not provided'}</td>
              <td>{payment.notes || 'No notes'}</td>
              <td className="d-flex gap-2 flex-wrap">
                <Button
                  variant="outline-primary"
                  type="button"
                  onClick={() => startEditing(payment)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline-danger"
                  type="button"
                  onClick={() => deletePayment(payment)}
                  disabled={deletingId === payment._id}
                >
                  {deletingId === payment._id ? 'Deleting...' : 'Delete'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default PaymentRecorder;
