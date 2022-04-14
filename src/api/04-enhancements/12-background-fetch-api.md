---
title: Background Fetch
description: |
  Use the Background Fetch API to download large files in the background while exposing the download progress to the user.
date: February 22, 2022
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/background-fetch-api/manifest.mpd
    type: application/dash+xml
    cast: true
  - src: https://storage.googleapis.com/kino-assets/background-fetch-api/master.m3u8
    type: application/x-mpegURL
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/background-fetch-api/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/background-fetch-api/cap-cs.vtt
    srclang: cz
thumbnail: https://storage.googleapis.com/kino-assets/background-fetch-api/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/background-fetch-api/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/background-fetch-api/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/background-fetch-api/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/background-fetch-api/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/background-fetch-api/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/background-fetch-api/artwork-512x512.png
    type: image/png
---

## Introduction

Web applications use the [Fetch API] to fetch resources, including file downloads, from the network. However if the user closes the application web page or navigates away, all in progress `fetch` requests are interrupted and the download halts.

The [Background Fetch API] allows web applications to offload a download operation to the browser. The browser exposes some UI to indicate that a download is in progress. When all files are downloaded, it exposes the downloaded data to your service worker.

[Background Fetch API] allows you to batch files into a single download operation. This is especially useful for downloading media, particularly for downloading streaming formats like MPEG DASH that often serve a single media item split into tens or even hundreds of chunks, each in its own file.

## Initiate the download

Your application needs to have a registered service worker in order to use the [Background Fetch API]. You will also need to make sure the API is supported in the user's browser before you use it.

```js
if (!('BackgroundFetchManager' in self)) {
  // Use the Fetch API instead to download the files.
}
```

Assuming the current browser supports the Background Fetch API, you should first obtain a `ServiceWorkerRegistration` instance and then use its `backgroundFetch` property to initialize the background fetch operation.

```js
navigator.serviceWorker.ready.then(async (swReg) => {
  const bgFetch = await swReg.backgroundFetch.fetch(
    // Provide your own meaningful ID.
    'my-video-id',

    // Array of file URLs to be downloaded.
    [
      '/static/video-chunk-1.mp4',
      '/static/video-chunk-2.mp4',
      '/static/video-chunk-3.mp4',
      '/static/video-chunk-4.mp4',
      '/static/video-thumbnail.jpg',
    ],

    // Browsers may use these options
    // to provide users with more information
    // about the object being downloaded.
    //
    // Note: All options are optional.
    {
      title: 'My Video: Chunk Funk',
      icons: [{
        sizes: '300x300',
        src: '/video-icon-300x300.png',
        type: 'image/png',
      }],

      // Total size of the downloaded
      // resources in bytes.
      downloadTotal: 60 * 1024 * 1024,
    }
  );
});
```

## Access downloaded data

Once the background fetch is initialized, the browser will expose some kind of progress indication to the user. The download will now continue even if the user closes the application or navigates away.

After all files finish downloading, the browser is going to trigger a `backgroundfetchsuccess` event in your service worker context. This gives you an opportunity to access the downloaded data.

```js
// In the service worker ↓

addEventListener('backgroundfetchsuccess', (event) => {
  // The `BackgroundFetchRegistration` instance.
  const bgFetch = event.registration;

  event.waitUntil(async function() {
    // Returns an array of `BackgroundFetchRecord` objects.
    const records = await bgFetch.matchAll();

    const promises = records.map(async (record) => {
      const response = await record.responseReady;

      // TODO: Store the response object using the Cache or IndexedDB API
    });

    // Wait until all responses are ready and saved locally
    await Promise.all(promises);

    // Use the `updateUI` method to change
    // the initially set `title` or `icons`.
    event.updateUI({
      title: 'My Video stored for offline playback'
    });
  }());
});
```

**Note:** In case one or more of the downloaded files can't be fetched or when the user actively aborts the download operation, a `backgroundfetchfailure` or `backgroundfetchabort` respectively will be triggered instead.

## Tracking progress

You can track the download progress via a `progress` event. Note that `downloadTotal` is going to be `0` if you didn't provide a value when initializing the background fetch operation.

```js
// In the service worker ↓

bgFetch.addEventListener('progress', () => {
  // If we didn't provide a total, we can't provide a %.
  if (!bgFetch.downloadTotal) return;

  const ratio = bgFetch.downloaded / bgFetch.downloadTotal;
  const percent = Math.round(ratio * 100);

  console.log(`Download progress: ${percent}%`);
});
```

## Try it!

Go to [Kino Settings] and enable the _Download videos in the background_ feature. Then try to download any of the videos using the _Make available offline_ button under any of the videos on this site. If your [browser supports the Background Fetch API], you'll notice it downloads the video using its own UI.

[Fetch API]: https://developers.google.com/web/updates/2015/03/introduction-to-fetch
[Background Fetch API]: https://wicg.github.io/background-fetch/
[service worker]: https://developers.google.com/web/fundamentals/primers/service-workers
[Kino Settings]: /settings/
[browser supports the Background Fetch API]: https://caniuse.com/mdn-api_serviceworkerregistration_backgroundfetch
