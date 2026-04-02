const STORAGE_KEY = 'emfuleni-documents-v1';

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function createDocumentId(type) {
  const randomPart =
    window.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${type}-${randomPart}`;
}

function readStore() {
  if (!isBrowser()) {
    return { quotations: [], invoices: [] };
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return { quotations: [], invoices: [] };
    }

    const parsed = JSON.parse(rawValue);

    return {
      quotations: Array.isArray(parsed.quotations) ? parsed.quotations : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
    };
  } catch {
    return { quotations: [], invoices: [] };
  }
}

function writeStore(store) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getCollectionName(type) {
  return type === 'quotation' ? 'quotations' : 'invoices';
}

function normalizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      description: String(item?.description || '').trim(),
      quantity: Number(item?.quantity || 0),
      price: Number(item?.price || 0),
    }))
    .filter((item) => item.description && item.quantity > 0);
}

function normalizeDocument(type, payload, currentDocument) {
  const normalizedDate = payload?.date
    ? new Date(payload.date).toISOString()
    : currentDocument?.date || new Date().toISOString();

  return {
    _id: currentDocument?._id || payload?._id || createDocumentId(type),
    type,
    clientName: String(payload?.clientName || currentDocument?.clientName || '').trim(),
    subjectLine: String(
      payload?.subjectLine !== undefined
        ? payload.subjectLine
        : currentDocument?.subjectLine || ''
    ).trim(),
    invoiceNumber: String(
      payload?.invoiceNumber || currentDocument?.invoiceNumber || ''
    ).trim(),
    status:
      type === 'quotation'
        ? String(payload?.status || currentDocument?.status || 'Pending').trim() ||
          'Pending'
        : 'Issued',
    date: normalizedDate,
    items: normalizeItems(payload?.items ?? currentDocument?.items),
    vatApplied:
      payload?.vatApplied !== undefined
        ? Boolean(payload.vatApplied)
        : Boolean(currentDocument?.vatApplied),
    vatRate:
      payload?.vatRate !== undefined
        ? Number(payload.vatRate || 0)
        : Number(currentDocument?.vatRate || 0),
    discount:
      payload?.discount !== undefined
        ? Number(payload.discount || 0)
        : Number(currentDocument?.discount || 0),
    total:
      payload?.total !== undefined
        ? Number(payload.total || 0)
        : Number(currentDocument?.total || 0),
    fileName: String(payload?.fileName || currentDocument?.fileName || '').trim(),
    updatedAt: new Date().toISOString(),
    createdAt: currentDocument?.createdAt || new Date().toISOString(),
    storageSource: 'local',
  };
}

export function listLocalDocuments() {
  const store = readStore();

  return [...store.quotations, ...store.invoices]
    .map((document) => ({
      ...document,
      storageSource: 'local',
    }))
    .sort((first, second) => new Date(second.date) - new Date(first.date));
}

export function getLocalDocument(type, id) {
  const store = readStore();
  const collection = store[getCollectionName(type)];
  const document = collection.find((item) => item._id === id);

  return document ? { ...document, storageSource: 'local' } : null;
}

export function saveLocalDocument(type, payload) {
  const store = readStore();
  const collectionName = getCollectionName(type);
  const collection = store[collectionName];
  const existingIndex = collection.findIndex((item) => item._id === payload?._id);
  const currentDocument = existingIndex >= 0 ? collection[existingIndex] : null;
  const nextDocument = normalizeDocument(type, payload, currentDocument);

  if (existingIndex >= 0) {
    collection[existingIndex] = nextDocument;
  } else {
    collection.unshift(nextDocument);
  }

  writeStore(store);
  return { ...nextDocument, storageSource: 'local' };
}

export function deleteLocalDocument(type, id) {
  const store = readStore();
  const collectionName = getCollectionName(type);
  const nextCollection = store[collectionName].filter((item) => item._id !== id);

  store[collectionName] = nextCollection;
  writeStore(store);
}

export function approveLocalQuotation(id) {
  const store = readStore();
  const index = store.quotations.findIndex((quotation) => quotation._id === id);

  if (index === -1) {
    return null;
  }

  store.quotations[index] = {
    ...store.quotations[index],
    status: 'Approved',
    updatedAt: new Date().toISOString(),
  };

  writeStore(store);
  return { ...store.quotations[index], storageSource: 'local' };
}
