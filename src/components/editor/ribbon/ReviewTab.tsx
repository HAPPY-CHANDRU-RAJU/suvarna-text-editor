import { BookA, CircleHelp, Languages, ListChecks, MessageSquarePlus, MessagesSquare, PlugZap, SpellCheck2, Sigma, WandSparkles } from 'lucide-react';
import { useI18n } from '@/i18n';
import { toKannadaDigits, toWesternDigits } from '@/lib/kannada/transliterate';
import { isTransliterating, transliterationState } from '@/editor/extensions/transliteration';
import { languageService, useLanguage } from '@/lib/language/service';
import { useEditorUi } from '../EditorContext';
import { RibbonButton, RibbonGroup, RibbonRows } from './controls';

export function ReviewTab() {
  const { editor, setPanel, panel, openDialog, startComment } = useEditorUi();
  const { t } = useI18n();
  const { settings } = useLanguage();
  const translit = isTransliterating(editor.state);
  const kannadaDigits = transliterationState(editor.state)?.kannadaDigits ?? false;

  const convertDigits = (fn: (s: string) => string) => {
    const { from, to, empty } = editor.state.selection;
    const range = empty ? { from: 0, to: editor.state.doc.content.size } : { from, to };
    const tr = editor.state.tr;
    editor.state.doc.nodesBetween(range.from, range.to, (node, pos) => {
      if (!node.isText || !node.text) return;
      const start = Math.max(pos, range.from);
      const end = Math.min(pos + node.nodeSize, range.to);
      const original = node.text.slice(start - pos, end - pos);
      const converted = fn(original);
      // Digit conversion keeps the same length, so positions stay valid.
      if (converted !== original) tr.insertText(converted, tr.mapping.map(start), tr.mapping.map(end));
    });
    if (tr.docChanged) editor.view.dispatch(tr);
    editor.commands.focus();
  };

  return (
    <>
      <RibbonGroup label={t('group.proofing')}>
        <RibbonButton size="large" icon={SpellCheck2} label={t('review.spelling')} shortcut="F7" active={panel === 'spelling'} onClick={() => setPanel(panel === 'spelling' ? null : 'spelling')} />
        <RibbonRows>
          <RibbonButton icon={ListChecks} label={t('review.checkDocument')} showLabel onClick={() => editor.commands.checkDocument()} />
          <RibbonButton icon={Sigma} label={t('review.wordCount')} showLabel onClick={() => openDialog('wordCount')} />
          <RibbonButton icon={BookA} label={t('review.thesaurus')} showLabel disabled={!languageService.canSuggestSynonyms()} onClick={() => setPanel('spelling')} />
        </RibbonRows>
      </RibbonGroup>

      <RibbonGroup label={t('group.kannada')}>
        <RibbonButton size="large" icon={Languages} label={t('review.transliteration')} shortcut="Alt+K" active={translit} onClick={() => editor.chain().focus().toggleTransliteration().run()} />
        <RibbonRows>
          <RibbonButton icon={WandSparkles} label={t('review.kannadaDigits')} showLabel active={kannadaDigits} onClick={() => editor.chain().focus().setKannadaDigits(!kannadaDigits).run()} />
          <RibbonButton icon={Sigma} label={t('review.toKannadaDigits')} showLabel onClick={() => convertDigits(toKannadaDigits)} />
          <RibbonButton icon={Sigma} label={t('review.toWesternDigits')} showLabel onClick={() => convertDigits(toWesternDigits)} />
        </RibbonRows>
        <RibbonButton size="large" icon={CircleHelp} label={t('dialog.translitHelp')} onClick={() => openDialog('translitHelp')} />
      </RibbonGroup>

      <RibbonGroup label={t('group.comments')}>
        <RibbonButton size="large" icon={MessageSquarePlus} label={t('review.newComment')} onClick={startComment} />
        <RibbonButton size="large" icon={MessagesSquare} label={t('review.comments')} active={panel === 'comments'} onClick={() => setPanel(panel === 'comments' ? null : 'comments')} />
      </RibbonGroup>

      <RibbonGroup label={t('review.languageServices')}>
        <RibbonButton size="large" icon={PlugZap} label={t('review.languageServices')} onClick={() => openDialog('language')} />
        <RibbonButton
          size="large"
          icon={WandSparkles}
          label={t('review.autoCorrect')}
          active={settings.autoCorrect}
          onClick={() => languageService.update({ autoCorrect: !settings.autoCorrect })}
        />
      </RibbonGroup>
    </>
  );
}
