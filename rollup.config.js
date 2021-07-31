/**
 * Copyright 2021 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import css from 'rollup-plugin-import-css';
import generateApi from './src/js/utils/generateApi.js';
import generateAssetsToCache from './src/js/utils/generateAssetsToCache';
import json from '@rollup/plugin-json';

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
      json(),
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
