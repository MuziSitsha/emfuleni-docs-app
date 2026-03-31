const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const defaultDataFile = path.join(__dirname, '..', 'data', 'documents.json');
const dataFile = path.resolve(process.env.DATA_FILE || defaultDataFile);

let writeQueue = Promise.resolve();

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

function normalizeItems(items, includePrice = true) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      description: String(item?.description || '').trim(),
      quantity: toNumber(item?.quantity, 0),
      ...(includePrice ? { price: toNumber(item?.price, 0) } : {}),
    }))
    .filter((item) => item.description && item.quantity > 0);
}

function sortByDateDesc(items) {
  return [...items].sort((first, second) => {
    return new Date(second.date).getTime() - new Date(first.date).getTime();
  });
}

async function ensureStore() {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    const initialState = {
      clients: [],
      quotations: [],
      invoices: [],
      deliveryNotes: [],
      payments: [],
    };

    await fs.writeFile(dataFile, JSON.stringify(initialState, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  const contents = await fs.readFile(dataFile, 'utf8');
  const parsed = JSON.parse(contents);

  return {
    clients: Array.isArray(parsed.clients) ? parsed.clients : [],
    quotations: Array.isArray(parsed.quotations) ? parsed.quotations : [],
    invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    deliveryNotes: Array.isArray(parsed.deliveryNotes) ? parsed.deliveryNotes : [],
    payments: Array.isArray(parsed.payments) ? parsed.payments : [],
  };
}

function writeStore(nextState) {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(dataFile, JSON.stringify(nextState, null, 2))
  );

  return writeQueue;
}

async function mutateStore(mutator) {
  const current = await readStore();
  const result = await mutator(current);
  await writeStore(current);
  return result;
}

function buildDocumentFileName(prefix, date, clientName) {
  const safeClientName = String(clientName || 'Client')
    .trim()
    .replace(/\s+/g, '_');
  const safeDate = String(date || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `${prefix}_${safeDate}_${safeClientName}.pdf`;
}

function normalizeClientName(value) {
  return String(value || '').trim();
}

function compareClientNames(firstName, secondName) {
  return normalizeClientName(firstName).toLowerCase() ===
    normalizeClientName(secondName).toLowerCase();
}

function buildClientRecord(payload = {}) {
  const name = normalizeClientName(payload.name || payload.clientName);
  const status = String(payload.status || 'Active').trim() || 'Active';

  if (!name) {
    throw createHttpError(400, 'Client name is required.');
  }

  return {
    _id: payload._id || randomUUID(),
    name,
    contact: String(payload.contact || '').trim(),
    status,
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function upsertClientRecord(store, payload = {}) {
  const name = normalizeClientName(payload.name || payload.clientName);

  if (!name) {
    return null;
  }

  const existingClient = store.clients.find((client) =>
    compareClientNames(client.name, name)
  );

  if (existingClient) {
    existingClient.contact =
      String(payload.contact || existingClient.contact || '').trim();
    existingClient.status =
      String(payload.status || existingClient.status || 'Active').trim() || 'Active';
    existingClient.updatedAt = new Date().toISOString();
    return existingClient;
  }

  const nextClient = buildClientRecord(payload);
  store.clients.push(nextClient);
  return nextClient;
}

function buildClientSummaries(store) {
  return [...store.clients]
    .map((client) => {
      const quotations = store.quotations.filter((quotation) =>
        compareClientNames(quotation.clientName, client.name)
      );
      const invoices = store.invoices.filter((invoice) =>
        compareClientNames(invoice.clientName, client.name)
      );
      const payments = store.payments.filter((payment) =>
        compareClientNames(payment.clientName, client.name)
      );
      const lastActivity = [
        client.updatedAt,
        ...quotations.map((quotation) => quotation.date),
        ...invoices.map((invoice) => invoice.date),
        ...payments.map((payment) => payment.date),
      ]
        .filter(Boolean)
        .sort((first, second) => new Date(second) - new Date(first))[0] || null;

      return {
        ...client,
        quotationsCount: quotations.length,
        invoicesCount: invoices.length,
        paymentsCount: payments.length,
        totalQuoted: quotations.reduce(
          (sum, quotation) => sum + toNumber(quotation.total, 0),
          0
        ),
        totalInvoiced: invoices.reduce(
          (sum, invoice) => sum + toNumber(invoice.total, 0),
          0
        ),
        totalPaid: payments.reduce(
          (sum, payment) => sum + toNumber(payment.amount, 0),
          0
        ),
        lastActivity,
      };
    })
    .sort((first, second) => first.name.localeCompare(second.name));
}

function sanitizeQuotation(payload) {
  const clientName = String(payload?.clientName || '').trim();
  const items = normalizeItems(payload?.items);
  const total = toNumber(payload?.total, NaN);

  if (!clientName) {
    throw createHttpError(400, 'Please enter a client name.');
  }

  if (items.length === 0) {
    throw createHttpError(
      400,
      'Add at least one item with a description and quantity.'
    );
  }

  if (!Number.isFinite(total)) {
    throw createHttpError(400, 'A valid total amount is required.');
  }

  const date = toIsoDate(payload?.date);

  return {
    _id: randomUUID(),
    clientName,
    invoiceNumber:
      String(payload?.invoiceNumber || '').trim() || `QTN-${Date.now()}`,
    status: payload?.status === 'Approved' ? 'Approved' : 'Pending',
    date,
    items,
    vatApplied: Boolean(payload?.vatApplied),
    vatRate: toNumber(payload?.vatRate, 15),
    discount: toNumber(payload?.discount, 0),
    total,
    fileName:
      String(payload?.fileName || '').trim() ||
      buildDocumentFileName('Quotation', date, clientName),
  };
}

function sanitizeInvoice(payload) {
  const clientName = String(payload?.clientName || '').trim();
  const items = normalizeItems(payload?.items);
  const total = toNumber(payload?.total, NaN);

  if (!clientName) {
    throw createHttpError(400, 'Please enter a client name.');
  }

  if (items.length === 0) {
    throw createHttpError(
      400,
      'Add at least one item with a description and quantity.'
    );
  }

  if (!Number.isFinite(total)) {
    throw createHttpError(400, 'A valid total amount is required.');
  }

  const date = toIsoDate(payload?.date);

  return {
    _id: randomUUID(),
    clientName,
    invoiceNumber:
      String(payload?.invoiceNumber || '').trim() || `INV-${Date.now()}`,
    date,
    items,
    vatApplied: Boolean(payload?.vatApplied),
    vatRate: toNumber(payload?.vatRate, 15),
    discount: toNumber(payload?.discount, 0),
    total,
    fileName:
      String(payload?.fileName || '').trim() ||
      buildDocumentFileName('Invoice', date, clientName),
  };
}

function populateDeliveryNote(note, quotation) {
  return {
    ...note,
    quotationId: quotation ? { ...quotation } : note.quotationId,
  };
}

async function listQuotations() {
  const store = await readStore();
  return sortByDateDesc(store.quotations);
}

async function createQuotation(payload) {
  return mutateStore(async (store) => {
    const quotation = sanitizeQuotation(payload);
    upsertClientRecord(store, {
      clientName: quotation.clientName,
      status: 'Active',
    });
    store.quotations.push(quotation);
    return quotation;
  });
}

async function approveQuotation(id) {
  return mutateStore(async (store) => {
    const quotation = store.quotations.find((item) => item._id === id);

    if (!quotation) {
      throw createHttpError(404, 'Quotation not found.');
    }

    quotation.status = 'Approved';
    return { ...quotation };
  });
}

async function listInvoices() {
  const store = await readStore();
  return sortByDateDesc(store.invoices);
}

async function createInvoice(payload) {
  return mutateStore(async (store) => {
    const invoice = sanitizeInvoice(payload);
    upsertClientRecord(store, {
      clientName: invoice.clientName,
      status: 'Active',
    });
    store.invoices.push(invoice);
    return invoice;
  });
}

async function listDeliveryNotes() {
  const store = await readStore();

  return sortByDateDesc(store.deliveryNotes).map((note) =>
    populateDeliveryNote(
      note,
      store.quotations.find((quotation) => quotation._id === note.quotationId)
    )
  );
}

async function createDeliveryNote(payload) {
  return mutateStore(async (store) => {
    const quotationId = String(payload?.quotationId || '').trim();

    if (!quotationId) {
      throw createHttpError(400, 'Quotation ID is required.');
    }

    const quotation = store.quotations.find((item) => item._id === quotationId);

    if (!quotation) {
      throw createHttpError(404, 'Quotation not found.');
    }

    if (quotation.status !== 'Approved') {
      throw createHttpError(
        409,
        'Approve the quotation before creating a delivery note.'
      );
    }

    const existingNote = store.deliveryNotes.find(
      (note) => note.quotationId === quotationId
    );

    if (existingNote) {
      throw createHttpError(
        409,
        'A delivery note already exists for this quotation.'
      );
    }

    const note = {
      _id: randomUUID(),
      quotationId,
      invoiceNumber:
        String(quotation.invoiceNumber || payload?.invoiceNumber || '').trim() ||
        `DN-${Date.now()}`,
      clientName: quotation.clientName,
      date: toIsoDate(payload?.date),
      items: normalizeItems(quotation.items, false),
      notes: String(payload?.notes || '').trim(),
      authorizedSignature: String(payload?.authorizedSignature || '').trim(),
    };

    store.deliveryNotes.push(note);
    return populateDeliveryNote(note, quotation);
  });
}

async function updateDeliveryNote(id, payload) {
  return mutateStore(async (store) => {
    const note = store.deliveryNotes.find((item) => item._id === id);

    if (!note) {
      throw createHttpError(404, 'Delivery note not found.');
    }

    note.notes = String(payload?.notes || '').trim();
    note.authorizedSignature = String(payload?.authorizedSignature || '').trim();

    const quotation = store.quotations.find(
      (item) => item._id === note.quotationId
    );

    return populateDeliveryNote(note, quotation);
  });
}

async function getStoreSummary() {
  const store = await readStore();
  const paymentsTotal = store.payments.reduce(
    (sum, payment) => sum + toNumber(payment.amount, 0),
    0
  );
  const documentTotal =
    store.quotations.reduce(
      (sum, quotation) => sum + toNumber(quotation.total, 0),
      0
    ) +
    store.invoices.reduce(
      (sum, invoice) => sum + toNumber(invoice.total, 0),
      0
    );

  return {
    clients: {
      count: store.clients.length,
    },
    quotations: {
      count: store.quotations.length,
      totalAmount: store.quotations.reduce(
        (sum, quotation) => sum + toNumber(quotation.total, 0),
        0
      ),
    },
    invoices: {
      count: store.invoices.length,
      totalAmount: store.invoices.reduce(
        (sum, invoice) => sum + toNumber(invoice.total, 0),
        0
      ),
    },
    deliveryNotes: {
      count: store.deliveryNotes.length,
    },
    payments: {
      count: store.payments.length,
      totalAmount: paymentsTotal,
    },
    outstandingAmount: documentTotal - paymentsTotal,
  };
}

async function listClients() {
  const store = await readStore();
  return buildClientSummaries(store);
}

async function createClient(payload) {
  return mutateStore(async (store) => {
    const existingClient = store.clients.find((client) =>
      compareClientNames(client.name, payload?.name || payload?.clientName)
    );

    if (existingClient) {
      existingClient.contact =
        String(payload?.contact || existingClient.contact || '').trim();
      existingClient.status =
        String(payload?.status || existingClient.status || 'Active').trim() ||
        'Active';
      existingClient.updatedAt = new Date().toISOString();

      return buildClientSummaries(store).find(
        (client) => client._id === existingClient._id
      );
    }

    const client = buildClientRecord(payload);
    store.clients.push(client);

    return buildClientSummaries(store).find(
      (clientSummary) => clientSummary._id === client._id
    );
  });
}

async function listPayments() {
  const store = await readStore();

  return sortByDateDesc(store.payments).map((payment) => ({
    ...payment,
  }));
}

async function createPayment(payload) {
  return mutateStore(async (store) => {
    const clientName = normalizeClientName(payload?.clientName);
    const amount = toNumber(payload?.amount, NaN);

    if (!clientName) {
      throw createHttpError(400, 'Client name is required.');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw createHttpError(400, 'Payment amount must be greater than zero.');
    }

    upsertClientRecord(store, {
      clientName,
      status: 'Active',
    });

    const payment = {
      _id: randomUUID(),
      clientName,
      amount,
      date: toIsoDate(payload?.date),
      reference: String(payload?.reference || '').trim(),
      notes: String(payload?.notes || '').trim(),
      createdAt: new Date().toISOString(),
    };

    store.payments.push(payment);
    return payment;
  });
}

module.exports = {
  createClient,
  createDeliveryNote,
  createInvoice,
  createPayment,
  createQuotation,
  approveQuotation,
  getStoreSummary,
  listClients,
  listDeliveryNotes,
  listInvoices,
  listPayments,
  listQuotations,
  updateDeliveryNote,
};
