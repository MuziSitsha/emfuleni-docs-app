const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  invoiceNumber: { type: String },
  date: { type: Date, default: Date.now },
  items: [
    {
      description: String,
      quantity: Number,
      price: Number
    }
  ],
  vatApplied: { type: Boolean, default: false },
  vatRate: { type: Number, default: 15 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  fileName: { type: String }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
