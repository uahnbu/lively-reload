//@ts-check

'use strict';

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

/**@type {import('webpack').Configuration}*/
module.exports = [
  {
    target: 'web',
    entry: './src/client',
    output: {
      path: path.resolve(__dirname, 'out/assets'),
      filename: 'index.js',
      libraryTarget: 'umd',
    },
    devtool: false,
    resolve: {
      extensions: ['.ts']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              projectReferences: true,
              happyPackMode: true
            }
          },
        }
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          diagnosticOptions: {
            semantic: true,
            syntactic: true,
          },
        },
      }),
      new HtmlWebpackPlugin({
        template: './src/client/index.html',
        filename: './index.html',
        inject: false
      })
    ]
  },
  {
    target: 'node',
    entry: './src/extension',
    output: {
      path: path.resolve(__dirname, 'out'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
      devtoolModuleFilenameTemplate: '../[resource-path]'
    },
    node: {
      __dirname: false
    },
    devtool: 'eval',
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                happyPackMode: true
              }
            }
          ]
        },
        {
          test: /\.node$/,
          use: [
            {
              loader: 'node-loader'
            }
          ]
        }
      ]
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          diagnosticOptions: {
            semantic: true,
            syntactic: true,
          },
        },
      })
    ]
  }
];