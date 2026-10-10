import test from 'node:test';
import assert from 'node:assert/strict';
import messages from '../src/i18n/messages.json' with { type: 'json' };
import { setLanguage, tr, trHtml, translatedLabel } from '../src/i18n/index.ts';
import { escapeHtml } from '../src/utils/sanitize.ts';

const symbolLabels = [
  ['View Diary &rarr;', 'View Diary →', 'ดูบันทึก →'],
  ['&times;', '×', '×'],
  ['{0}kg &times;', '12kg ×', '12 กก. ×'],
  ['&bull; Barcode: {0}', '• Barcode: 12', '• บาร์โค้ด: 12'],
  ['Set Portion &rarr;', 'Set Portion →', 'กำหนดปริมาณ →'],
  ['&bull; {0}', '• 12', '• 12'],
  ['kg &times;', 'kg ×', 'กก. ×'],
  ['Epley Formula: w &times; (1 + r/30)', 'Epley Formula: w × (1 + r/30)', 'สูตรเอปลีย์: น้ำหนัก × (1 + จำนวนครั้ง/30)'],
  ['{0}k &times;', '12k ×', '12 พัน ×'],
  ['g Protein • Tap for Details &rarr;', 'g Protein • Tap for Details →', 'กรัมโปรตีน • แตะเพื่อดูรายละเอียด →'],
  ['&ndash;', '–', '–'],
  ['{0} kg &times;', '12 kg ×', '12 กก. ×'],
] as const;

for (const language of ['en', 'th'] as const) {
  test(`app-owned symbols render correctly in ${language} using existing lookup keys`, () => {
    setLanguage(language);
    for (const [key, en, th] of symbolLabels) {
      const expected = language === 'en' ? en : th;
      assert.equal(tr(key, 12), expected);
      assert.equal(trHtml(key, 12), escapeHtml(expected));
    }
  });

  test(`corrected labels preserve previous template lookups in ${language}`, () => {
    setLanguage(language);
    assert.equal(translatedLabel('12kg &times;'), language === 'en' ? '12kg ×' : '12 กก. ×');
    assert.equal(translatedLabel('12kg ×'), language === 'en' ? '12kg ×' : '12 กก. ×');
    assert.equal(translatedLabel('View Diary &rarr;'), language === 'en' ? 'View Diary →' : 'ดูบันทึก →');
  });

  test(`HTML rendering still escapes interpolated content in ${language}`, () => {
    setLanguage(language);
    const input = '<img src=x onerror="alert(1)"> &rarr; &lt;script&gt; \'quoted\'';
    assert.equal(trHtml('&bull; {0}', input), `• ${escapeHtml(input)}`);
    assert.equal(trHtml('Unregistered {0}', input), `Unregistered ${escapeHtml(input)}`);
    assert.equal(trHtml('&rarr; &lt;script&gt;'), '&amp;rarr; &amp;lt;script&amp;gt;');
    assert.equal(translatedLabel(input), input);
  });
}

test('display translation values use literal symbols instead of HTML entities', () => {
  for (const [key, entry] of Object.entries(messages)) {
    for (const [language, text] of Object.entries(entry)) {
      assert.doesNotMatch(text, /&(?:[a-zA-Z]+|#\d+|#x[\da-fA-F]+);/, `${language}: ${key}`);
    }
  }
});
