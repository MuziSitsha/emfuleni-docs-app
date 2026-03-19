import { Container, Table, Button } from 'react-bootstrap';

function Clients() {
  const clients = [
    {
      name: 'ABC School',
      contact: 'accounts@abcschool.co.za',
      status: 'Active',
    },
    {
      name: 'XYZ Supplies',
      contact: 'sales@xyzsupplies.co.za',
      status: 'Pending',
    },
  ];

  return (
    <Container className="mt-4" id="clients">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Clients</h2>
        <Button variant="outline-primary">Add Client</Button>
      </div>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Contact</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.name}>
              <td>{client.name}</td>
              <td>{client.contact}</td>
              <td>{client.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default Clients;
