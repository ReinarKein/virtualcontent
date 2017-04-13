var path    = require('path');
var webpack = require('webpack');

module.exports = {
  devtool : false,

  entry   : './src/virtual_content.js',

  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader" }
    ]
  },

  output: {
    filename      : 'virtualcontent.js',
    library       : "VC",
    libraryTarget : "umd",
    path          : path.resolve(__dirname, 'dist')
  },

  plugins:[
    new webpack.optimize.UglifyJsPlugin({
      mangle: {
        except: ["VirtualContent"]
      }
    })
  ]

};
