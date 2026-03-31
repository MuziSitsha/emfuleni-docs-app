import { useEffect, useState } from 'react';
import { Alert, Card, Container, Spinner, Table } from 'react-bootstrap';
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

  const rows = [
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
  ];

  return (
    <Container className="mt-4">
      <h2>Reports</h2>

      <Card className="mb-3">
        <Card.Body>
          <Card.Title>Summary</Card.Title>
          <Card.Text>
            Live totals from the backend for invoices, quotations, and delivery notes.
          </Card.Text>
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
