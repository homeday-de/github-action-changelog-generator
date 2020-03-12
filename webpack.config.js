const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  target: 'node',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'lib'),
  },
};