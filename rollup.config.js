import css from 'rollup-plugin-import-css';
import generateApi from './src/js/utils/generateApi.js';
import generateAssetsToCache from './src/js/utils/generateAssetsToCache';

async function setupApi() {
  try {
    const api = await generateApi();
    await generateAssetsToCache(api);
  } catch (err) {
    console.error(err);
  }
}

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
      setupApi(),
    ],
  },
];
