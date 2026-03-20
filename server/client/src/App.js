import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './Dashboard';
import PaymentRecorder from './PaymentRecorder';
import Clients from './Clients';
import Reports from './Reports';
import RecentDocuments from './RecentDocuments'; // now serves as History page
import DeliveryNotes from './DeliveryNotes';
import emfuleniLogo from './emfuleni-logo.svg';

function App() {
  return (
    <Router>
      <Navbar bg="primary" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand as={Link} to="/" className="app-brand">
            <img
              src={emfuleniLogo}
              alt="Emfuleni Business Lines logo"
              className="app-brand-logo"
            />
            <span className="app-brand-copy">
              <span className="app-brand-name">Emfuleni Business Lines</span>
              <span className="app-brand-subtitle">School Supply Solutions</span>
            </span>
          </Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard">Quotations</Nav.Link>
            <Nav.Link as={Link} to="/clients">Clients</Nav.Link>
            <Nav.Link as={Link} to="/reports">Reports</Nav.Link>
            <Nav.Link as={Link} to="/payments">Payments</Nav.Link>
            <Nav.Link as={Link} to="/delivery-notes">Delivery Notes</Nav.Link>
            <Nav.Link as={Link} to="/history">History</Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <Container className="mt-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/payments" element={<PaymentRecorder />} />
          <Route path="/delivery-notes" element={<DeliveryNotes />} />
          <Route path="/history" element={<RecentDocuments />} />
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
