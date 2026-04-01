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

function getDocumentPrefix(type) {
  return type === 'quotation' ? 'Quotation' : 'Invoice';
}

function getDocumentCollection(store, type) {
  if (type === 'quotation') {
    return store.quotations;
  }

  if (type === 'invoice') {
    return store.invoices;
  }

  throw createHttpError(400, 'Unsupported document type.');
}

function findDocumentByType(store, type, id) {
  const collection = getDocumentCollection(store, type);
  const document = collection.find((item) => item._id === id);

  if (!document) {
    throw createHttpError(404, `${getDocumentPrefix(type)} not found.`);
  }

  return document;
}

function normalizeClientName(value) {
  return String(value || '').trim();
}

function compareClientNames(firstName, secondName) {
  return normalizeClientName(firstName).toLowerCase() ===
    normalizeClientName(secondName).toLowerCase();
}

function escapeCsvValue(value) {
  const stringValue =
    value === null || value === undefined ? '' : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
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
  const subjectLine = String(payload?.subjectLine || '').trim();
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
    subjectLine,
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

function sanitizeDocumentUpdate(type, currentDocument, payload) {
  const clientName = String(
    payload?.clientName || currentDocument.clientName || ''
  ).trim();
  const items = normalizeItems(payload?.items ?? currentDocument.items);
  const total = toNumber(payload?.total, currentDocument.total);

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

  const date = toIsoDate(payload?.date || currentDocument.date);

  return {
    ...currentDocument,
    clientName,
    subjectLine:
      type === 'quotation'
        ? String(
            payload?.subjectLine !== undefined
              ? payload.subjectLine
              : currentDocument.subjectLine || ''
          ).trim()
        : undefined,
    invoiceNumber:
      String(payload?.invoiceNumber || currentDocument.invoiceNumber || '').trim() ||
      `${type === 'quotation' ? 'QTN' : 'INV'}-${Date.now()}`,
    status:
      type === 'quotation'
        ? payload?.status || currentDocument.status || 'Pending'
        : undefined,
    date,
    items,
    vatApplied:
      payload?.vatApplied !== undefined
        ? Boolean(payload.vatApplied)
        : Boolean(currentDocument.vatApplied),
    vatRate:
      payload?.vatRate !== undefined
        ? toNumber(payload.vatRate, 15)
        : toNumber(currentDocument.vatRate, 15),
    discount:
      payload?.discount !== undefined
        ? toNumber(payload.discount, 0)
        : toNumber(currentDocument.discount, 0),
    total,
    fileName:
      String(payload?.fileName || currentDocument.fileName || '').trim() ||
      buildDocumentFileName(getDocumentPrefix(type), date, clientName),
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

async function getDocument(type, id) {
  const store = await readStore();
  return { ...findDocumentByType(store, type, id) };
}

async function updateDocument(type, id, payload) {
  return mutateStore(async (store) => {
    const document = findDocumentByType(store, type, id);
    const previousClientName = document.clientName;
    const nextDocument = sanitizeDocumentUpdate(type, document, payload);

    Object.assign(document, nextDocument);

    upsertClientRecord(store, {
      clientName: document.clientName,
      status: 'Active',
    });

    if (type === 'quotation') {
      store.deliveryNotes.forEach((note) => {
        if (note.quotationId === id) {
          note.clientName = document.clientName;
          note.invoiceNumber = document.invoiceNumber;
        }
      });
    }

    if (
      previousClientName &&
      !compareClientNames(previousClientName, document.clientName)
    ) {
      const previousClient = store.clients.find((client) =>
        compareClientNames(client.name, previousClientName)
      );

      if (previousClient) {
        previousClient.updatedAt = new Date().toISOString();
      }
    }

    return { ...document };
  });
}

async function deleteDocument(type, id) {
  return mutateStore(async (store) => {
    const collection = getDocumentCollection(store, type);
    const index = collection.findIndex((item) => item._id === id);

    if (index === -1) {
      throw createHttpError(404, `${getDocumentPrefix(type)} not found.`);
    }

    const [deletedDocument] = collection.splice(index, 1);

    if (type === 'quotation') {
      store.deliveryNotes = store.deliveryNotes.filter(
        (note) => note.quotationId !== deletedDocument._id
      );
    }

    return { ...deletedDocument };
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

async function deleteDeliveryNote(id) {
  return mutateStore(async (store) => {
    const index = store.deliveryNotes.findIndex((item) => item._id === id);

    if (index === -1) {
      throw createHttpError(404, 'Delivery note not found.');
    }

    const [deletedNote] = store.deliveryNotes.splice(index, 1);
    return { ...deletedNote };
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

async function updateClient(id, payload) {
  return mutateStore(async (store) => {
    const client = store.clients.find((item) => item._id === id);

    if (!client) {
      throw createHttpError(404, 'Client not found.');
    }

    const nextName = normalizeClientName(payload?.name || client.name);

    if (!nextName) {
      throw createHttpError(400, 'Client name is required.');
    }

    const duplicateClient = store.clients.find(
      (item) => item._id !== id && compareClientNames(item.name, nextName)
    );

    if (duplicateClient) {
      throw createHttpError(409, 'A client with that name already exists.');
    }

    const previousName = client.name;
    client.name = nextName;
    client.contact = String(payload?.contact || '').trim();
    client.status =
      String(payload?.status || client.status || 'Active').trim() || 'Active';
    client.updatedAt = new Date().toISOString();

    if (!compareClientNames(previousName, nextName)) {
      store.quotations.forEach((quotation) => {
        if (compareClientNames(quotation.clientName, previousName)) {
          quotation.clientName = nextName;
          quotation.fileName = buildDocumentFileName(
            'Quotation',
            quotation.date,
            nextName
          );
        }
      });

      store.invoices.forEach((invoice) => {
        if (compareClientNames(invoice.clientName, previousName)) {
          invoice.clientName = nextName;
          invoice.fileName = buildDocumentFileName('Invoice', invoice.date, nextName);
        }
      });

      store.deliveryNotes.forEach((note) => {
        if (compareClientNames(note.clientName, previousName)) {
          note.clientName = nextName;
        }
      });

      store.payments.forEach((payment) => {
        if (compareClientNames(payment.clientName, previousName)) {
          payment.clientName = nextName;
        }
      });
    }

    return buildClientSummaries(store).find(
      (clientSummary) => clientSummary._id === client._id
    );
  });
}

async function deleteClient(id) {
  return mutateStore(async (store) => {
    const client = store.clients.find((item) => item._id === id);

    if (!client) {
      throw createHttpError(404, 'Client not found.');
    }

    const hasLinkedRecords =
      store.quotations.some((quotation) =>
        compareClientNames(quotation.clientName, client.name)
      ) ||
      store.invoices.some((invoice) =>
        compareClientNames(invoice.clientName, client.name)
      ) ||
      store.deliveryNotes.some((note) =>
        compareClientNames(note.clientName, client.name)
      ) ||
      store.payments.some((payment) =>
        compareClientNames(payment.clientName, client.name)
      );

    if (hasLinkedRecords) {
      throw createHttpError(
        409,
        'Cannot delete a client that still has saved documents or payments.'
      );
    }

    store.clients = store.clients.filter((item) => item._id !== id);
    return { ...client };
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

async function updatePayment(id, payload) {
  return mutateStore(async (store) => {
    const payment = store.payments.find((item) => item._id === id);

    if (!payment) {
      throw createHttpError(404, 'Payment not found.');
    }

    const clientName = normalizeClientName(payload?.clientName || payment.clientName);
    const amount = toNumber(
      payload?.amount !== undefined ? payload.amount : payment.amount,
      NaN
    );

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

    payment.clientName = clientName;
    payment.amount = amount;
    payment.date = toIsoDate(payload?.date || payment.date);
    payment.reference = String(payload?.reference || '').trim();
    payment.notes = String(payload?.notes || '').trim();

    return { ...payment };
  });
}

async function deletePayment(id) {
  return mutateStore(async (store) => {
    const index = store.payments.findIndex((item) => item._id === id);

    if (index === -1) {
      throw createHttpError(404, 'Payment not found.');
    }

    const [deletedPayment] = store.payments.splice(index, 1);
    return { ...deletedPayment };
  });
}

async function exportStoreAsJson() {
  return readStore();
}

async function exportStoreAsCsv() {
  const store = await readStore();
  const rows = [
    ...store.clients.map((client) => ({
      entityType: 'client',
      id: client._id,
      name: client.name,
      clientName: client.name,
      contact: client.contact,
      status: client.status,
      date: client.updatedAt || client.createdAt,
      reference: '',
      amount: '',
      total: '',
      fileName: '',
      itemCount: '',
      items: '',
      notes: '',
      relatedId: '',
    })),
    ...store.quotations.map((quotation) => ({
      entityType: 'quotation',
      id: quotation._id,
      name: '',
      clientName: quotation.clientName,
      contact: '',
      status: quotation.status,
      date: quotation.date,
      reference: quotation.invoiceNumber,
      amount: '',
      total: quotation.total,
      fileName: quotation.fileName,
      itemCount: quotation.items.length,
      items: JSON.stringify(quotation.items),
      notes: '',
      relatedId: '',
    })),
    ...store.invoices.map((invoice) => ({
      entityType: 'invoice',
      id: invoice._id,
      name: '',
      clientName: invoice.clientName,
      contact: '',
      status: 'Issued',
      date: invoice.date,
      reference: invoice.invoiceNumber,
      amount: '',
      total: invoice.total,
      fileName: invoice.fileName,
      itemCount: invoice.items.length,
      items: JSON.stringify(invoice.items),
      notes: '',
      relatedId: '',
    })),
    ...store.deliveryNotes.map((note) => ({
      entityType: 'delivery-note',
      id: note._id,
      name: '',
      clientName: note.clientName,
      contact: '',
      status: 'Approved Delivery',
      date: note.date,
      reference: note.invoiceNumber,
      amount: '',
      total: '',
      fileName: '',
      itemCount: note.items.length,
      items: JSON.stringify(note.items),
      notes: note.notes,
      relatedId: note.quotationId,
    })),
    ...store.payments.map((payment) => ({
      entityType: 'payment',
      id: payment._id,
      name: '',
      clientName: payment.clientName,
      contact: '',
      status: '',
      date: payment.date,
      reference: payment.reference,
      amount: payment.amount,
      total: '',
      fileName: '',
      itemCount: '',
      items: '',
      notes: payment.notes,
      relatedId: '',
    })),
  ];

  const headers = [
    'entityType',
    'id',
    'name',
    'clientName',
    'contact',
    'status',
    'date',
    'reference',
    'amount',
    'total',
    'fileName',
    'itemCount',
    'items',
    'notes',
    'relatedId',
  ];

  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(',')
    ),
  ];

  return csvLines.join('\n');
}

module.exports = {
  createClient,
  createDeliveryNote,
  createInvoice,
  createPayment,
  createQuotation,
  approveQuotation,
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
};
