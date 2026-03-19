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

function RecentDocuments() {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatDocument = (document, type) => {
    const formattedDate = document.date
      ? new Date(document.date).toISOString().split('T')[0]
      : 'No date';
    const fallbackFileName = `${type}_${formattedDate}_${document.clientName || 'Document'}.pdf`;

    return {
      id: document._id,
      type,
      file: document.fileName || fallbackFileName,
      date: formattedDate,
      clientName: document.clientName || 'Unknown client',
      total: document.total ?? 0,
    };
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError('');

        const [quotationsResponse, invoicesResponse] = await Promise.all([
          api.get('/quotations'),
          api.get('/invoices'),
        ]);

        const allDocuments = [
          ...quotationsResponse.data.map((document) =>
            formatDocument(document, 'Quotation')
          ),
          ...invoicesResponse.data.map((document) =>
            formatDocument(document, 'Invoice')
          ),
        ].sort((first, second) => new Date(second.date) - new Date(first.date));

        setDocuments(allDocuments);
      } catch (fetchError) {
        const errorMessage =
          fetchError.response?.data?.error ||
          'Unable to load document history from the backend.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const revertDocument = (document) => {
    alert(`Reverting back to: ${document.file}`);
  };

  const filteredDocs = documents.filter((document) =>
    [document.file, document.clientName, document.type].some((value) =>
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <Container className="mt-4">
      <h2>History (All Quotations & Invoices)</h2>

      <Form className="mb-3">
        <Form.Control
          type="text"
          placeholder="Search by file name, client, or type..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </Form>

      {loading && (
        <div className="d-flex align-items-center gap-2 mb-3">
          <Spinner animation="border" size="sm" />
          <span>Loading documents...</span>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Type</th>
            <th>File Name</th>
            <th>Client</th>
            <th>Date</th>
            <th>Total</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {!loading && filteredDocs.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center">
                No documents found yet.
              </td>
            </tr>
          )}

          {filteredDocs.map((document) => (
            <tr key={document.id}>
              <td>{document.type}</td>
              <td>{document.file}</td>
              <td>{document.clientName}</td>
              <td>{document.date}</td>
              <td>R {Number(document.total).toFixed(2)}</td>
              <td>
                <Button variant="info" onClick={() => revertDocument(document)}>
                  Revert
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}

export default RecentDocuments;
