const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');

// Save a new quotation
router.post('/quotations', async (req, res) => {
  try {
    const quotation = new Quotation(req.body);
    await quotation.save();
    res.status(201).json(quotation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all quotations
router.get('/quotations', async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ date: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save a new invoice
router.post('/invoices', async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all invoices
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.find().sort({ date: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
