import { useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Spinner, Table } from 'react-bootstrap';
import api from './api';

function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get('/summary');
        setSummary(response.data);
      } catch (fetchError) {
        const errorMessage =
          fetchError.response?.data?.error ||
          'Unable to load report totals from the backend.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const downloadExport = (format) => {
    window.open(`/api/export/${format}`, '_blank');
  };

  const rows = [
    {
      label: 'Clients',
      count: summary?.clients?.count ?? 0,
      totalAmount: null,
    },
    {
      label: 'Invoices',
      count: summary?.invoices?.count ?? 0,
      totalAmount: summary?.invoices?.totalAmount ?? 0,
    },
    {
      label: 'Quotations',
      count: summary?.quotations?.count ?? 0,
      totalAmount: summary?.quotations?.totalAmount ?? 0,
    },
    {
      label: 'Delivery Notes',
      count: summary?.deliveryNotes?.count ?? 0,
      totalAmount: null,
    },
    {
      label: 'Payments',
      count: summary?.payments?.count ?? 0,
      totalAmount: summary?.payments?.totalAmount ?? 0,
    },
  ];

  return (
    <Container className="mt-4">
      <h2>Reports</h2>

      <Card className="mb-3">
        <Card.Body>
          <Card.Title>Summary</Card.Title>
          <Card.Text>
            Live totals from the backend for clients, invoices, quotations, delivery notes, and payments.
          </Card.Text>
          <Card.Text className="mb-0">
            Outstanding balance:{' '}
            <strong>R {Number(summary?.outstandingAmount ?? 0).toFixed(2)}</strong>
          </Card.Text>
          <div className="d-flex gap-2 mt-3">
            <Button variant="outline-primary" onClick={() => downloadExport('json')}>
              Backup JSON
            </Button>
            <Button variant="outline-secondary" onClick={() => downloadExport('csv')}>
              Export CSV
            </Button>
          </div>
        </Card.Body>
      </Card>

      {loading && (
        <div className="d-flex align-items-center gap-2 mb-3">
          <Spinner animation="border" size="sm" />
          <span>Loading report totals...</span>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Type</th>
            <th>Total Count</th>
            <th>Total Amount</th>
          </tr>
        </thead>
        <tbody>
          {!loading &&
            rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.count}</td>
                <td>
                  {row.totalAmount === null
                    ? 'N/A'
                    : `R ${Number(row.totalAmount).toFixed(2)}`}
                </td>
              </tr>
            ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default Reports;
