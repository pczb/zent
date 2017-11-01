const { resolve } = require('path');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const cp = require('child_process');

const webpackConfig = require('../webpack/webpack.dev.config.js');

const cmds = {
  wind32: 'start',
  linux: 'xdg-open',
  darwin: 'open'
};

let onceMark = !true;

const compiler = webpack(webpackConfig);

// compiler.apply(new DashboardPlugin({ port: 4396 }));

compiler.plugin('done', () => {
  if (onceMark) {
    cp.exec(`${cmds[process.platform]} http://127.0.0.1:4396`);
  }
  onceMark = false;
});

const server = new WebpackDevServer(compiler, {
  compress: true,
  contentBase: resolve(__dirname, 'dist'),
  disableHostCheck: true,
  historyApiFallback: true,
  hot: true,
  inline: true,
  publicPath: '/',
  quiet: true,
  stats: {
    colors: true
  }
});

server.listen(4396, '0.0.0.0', () => {
  // eslint-disable-next-line
  console.log('\n Starting server on http://localhost:4396 \n');
});
