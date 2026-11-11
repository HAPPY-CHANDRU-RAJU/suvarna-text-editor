import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PAGE_SETTINGS, EMPTY_DOC, normalizeSettings, type DocumentRecord, type DocumentSummary } from '@/lib/document';
import type { DocumentPatch, DocumentRepository, NewDocument } from './types';

// Table definition: supabase/migrations/0001_init.sql
interface Row {
  id: string;
  owner_id: string;
  title: string;
  content: DocumentRecord['content'];
  settings: DocumentRecord['settings'];
  comments: DocumentRecord['comments'];
  preview: string;
  word_count: number;
  starred: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

const SUMMARY_COLUMNS = 'id,title,preview,word_count,starred,is_public,created_at,updated_at';

function toSummary(row: Pick<Row, 'id' | 'title' | 'preview' | 'word_count' | 'starred' | 'is_public' | 'created_at' | 'updated_at'>): DocumentSummary {
  return {
    id: row.id,
    title: row.title,
    preview: row.preview,
    wordCount: row.word_count,
    starred: row.starred,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRecord(row: Row): DocumentRecord {
  return {
    ...toSummary(row),
    content: row.content ?? EMPTY_DOC,
    settings: normalizeSettings(row.settings),
    comments: row.comments ?? [],
    ownerId: row.owner_id,
  };
}

function toRow(patch: DocumentPatch): Partial<Row> {
  const row: Partial<Row> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.settings !== undefined) row.settings = patch.settings;
  if (patch.comments !== undefined) row.comments = patch.comments;
  if (patch.preview !== undefined) row.preview = patch.preview;
  if (patch.wordCount !== undefined) row.word_count = patch.wordCount;
  if (patch.starred !== undefined) row.starred = patch.starred;
  if (patch.isPublic !== undefined) row.is_public = patch.isPublic;
  return row;
}

export class SupabaseRepository implements DocumentRepository {
  constructor(private readonly client: SupabaseClient, private readonly ownerId: string) {}

  async list() {
    const { data, error } = await this.client
      .from('documents')
      .select(SUMMARY_COLUMNS)
      .eq('owner_id', this.ownerId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toSummary);
  }

  async get(id: string) {
    const { data, error } = await this.client.from('documents').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toRecord(data as Row) : null;
  }

  async getShared(id: string) {
    // RLS lets anyone read rows with is_public = true.
    const { data, error } = await this.client.from('documents').select('*').eq('id', id).eq('is_public', true).maybeSingle();
    if (error) throw error;
    return data ? toRecord(data as Row) : null;
  }

  async create(init: NewDocument) {
    const { data, error } = await this.client
      .from('documents')
      .insert({
        owner_id: this.ownerId,
        title: init.title ?? '',
        content: init.content ?? EMPTY_DOC,
        settings: init.settings ?? DEFAULT_PAGE_SETTINGS,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toRecord(data as Row);
  }

  async update(id: string, patch: DocumentPatch) {
    const { data, error } = await this.client.from('documents').update(toRow(patch)).eq('id', id).select('*').single();
    if (error) throw error;
    return toRecord(data as Row);
  }

  async remove(id: string) {
    const { error } = await this.client.from('documents').delete().eq('id', id);
    if (error) throw error;
  }
}
