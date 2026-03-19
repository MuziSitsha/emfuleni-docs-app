import { Container, Table, Tabs, Tab } from 'react-bootstrap';

function RecentDocuments() {
  return (
    <Container className="mt-4">
      <h2>Recent Documents</h2>
      <Tabs defaultActiveKey="invoices" className="mb-3">
        <Tab eventKey="invoices" title="Invoices">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Invoice_2026-03-17_ABC School.pdf</td>
                <td>2026-03-17</td>
              </tr>
              <tr>
                <td>Invoice_2026-03-16_XYZ Supplies.pdf</td>
                <td>2026-03-16</td>
              </tr>
            </tbody>
          </Table>
        </Tab>
        <Tab eventKey="quotations" title="Quotations">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Quotation_2026-03-15_XYZ Supplies.pdf</td>
                <td>2026-03-15</td>
              </tr>
            </tbody>
          </Table>
        </Tab>
      </Tabs>
    </Container>
  );
}

export default RecentDocuments;
