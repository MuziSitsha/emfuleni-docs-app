const express = require('express');
const router = express.Router();
const {
  createClient,
  approveQuotation,
  createDeliveryNote,
  createInvoice,
  createPayment,
  createQuotation,
  getStoreSummary,
  listClients,
  listDeliveryNotes,
  listInvoices,
  listPayments,
  listQuotations,
  updateDeliveryNote,
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

module.exports = router;
