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
import svg from 'rollup-plugin-svg';
import json from '@rollup/plugin-json';
import generateApi from './src/js/utils/generateApi';
import generateCache from './src/js/utils/generateCache';
import { terser } from 'rollup-plugin-terser';

const isWatch = process.env.npm_lifecycle_event === 'watch';

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'public/dist/js/index.js',
      format: 'cjs',
    },
    plugins: [
      generateApi(),
      json(),
      css(),
      svg(),
      isWatch ? {} : terser(),
    ],
  },
  {
    input: 'src/js/sw/sw.js',
    output: {
      file: 'public/sw.js',
      format: 'cjs',
    },
    plugins: [
      generateApi(),
      generateCache(),
      json(),
      isWatch ? {} : terser(),
    ],
  },
];
