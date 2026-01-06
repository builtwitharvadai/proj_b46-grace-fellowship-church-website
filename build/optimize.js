/**
 * Build Optimization Script
 * 
 * Handles CSS minification, JavaScript bundling, image optimization,
 * and performance budget checking for production builds.
 * 
 * @generated-from: task-id:TASK-006 type:performance
 * @modifies: build process
 * @dependencies: ["postcss", "terser", "fs", "path"]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postcss from 'postcss';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';
import { minify } from 'terser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Performance budget thresholds (in bytes)
const PERFORMANCE_BUDGET = {
  css: 50 * 1024, // 50KB
  js: 200 * 1024, // 200KB
  images: 500 * 1024, // 500KB per image
  totalBundle: 1024 * 1024, // 1MB total
};

// Build configuration
const BUILD_CONFIG = {
  srcDir: path.resolve(__dirname, '../src'),
  distDir: path.resolve(__dirname, '../dist'),
  cssEntry: path.resolve(__dirname, '../src/css/main.css'),
  jsEntry: path.resolve(__dirname, '../src/js/main.js'),
  imageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
};

/**
 * Logger utility for structured logging
 */
const logger = {
  info: (message, context = {}) => {
    console.log(`[INFO] ${message}`, Object.keys(context).length ? context : '');
  },
  success: (message, context = {}) => {
    console.log(`[SUCCESS] ✓ ${message}`, Object.keys(context).length ? context : '');
  },
  warn: (message, context = {}) => {
    console.warn(`[WARN] ⚠ ${message}`, Object.keys(context).length ? context : '');
  },
  error: (message, context = {}) => {
    console.error(`[ERROR] ✗ ${message}`, Object.keys(context).length ? context : '');
  },
};

/**
 * Ensures directory exists, creates if not
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
}

/**
 * Gets file size in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    logger.error(`Failed to get file size: ${filePath}`, { error: error.message });
    return 0;
  }
}

/**
 * Formats bytes to human-readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Recursively finds all files with specific extensions
 */
function findFiles(dir, extensions, fileList = []) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findFiles(filePath, extensions, fileList);
      } else if (extensions.includes(path.extname(file).toLowerCase())) {
        fileList.push(filePath);
      }
    });
    
    return fileList;
  } catch (error) {
    logger.error(`Failed to find files in directory: ${dir}`, { error: error.message });
    return fileList;
  }
}

/**
 * Minifies CSS using PostCSS with cssnano and autoprefixer
 */
async function minifyCSS() {
  logger.info('Starting CSS minification...');
  
  try {
    const cssContent = fs.readFileSync(BUILD_CONFIG.cssEntry, 'utf8');
    const originalSize = Buffer.byteLength(cssContent, 'utf8');
    
    const result = await postcss([
      autoprefixer({
        overrideBrowserslist: ['> 1%', 'last 2 versions', 'not dead'],
      }),
      cssnano({
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
          minifyFontValues: true,
          minifySelectors: true,
        }],
      }),
    ]).process(cssContent, {
      from: BUILD_CONFIG.cssEntry,
      to: path.join(BUILD_CONFIG.distDir, 'css/main.min.css'),
    });
    
    const outputPath = path.join(BUILD_CONFIG.distDir, 'css/main.min.css');
    ensureDirectoryExists(path.dirname(outputPath));
    fs.writeFileSync(outputPath, result.css);
    
    const minifiedSize = Buffer.byteLength(result.css, 'utf8');
    const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(2);
    
    logger.success('CSS minification complete', {
      original: formatBytes(originalSize),
      minified: formatBytes(minifiedSize),
      reduction: `${reduction}%`,
      output: outputPath,
    });
    
    return { size: minifiedSize, path: outputPath };
  } catch (error) {
    logger.error('CSS minification failed', { error: error.message });
    throw error;
  }
}

/**
 * Bundles and minifies JavaScript using Terser
 */
