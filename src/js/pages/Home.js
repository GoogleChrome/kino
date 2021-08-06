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
  const { mainContent, apiData } = routerContext;

  mainContent.innerHTML = `
    <div class="container">
      <header class="page-header">
        <h1>Bye bye buffering, hello video!</h1>
        <p>This is a sample Video on demand (VOD) app to demonstrate media functionality in the context of a Progressive Web App (PWA). All the content on this website is available offline when your browser supports the latest technologies, which means you can stream Videos downloaded to your device whenever you want.</p>
        <p>It’s <strong>important</strong> to note that a single Video from the Google Chrome Developers <a href="https://www.youtube.com/channel/UCnUYZLuoy1rq1aVMwx4aTzw">YouTube channel</a> is being used to demonstrate the PWA’s capabilities. The main takeaway is the use case described in each article and not the Video content itself.</p>
      </header>
    </div>
  `;

  const videosByCategories = apiData.videos.reduce((acc, videoData) => {
    videoData.categories.forEach((category) => {
      if (!(category in acc)) acc[category] = [];
      acc[category].push(videoData);
    });
    return acc;
  }, {});

  Object.keys(videosByCategories).forEach((category) => {
    const categoryData = apiData.categories.find((obj) => obj.slug === category);
    const localContext = {
      category: `${categoryData.name}:${categoryData.slug}`,
    };

    /**
     * Limit the number of videos to 3 per category on the homepage.
     */
    const categoryApiData = {
      categories: apiData.categories,
      videos: videosByCategories[category].slice(0, 3),
    };

    appendVideoToGallery({
      ...routerContext,
      apiData: categoryApiData,
    }, localContext);
  });
};
