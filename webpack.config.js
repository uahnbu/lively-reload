// @ts-nocheck

'use strict';

const CopyPlugin = require('copy-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');

/**@type {import('webpack').Configuration}*/
module.exports = [
  {
    target: 'web',
    context: path.resolve(__dirname, 'src/client'),
    entry: '.',
    output: {
      path: path.resolve(__dirname, 'out/static'),
      filename: 'script.js',
      libraryTarget: 'umd',
    },
    devtool: 'eval',
    resolve: {
      extensions: ['.ts', '.js']
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
        },
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
      new CopyPlugin({
        patterns: ['assets']
      })
    ]
  },
  {
    target: 'node',
    context: path.resolve(__dirname, 'src/core'),
    entry: './extension',
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
                projectReferences: true,
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
            syntactic: true
          },
        },
      })
    ]
  }
];