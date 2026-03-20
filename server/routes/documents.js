const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');
const Invoice = require('../models/Invoice');
const DeliveryNote = require('../models/DeliveryNote');

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

// Approve a quotation before drafting a delivery note
router.patch('/quotations/:id/approve', async (req, res) => {
  try {
    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved' },
      { new: true, runValidators: true }
    );

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    res.json(quotation);
  } catch (err) {
    res.status(400).json({ error: err.message });
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

// Create delivery note from quotation
router.post('/delivery-notes', async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.body.quotationId);

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found.' });
    }

    if (quotation.status !== 'Approved') {
      return res.status(409).json({
        error: 'Approve the quotation before creating a delivery note.',
      });
    }

    const existingNote = await DeliveryNote.findOne({
      quotationId: req.body.quotationId,
    });

    if (existingNote) {
      return res.status(409).json({
        error: 'A delivery note already exists for this quotation.',
      });
    }

    const note = new DeliveryNote({
      quotationId: quotation._id,
      invoiceNumber: quotation.invoiceNumber || req.body.invoiceNumber,
      clientName: quotation.clientName,
      date: req.body.date,
      items: quotation.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
      })),
      notes: req.body.notes,
      authorizedSignature: req.body.authorizedSignature,
    });
    await note.save();
    const populatedNote = await note.populate('quotationId');
    res.status(201).json(populatedNote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all delivery notes
router.get('/delivery-notes', async (req, res) => {
  try {
    const notes = await DeliveryNote.find()
      .sort({ date: -1 })
      .populate('quotationId');
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update editable delivery note fields before printing
router.patch('/delivery-notes/:id', async (req, res) => {
  try {
    const note = await DeliveryNote.findByIdAndUpdate(
      req.params.id,
      {
        notes: req.body.notes,
        authorizedSignature: req.body.authorizedSignature,
      },
      { new: true, runValidators: true }
    ).populate('quotationId');

    if (!note) {
      return res.status(404).json({ error: 'Delivery note not found.' });
    }

    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
