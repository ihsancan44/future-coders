import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { EditorView, Prec } from "@uiw/react-codemirror";

// Hazır temaların birkaç rengi zeminde WCAG AA kontrastına (4.5:1) ulaşmıyor
// (karanlıkta yorumlar, satır numaraları ve değişken adları, aydınlıkta f-string'ler); yalnızca onların rengi düzeltilir.
const lightFixes = HighlightStyle.define([{ tag: t.special(t.string), color: "#b33600" }]);
const darkFixes = HighlightStyle.define([
  { tag: [t.comment, t.meta], color: "#a3acbb" },
  { tag: t.keyword, color: "#d49be6" },
  { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: "#f08d95" },
]);

// Satır numaraları da aynı soluk gri: koyu zeminde biraz açılır.
const darkGutter = EditorView.theme({ ".cm-gutters": { color: "#a3acbb" } }, { dark: true });

/** Editör alanının ekran okuyucu etiketi ve okunur sözdizimi renkleri. */
export const editorA11y = (label, mode) => [
  EditorView.contentAttributes.of({ "aria-label": label }),
  Prec.highest(mode === "dark" ? [syntaxHighlighting(darkFixes), darkGutter] : syntaxHighlighting(lightFixes)),
];
