const mongoose = require('mongoose');

const DocumentItemSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const DeliveryItemSchema = new mongoose.Schema(
  {
    description: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
  },
  { _id: false }
);

const ClientSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    contact: { type: String, default: '' },
    status: { type: String, default: 'Active' },
    createdAt: { type: String, default: '' },
    updatedAt: { type: String, default: '' },
  },
  { _id: false }
);

const QuotationSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    clientName: { type: String, required: true },
    subjectLine: { type: String, default: '' },
    invoiceNumber: { type: String, default: '' },
    status: { type: String, default: 'Pending' },
    date: { type: String, default: '' },
    items: { type: [DocumentItemSchema], default: [] },
    vatApplied: { type: Boolean, default: false },
    vatRate: { type: Number, default: 15 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    fileName: { type: String, default: '' },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    clientName: { type: String, required: true },
    subjectLine: { type: String, default: '' },
    invoiceNumber: { type: String, default: '' },
    date: { type: String, default: '' },
    items: { type: [DocumentItemSchema], default: [] },
    vatApplied: { type: Boolean, default: false },
    vatRate: { type: Number, default: 15 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    fileName: { type: String, default: '' },
  },
  { _id: false }
);

const DeliveryNoteSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    quotationId: { type: String, required: true },
    invoiceNumber: { type: String, default: '' },
    clientName: { type: String, default: '' },
    date: { type: String, default: '' },
    items: { type: [DeliveryItemSchema], default: [] },
    notes: { type: String, default: '' },
    authorizedSignature: { type: String, default: '' },
  },
  { _id: false }
);

const PaymentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    clientName: { type: String, required: true },
    amount: { type: Number, default: 0 },
    date: { type: String, default: '' },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdAt: { type: String, default: '' },
  },
  { _id: false }
);

const AppStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    clients: { type: [ClientSchema], default: [] },
    quotations: { type: [QuotationSchema], default: [] },
    invoices: { type: [InvoiceSchema], default: [] },
    deliveryNotes: { type: [DeliveryNoteSchema], default: [] },
    payments: { type: [PaymentSchema], default: [] },
  },
  {
    minimize: false,
    timestamps: true,
  }
);

module.exports =
  mongoose.models.AppState || mongoose.model('AppState', AppStateSchema);
