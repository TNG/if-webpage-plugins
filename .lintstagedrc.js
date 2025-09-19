module.exports = {
  '*.ts': [
    'gts lint',
    'npm run test:pre-commit',
  ],
  'package.json': 'fixpack',
}
