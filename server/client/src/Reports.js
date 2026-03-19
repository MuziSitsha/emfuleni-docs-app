import { Container, Table, Card } from 'react-bootstrap';

function Reports() {
  return (
    <Container className="mt-4">
      <h2>Reports</h2>

      <Card className="mb-3">
        <Card.Body>
          <Card.Title>Summary</Card.Title>
          <Card.Text>
            Here you can view totals for invoices, quotations, and payments.
          </Card.Text>
        </Card.Body>
      </Card>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Type</th>
            <th>Total Count</th>
            <th>Total Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Invoices</td>
            <td>25</td>
            <td>R 120,000</td>
          </tr>
          <tr>
            <td>Quotations</td>
            <td>15</td>
            <td>R 80,000</td>
          </tr>
          <tr>
            <td>Payments</td>
            <td>20</td>
            <td>R 95,000</td>
          </tr>
        </tbody>
      </Table>
    </Container>
  );
}

export default Reports;
