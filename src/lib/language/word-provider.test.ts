import { afterEach, describe, expect, it, vi } from 'vitest';
import { readList, WordListProvider } from './word-provider';

function api(table: Record<string, string[]>) {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const { word } = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ body: table[word] ?? [] }), { status: 200 });
  });
}

const make = () =>
  new WordListProvider({ id: 'w', url: 'http://localhost:9001/spellcheck', wordField: 'word', resultField: 'body', getHeaders: () => ({}) });

describe('readList', () => {
  it('reads dotted paths and bare arrays', () => {
    expect(readList({ body: ['a', 2, ' b '] }, 'body')).toEqual(['a', 'b']);
    expect(readList({ data: { s: ['x'] } }, 'data.s')).toEqual(['x']);
    expect(readList(['y'], 'body')).toEqual(['y']);
    expect(readList({ body: 'nope' }, 'body')).toEqual([]);
  });
});

describe('WordListProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts each distinct word once and flags words with suggestions', async () => {
    const fetchMock = api({ wanner: ['winner', 'more options'], winner: ['winner'], ಬಾರತ: ['ಭಾರತ'] });
    vi.stubGlobal('fetch', fetchMock);
    const [first, second] = await make().check(['the wanner is the winner', 'ಬಾರತ wanner']);

    expect(first).toEqual([{ original: 'wanner', offset: 4, suggestions: ['winner', 'more options'], type: 'spelling' }]);
    expect(second.map((i) => [i.original, i.offset])).toEqual([['ಬಾರತ', 0], ['wanner', 5]]);
    const words = fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init.body)).word).sort();
    expect(words).toEqual(['is', 'the', 'wanner', 'winner', 'ಬಾರತ'].sort());
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:9001/spellcheck');
  });

  it('caches lookups across checks', async () => {
    const fetchMock = api({});
    vi.stubGlobal('fetch', fetchMock);
    const provider = make();
    await provider.check(['hello world']);
    await provider.check(['hello again world']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('surfaces HTTP errors and retries the word later', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('boom', { status: 500 })).mockResolvedValue(new Response('{"body":[]}'));
    vi.stubGlobal('fetch', fetchMock);
    const provider = make();
    await expect(provider.check(['oops'])).rejects.toThrow('500');
    await expect(provider.check(['oops'])).resolves.toEqual([[]]);
  });
});
