var path = require('path');

module.exports = {
  entry: './src/virtual_content.ts',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ['babel-loader', 'ts-loader'],
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    filename: 'virtualcontent.js',
    library: 'VC',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
  },
};
