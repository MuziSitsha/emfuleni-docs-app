const express = require('express');
const router = express.Router();
const {
  createClient,
  approveQuotation,
  createDeliveryNote,
  createInvoice,
  createPayment,
  createQuotation,
  deleteClient,
  deleteDeliveryNote,
  deleteDocument,
  deletePayment,
  exportStoreAsCsv,
  exportStoreAsJson,
  getDocument,
  getStoreSummary,
  listClients,
  listDeliveryNotes,
  listInvoices,
  listPayments,
  listQuotations,
  updateClient,
  updateDeliveryNote,
  updateDocument,
  updatePayment,
} = require('../lib/dataStore');

function handleRouteError(res, error) {
  const status = error.status || 500;
  res.status(status).json({ error: error.message || 'Something went wrong.' });
}

// Save a new quotation
router.post('/quotations', async (req, res) => {
  try {
    const quotation = await createQuotation(req.body);
    res.status(201).json(quotation);
  } catch (err) {
    handleRouteError(res, err);
  }
});

// Get all quotations
router.get('/quotations', async (req, res) => {
  try {
    const quotations = await listQuotations();
    res.json(quotations);
  } catch (err) {
    handleRouteError(res, err);
  }
});

// Approve a quotation before drafting a delivery note
router.patch('/quotations/:id/approve', async (req, res) => {
  try {
    const quotation = await approveQuotation(req.params.id);
    res.json(quotation);
  } catch (err) {
    handleRouteError(res, err);
  }
});

// Save a new invoice
router.post('/invoices', async (req, res) => {
  try {
    const invoice = await createInvoice(req.body);
    res.status(201).json(invoice);
  } catch (err) {
    handleRouteError(res, err);
  }
});

// Get all invoices
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await listInvoices();
    res.json(invoices);
  } catch (err) {
    handleRouteError(res, err);
  }
});

// Create delivery note from quotation
router.post('/delivery-notes', async (req, res) => {
  try {
    const note = await createDeliveryNote(req.body);
    res.status(201).json(note);
  } catch (err) {
    handleRouteError(res, err);
  }
});

// Get all delivery notes
router.get('/delivery-notes', async (req, res) => {
  try {
    const notes = await listDeliveryNotes();
    res.json(notes);
  } catch (err) {
    handleRouteError(res, err);
  }
});

// Update editable delivery note fields before printing
router.patch('/delivery-notes/:id', async (req, res) => {
  try {
    const note = await updateDeliveryNote(req.params.id, req.body);
    res.json(note);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.delete('/delivery-notes/:id', async (req, res) => {
  try {
    const note = await deleteDeliveryNote(req.params.id);
    res.json(note);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.get('/summary', async (_req, res) => {
  try {
    const summary = await getStoreSummary();
    res.json(summary);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.get('/clients', async (_req, res) => {
  try {
    const clients = await listClients();
    res.json(clients);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.post('/clients', async (req, res) => {
  try {
    const client = await createClient(req.body);
    res.status(201).json(client);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.patch('/clients/:id', async (req, res) => {
  try {
    const client = await updateClient(req.params.id, req.body);
    res.json(client);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.delete('/clients/:id', async (req, res) => {
  try {
    const client = await deleteClient(req.params.id);
    res.json(client);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.get('/payments', async (_req, res) => {
  try {
    const payments = await listPayments();
    res.json(payments);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.post('/payments', async (req, res) => {
  try {
    const payment = await createPayment(req.body);
    res.status(201).json(payment);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.patch('/payments/:id', async (req, res) => {
  try {
    const payment = await updatePayment(req.params.id, req.body);
    res.json(payment);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.delete('/payments/:id', async (req, res) => {
  try {
    const payment = await deletePayment(req.params.id);
    res.json(payment);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.get('/documents/:type/:id', async (req, res) => {
  try {
    const document = await getDocument(req.params.type, req.params.id);
    res.json(document);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.patch('/documents/:type/:id', async (req, res) => {
  try {
    const document = await updateDocument(
      req.params.type,
      req.params.id,
      req.body
    );
    res.json(document);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.delete('/documents/:type/:id', async (req, res) => {
  try {
    const document = await deleteDocument(req.params.type, req.params.id);
    res.json(document);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.get('/export/json', async (_req, res) => {
  try {
    const data = await exportStoreAsJson();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="emfuleni-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`
    );
    res.json(data);
  } catch (err) {
    handleRouteError(res, err);
  }
});

router.get('/export/csv', async (_req, res) => {
  try {
    const csv = await exportStoreAsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="emfuleni-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`
    );
    res.send(csv);
  } catch (err) {
    handleRouteError(res, err);
  }
});

module.exports = router;
