import generateAssetsToCache from './src/js/utils/generateAssetsToCache';
import api from './public/api.json';

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'public/dist/js/index.js',
      format: 'cjs',
    },
  },
  {
    input: 'src/js/sw/sw.js',
    output: {
      file: 'public/sw.js',
      format: 'cjs',
    },
    plugins: [
      generateAssetsToCache('public', api),
    ],
  },
];
