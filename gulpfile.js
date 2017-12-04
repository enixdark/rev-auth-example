'use strict';
var
  autoprefixer = require('autoprefixer'),
  buffer = require('vinyl-buffer'),
  cache = require('gulp-cached'),
  concat = require('gulp-concat'),
  crypto = require('crypto'),
  csso = require('postcss-csso'),
  debug = require('gulp-debug'),
  del = require('del'),
  eslint = require('gulp-eslint'),
  filter = require('gulp-filter'),
  fs = require('fs'),
  gulp = require('gulp'),
  gutil = require('gulp-util'),
  imagemin = require('gulp-imagemin'),
  lazypipe = require('lazypipe'),
  livereload = require('gulp-livereload'),
  merge = require('merge-stream'),
  path = require('path'),
  postcss = require('gulp-postcss'),
  remember = require('gulp-remember'),
  rev = require('gulp-rev'),
  revReplace = require('gulp-rev-replace'),
  sass = require('gulp-sass'),
  source = require('vinyl-source-stream'),
  sourcemaps = require('gulp-sourcemaps'),
  through = require('through2'),
  watch = require('gulp-watch'),
  webpack = require('webpack'),
  UglifyJSPlugin  = require('uglifyjs-webpack-plugin');

var config = require('./gulpconfig'),
    paths = config.paths;

var OPTIMIZE = config.optimize;

var filterCache = function(name, opt) {
  return cache(name, opt);
};

var watchCache = function(watcher, name) {
  watcher.on('change', function(evt) {
    if (evt.type == 'deleted') {
      delete cache.caches[name][evt.path];
    }
  });
};

var defaultErrorHandler = function(err) {
  gutil.log(gutil.colors.red('Error'), err.message);
  this.emit('end');
};

var trapErrors = function(stream, handler) {
  if (OPTIMIZE) {
    return stream;
  }
  handler = handler || defaultErrorHandler;
  return stream.on('error', handler);
};

var startSourceMap = function(opts) {
  return !OPTIMIZE ? sourcemaps.init(opts) : gutil.noop();
};

var writeSourceMap = function(opts) {
  return !OPTIMIZE ? sourcemaps.write(opts) : gutil.noop();
};

gulp.task('eslint', function() {
  return gulp.src(paths.src.scripts + '/**/*.js')
    .pipe(filterCache('eslint'))
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failOnError());
});

gulp.task('sass', ['clean-manifest'], function() {
  var c = config.sass;
  var processors = [
    autoprefixer({
      browsers: [
        'last 2 versions',
        '> 5%',
        'iOS >= 6',
        'ie >= 9',
      ],
    }),
  ];
  if (OPTIMIZE) {
    processors.push(csso());
  }
  var buildThis = function(bundleKey) {
    var bundleConfig = c.bundles[bundleKey];
    return gulp.src(bundleConfig.src)
      .pipe(startSourceMap())
      .pipe(sass()).on('error', sass.logError)
      .pipe(postcss(processors))
      .pipe(concat(bundleKey + '.css'))
      .pipe(writeSourceMap())
      .pipe(gulp.dest(c.dest));
  };
  return merge.apply(this, Object.keys(c.bundles).map(buildThis));
});

// Disabled eslint ['clean-manifest', 'eslint']
gulp.task('webpack', ['clean-manifest'], function(cb) {
  var c = config.webpack;
  var plugins = (c.plugins || []).slice();
  if (OPTIMIZE) {
    plugins.push(
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      new UglifyJSPlugin({
        compress: true,
      })
      // new webpack.optimize.DedupePlugin()
    );
  } else {
      plugins.push(
          new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('development')
          })
      );
  }
  webpack({
    context: paths.src.scripts,
    entry: c.entries,
    output: {
      path: paths.dist.js,
      filename: '[name].js',
    },
    // resolve: {
    //   root: c.searchPath,
    //   alias: c.aliases,
    // },
    plugins: plugins,
    module: {
      loaders: [
        {
          test: /\.js$/,
          include: paths.src_root,
          loader: 'babel-loader',
          query: {
            presets: ["es2015", "stage-0"],
            plugins: ['transform-runtime'],
          },
          exclude: /node_modules/
        },
      ],
    },
    devtool: OPTIMIZE ? "" : 'cheap-module-inline-source-map',
  }, function(err, stats) {
    if (err) throw new gutil.PluginError('webpack', err);

    var jsonStats = stats.toJson();
    if (stats.hasErrors) {
      jsonStats.errors.forEach(function (e) {
        gutil.log(e);
      });
    }
    if (stats.hasWarnings) {
      jsonStats.warnings.forEach(function (e) {
        gutil.log(e);
      });
    }
    cb();
  });
});

