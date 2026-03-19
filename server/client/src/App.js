import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Navbar, Nav } from 'react-bootstrap';
import Dashboard from './Dashboard';
import PaymentRecorder from './PaymentRecorder';
import RecentDocuments from './RecentDocuments';

function App() {
  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="#home">Emfuleni Business Lines</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link href="#dashboard">Dashboard</Nav.Link>
            <Nav.Link href="#clients">Clients</Nav.Link>
            <Nav.Link href="#reports">Reports</Nav.Link>
            <Nav.Link href="#payments">Payments</Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <Dashboard />
      <PaymentRecorder />
      <RecentDocuments />
    </>
  );
}

export default App;
