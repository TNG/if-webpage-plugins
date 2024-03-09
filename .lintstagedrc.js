module.exports = {
  '*.ts': [
    'gts lint',
    'jest --verbose --findRelatedTests',
  ],
  'package.json': 'fixpack',
}
