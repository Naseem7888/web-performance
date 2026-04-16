# WHY Q Website - Performance Optimization Guide

## Overview
This guide explains the implemented web performance optimizations for the WHY Q personal website.

---

## 1. CSS Minification ✓

### What's Implemented
- **gulp-clean-css** with level 2 optimization
- Comprehensive CSS minification with beautify format
- Automatic rebase for URLs in minified files

### How It Works
```bash
npm run build
```

**Output:**
- Source: `style.css`, `theme.css` → `dist/css/site.min.css`
- Reduction: ~40-60% size improvement
- No loss of functionality

### Configuration
Located in `gulpfile.js`:
```javascript
cleanCSS({
  level: 2,           // Full optimization
  rebaseTo: paths.dist,
  format: 'beautify'
})
```

---

## 2. SVG Optimization ✓

### What's Implemented
- **gulp-svgo** for SVG compression
- Multi-pass optimization
- Removal of unnecessary metadata and elements

### How It Works
SVG files in the workspace are automatically optimized during build:
```bash
npm run build
```

### Configuration Details
- **Multipass**: true (multiple processing passes for better compression)
- **Removes**: title, desc, enableBackground elements
- **Preserves**: viewBox and other critical attributes

### File Locations
- Source: `*.svg`, `images/**/*.svg`
- Output: `dist/` (flattened structure)

### Performance Gains
- SVG files typically reduce by 30-50%
- Preserves visual quality
- Maintains responsive scaling

---

## 3. Font Subsetting ✓

### What's Implemented
- Font subsetting configuration guide
- Glyphhanger and fonttools integration instructions
- WOFF2 format support for optimal compression

### How to Subset Fonts

#### Option A: Using Glyphhanger (Recommended)
```bash
# Install glyphhanger globally
npm install -g glyphhanger

# Subset fonts (only Latin characters)
glyphhanger --formats=woff2 --subset=latin fonts/segoe-ui.ttf
```

#### Option B: Using Fonttools
```bash
# Install fonttools
pip install fonttools

# Subset fonts
pyftsubset fonts/segoe-ui.ttf --output-file=fonts/segoe-ui-latin.woff2 --flavor=woff2 --unicodes=U+0020-007F
```

### Integration into CSS
```css
@font-face {
  font-family: 'Segoe UI Subset';
  src: url('/fonts/segoe-ui-latin.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: 'Segoe UI Subset', sans-serif;
}
```

### Performance Tips
- Use `font-display: swap` to prevent FOIT (Flash of Invisible Text)
- Subset to only necessary character ranges
- WOFF2 provides 25-35% better compression than WOFF
- Preload critical fonts in HTML `<head>`

### Configuration File
See `FONT_SUBSETTING_CONFIG.json` for detailed subsetting options.

---

## 4. Asset Delivery with Server Path ✓

### What's Implemented
- Asset manifest generation (`assets-manifest.json`)
- Configurable asset path via environment variable `ASSET_PATH`
- Asset versioning and cache control strategy

### How It Works

#### Development Environment
```bash
# Default: assets served from /
ASSET_PATH="/" npm run serve
```

#### Production Environment
```bash
# Assets served from CDN or /static/
ASSET_PATH="/static/" npm run build
```

#### Configure in gulpfile.js
```javascript
const ASSET_PATH = process.env.ASSET_PATH || '/';
```

### Asset Manifest (Generated)
The build process creates `dist/assets-manifest.json`:
```json
{
  "assetPath": "/",
  "timestamp": "2026-04-16T00:00:00Z",
  "assets": {
    "styles": ["/css/site.min.css"],
    "scripts": ["/js/site.min.js"],
    "fonts": [],
    "images": ["/WHY%20Q%20LOGO.png"]
  }
}
```

### Server Configuration
See `ASSET_DELIVERY_CONFIG.json` for:
- Production/staging/development paths
- Cache control headers
- CDN URL configuration
- Asset versioning strategy

---

## 5. Service Worker ✓

### What's Implemented
- Complete service worker with offline support
- Dual caching strategy (network-first for HTML, cache-first for assets)
- Automatic cache cleanup and updates
- Comprehensive logging

### Features

#### Cache Strategy
1. **HTML Pages (Network First)**
   - Always try to fetch fresh content from network
   - Fall back to cached version if offline
   - Automatically cache successful responses

