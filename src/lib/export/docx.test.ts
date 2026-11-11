import { describe, expect, it } from 'vitest';
import { Packer } from 'docx';
import { DEFAULT_PAGE_SETTINGS } from '@/lib/document';
import { htmlToContent } from './import';
import { buildDocx, toHalfPoints, toHexColor } from './docx';

describe('docx helpers', () => {
  it('normalises colors', () => {
    expect(toHexColor('#abc')).toBe('AABBCC');
    expect(toHexColor('rgb(255, 0, 16)')).toBe('FF0010');
    expect(toHexColor('red')).toBeUndefined();
  });

  it('converts font sizes to half-points', () => {
    expect(toHalfPoints('14pt')).toBe(28);
    expect(toHalfPoints('16px')).toBe(24);
  });
});

describe('buildDocx', () => {
  it('produces a Word file with Kannada text, lists, tables and page breaks', async () => {
    const content = htmlToContent(`
      <h1>ಶೀರ್ಷಿಕೆ</h1>
      <p style="text-align: center"><strong>ದಪ್ಪ</strong> <em>ಓರೆ</em> <span style="color: #ff0000; font-size: 14pt; font-family: Tiro Kannada">ಕೆಂಪು</span></p>
      <ul><li><p>ಒಂದು</p><ul><li><p>ಒಳಗಿನದು</p></li></ul></li></ul>
      <ol><li><p>ಮೊದಲು</p></li></ol>
      <table><tbody><tr><th><p>ಹೆಸರು</p></th></tr><tr><td><p>ರಾಮ</p></td></tr></tbody></table>
      <div data-page-break></div>
      <p><a href="https://kn.wikipedia.org">ವಿಕಿಪೀಡಿಯ</a></p>
    `);
    const doc = await buildDocx(content, { ...DEFAULT_PAGE_SETTINGS, header: 'ಶಿರೋಲೇಖ' }, 'ಪರೀಕ್ಷೆ');
    const buffer = await Packer.toBuffer(doc);
    // A .docx is a zip archive.
    expect(buffer.subarray(0, 2).toString()).toBe('PK');

    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(buffer);
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('ಶೀರ್ಷಿಕೆ');
    expect(xml).toContain('w:cs="Tiro Kannada"');
    expect(xml).toContain('<w:br w:type="page"/>');
    expect(xml).toContain('w:tbl');
    const header = Object.keys(zip.files).find((f) => f.startsWith('word/header'));
    expect(await zip.file(header!)!.async('string')).toContain('ಶಿರೋಲೇಖ');
  });
});
