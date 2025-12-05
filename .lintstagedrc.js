module.exports = {
  '*.ts': [
    'pnpm run lint',
    'pnpm run test:ci',
  ],
  '{src/**/*.ts,vitest.config.ts}': () => 'pnpm run typecheck', // use function syntax to avoid file paths being passed to tsc. There were occasions when that broke the command.
  'package.json': 'pnpm run fix:package',
}
