module.exports = {
  entryPoints: ['src/index.ts'],
  plugin: ['typedoc-plugin-markdown'],
  out: 'docs/typedoc-md',
  excludePrivate: true,
  excludeProtected: true,
  excludeInternal: false,
  readme: 'none'
};