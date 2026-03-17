import { useState } from 'react';
import { Container, Button, Form, Table } from 'react-bootstrap';

function Dashboard() {
  const [docType, setDocType] = useState("Invoice");

  return (
    <Container className="mt-4">
      <h2>Create New {docType}</h2>
      <div className="mb-3">
        <Button
          variant={docType === "Invoice" ? "primary" : "outline-primary"}
          onClick={() => setDocType("Invoice")}
        >
          Invoice
        </Button>{' '}
        <Button
          variant={docType === "Quotation" ? "primary" : "outline-primary"}
          onClick={() => setDocType("Quotation")}
        >
          Quotation
        </Button>
      </div>

      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Client Name</Form.Label>
          <Form.Control type="text" placeholder="Enter client name" />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Date</Form.Label>
          <Form.Control type="date" />
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
            <tr>
              <td><Form.Control type="text" /></td>
              <td><Form.Control type="number" /></td>
              <td><Form.Control type="number" /></td>
            </tr>
          </tbody>
        </Table>

        <Button variant="success" className="mt-3">Generate PDF</Button>{' '}
        <Button variant="secondary" className="mt-3">Save to Folder</Button>
      </Form>
    </Container>
  );
}

export default Dashboard;
