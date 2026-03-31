import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Container,
  Form,
  Spinner,
  Table,
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import api from './api';

function formatDocument(document, type) {
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
    invoiceNumber: document.invoiceNumber || 'Not assigned',
    items: document.items || [],
    status: document.status || (type === 'Quotation' ? 'Pending' : 'Issued'),
  };
}

async function loadDocumentsData() {
  const [quotationsResponse, invoicesResponse, deliveryNotesResponse] =
    await Promise.all([
      api.get('/quotations'),
      api.get('/invoices'),
      api.get('/delivery-notes'),
    ]);

  const documents = [
    ...quotationsResponse.data.map((document) =>
      formatDocument(document, 'Quotation')
    ),
    ...invoicesResponse.data.map((document) =>
      formatDocument(document, 'Invoice')
    ),
  ].sort((first, second) => new Date(second.date) - new Date(first.date));

  const notesMap = deliveryNotesResponse.data.reduce((accumulator, note) => {
    if (note.quotationId?._id) {
      accumulator[note.quotationId._id] = true;
    } else if (note.quotationId) {
      accumulator[note.quotationId] = true;
    }

    return accumulator;
  }, {});

  return { documents, notesMap };
}

function RecentDocuments() {
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryNotesByQuotationId, setDeliveryNotesByQuotationId] = useState(
    {}
  );
  const [processingId, setProcessingId] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError('');

        const { documents: nextDocuments, notesMap } =
          await loadDocumentsData();

        setDocuments(nextDocuments);
        setDeliveryNotesByQuotationId(notesMap);
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

  const refreshDocuments = async () => {
    const { documents: nextDocuments, notesMap } = await loadDocumentsData();
    setDocuments(nextDocuments);
    setDeliveryNotesByQuotationId(notesMap);
  };

  const deleteDocument = async (document) => {
    const confirmed = window.confirm(
      `Delete ${document.type.toLowerCase()} ${document.invoiceNumber}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingId(document.id);
      setMessage('');
      setError('');

      await api.delete(`/documents/${document.type.toLowerCase()}/${document.id}`);
      await refreshDocuments();
      setMessage(`${document.type} deleted successfully.`);
    } catch (deleteError) {
      const errorMessage =
        deleteError.response?.data?.error ||
        'Unable to delete this document right now.';
      setError(errorMessage);
    } finally {
      setProcessingId('');
    }
  };

  const approveQuotation = async (document) => {
    try {
      setProcessingId(document.id);
      setMessage('');
      setError('');

      await api.patch(`/quotations/${document.id}/approve`);
      await refreshDocuments();
      setMessage(`Quotation for ${document.clientName} has been approved.`);
    } catch (approveError) {
      const errorMessage =
        approveError.response?.data?.error ||
        'Unable to approve this quotation.';
      setError(errorMessage);
    } finally {
      setProcessingId('');
    }
  };

  const createDeliveryNote = async (document) => {
    try {
      setProcessingId(document.id);
      setMessage('');
      setError('');

      await api.post('/delivery-notes', {
        quotationId: document.id,
        invoiceNumber: document.invoiceNumber,
        clientName: document.clientName,
      });

      await refreshDocuments();
      setMessage(`Delivery note created for ${document.clientName}.`);
    } catch (createError) {
      const errorMessage =
        createError.response?.data?.error ||
        'Unable to create a delivery note for this quotation.';
      setError(errorMessage);
    } finally {
      setProcessingId('');
    }
  };

  const filteredDocs = documents.filter((document) =>
    [
      document.file,
      document.clientName,
      document.type,
      document.invoiceNumber,
      document.status,
    ].some((value) => value.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Container className="mt-4">
      <h2>History (All Quotations & Invoices)</h2>

      <Form className="mb-3">
        <Form.Control
          type="text"
          placeholder="Search by file name, client, type, invoice number, or status..."
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

      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Type</th>
            <th>Status</th>
            <th>Invoice Number</th>
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
              <td colSpan="8" className="text-center">
                No documents found yet.
              </td>
            </tr>
          )}

          {filteredDocs.map((document) => (
            <tr key={document.id}>
              <td>{document.type}</td>
              <td>{document.status}</td>
              <td>{document.invoiceNumber}</td>
              <td>{document.file}</td>
              <td>{document.clientName}</td>
              <td>{document.date}</td>
              <td>R {Number(document.total).toFixed(2)}</td>
              <td className="d-flex gap-2 flex-wrap">
                <Button
                  as={Link}
                  to={`/history/${document.type.toLowerCase()}/${document.id}`}
                  variant="info"
                >
                  Open
                </Button>
                {document.type === 'Quotation' && document.status !== 'Approved' && (
                  <Button
                    variant="warning"
                    onClick={() => approveQuotation(document)}
                    disabled={processingId === document.id}
                  >
                    {processingId === document.id ? 'Working...' : 'Approve'}
                  </Button>
                )}
                {document.type === 'Quotation' && (
                  <Button
                    variant="success"
                    onClick={() => createDeliveryNote(document)}
                    disabled={
                      processingId === document.id ||
                      document.status !== 'Approved' ||
                      deliveryNotesByQuotationId[document.id]
                    }
                  >
                    {deliveryNotesByQuotationId[document.id]
                      ? 'Delivery Note Created'
                      : processingId === document.id
                        ? 'Working...'
                        : 'Create Delivery Note'}
                  </Button>
                )}
                <Button
                  variant="outline-danger"
                  onClick={() => deleteDocument(document)}
                  disabled={processingId === document.id}
                >
                  Delete
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
