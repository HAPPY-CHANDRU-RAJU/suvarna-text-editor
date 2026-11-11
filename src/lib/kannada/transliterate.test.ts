import { describe, expect, it } from 'vitest';
import { toKannadaDigits, toWesternDigits, transliterate } from './transliterate';

describe('transliterate', () => {
  it.each([
    ['namaskaara', 'ನಮಸ್ಕಾರ'],
    ['kannaDa', 'ಕನ್ನಡ'],
    ['karnaaTaka', 'ಕರ್ನಾಟಕ'],
    ['beMgaLUru', 'ಬೆಂಗಳೂರು'],
    ['dhanyavaada', 'ಧನ್ಯವಾದ'],
    ['bhaarata', 'ಭಾರತ'],
    ['vidyaarthi', 'ವಿದ್ಯಾರ್ಥಿ'],
    ['kai', 'ಕೈ'],
    ['kRuShi', 'ಕೃಷಿ'],
    ['pareekShe', 'ಪರೀಕ್ಷೆ'],
    ['xamisi', 'ಕ್ಷಮಿಸಿ'],
    ['duHkha', 'ದುಃಖ'],
    ['abhivRuddhi', 'ಅಭಿವೃದ್ಧಿ'],
    ['jnaana', 'ಜ್ಞಾನ'],
    ['Ota', 'ಓತ'],
    ['aa', 'ಆ'],
  ])('%s → %s', (input, expected) => {
    expect(transliterate(input)).toBe(expected);
  });

  it('adds a virama to a trailing consonant while typing', () => {
    expect(transliterate('n')).toBe('ನ್');
    expect(transliterate('na')).toBe('ನ');
    expect(transliterate('nan')).toBe('ನನ್');
  });

  it('passes through characters it does not know', () => {
    expect(transliterate('ka-ka')).toBe('ಕ-ಕ');
  });
});

describe('digits', () => {
  it('converts both ways', () => {
    expect(toKannadaDigits('2026-11-10')).toBe('೨೦೨೬-೧೧-೧೦');
    expect(toWesternDigits('೨೦೨೬')).toBe('2026');
  });
});
