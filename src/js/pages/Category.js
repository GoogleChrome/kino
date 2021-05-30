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

import appendVideoToGallery from '../utils/appendVideoToGallery';

/**
 * @param {RouterContext} routerContext Context object passed by the Router.
 */
export default (routerContext) => {
  const {
    mainContent,
    apiData,
    path,
  } = routerContext;

  const categorySlug = path.replace('/category/', '').replace(/\/$/, '');
  const categoryObject = apiData.categories.find((candidate) => candidate.slug === categorySlug);

  mainContent.innerHTML = `
    <div class="container">
      <header class="page-header">
        <h1>${categoryObject.name}</h1>
        ${categoryObject.description}
      </header>
    </div>
  `;

  const videosFromCurrentCategory = apiData.videos.filter(
    (videoData) => videoData.categories.includes(categoryObject.slug),
  );
  const apiDataCurrentCategory = {
    videos: videosFromCurrentCategory,
    categories: apiData.categories,
  };

  const localContext = {
    category: `${categoryObject.name}:${categoryObject.slug}`,
    class: 'hide-header',
  };

  document.body.classList.add('is-category');

  appendVideoToGallery({
    ...routerContext,
    apiData: apiDataCurrentCategory,
  }, localContext);
};
