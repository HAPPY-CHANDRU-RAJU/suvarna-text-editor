import type { MessageKey } from '@/i18n/strings';
import { toKannadaDigits } from '@/lib/kannada/transliterate';

export interface Template {
  id: string;
  nameKey: MessageKey;
  /** Title given to the new document. */
  title: string;
  html: () => string;
}

const today = () => {
  const d = new Date();
  return toKannadaDigits(`${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`);
};

export const TEMPLATES: Template[] = [
  {
    id: 'letter',
    nameKey: 'tpl.letter',
    title: 'ಅಧಿಕೃತ ಪತ್ರ',
    html: () => `
<p style="text-align: right">ದಿನಾಂಕ: ${today()}</p>
<p style="text-align: right">ಸ್ಥಳ: ಬೆಂಗಳೂರು</p>
<p><strong>ಇವರಿಂದ,</strong><br>ನಿಮ್ಮ ಹೆಸರು<br>ವಿಳಾಸ<br>ದೂರವಾಣಿ</p>
<p><strong>ಇವರಿಗೆ,</strong><br>ಸ್ವೀಕರಿಸುವವರ ಹೆಸರು<br>ಹುದ್ದೆ<br>ಸಂಸ್ಥೆ ಮತ್ತು ವಿಳಾಸ</p>
<p><strong>ವಿಷಯ:</strong> ಪತ್ರದ ವಿಷಯವನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ.</p>
<p>ಮಾನ್ಯರೇ,</p>
<p style="text-align: justify">ಮೇಲ್ಕಂಡ ವಿಷಯಕ್ಕೆ ಸಂಬಂಧಿಸಿದಂತೆ ತಮ್ಮಲ್ಲಿ ವಿನಂತಿಸಿಕೊಳ್ಳುವುದೇನೆಂದರೆ, ಪತ್ರದ ಮುಖ್ಯ ವಿಷಯವನ್ನು ಇಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ಬರೆಯಿರಿ.</p>
<p style="text-align: justify">ಈ ವಿಷಯವನ್ನು ಪರಿಗಣಿಸಿ ಸೂಕ್ತ ಕ್ರಮ ಕೈಗೊಳ್ಳಬೇಕೆಂದು ಕೋರುತ್ತೇನೆ.</p>
<p>ಧನ್ಯವಾದಗಳೊಂದಿಗೆ,</p>
<p>ತಮ್ಮ ವಿಶ್ವಾಸಿ,<br><br>(ಸಹಿ)<br>ನಿಮ್ಮ ಹೆಸರು</p>`,
  },
  {
    id: 'application',
    nameKey: 'tpl.application',
    title: 'ರಜೆ ಅರ್ಜಿ',
    html: () => `
<p>ಇವರಿಗೆ,<br>ಮುಖ್ಯೋಪಾಧ್ಯಾಯರು / ವ್ಯವಸ್ಥಾಪಕರು<br>ಸಂಸ್ಥೆಯ ಹೆಸರು<br>ಊರು</p>
<p><strong>ವಿಷಯ:</strong> ರಜೆ ಮಂಜೂರು ಮಾಡುವ ಬಗ್ಗೆ ಮನವಿ.</p>
<p>ಮಾನ್ಯರೇ,</p>
<p style="text-align: justify">ನಾನು ನಿಮ್ಮ ಸಂಸ್ಥೆಯಲ್ಲಿ ವಿಭಾಗದ ಹೆಸರು ವಿಭಾಗದಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆ. ಕಾರಣವನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ ಆದ್ದರಿಂದ ದಿನಾಂಕ ____ ರಿಂದ ____ ರವರೆಗೆ ರಜೆ ಮಂಜೂರು ಮಾಡಬೇಕೆಂದು ವಿನಂತಿಸುತ್ತೇನೆ.</p>
<p>ತಮ್ಮ ವಿಶ್ವಾಸಿ,<br>ಹೆಸರು<br>ದಿನಾಂಕ: ${today()}</p>`,
  },
  {
    id: 'resume',
    nameKey: 'tpl.resume',
    title: 'ಸ್ವವಿವರ',
    html: () => `
<h1 style="text-align: center">ನಿಮ್ಮ ಹೆಸರು</h1>
<p style="text-align: center">ಇಮೇಲ್ · ದೂರವಾಣಿ · ಊರು</p>
<hr>
<h2>ವೃತ್ತಿ ಗುರಿ</h2>
<p style="text-align: justify">ನಿಮ್ಮ ವೃತ್ತಿ ಗುರಿಯನ್ನು ಎರಡು ಮೂರು ವಾಕ್ಯಗಳಲ್ಲಿ ಬರೆಯಿರಿ.</p>
<h2>ಶಿಕ್ಷಣ</h2>
<table><tbody>
<tr><th><p>ಪದವಿ</p></th><th><p>ಸಂಸ್ಥೆ</p></th><th><p>ವರ್ಷ</p></th><th><p>ಫಲಿತಾಂಶ</p></th></tr>
<tr><td><p>ಬಿ.ಎ.</p></td><td><p>ಕಾಲೇಜಿನ ಹೆಸರು</p></td><td><p>೨೦೨೪</p></td><td><p>ಪ್ರಥಮ ದರ್ಜೆ</p></td></tr>
</tbody></table>
<h2>ಅನುಭವ</h2>
<ul><li><p><strong>ಹುದ್ದೆ</strong> — ಸಂಸ್ಥೆ (ವರ್ಷ)</p></li><li><p>ಮುಖ್ಯ ಸಾಧನೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ</p></li></ul>
<h2>ಕೌಶಲಗಳು</h2>
<ul><li><p>ಕನ್ನಡ, ಇಂಗ್ಲಿಷ್ ಭಾಷಾ ಪ್ರಾವೀಣ್ಯ</p></li><li><p>ಗಣಕಯಂತ್ರ ಜ್ಞಾನ</p></li></ul>`,
  },
  {
    id: 'report',
    nameKey: 'tpl.report',
    title: 'ವರದಿ',
    html: () => `
<h1 style="text-align: center">ವರದಿಯ ಶೀರ್ಷಿಕೆ</h1>
<p style="text-align: center">ಸಿದ್ಧಪಡಿಸಿದವರು: ಹೆಸರು · ದಿನಾಂಕ: ${today()}</p>
<h2>೧. ಪೀಠಿಕೆ</h2>
<p style="text-align: justify">ವರದಿಯ ಉದ್ದೇಶ ಮತ್ತು ಹಿನ್ನೆಲೆಯನ್ನು ಇಲ್ಲಿ ವಿವರಿಸಿ.</p>
<h2>೨. ಮುಖ್ಯ ಅಂಶಗಳು</h2>
<ol><li><p>ಮೊದಲ ಅಂಶ</p></li><li><p>ಎರಡನೇ ಅಂಶ</p></li><li><p>ಮೂರನೇ ಅಂಶ</p></li></ol>
<h2>೩. ವಿಶ್ಲೇಷಣೆ</h2>
<p style="text-align: justify">ಸಂಗ್ರಹಿಸಿದ ಮಾಹಿತಿಯ ವಿಶ್ಲೇಷಣೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ.</p>
<h2>೪. ತೀರ್ಮಾನ ಮತ್ತು ಶಿಫಾರಸುಗಳು</h2>
<p style="text-align: justify">ತೀರ್ಮಾನ ಮತ್ತು ಮುಂದಿನ ಕ್ರಮಗಳನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ.</p>`,
  },
  {
    id: 'minutes',
    nameKey: 'tpl.minutes',
    title: 'ಸಭೆಯ ನಡಾವಳಿ',
    html: () => `
<h1 style="text-align: center">ಸಭೆಯ ನಡಾವಳಿ</h1>
<p><strong>ದಿನಾಂಕ:</strong> ${today()} &nbsp; <strong>ಸಮಯ:</strong> ಬೆಳಿಗ್ಗೆ ೧೦:೦೦ &nbsp; <strong>ಸ್ಥಳ:</strong> ಸಭಾಂಗಣ</p>
<p><strong>ಅಧ್ಯಕ್ಷತೆ:</strong> ಹೆಸರು</p>
<p><strong>ಹಾಜರಿದ್ದವರು:</strong> ಹೆಸರುಗಳು</p>
<h2>ಕಾರ್ಯಸೂಚಿ</h2>
<ol><li><p>ಹಿಂದಿನ ಸಭೆಯ ನಡಾವಳಿ ಅನುಮೋದನೆ</p></li><li><p>ಮುಖ್ಯ ವಿಷಯ</p></li><li><p>ಇತರ ವಿಷಯಗಳು</p></li></ol>
<h2>ತೀರ್ಮಾನಗಳು</h2>
<table><tbody>
<tr><th><p>ಕ್ರ.ಸಂ.</p></th><th><p>ತೀರ್ಮಾನ</p></th><th><p>ಜವಾಬ್ದಾರಿ</p></th><th><p>ಗಡುವು</p></th></tr>
<tr><td><p>೧</p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>
<tr><td><p>೨</p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>
</tbody></table>
<p>ಸಭೆಯು ವಂದನಾರ್ಪಣೆಯೊಂದಿಗೆ ಮುಕ್ತಾಯವಾಯಿತು.</p>`,
  },
  {
    id: 'invitation',
    nameKey: 'tpl.invitation',
    title: 'ಆಮಂತ್ರಣ ಪತ್ರಿಕೆ',
    html: () => `
<p style="text-align: center">॥ ಶ್ರೀ ॥</p>
<h1 style="text-align: center">ಆಮಂತ್ರಣ</h1>
<p style="text-align: center">ಆತ್ಮೀಯರೇ,</p>
<p style="text-align: center">ನಮ್ಮ ಮನೆಯಲ್ಲಿ ನಡೆಯಲಿರುವ <strong>ಕಾರ್ಯಕ್ರಮದ ಹೆಸರು</strong> ಸಮಾರಂಭಕ್ಕೆ ತಾವು ಕುಟುಂಬ ಸಮೇತರಾಗಿ ಆಗಮಿಸಿ, ಶುಭ ಹಾರೈಸಬೇಕೆಂದು ಆದರದಿಂದ ಆಮಂತ್ರಿಸುತ್ತೇವೆ.</p>
<p style="text-align: center"><strong>ದಿನಾಂಕ:</strong> ____ &nbsp; <strong>ಸಮಯ:</strong> ____</p>
<p style="text-align: center"><strong>ಸ್ಥಳ:</strong> ವಿಳಾಸ</p>
<p style="text-align: center">ತಮ್ಮ ಆಗಮನದ ನಿರೀಕ್ಷೆಯಲ್ಲಿ,<br>ಕುಟುಂಬದ ಹೆಸರು</p>`,
  },
];
