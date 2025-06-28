import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  // Multiple entry points for different parts of the extension
  entry: {
    popup: './src/popup.ts',
    url_extractor: './src/url_extractor.ts',
    // Add background script when you create it
    // background: './src/background.ts',
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  output: {
    filename: '[name].js', // This creates popup.js, url_extractor.js, etc.
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Clean dist folder before each build
  },

  mode: 'development', // Use 'production' for final builds

  // Source maps for easier debugging
  devtool: 'cheap-module-source-map',

  // Optimize for web extension environment
  target: 'web',
  
  // Disable some webpack features that don't work well in extensions
  optimization: {
    splitChunks: false, // Don't split chunks - extensions need single files
  },

  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/manifest.json', to: 'manifest.json' },
        { from: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'), to: 'pdf.worker.js' },
      ],
    }),
    new HtmlWebpackPlugin({
      template: 'src/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
  ]
};
