import { DEFAULT_PAGE_SETTINGS, EMPTY_DOC, newId, normalizeSettings, type DocumentRecord } from '@/lib/document';
import type { DocumentPatch, DocumentRepository, NewDocument } from './types';

// Documents live in IndexedDB (not localStorage) because embedded images
// quickly exceed localStorage's ~5 MB quota.
const DB_NAME = 'suvarna';
const STORE = 'documents';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

export class LocalRepository implements DocumentRepository {
  constructor(private readonly ownerId: string) {}

  async list() {
    const all = await run<DocumentRecord[]>('readonly', (s) => s.getAll());
    return all
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(({ id, title, preview, wordCount, starred, isPublic, createdAt, updatedAt }) => ({
        id, title, preview, wordCount, starred, isPublic, createdAt, updatedAt,
      }));
  }

  async get(id: string) {
    const doc = await run<DocumentRecord | undefined>('readonly', (s) => s.get(id));
    return doc ? { ...doc, settings: normalizeSettings(doc.settings) } : null;
  }

  async create(init: NewDocument) {
    const now = new Date().toISOString();
    const doc: DocumentRecord = {
      id: newId(),
      title: init.title ?? '',
      content: init.content ?? EMPTY_DOC,
      settings: init.settings ?? DEFAULT_PAGE_SETTINGS,
      comments: [],
      preview: '',
      wordCount: 0,
      starred: false,
      isPublic: false,
      ownerId: this.ownerId,
      createdAt: now,
      updatedAt: now,
    };
    await run('readwrite', (s) => s.put(doc));
    return doc;
  }

  async update(id: string, patch: DocumentPatch) {
    const current = await this.get(id);
    if (!current) throw new Error('Document not found');
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await run('readwrite', (s) => s.put(next));
    return next;
  }

  async remove(id: string) {
    await run('readwrite', (s) => s.delete(id));
  }
}
