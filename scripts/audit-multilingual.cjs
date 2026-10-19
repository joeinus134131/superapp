/* Static multilingual audit for both clients. Run with pnpm audit:i18n. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../web/node_modules/typescript');
const root = path.resolve(__dirname, '..');
const errors = [];
const load = (file, name) => {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8').replace(`export const ${name} =`, `globalThis.value =`), context);
  return context.value;
};
const dictionaries = { web: load('web/lib/dictionaries.js', 'DICTIONARIES'), mobile: load('shared/lib/dictionaries.js', 'DICTIONARIES') };
const catalog = load('shared/lib/textCatalog.js', 'TEXT_CATALOG');
const catalogValues = new Set(Object.values(catalog));
const read = (object, key) => key.split('.').reduce((value, part) => value?.[part], object);
const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join(',');
function flatten(object, prefix = '', result = {}) {
  for (const [key, value] of Object.entries(object)) {
    if (value !== null && typeof value === 'object') flatten(value, `${prefix}${key}.`, result);
    else result[prefix + key] = value;
  }
  return result;
}
for (const [platform, dictionary] of Object.entries(dictionaries)) {
  const en = flatten(dictionary.en), id = flatten(dictionary.id);
  for (const key of new Set([...Object.keys(en), ...Object.keys(id)])) {
    if (typeof en[key] !== 'string' || typeof id[key] !== 'string') errors.push(`${platform}: missing translation ${key}`);
    else if (placeholders(en[key]) !== placeholders(id[key])) errors.push(`${platform}: placeholder mismatch ${key}`);
  }
}
for (const [id, en] of Object.entries(catalog)) {
  if (!en || placeholders(id) !== placeholders(en)) errors.push(`Catalog: invalid translation ${id}`);
}
// Brands, unit abbreviations, technical field identifiers, and language endonyms.
const invariantCopy = new Set(['Lv.', 'XP', 'PRO', 'PREMIUM', 'Emoji', 'ID:', '· Laya:', 'Input SHA-256:', 'Engine SHA-256:', 'min', 'MB', '• WhatsApp:', '• Email:', 'idnmakerspace@gmail.com', '&copy;', '🇮🇩 Indonesia (ID)', '🇬🇧 English (EN)', 'Whenya', 'whenya', 'Google', 'Apple', 'Indonesia', 'English', 'Enter', 'Esc', 'YYYY-MM-DD', 'Emoji &', 'min •', 'cal •', 'k XP', '⏱️ Pomodoro', '· confidence', 'PLAN • FOCUS • LIVE BETTER', 'Your life, in sync.', 'Cloud', 'Avatar']);
let files = 0, keyReferences = 0, copyReferences = 0;
function walk(directory, platform) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'assets', 'scratch', '__tests__', 'scripts'].includes(entry.name)) walk(path.join(directory, entry.name), platform);
      continue;
    }
    if (!/\.(js|tsx?|mts)$/.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
    const file = path.join(directory, entry.name), source = fs.readFileSync(file, 'utf8');
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.JSX);
    files++;
    const fail = (node, message) => errors.push(`${path.relative(root, file)}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}: ${message}`);
    function visit(node) {
      let key;
      if (ts.isCallExpression(node) && node.expression.getText(tree) === 't' && ts.isStringLiteral(node.arguments[0])) key = node.arguments[0].text;
      if (ts.isStringLiteral(node) && ts.isPropertyAssignment(node.parent) && /^(key|titleKey|descKey|labelKey|tipKey)$/.test(node.parent.name.getText(tree)) && /^[a-z]+\.[a-z0-9_]+$/.test(node.text)) key = node.text;
      if (key) {
        keyReferences++;
        for (const language of ['en', 'id']) if (read(dictionaries[platform][language], key) === undefined) fail(node, `Missing ${language} key ${key}`);
      }
      if (ts.isCallExpression(node) && node.expression.getText(tree) === 'translateCopy' && ts.isStringLiteral(node.arguments[0])) {
        copyReferences++;
        const text = node.arguments[0].text;
        if (!(text in catalog) && !catalogValues.has(text)) fail(node, `Missing catalog copy ${text}`);
      }
      if (ts.isStringLiteral(node) && ts.isJsxAttribute(node.parent) && ['title', 'subtitle', 'label', 'description', 'aria-label', 'accessibilityLabel', 'accessibilityHint'].includes(node.parent.name.getText(tree))) {
        const text = node.text.trim();
        if (/[A-Za-z]{2}/.test(text) && !invariantCopy.has(text)) fail(node, `Untranslated attribute copy ${JSON.stringify(text)}`);
      }
      if (ts.isJsxText(node)) {
        const text = node.text.trim().replace(/\s+/g, ' ');
        if (/[A-Za-z]{2}/.test(text) && !invariantCopy.has(text)) fail(node, `Untranslated JSX copy ${JSON.stringify(text)}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(tree);
  }
}
walk(path.join(root, 'web/app'), 'web');
walk(path.join(root, 'web/components'), 'web');
walk(path.join(root, 'web/lib'), 'web');
walk(path.join(root, 'mobile/app'), 'mobile');
walk(path.join(root, 'mobile/components'), 'mobile');
walk(path.join(root, 'mobile/lib'), 'mobile');
walk(path.join(root, 'shared/lib'), 'mobile');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Multilingual audit passed: ${files} files, ${keyReferences} key references, ${copyReferences} catalog references; EN/ID parity and placeholders verified.`);
