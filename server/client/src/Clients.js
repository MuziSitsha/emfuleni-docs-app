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

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [form, setForm] = useState({
    name: '',
    contact: '',
    status: 'Active',
  });

  const loadClients = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (fetchError) {
      setError(
        fetchError.response?.data?.error ||
          'Unable to load clients from the backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
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
      name: '',
      contact: '',
      status: 'Active',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setMessage('');

      if (editingId) {
        await api.patch(`/clients/${editingId}`, form);
        setMessage(`Client ${form.name.trim()} updated successfully.`);
      } else {
        await api.post('/clients', form);
        setMessage(`Client ${form.name.trim()} saved successfully.`);
      }

      resetForm();
      await loadClients();
    } catch (saveError) {
      setError(
        saveError.response?.data?.error ||
          'Unable to save the client right now.'
      );
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (client) => {
    setEditingId(client._id);
    setMessage('');
    setError('');
    setForm({
      name: client.name,
      contact: client.contact || '',
      status: client.status || 'Active',
    });
  };

  const deleteClient = async (client) => {
    const confirmed = window.confirm(`Delete client ${client.name}?`);

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(client._id);
      setError('');
      setMessage('');
      await api.delete(`/clients/${client._id}`);
      if (editingId === client._id) {
        resetForm();
      }
      setMessage(`Client ${client.name} deleted successfully.`);
      await loadClients();
    } catch (deleteError) {
      setError(
        deleteError.response?.data?.error ||
          'Unable to delete this client right now.'
      );
    } finally {
      setDeletingId('');
    }
  };

  return (
    <Container className="mt-4" id="clients">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Clients</h2>
        <Button
          variant="outline-primary"
          type="button"
          onClick={() =>
            setMessage(
              editingId
                ? 'You are editing an existing client.'
                : 'Add the client details below and click Save Client.'
            )
          }
        >
          {editingId ? 'Editing Client' : 'Add Client'}
        </Button>
      </div>

      {loading && (
        <div className="d-flex align-items-center gap-2 mb-3">
          <Spinner animation="border" size="sm" />
          <span>Loading clients...</span>
        </div>
      )}

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Form className="mb-4" onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Client Name</Form.Label>
              <Form.Control
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Enter client name"
              />
            </Form.Group>
          </div>
          <div className="col-md-4">
            <Form.Group>
              <Form.Label>Contact</Form.Label>
              <Form.Control
                type="text"
                value={form.contact}
                onChange={(event) => handleChange('contact', event.target.value)}
                placeholder="Email or phone"
              />
            </Form.Group>
          </div>
          <div className="col-md-2">
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={form.status}
                onChange={(event) => handleChange('status', event.target.value)}
              >
                <option>Active</option>
                <option>Pending</option>
                <option>Inactive</option>
              </Form.Select>
            </Form.Group>
          </div>
          <div className="col-md-2 d-flex align-items-end">
            <Button type="submit" variant="success" className="w-100" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Client' : 'Save Client'}
            </Button>
          </div>
        </div>
        {editingId && (
          <div className="mt-3">
            <Button type="button" variant="outline-secondary" onClick={resetForm}>
              Cancel Editing
            </Button>
          </div>
        )}
      </Form>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Quotations</th>
            <th>Invoices</th>
            <th>Paid</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {!loading && clients.length === 0 && (
            <tr>
              <td colSpan="7" className="text-center">
                No clients saved yet.
              </td>
            </tr>
          )}
          {clients.map((client) => (
            <tr key={client._id}>
              <td>{client.name}</td>
              <td>{client.contact || 'Not set'}</td>
              <td>{client.status}</td>
              <td>{client.quotationsCount}</td>
              <td>{client.invoicesCount}</td>
              <td>R {Number(client.totalPaid || 0).toFixed(2)}</td>
              <td className="d-flex gap-2 flex-wrap">
                <Button
                  variant="outline-primary"
                  type="button"
                  onClick={() => startEditing(client)}
                >
                  Edit
                </Button>
                <Button
                  variant="outline-danger"
                  type="button"
                  onClick={() => deleteClient(client)}
                  disabled={deletingId === client._id}
                >
                  {deletingId === client._id ? 'Deleting...' : 'Delete'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default Clients;
