'use strict';

let path = require('path');
let ExtractTextPlugin = require('extract-text-webpack-plugin');
let CopyWebpackPlugin = require('copy-webpack-plugin');

let loaders = [
  {
    test: /\.(png|jpg)$/,
    loader: 'url-loader',
    query: { mimetype: 'image/png' }
  },
  {
    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'url-loader?limit=10000&minetype=application/font-woff'
  },
  {
    test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'file-loader'
  },
  {
    test: /\.s[ac]ss$/,
    loader: ExtractTextPlugin.extract('style', 'css!sass')
  },
  {
    test: /\.jade$/,
    loader: 'jade-loader'
  },
  {
    test: /\.json$/,
    loader: 'json-loader'
  }
];

module.exports = [{
  entry: 'static/entry.js',
  output: {
    path: path.join(__dirname, 'public'),
    filename: 'js/app.js'
  },
  debug: true,
  devtool: 'inline-source-map',
  module: {
    loaders: loaders
  },
  plugins: [
    new ExtractTextPlugin('css/[name].css'),
    new CopyWebpackPlugin([
      // From root img to dist img
      { from: 'img', to: 'img' },
      { from: 'netflix/img', to: 'img/netflix' },
      { from: 'sdna/img', to: 'img/sdna' },
      // SourceDNA data
      { from: 'sdna/data', to: 'data'}
    ])
  ]
}];
