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
    path,
  } = routerContext;

  mainContent.innerHTML = `
    <style>
      ins {
        color: var(--accent-text);
        font-weight: normal;
      }
    </style>
    <div class="container">
      <header class="page-header">
        <h1>404. <ins>That’s an error.</ins></h1>
        <p>The requested URL <code>${path}</code> was not found on this server. <br><ins>That’s all we know.</ins></p>
      </header>
    </div>
  `;

  const meta = document.createElement('meta');
  meta.name = 'robots';
  meta.content = 'noindex';
  document.head.appendChild(meta);
};
