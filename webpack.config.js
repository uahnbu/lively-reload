// @ts-nocheck

'use strict';

const CopyPlugin = require('copy-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');

/**@type {import('webpack').Configuration}*/
module.exports = [
  {
    target: 'web',
    entry: './src/client',
    output: {
      path: path.resolve(__dirname, 'out/static'),
      filename: 'lively_script.js',
      libraryTarget: 'umd',
    },
    devtool: false,
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
        patterns: [
          'src/client/index.lively-reload.html',
          { from: 'src/client/assets', to: 'lively_assets' }
        ]
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