gulp.task('scripts', ['webpack']);

gulp.task('styles', ['sass']);

gulp.task('media', ['clean-manifest'], function() {
  var c = config.media;
  return gulp.src(c.src)
    .pipe(filterCache('media'))
    .pipe(OPTIMIZE ? imagemin() : gutil.noop())
    .pipe(gulp.dest(c.dest));
});

gulp.task('fonts', ['clean-manifest'], function() {
  var c = config.fonts;
  return gulp.src(c.src)
    .pipe(filterCache('fonts'))
    .pipe(gulp.dest(c.dest));
});

gulp.task('clean-manifest', function() {
  return del([
    path.join(config.manifest.dest, config.manifest.jsonOutputName),
    path.join(config.manifest.dest, config.manifest.jsOutputName),
  ], {force: true});
});

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

gulp.task('manifest', ['clean-manifest', 'media', 'fonts', 'styles', 'scripts'], function() {
  var c = config.manifest;
  var manifestStream = gulp.src(c.src)
    .pipe(rev())
    .pipe(rev.manifest(c.jsonOutputName))
    // inject the manifest.js mapping into the manifest.json and
    // write out manifest.js
    .pipe(through.obj(function patchManifest(origFile, enc, cb) {
      var jsPath = c.jsOutputName;
      var jsPathExt = path.extname(jsPath);
      var jsPathNoExt = path.join(path.dirname(jsPath), path.basename(jsPath, jsPathExt));
      var rawManifest = origFile.contents.toString();
      var jsRawManifest = 'window.STATIC_ASSET_MANIFEST = ' + rawManifest + ';';

      var origManifest = JSON.parse(rawManifest);
      origManifest[jsPath] = jsPathNoExt + '-' + md5(jsRawManifest).slice(0, 10) + jsPathExt;
      origFile.contents = new Buffer(JSON.stringify(origManifest, null, '    '));
      this.push(origFile);

      fs.writeFile(path.join(c.dest, c.jsOutputName), jsRawManifest, cb);
    }))
    .pipe(gulp.dest(c.dest));

  return gulp.src(paths.dist.css + '/**', {base: c.dest})
    .pipe(revReplace({manifest: manifestStream}))
    .pipe(gulp.dest(c.dest));
});

if (!OPTIMIZE) {
gulp.task('watch', ['build'], function() {
  var c = config.livereload;
  livereload.listen({host: c.host || '127.0.0.1', port: c.port});

  watch([paths.dist_root + '/**/*'])
    .on('change', livereload.changed)
    .on('add', livereload.changed);
  watch(paths.templates)
    .on('change', livereload.changed)
    .on('add', livereload.changed);

  watch(paths.src.styles + '/**/*', function() {
    gulp.start('styles');
  });
  var watcher = watch(paths.src.scripts + '/**/*', function() {
    gulp.start('scripts');
  });
  watchCache(watcher, 'eslint');

  watch(config.fonts.src, function() {
    gulp.start('fonts');
  });
  watch(config.media.src, function() {
    gulp.start('media');
  });
});
}

gulp.task('clean', ['clean-manifest'], function () {
  return del([paths.dist_root, '.sass-cache', '.tmp'], {force: true});
});

var DEFAULT_BUILD_TASKS = ['fonts', 'media', 'styles', 'scripts'];
if (OPTIMIZE) {
    DEFAULT_BUILD_TASKS.push('manifest');
}

gulp.task('build', DEFAULT_BUILD_TASKS);

gulp.task('default', ['build']);
