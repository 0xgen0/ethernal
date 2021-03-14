/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const Dotenv = require('dotenv-webpack');
const { ProvidePlugin, DefinePlugin } = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const SveltePreprocess = require('svelte-preprocess');

const outputPath = `${__dirname}/${process.env.BUILD_OUTPUT || 'dungeon-test/public'}`;
const useBabel = process.env.USE_BABEL === 'true';
const buildDate = Math.floor(Date.now() / 1000);

const env = process.env.ENV || 'dev';
console.log(`using ${env} environment`);

const environments = {
  prod: {
    assetEnv: 'alpha',
    contracts: './contracts/production.json',
    serverList: 'https://ethernal-list.prod.tmcloud.io',
    cache: 'https://ethernal.prod.tmcloud.io',
    mode: 'production',
    ethUrl: 'https://rpc-mumbai.matic.today',
    // blockExplorerUrl: 'https://explorer.matic.network//blocks', // <-- MAINNET
  },
  staging: {
    assetEnv: 'dev',
    contracts: './contracts/staging.json',
    serverList: 'https://181boa3ktb.execute-api.us-east-1.amazonaws.com/default/serverList-dev',
    cache: 'https://ethernal-be-alpha.herokuapp.com',
    mode: 'production',
    ethUrl: 'https://rpc-mumbai.matic.today',
  },
  dev: {
    // assetEnv: 'localhost',
    assetEnv: 'dev',
    contracts: './contracts/development.json',
    mode: 'development',
  },
};

const contractsPath = process.env.CONTRACTS_PATH || environments[env].contracts;
const contractsInfo = path.resolve(__dirname, contractsPath);
if (!fs.existsSync(contractsInfo)) {
  console.error(`${env} contracts info file doesn't exist: ${contractsInfo}`);
  process.exit();
}
console.log(`using ${contractsInfo} contracts`);

const serverList = process.env.SERVER_LIST || environments[env].serverList;
console.log(`using ${serverList} server list`);

const cacheApi = process.env.CACHE_API || environments[env].cache;
console.log(`using ${cacheApi || 'fallback'} cache api`);

const ethUrl = process.env.ETH_URL || environments[env].ethUrl;
console.log(`using ${ethUrl || 'fallback'} eth node`);

const assetEnv = process.env.ASSET_ENV || environments[env].assetEnv || 'alpha';
const blockExplorerUrl = process.env.BLOCK_EXPLORER_URL || environments[env].blockExplorerUrl || `https://mumbai-explorer.matic.today/blocks`;

const commit = process.env.COMMIT;
if (commit) {
  console.log(`tagging build with commit ${commit}`);
} else {
  console.log('not tagging build with commit');
}

const sentryDsn = process.env.SENTRY_DSN;
console.log('using sentry', sentryDsn);

const mode = process.env.MODE || environments[env].mode;
console.log(`using mode ${mode}`);

const rules = [
  useBabel && {
    test: /\.(js|mjs|svelte)$/,
    exclude: /node_modules\/(?!svelte)/,
    use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env'],
        // plugins: ['@babel/plugin-proposal-object-rest-spread']
      },
    },
  },
  {
    test: /\.svelte$/,
    // exclude: /node_modules/,
    use: {
      loader: 'svelte-loader',
      options: {
        emitCss: true,
        hotReload: true,
        preprocess: SveltePreprocess({ scss: true }),
      },
    },
  },
  {
    test: /\.svg$/,
    loader: 'svg-inline-loader',
    options: {
      removeSVGTagAttrs: true,
    },
  },
  {
    test: /\.(png|svg|jpg|gif)$/,
    use: ['file-loader'],
  },
  {
    test: /\.css$/,
    use: [
      /**
       * MiniCssExtractPlugin doesn't support HMR.
       * For developing, use 'style-loader' instead.
       * */
      mode === 'production' ? MiniCssExtractPlugin.loader : 'style-loader',
      'css-loader',
      'sass-loader',
    ],
  },
].filter(Boolean);

module.exports = {
  entry: {
    bundle: [useBabel && '@babel/polyfill', './src/main.js'].filter(Boolean),
  },
  resolve: {
    modules: ['src', 'node_modules'],
    extensions: ['.mjs', '.js', '.svelte'],
    alias: {
      fs: './src/lib/empty.js',
      contractsInfo,
      svelte: path.resolve('node_modules', 'svelte'),
    },
    mainFields: ['svelte', 'browser', 'module', 'main'],
  },
  output: {
    path: outputPath,
    publicPath: '/',
    filename: '[name]_[hash].js',
    chunkFilename: '[name]_[hash].[id].js',
  },
  module: {
    rules,
  },
  mode,
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name]_[hash].css',
    }),
    new Dotenv(),
    new ProvidePlugin({
      PIXI: 'pixi.js',
    }),
    new DefinePlugin({
      ASSET_ENV: JSON.stringify(assetEnv),
      BLOCK_EXPLORER_URL: JSON.stringify(blockExplorerUrl || ''),
      ENV: JSON.stringify(env || ''),
      MODE: JSON.stringify(mode || ''),
      BUILD_TIMESTAMP: buildDate,
      COMMIT: JSON.stringify(commit || ''),
      CACHE_API: JSON.stringify(cacheApi || ''),
      ETH_URL: JSON.stringify(ethUrl || ''),
      SENTRY_DSN: JSON.stringify(sentryDsn || ''),
      SERVER_LIST: JSON.stringify(serverList || ''),
    }),
    new HtmlWebpackPlugin({
      template: 'src/index.ejs',
      templateParameters: () => ({
        timestamp: buildDate,
        commit,
      }),
    }),
    new CopyPlugin({ patterns: [{ from: 'static', to: './' }] }),
  ],
  devtool: mode === 'production' ? 'cheap-source-map' : 'eval-cheap-module-source-map',
  node: false,
  devServer: {
    host: 'localhost',
    historyApiFallback: true,
    disableHostCheck: true,
  },
};
