import { useEffect, useState } from 'react';
import { Alert, Button, Container, Form, Spinner } from 'react-bootstrap';
import api from './api';
import './DeliveryNotes.css';
import emfuleniLogo from './emfuleni-logo.svg';

const COMPANY_DETAILS = {
  name: 'Emfuleni Business Lines',
  tagline: 'School Supply Solutions',
  registration: 'Enterprise Number: 2025/119633/07',
  location: [
    '1207 Fa-Hua Avenue, Culturapark',
    'Bronkhorstspruit, 1020, Gauteng',
    'emfulenibusiness@outlook.com',
  ],
};

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function buildSubject(note) {
  const firstItem = note.items?.[0]?.description;
  return firstItem ? `Delivery of ${firstItem}` : 'Approved quotation delivery';
}

function DeliveryNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState('');
  const [savingId, setSavingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [drafts, setDrafts] = useState({});

  const syncDrafts = (items) => {
    setDrafts(
      items.reduce((accumulator, note) => {
        accumulator[note._id] = {
          notes: note.notes || '',
          authorizedSignature: note.authorizedSignature || '',
        };
        return accumulator;
      }, {})
    );
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        setError('');
        setMessage('');

        const response = await api.get('/delivery-notes');
        setNotes(response.data);
        syncDrafts(response.data);
      } catch (fetchError) {
        const errorMessage =
          fetchError.response?.data?.error ||
          'Unable to load delivery notes from the backend.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  const handleDraftChange = (noteId, field, value) => {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [noteId]: {
        ...currentDrafts[noteId],
        [field]: value,
      },
    }));
  };

  const startEditing = (note) => {
    setMessage('');
    setError('');
    setEditingId(note._id);
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [note._id]: {
        notes: note.notes || '',
        authorizedSignature: note.authorizedSignature || '',
      },
    }));
  };

  const cancelEditing = (note) => {
    setEditingId('');
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [note._id]: {
        notes: note.notes || '',
        authorizedSignature: note.authorizedSignature || '',
      },
    }));
  };

  const saveDeliveryNote = async (noteId) => {
    try {
      setSavingId(noteId);
      setError('');
      setMessage('');

      const response = await api.patch(`/delivery-notes/${noteId}`, {
        notes: drafts[noteId]?.notes || '',
        authorizedSignature: drafts[noteId]?.authorizedSignature || '',
      });

      setNotes((currentNotes) =>
        currentNotes.map((note) => (note._id === noteId ? response.data : note))
      );
      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [noteId]: {
          notes: response.data.notes || '',
          authorizedSignature: response.data.authorizedSignature || '',
        },
      }));
      setEditingId('');
      setMessage('Delivery note updated successfully.');
    } catch (saveError) {
      const errorMessage =
        saveError.response?.data?.error ||
        'Unable to save the delivery note details right now.';
      setError(errorMessage);
    } finally {
      setSavingId('');
    }
  };

  const deleteDeliveryNote = async (noteId) => {
    const confirmed = window.confirm(
      'Delete this delivery note? This cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(noteId);
      setError('');
      setMessage('');
      await api.delete(`/delivery-notes/${noteId}`);
      const nextNotes = notes.filter((note) => note._id !== noteId);
      setNotes(nextNotes);
      syncDrafts(nextNotes);
      if (editingId === noteId) {
        setEditingId('');
      }
      setMessage('Delivery note deleted successfully.');
    } catch (deleteError) {
      const errorMessage =
        deleteError.response?.data?.error ||
        'Unable to delete the delivery note right now.';
      setError(errorMessage);
    } finally {
      setDeletingId('');
    }
  };

  return (
    <Container className="mt-4 delivery-notes-page">
      <div className="delivery-notes-header">
        <div>
          <h2>Delivery Notes</h2>
          <p>
            Each note is laid out as a printable delivery document, based on your
            reference style and adapted for Emfuleni Business Lines.
          </p>
        </div>
      </div>

      {loading && (
        <div className="d-flex align-items-center gap-2 mb-3">
          <Spinner animation="border" size="sm" />
          <span>Loading delivery notes...</span>
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      {!loading && notes.length === 0 && (
        <div className="delivery-note-empty">
          No delivery notes have been created yet.
        </div>
      )}

      <div className="delivery-note-stack">
        {notes.map((note) => (
          <article key={note._id} className="delivery-note-card">
            <div className="delivery-note-toolbar">
              <Button
                variant="outline-primary"
                onClick={() =>
                  editingId === note._id ? cancelEditing(note) : startEditing(note)
                }
              >
                {editingId === note._id ? 'Cancel Editing' : 'Edit Details'}
              </Button>
              <Button variant="outline-secondary" onClick={() => window.print()}>
                Print Note
              </Button>
              <Button
                variant="outline-danger"
                onClick={() => deleteDeliveryNote(note._id)}
                disabled={deletingId === note._id}
              >
                {deletingId === note._id ? 'Deleting...' : 'Delete Note'}
              </Button>
            </div>

            <div className="delivery-note-document">
              <section className="delivery-note-top">
                <div className="delivery-note-brand">
                  <img
                    src={emfuleniLogo}
                    alt="Emfuleni Business Lines logo"
                    className="delivery-note-logo"
                  />
                  <div className="delivery-note-company">
                    <h3>{COMPANY_DETAILS.name}</h3>
                    <p className="delivery-note-tagline">{COMPANY_DETAILS.tagline}</p>
                    <p>{COMPANY_DETAILS.registration}</p>
                    {COMPANY_DETAILS.location.map((line) => (
                      <p key={`${note._id}-${line}`}>{line}</p>
                    ))}
                  </div>
                </div>

                <div className="delivery-note-title">
                  <h1>DELIVERY NOTE</h1>
                  <div className="delivery-note-detail-row">
                    <dt>Reference</dt>
                    <dd>#{note.invoiceNumber}</dd>
                  </div>
                  <div className="delivery-note-balance">
                    <span className="delivery-note-balance-label">Balance Due</span>
                    <span className="delivery-note-balance-amount">R0.00</span>
                  </div>
                </div>
              </section>

              <section className="delivery-note-meta">
                <div>
                  <div className="delivery-note-block-label">Bill To</div>
                  <div className="delivery-note-client">{note.clientName}</div>

                  <div className="delivery-note-subject">
                    <div className="delivery-note-block-label">Subject</div>
                    <div>{buildSubject(note)}</div>
                  </div>
                </div>

                <dl className="delivery-note-detail-grid">
                  <div className="delivery-note-detail-row">
                    <dt>Date</dt>
                    <dd>{formatDate(note.date)}</dd>
                  </div>
                  <div className="delivery-note-detail-row">
                    <dt>Quotation</dt>
                    <dd>{note.quotationId?.invoiceNumber || note.invoiceNumber}</dd>
                  </div>
                  <div className="delivery-note-detail-row">
                    <dt>Status</dt>
                    <dd>Approved Delivery</dd>
                  </div>
                </dl>
              </section>

              <table className="delivery-note-items">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item &amp; Description</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {(note.items || []).map((item, index) => (
                    <tr key={`${note._id}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{item.description}</td>
                      <td>{Number(item.quantity || 0).toLocaleString('en-ZA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <section className="delivery-note-footer">
                <div className="delivery-note-notes">
                  <h4>Notes</h4>
                  <p>{note.notes || 'Thanks for your business.'}</p>
                </div>

                <div className="delivery-note-signature">
                  <h4>Authorized Signature</h4>
                  <div className="delivery-note-signature-line">
                    {note.authorizedSignature || '________________'}
                  </div>
                </div>
              </section>

              {editingId === note._id && (
                <Form className="delivery-note-editor">
                  <p className="delivery-note-helper">
                    Update the note text and signature below, then save before
                    printing.
                  </p>
                  <div className="delivery-note-editor-grid">
                    <Form.Group controlId={`delivery-note-notes-${note._id}`}>
                      <Form.Label>Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={5}
                        value={drafts[note._id]?.notes || ''}
                        onChange={(event) =>
                          handleDraftChange(note._id, 'notes', event.target.value)
                        }
                      />
                    </Form.Group>

                    <Form.Group
                      controlId={`delivery-note-signature-${note._id}`}
                    >
                      <Form.Label>Authorized Signature</Form.Label>
                      <Form.Control
                        type="text"
                        value={drafts[note._id]?.authorizedSignature || ''}
                        onChange={(event) =>
                          handleDraftChange(
                            note._id,
                            'authorizedSignature',
                            event.target.value
                          )
                        }
                      />
                    </Form.Group>
                  </div>

                  <div className="delivery-note-editor-actions">
                    <Button
                      variant="primary"
                      onClick={() => saveDeliveryNote(note._id)}
                      disabled={savingId === note._id}
                    >
                      {savingId === note._id ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={() => cancelEditing(note)}
                      disabled={savingId === note._id}
                    >
                      Cancel
                    </Button>
                  </div>
                </Form>
              )}
            </div>
          </article>
        ))}
      </div>
    </Container>
  );
}

export default DeliveryNotes;
