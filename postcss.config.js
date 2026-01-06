export default {
  plugins: {
    autoprefixer: {
      overrideBrowserslist: [
        'last 2 versions',
        '> 1%',
        'not dead',
        'not ie <= 11'
      ],
      grid: 'autoplace',
      flexbox: 'no-2009'
    },
    cssnano: {
      preset: [
        'default',
        {
          discardComments: {
            removeAll: true
          },
          normalizeWhitespace: true,
          colormin: true,
          minifyFontValues: true,
          minifySelectors: true,
          reduceIdents: false,
          zindex: false
        }
      ]
    }
  },
  map: process.env.NODE_ENV !== 'production' ? { inline: false } : false
};