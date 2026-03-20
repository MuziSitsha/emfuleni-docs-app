const mongoose = require('mongoose');

const DeliveryNoteSchema = new mongoose.Schema({
  quotationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    required: true,
  },
  invoiceNumber: { type: String, required: true },
  clientName: { type: String, required: true },
  date: { type: Date, default: Date.now },
  items: [
    {
      description: String,
      quantity: Number,
    },
  ],
  notes: { type: String },
  authorizedSignature: { type: String },
});

module.exports = mongoose.model('DeliveryNote', DeliveryNoteSchema);
