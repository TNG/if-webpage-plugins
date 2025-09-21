module.exports = {
  '*.ts': [
    'npm run lint',
    'npm run test:unit:ci',
  ],
  '{src/**/*.ts,vitest.config.ts}': () => 'npm run typecheck', // use function syntax to avoid file paths being passed to tsc. There were occasions when that broke the command.
  'package.json': 'npm run fix:package',
}
