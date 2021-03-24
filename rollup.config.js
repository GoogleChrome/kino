import css from 'rollup-plugin-import-css';
import generateAssetsToCache from './src/js/utils/generateAssetsToCache';

import api from './public/api.json';

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'public/dist/js/index.js',
      format: 'cjs',
    },
    plugins: [
      css(),
    ],
  },
  {
    input: 'src/js/sw/sw.js',
    output: {
      file: 'public/sw.js',
      format: 'cjs',
    },
    plugins: [
      generateAssetsToCache(api),
    ],
  },
];
