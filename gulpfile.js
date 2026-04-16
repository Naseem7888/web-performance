const { src, dest, series, parallel, watch } = require('gulp');
const browserSync = require('browser-sync').create();
const del = require('del');
const cleanCSS = require('gulp-clean-css');
const htmlmin = require('gulp-htmlmin');
const gulpIf = require('gulp-if');
const imagemin = require('gulp-imagemin');
const svgo = require('gulp-svgo');
const terser = require('gulp-terser');
const useref = require('gulp-useref');
const size = require('gulp-size');
const fs = require('fs');
const path = require('path');

const ASSET_PATH = process.env.ASSET_PATH || '/'; // Configure server path for assets
const paths = {
  html: ['*.html'],
  images: ['logo.png', 'WHY Q LOGO.png'],
  svg: ['*.svg', 'images/**/*.svg'],
  fonts: ['fonts/**/*.{ttf,otf}'],
  dist: 'dist'
};

function clean() {
  return del([paths.dist]);
}

// Enhanced CSS minification with comprehensive options
function css() {
  return src(['style.css', 'theme.css'])
    .pipe(cleanCSS({
      level: 2,
      format: 'beautify',
      compatibility: '*'
    }))
    .pipe(size({ title: 'CSS minified:', showFiles: true }))
    .pipe(dest(paths.dist));
}

// SVG optimization
function svgOptimize() {
  return src(paths.svg, { allowEmpty: true })
    .pipe(svgo({
      multipass: true,
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              removeViewBox: false,
              removeTitle: true,
              removeDesc: true,
              cleanupEnableBackground: true
            }
          }
        }
      ]
    }))
    .pipe(size({ title: 'SVG optimized:', showFiles: true }))
    .pipe(dest(paths.dist));
}

// Copy fonts for subsetting-ready deployment
function fonts() {
  return src(paths.fonts, { allowEmpty: true })
    .pipe(dest(path.join(paths.dist, 'fonts')));
}

// HTML processing with asset path replacement
function html() {
  return src(paths.html)
    .pipe(useref({ searchPath: '.' }))
    .pipe(gulpIf(/\.css$/, cleanCSS({ 
      level: 2,
      rebaseTo: paths.dist,
      format: 'beautify'
    })))
    .pipe(gulpIf(/\.js$/, terser({
      compress: {
        drop_console: true,
        passes: 2
      },
      mangle: true
    })))
    .pipe(gulpIf(/\.html$/, htmlmin({ 
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(size({ title: 'HTML optimized:', showFiles: true }))
    .pipe(dest(paths.dist));
}

// Image optimization
function images() {
  return src(paths.images, { allowEmpty: true })
    .pipe(imagemin([
      imagemin.mozjpeg({ quality: 80, progressive: true }),
      imagemin.optipng({ optimizationLevel: 3 }),
      imagemin.gifsicle({ interlaced: true })
    ]))
    .pipe(size({ title: 'Images optimized:', showFiles: true }))
    .pipe(dest(paths.dist));
}

// Generate service worker
function generateServiceWorker() {
  const swContent = `
const CACHE_NAME = 'why-q-v1';
const ASSETS_TO_CACHE = [
  '${ASSET_PATH}',
  '${ASSET_PATH}index.html',
  '${ASSET_PATH}css/site.min.css',
  '${ASSET_PATH}js/site.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network first for HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Cache first for assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });
        return response;
      });
    })
  );
});
`;

  return new Promise((resolve, reject) => {
    fs.writeFile(
      path.join(paths.dist, 'sw.js'),
      swContent,
      (err) => {
        if (err) reject(err);
        console.log('✓ Service Worker generated');
        resolve();
      }
    );
  });
}

// Create asset manifest for server-side asset delivery
function createAssetManifest() {
  const manifest = {
    assetPath: ASSET_PATH,
    timestamp: new Date().toISOString(),
    assets: {
      styles: [
        `${ASSET_PATH}css/site.min.css`
      ],
      scripts: [
        `${ASSET_PATH}js/site.min.js`
      ],
      fonts: [
        // Add your font files here after subsetting
      ],
      images: [
        `${ASSET_PATH}WHY%20Q%20LOGO.png`,
        `${ASSET_PATH}logo.png`
      ]
    }
  };

  return new Promise((resolve, reject) => {
    fs.writeFile(
      path.join(paths.dist, 'assets-manifest.json'),
      JSON.stringify(manifest, null, 2),
      (err) => {
        if (err) reject(err);
        console.log('✓ Asset manifest generated');
        resolve();
      }
    );
  });
}

// Create font subsetting configuration file
function createFontConfig() {
  const fontConfig = {
    description: 'Font subsetting configuration',
    fonts: [
      {
        name: 'segoe-ui',
        source: 'fonts/segoe-ui.ttf',
        subsets: {
          latin: {
            glyphs: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.,;:\'"',
            target: 'fonts/segoe-ui-latin.woff2'
          }
        }
      }
    ],
    instruction: 'Run: npx glyphhanger --formats=woff2 --subset=latin fonts/*.ttf'
  };

  return new Promise((resolve, reject) => {
    fs.writeFile(
      path.join(paths.dist, 'font-config.json'),
      JSON.stringify(fontConfig, null, 2),
      (err) => {
        if (err) reject(err);
        console.log('✓ Font subsetting config generated');
        resolve();
      }
    );
  });
}

function reload(done) {
  browserSync.reload();
  done();
}

function serve(done) {
  browserSync.init({
    server: {
      baseDir: '.',
      routes: {
        '/': './'
      }
    },
    notify: false,
    open: false
  });
  done();
}

function watchFiles() {
  watch(paths.html, reload);
  watch(['style.css', 'theme.css', 'scripts/**/*.js'], reload);
  watch(paths.images, reload);
  watch(paths.svg, reload);
}

exports.clean = clean;
exports.css = css;
exports.svg = svgOptimize;
exports.fonts = fonts;
exports.html = html;
exports.images = images;
exports.build = series(
  clean,
  parallel(html, images, svgOptimize, fonts),
  generateServiceWorker,
  createAssetManifest,
  createFontConfig
);
exports.serve = series(serve, watchFiles);
exports.default = exports.serve;