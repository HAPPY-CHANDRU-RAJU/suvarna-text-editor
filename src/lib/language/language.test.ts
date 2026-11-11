import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRuleMap, matchRule } from './autocorrect';
import { checkParagraph, levenshtein, suggest } from './local-provider';
import { RemoteProvider } from './remote-provider';

describe('autocorrect rules', () => {
  const rules = buildRuleMap([{ from: 'ಕನ್ನದ', to: 'ಕನ್ನಡ' }]);

  it('matches a finished word', () => {
    expect(matchRule('ನಾನು ಕನ್ನದ', rules)).toEqual({ from: 'ಕನ್ನದ', to: 'ಕನ್ನಡ' });
    expect(matchRule('ನಮ್ಮ ಬಾರತ', rules)).toEqual({ from: 'ಬಾರತ', to: 'ಭಾರತ' });
  });

  it('does not match the tail of a longer word', () => {
    expect(matchRule('ಅಬಾರತ', rules)).toBeNull();
  });

  it('matches symbol rules glued to text', () => {
    expect(matchRule('wait...', rules)).toEqual({ from: '...', to: '…' });
  });

  it('lets user rules override built-ins', () => {
    const custom = buildRuleMap([{ from: '(c)', to: '(C)' }]);
    expect(matchRule('(c)', custom)?.to).toBe('(C)');
  });
});

describe('local provider', () => {
  it('computes edit distance', () => {
    expect(levenshtein('ಕನ್ನಡ', 'ಕನ್ನಡ')).toBe(0);
    expect(levenshtein('ಬಾರತ', 'ಭಾರತ')).toBe(1);
  });

  it('suggests dictionary words for near misses', () => {
    expect(suggest('ಬಾರತ')[0]).toBe('ಭಾರತ');
  });

  it('flags known misspellings and accepts inflected dictionary words', () => {
    const issues = checkParagraph('ನಮ್ಮ ಬಾರತ ದೇಶದಲ್ಲಿ ಶಾಲೆಗಳು ಇವೆ', new Set());
    expect(issues.map((i) => i.original)).toEqual(['ಬಾರತ']);
    expect(issues[0].offset).toBe(5);
    expect(issues[0].suggestions[0]).toBe('ಭಾರತ');
  });

  it('skips words in the user dictionary', () => {
    expect(checkParagraph('ಬಾರತ', new Set(['ಬಾರತ']))).toEqual([]);
  });
});

describe('remote provider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts paragraphs and sanitizes the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            { issues: [{ original: 'ನಮಸ್ಕರ', suggestions: ['ನಮಸ್ಕಾರ', 'ನಮಸ್ಕರ', 42], type: 'spelling', confidence: 3 }, { bogus: true }] },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const provider = new RemoteProvider({ id: 'test', url: 'https://api.test/kn', getHeaders: () => ({ Authorization: 'Bearer x' }) });
    const [issues, second] = await provider.check(['ನಮಸ್ಕರ', 'ಸರಿ']);

    expect(issues).toEqual([{ original: 'ನಮಸ್ಕರ', suggestions: ['ನಮಸ್ಕಾರ'], type: 'spelling', confidence: 1, message: undefined, offset: undefined }]);
    expect(second).toEqual([]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/kn');
    expect(init.headers.Authorization).toBe('Bearer x');
    expect(JSON.parse(init.body)).toEqual({ language: 'kn', action: 'check', paragraphs: ['ನಮಸ್ಕರ', 'ಸರಿ'] });
  });

  it('surfaces HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 401 })));
    const provider = new RemoteProvider({ id: 'test', url: 'https://api.test', getHeaders: () => ({}) });
    await expect(provider.check(['x'])).rejects.toThrow('401');
  });
});