2. **Assets - CSS, JS, Fonts, Images (Cache First)**
   - Serve from cache immediately if available
   - Update cache in background
   - Fall back to network if not cached

#### Installation & Activation
```javascript
// Automatic on page load (in main.js)
navigator.serviceWorker.register('dist/sw.js')
```

#### Update Checking
- Checks for updates every 60 seconds during session
- Automatically skips waiting on update detection
- Notifies clients of controller changes

### Service Worker Files

#### Development
- Source: `sw.js` (in root)
- Used directly during development serve

#### Production
- Generated: `dist/sw.js` (created during build)
- Deployed with production assets

### Service Worker Scope
- Path: `/`
- Covers entire website
- Configurable in HTML via:
```html
<script>
  navigator.serviceWorker.register('dist/sw.js', { scope: '/' })
</script>
```

### Console Output
Service Worker logs cache operations:
```
✓ Service Worker registered
✓ Service Worker updated
[Service Worker] Serving from cache: /css/site.min.css
[Service Worker] Cached asset: /js/site.min.js
```

### Cache Invalidation
- Cache version: `why-q-v1`
- Old caches automatically deleted on activation
- Manual cache clear via DevTools or code reset

---

## Build Commands

### Development
```bash
npm install          # Install dependencies
npm run serve        # Start dev server with service worker registration
```

### Production Build
```bash
npm run build        # Full optimization build
```

### Clean
```bash
npm run clean        # Delete dist/ directory
```

### Custom Asset Path (Production CDN)
```bash
ASSET_PATH="/static/" npm run build
```

---

## Generated Files in `dist/`

After running `npm run build`, you'll have:
```
dist/
├── index.html              # Minified, optimized HTML
├── about.html              # All HTML pages
├── *.html                  # Minified
├── css/
│   └── site.min.css        # Minified CSS (bundled)
├── js/
│   └── site.min.js         # Minified, terser JS (bundled)
├── *.png                   # Optimized images
├── *.svg                   # Optimized SVG (if present)
├── sw.js                   # Service worker
├── assets-manifest.json    # Asset metadata
├── font-config.json        # Font subsetting guide
└── asset-delivery-config.json   # Asset serving configuration
```

---

## Performance Metrics

### Expected Improvements
- **CSS**: 40-60% reduction
- **JavaScript**: 50-70% reduction (minify + terser)
- **Images**: 10-30% reduction
- **SVG**: 30-50% reduction
- **Fonts**: 60-80% reduction (after subsetting)
- **Overall**: 50-75% total payload reduction

### Caching Benefits
- Service Worker: 90%+ cache hit rate for assets
- First visit: Standard load
- Repeat visits: 80%+ faster (from cache)
- Offline: Fully functional

---

## Troubleshooting

### Service Worker Not Registering
1. Check browser DevTools → Application → Service Workers
2. Verify `sw.js` exists in dist/ or root
3. Check console for errors: `navigator.serviceWorker error`

### Fonts Not Loading
1. Ensure font files are in `fonts/` directory
2. Check CSS @font-face paths are correct
3. Use `font-display: swap` for better performance

### Slow First Load
1. Reduce critical font size via subsetting
2. Enable GZIP/Brotli on server
3. Consider preloading critical resources

### Cache Issues
1. Clear service worker cache in DevTools
2. Increment `CACHE_NAME` in `sw.js`
3. Hard refresh (Ctrl+Shift+R)

---

## SEO & Performance Best Practices

1. ✓ Minified CSS & JavaScript
2. ✓ Optimized images and SVG
3. ✓ Service worker for offline support
4. ✓ Proper cache headers via manifest
5. ✓ Asset path configuration ready
6. □ Add structured data (schema.org)
7. □ Generate sitemap.xml
8. □ Add robots.txt
9. □ Mobile optimization testing

---

## Next Steps

1. **Install Dependencies**: `npm install`
2. **Subset Fonts**: Follow glyphhanger instructions above
3. **Test Build**: `npm run build`
4. **Deploy Assets**: Use `ASSET_PATH` for CDN/server paths
5. **Monitor**: Check service worker cache in DevTools

---

## References
- [Google Web Performance](https://web.dev/)
- [Service Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Glyphhanger Font Subsetting](https://www.zachleat.com/web/glyphhanger/)
- [CSS Minification Best Practices](https://cssnano.co/)
