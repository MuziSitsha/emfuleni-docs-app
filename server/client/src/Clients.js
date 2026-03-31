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

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setError('');
      setMessage('');

      await api.post('/clients', form);
      setMessage(`Client ${form.name.trim()} saved successfully.`);
      setForm({
        name: '',
        contact: '',
        status: 'Active',
      });
      await loadClients();
    } catch (saveError) {
      setError(
        saveError.response?.data?.error ||
          'Unable to save the client right now.'
      );
    }
  };

  return (
    <Container className="mt-4" id="clients">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Clients</h2>
        <Button
          variant="outline-primary"
          type="button"
          onClick={() => setMessage('Add the client details below and click Save Client.')}
        >
          Add Client
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
            <Button type="submit" variant="success" className="w-100">
              Save Client
            </Button>
          </div>
        </div>
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
          </tr>
        </thead>
        <tbody>
          {!loading && clients.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center">
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
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default Clients;
