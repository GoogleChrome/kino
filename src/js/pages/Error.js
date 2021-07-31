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

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const {
    mainContent,
  } = routerContext;

  mainContent.innerHTML = `
    <style>
      .button {
        color: var(--accent);
      }
    </style>
    <div class="container">
      <header class="page-header">
        <h1>Not Found</h1>
        <p>Looks like something went wrong. Try returning to the <a data-use-router href="/" class="button">home</a> page.</p>
      </header>
    </div>
  `;

  const meta = document.createElement('meta');
  meta.name = 'robots';
  meta.content = 'noindex';
  document.head.appendChild(meta);
};
