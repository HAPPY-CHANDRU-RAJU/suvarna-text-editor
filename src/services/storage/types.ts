import type { DocumentRecord, DocumentSummary } from '@/lib/document';

export type DocumentPatch = Partial<
  Pick<DocumentRecord, 'title' | 'content' | 'settings' | 'comments' | 'preview' | 'wordCount' | 'starred' | 'isPublic'>
>;

export type NewDocument = Partial<Pick<DocumentRecord, 'title' | 'content' | 'settings'>>;

export interface DocumentRepository {
  list(): Promise<DocumentSummary[]>;
  get(id: string): Promise<DocumentRecord | null>;
  create(init: NewDocument): Promise<DocumentRecord>;
  update(id: string, patch: DocumentPatch): Promise<DocumentRecord>;
  remove(id: string): Promise<void>;
  /** Read-only access to a document shared by link. Cloud only. */
  getShared?(id: string): Promise<DocumentRecord | null>;
}
