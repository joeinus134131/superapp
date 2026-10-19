import { TEXT_CATALOG } from './textCatalog.js';

const englishToIndonesian = new Map(Object.entries(TEXT_CATALOG).map(([id, en]) => [en, id]));
const escapePattern = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.entries(TEXT_CATALOG).filter(([text]) => /\{\d+\}/.test(text)).map(([id, en]) => {
  const compile = (text) => new RegExp('^' + text.split(/\{\d+\}/).map(escapePattern).join('([\\s\\S]*?)') + '$');
  return { id, en, idPattern: compile(id), enPattern: compile(en) };
});

/** Translate application-owned copy only. Never pass user-entered content here. */
export function translateText(text, language = 'en', values = []) {
  if (typeof text !== 'string') return text;
  let translated = language === 'id' ? (englishToIndonesian.get(text) ?? text) : (TEXT_CATALOG[text] ?? text);
  // Older generated reminders and activity messages may already contain their values.
  if (translated === text && values.length === 0 && !(text in TEXT_CATALOG) && !englishToIndonesian.has(text)) {
    for (const template of templates) {
      const match = (language === 'id' ? template.enPattern : template.idPattern).exec(text);
      if (match) {
        translated = language === 'id' ? template.id : template.en;
        values = match.slice(1);
        break;
      }
    }
  }
  return translated.replace(/\{(\d+)\}/g, (match, index) => index < values.length ? String(values[index]) : match);
}

/** Resolve dotted keys, including arrays, with an English fallback. */
export function resolveTranslation(dictionaries, language, path) {
  const read = (dictionary) => path.split('.').reduce((value, key) => value?.[key], dictionary);
  return read(dictionaries[language]) ?? read(dictionaries.en) ?? path;
}
