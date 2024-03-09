module.exports = {
  '*.ts': [
    'gts lint',
    'jest --verbose --findRelatedTests --passWithNoTests',
  ],
  'package.json': 'fixpack',
}
