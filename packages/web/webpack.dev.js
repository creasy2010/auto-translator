const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const tsImportPluginFactory = require('ts-import-plugin');
const {EntriesPlugin, HtmlExtPlugin} = require('falcon-webpack');
const {version, line} = require('./package.json') || {};
module.exports = {
  entry: './src/index.tsx',
  devtool: 'cheap-module-source-map',
  output: {
    path: path.resolve(__dirname, '../server/public'),
    filename: 'bundle-[name]-[hash:5].js',
    chunkFilename: `bundle-[name]-[hash:5].js`,
  },
  module: {
    rules: [
      {
        test: /\.(tsx|ts)$/,
        exclude: /node_modules/,
        use: [
          'babel-loader',
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              getCustomTransformers: () => ({
                before: [
                  tsImportPluginFactory({
                    libraryName: 'antd',
                    libraryDirectory: 'es',
                    style: 'css',
                  }),
                ],
              }),
              compilerOptions: {
                module: 'es2015',
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader',
        }),
      },
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader!less-loader',
        }),
      },
      {test: /\.(png|gif)$/, loader: 'file-loader'},
    ],
  },
  resolve: {
    modules: [path.resolve(__dirname, 'src/web_modules'), 'node_modules'],
    extensions: ['.js', '.json', '.ts', '.tsx'],
    alias: {
      plume2: 'plume2/es5',
    },
  },
  plugins: [
    new ExtractTextPlugin({
      filename: 'bundle-[name]-[hash:5].css',
      disable: false,
      allChunks: true,
    }),
    new webpack.DefinePlugin({
      __DEBUG__: true,
      __DEV__: true,
      'process.env.NODE_ENV': JSON.stringify('env'),
    }),
    new HtmlExtPlugin({
      option: {
        env: '5', //.dev | 0,1,2,3,4,5 | null
      },
      context: __dirname,
      filename: ['./properties/config.json', './properties/bundles.json'],
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './index.ejs',
    }),
  ],
  // devServer: {
  //   port: 8080,
  //   disableHostCheck: true,
  // },
};
