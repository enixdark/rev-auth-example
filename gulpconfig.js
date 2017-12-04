var path = require('path');
var webpack = require('webpack');

var src_root = __dirname + '/webpack';
var pkg_root = path.normalize(__dirname + '/public');
var dist_root = pkg_root;

var paths = {
  src_root: src_root,
  pkg_root: pkg_root,
  dist_root: dist_root,
  src: {
    scripts: src_root + '/scripts',
    styles: src_root + '/styles',
    fonts: src_root + '/fonts',
    media: src_root + '/images',
  },
  dist: {
    js: dist_root + '/js',
    css: dist_root + '/css',
    fonts: dist_root + '/fonts',
    media: dist_root + '/img',
  },
  vendor: src_root + '/vendor',
  templates: pkg_root + '/**/*.html',
};

var config = {
  optimize: process.env.NODE_ENV === 'production',
  // optimize: true,
  paths: paths,
  manifest: {
    src: dist_root + '/**/*',
    jsonOutputName: 'manifest.json',
    jsOutputName: 'js/manifest.js',
    dest: dist_root,
  },
  fonts: {
    src: [
      './node_modules/bootstrap/dist/fonts/*',
      './node_modules/font-awesome/fonts/*',
      paths.src.fonts + '/**/*.{eot,svg,ttf,woff,woff2,otf}',
    ],
    dest: paths.dist.fonts,
  },
  media: {
    src: [
      paths.src.media + '/**/*',
    ],
    dest: paths.dist.media,
  },
  webpack: {
    entries: {
      'common': paths.src.scripts + '/common.js',
      'script':paths.src.scripts + '/script.js',
    },
    aliases: {

    },
    plugins: [
      new webpack.optimize.CommonsChunkPlugin({
        name: "common",
        filename: "common.js"
      }),
      new webpack.ProvidePlugin({
          $: "jquery",
          jQuery: 'jquery',
          moment: "moment",
          R: "ramda"
      }),
    ],
  },
  livereload: {
    // if you change the port make sure to update it in the ini as well
    host: '0.0.0.0',
    port: 35780,
  },
  sass: {
    bundles: {
      'common': {
        src: paths.src.styles + '/common.scss',
      },
      'main': {
        src: paths.src.styles + '/main.scss',
      },
      'angular-tooltips': {
        src: paths.src.styles + '/angular-tooltips.scss',
      },
    },
    dest: paths.dist.css,
  },
};

module.exports = config;