async function bundleAndMinifyJS() {
  logger.info('Starting JavaScript bundling and minification...');
  
  try {
    // Read main entry file
    const jsContent = fs.readFileSync(BUILD_CONFIG.jsEntry, 'utf8');
    const originalSize = Buffer.byteLength(jsContent, 'utf8');
    
    // Find all JS files to bundle
    const jsFiles = findFiles(path.join(BUILD_CONFIG.srcDir, 'js'), ['.js']);
    
    // Bundle all JS files
    let bundledContent = '';
    for (const file of jsFiles) {
      const content = fs.readFileSync(file, 'utf8');
      bundledContent += `\n/* ${path.relative(BUILD_CONFIG.srcDir, file)} */\n${content}\n`;
    }
    
    const bundledSize = Buffer.byteLength(bundledContent, 'utf8');
    
    // Minify bundled JavaScript
    const minified = await minify(bundledContent, {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        toplevel: true,
        reserved: ['$', 'jQuery'],
      },
      format: {
        comments: false,
      },
      sourceMap: {
        filename: 'main.min.js',
        url: 'main.min.js.map',
      },
    });
    
    if (minified.error) {
      throw minified.error;
    }
    
    const outputPath = path.join(BUILD_CONFIG.distDir, 'js/main.min.js');
    const mapPath = path.join(BUILD_CONFIG.distDir, 'js/main.min.js.map');
    
    ensureDirectoryExists(path.dirname(outputPath));
    fs.writeFileSync(outputPath, minified.code);
    
    if (minified.map) {
      fs.writeFileSync(mapPath, minified.map);
    }
    
    const minifiedSize = Buffer.byteLength(minified.code, 'utf8');
    const reduction = ((1 - minifiedSize / bundledSize) * 100).toFixed(2);
    
    logger.success('JavaScript bundling and minification complete', {
      files: jsFiles.length,
      bundled: formatBytes(bundledSize),
      minified: formatBytes(minifiedSize),
      reduction: `${reduction}%`,
      output: outputPath,
    });
    
    return { size: minifiedSize, path: outputPath };
  } catch (error) {
    logger.error('JavaScript bundling/minification failed', { error: error.message });
    throw error;
  }
}

/**
 * Optimizes images by copying and validating sizes
 */
async function optimizeImages() {
  logger.info('Starting image optimization...');
  
  try {
    const imageFiles = findFiles(BUILD_CONFIG.srcDir, BUILD_CONFIG.imageExtensions);
    const optimizedImages = [];
    let totalSize = 0;
    let oversizedImages = [];
    
    for (const imagePath of imageFiles) {
      const imageSize = getFileSize(imagePath);
      totalSize += imageSize;
      
      const relativePath = path.relative(BUILD_CONFIG.srcDir, imagePath);
      const outputPath = path.join(BUILD_CONFIG.distDir, relativePath);
      
      ensureDirectoryExists(path.dirname(outputPath));
      fs.copyFileSync(imagePath, outputPath);
      
      optimizedImages.push({
        path: relativePath,
        size: imageSize,
      });
      
      // Check if image exceeds budget
      if (imageSize > PERFORMANCE_BUDGET.images) {
        oversizedImages.push({
          path: relativePath,
          size: formatBytes(imageSize),
          budget: formatBytes(PERFORMANCE_BUDGET.images),
        });
      }
    }
    
    logger.success('Image optimization complete', {
      count: imageFiles.length,
      totalSize: formatBytes(totalSize),
    });
    
    if (oversizedImages.length > 0) {
      logger.warn('Some images exceed performance budget', {
        count: oversizedImages.length,
        images: oversizedImages,
      });
    }
    
    return { size: totalSize, count: imageFiles.length, oversized: oversizedImages };
  } catch (error) {
    logger.error('Image optimization failed', { error: error.message });
    throw error;
  }
}

/**
 * Checks performance budget and reports violations
 */
