import { Container, Form, Button } from 'react-bootstrap';

function PaymentRecorder() {
  return (
    <Container className="mt-4">
      <h2>Payment Recorder</h2>
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Client Name</Form.Label>
          <Form.Control type="text" placeholder="Enter client name" />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Payment Amount</Form.Label>
          <Form.Control type="number" placeholder="Enter amount" />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Payment Date</Form.Label>
          <Form.Control type="date" />
        </Form.Group>

        <Button variant="success" className="mt-3">Record Payment</Button>{' '}
        <Button variant="secondary" className="mt-3">View Payments</Button>
      </Form>
    </Container>
  );
}

export default PaymentRecorder;
