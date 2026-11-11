import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { handleLanguageRequest } from '../supabase/functions/_shared/language-core';

function fakeClient(payload: unknown, stopReason = 'end_turn') {
  const create = vi.fn().mockResolvedValue({
    stop_reason: stopReason,
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  });
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
}

describe('handleLanguageRequest', () => {
  it('rejects malformed requests without calling the API', async () => {
    const { client, create } = fakeClient({});
    expect((await handleLanguageRequest(client, { action: 'check', paragraphs: 'nope' })).status).toBe(400);
    expect((await handleLanguageRequest(client, { action: 'translate' })).status).toBe(400);
    expect((await handleLanguageRequest(client, { action: 'check', language: 'hi', paragraphs: [] })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('sends a structured-output request and keeps only issues found in the text', async () => {
    const { client, create } = fakeClient({
      results: [
        {
          index: 0,
          issues: [
            { original: 'ವಿದ್ಯಾರ್ತಿ', suggestions: ['ವಿದ್ಯಾರ್ಥಿ', 'ವಿದ್ಯಾರ್ತಿ'], type: 'spelling', message: 'ಮಹಾಪ್ರಾಣ', confidence: 1.4 },
            { original: 'ಇಲ್ಲದ ಪದ', suggestions: ['x'], type: 'grammar', message: '', confidence: 0.5 },
          ],
        },
      ],
    });
    const result = await handleLanguageRequest(client, { action: 'check', language: 'kn', paragraphs: ['ನಾನು ವಿದ್ಯಾರ್ತಿ', 'ಸರಿ'] }, 'test-model');

    expect(result.status).toBe(200);
    expect(result.body.results).toEqual([
      { issues: [{ original: 'ವಿದ್ಯಾರ್ತಿ', suggestions: ['ವಿದ್ಯಾರ್ಥಿ'], type: 'spelling', message: 'ಮಹಾಪ್ರಾಣ', confidence: 1 }] },
      { issues: [] },
    ]);
    const params = create.mock.calls[0][0];
    expect(params.model).toBe('test-model');
    expect(params.output_config.format.type).toBe('json_schema');
    expect(params.fallbacks).toBe('default');
    expect(JSON.parse(params.messages[0].content)).toEqual([
      { index: 0, text: 'ನಾನು ವಿದ್ಯಾರ್ತಿ' },
      { index: 1, text: 'ಸರಿ' },
    ]);
  });

  it('returns empty results on a refusal', async () => {
    const { client } = fakeClient({}, 'refusal');
    const result = await handleLanguageRequest(client, { action: 'check', paragraphs: ['ಪಠ್ಯ'] });
    expect(result.body.results).toEqual([{ issues: [] }]);
  });

  it('dedupes synonyms and drops the original word', async () => {
    const { client } = fakeClient({ synonyms: ['ಸುಂದರ', 'ಚೆಂದ', 'ಚೆಂದ', 'ಸೊಗಸು'] });
    const result = await handleLanguageRequest(client, { action: 'synonyms', word: 'ಸುಂದರ', context: 'ಸುಂದರ ಹೂವು' });
    expect(result.body.synonyms).toEqual(['ಚೆಂದ', 'ಸೊಗಸು']);
  });
});