function checkPerformanceBudget(buildResults) {
  logger.info('Checking performance budget...');
  
  const violations = [];
  const { css, js, images } = buildResults;
  
  // Check CSS budget
  if (css.size > PERFORMANCE_BUDGET.css) {
    violations.push({
      type: 'CSS',
      actual: formatBytes(css.size),
      budget: formatBytes(PERFORMANCE_BUDGET.css),
      exceeded: formatBytes(css.size - PERFORMANCE_BUDGET.css),
    });
  }
  
  // Check JS budget
  if (js.size > PERFORMANCE_BUDGET.js) {
    violations.push({
      type: 'JavaScript',
      actual: formatBytes(js.size),
      budget: formatBytes(PERFORMANCE_BUDGET.js),
      exceeded: formatBytes(js.size - PERFORMANCE_BUDGET.js),
    });
  }
  
  // Check total bundle budget
  const totalSize = css.size + js.size + images.size;
  if (totalSize > PERFORMANCE_BUDGET.totalBundle) {
    violations.push({
      type: 'Total Bundle',
      actual: formatBytes(totalSize),
      budget: formatBytes(PERFORMANCE_BUDGET.totalBundle),
      exceeded: formatBytes(totalSize - PERFORMANCE_BUDGET.totalBundle),
    });
  }
  
  // Report results
  if (violations.length > 0) {
    logger.warn('Performance budget violations detected!', {
      violations,
      recommendation: 'Consider code splitting, lazy loading, or removing unused code',
    });
    return false;
  }
  
  logger.success('All performance budgets met!', {
    css: formatBytes(css.size),
    js: formatBytes(js.size),
    images: formatBytes(images.size),
    total: formatBytes(totalSize),
  });
  
  return true;
}

/**
 * Copies HTML files to dist directory
 */
function copyHTMLFiles() {
  logger.info('Copying HTML files...');
  
  try {
    const htmlFiles = findFiles(BUILD_CONFIG.srcDir, ['.html']);
    
    for (const htmlPath of htmlFiles) {
      const relativePath = path.relative(BUILD_CONFIG.srcDir, htmlPath);
      const outputPath = path.join(BUILD_CONFIG.distDir, relativePath);
      
      ensureDirectoryExists(path.dirname(outputPath));
      fs.copyFileSync(htmlPath, outputPath);
    }
    
    logger.success('HTML files copied', { count: htmlFiles.length });
  } catch (error) {
    logger.error('Failed to copy HTML files', { error: error.message });
    throw error;
  }
}

/**
 * Copies static assets (robots.txt, sitemap.xml, etc.)
 */
function copyStaticAssets() {
  logger.info('Copying static assets...');
  
  try {
    const staticFiles = ['robots.txt', 'sitemap.xml'];
    let copiedCount = 0;
    
    for (const file of staticFiles) {
      const srcPath = path.join(BUILD_CONFIG.srcDir, file);
      const destPath = path.join(BUILD_CONFIG.distDir, file);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        copiedCount++;
      }
    }
    
    logger.success('Static assets copied', { count: copiedCount });
  } catch (error) {
    logger.error('Failed to copy static assets', { error: error.message });
    throw error;
  }
}

/**
 * Main build function
 */
async function build() {
  const startTime = Date.now();
  
  logger.info('Starting production build...', {
    srcDir: BUILD_CONFIG.srcDir,
    distDir: BUILD_CONFIG.distDir,
  });
  
  try {
    // Clean dist directory
    if (fs.existsSync(BUILD_CONFIG.distDir)) {
      fs.rmSync(BUILD_CONFIG.distDir, { recursive: true, force: true });
      logger.info('Cleaned dist directory');
    }
    
    ensureDirectoryExists(BUILD_CONFIG.distDir);
    
    // Run build tasks
    const [css, js, images] = await Promise.all([
      minifyCSS(),
      bundleAndMinifyJS(),
      optimizeImages(),
    ]);
    
    // Copy HTML and static assets
    copyHTMLFiles();
    copyStaticAssets();
    
    // Check performance budget
    const budgetMet = checkPerformanceBudget({ css, js, images });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.success('Build completed successfully!', {
      duration: `${duration}s`,
      budgetMet,
    });
    
    // Exit with error code if budget exceeded
    if (!budgetMet) {
      process.exit(1);
    }
  } catch (error) {
    logger.error('Build failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run build if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build();
}

export { build, minifyCSS, bundleAndMinifyJS, optimizeImages, checkPerformanceBudget };