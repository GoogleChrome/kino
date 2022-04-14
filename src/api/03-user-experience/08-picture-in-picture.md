---
title: Picture-in-Picture
description: |
  Play your videos in a detached, floating window that stays on top of other applications using the Picture-in-Picture API.
date: January 31st, 2022
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/picture-in-picture/manifest.mpd
    type: application/dash+xml
  - src: https://storage.googleapis.com/kino-assets/picture-in-picture/master.m3u8
    type: application/x-mpegURL
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/picture-in-picture/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/picture-in-picture/cap-cs.vtt
    srclang: cz
thumbnail: https://storage.googleapis.com/kino-assets/picture-in-picture/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/picture-in-picture/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/picture-in-picture/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/picture-in-picture/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/picture-in-picture/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/picture-in-picture/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/picture-in-picture/artwork-512x512.png
    type: image/png
pip: true
---

## The basics

The three main pieces the Picture-in-Picture API introduces are:

1. The `requestPictureInPicture()` method of `<video>` elements.
2. The `exitPictureInPicture()` method of the `document`.
3. The `pictureInPictureElement` property of the `document` or a `shadowRoot`.

A minimal example of controlling the video's Picture-in-Picture state would only consist of calling `requestPictureInPicture` and `exitPictureInPicture` respectively:

```html
<video src="video.mp4"></video>
<button>Toggle Picture-in-Picture</button>

<script>
  const video = document.querySelector('video');
  const button = document.querySelector('button');

  button.addEventListener('click', () => {
    document.pictureInPictureElement === video
      ? document.exitPictureInPicture()
      : video.requestPictureInPicture();
  });
</script>
```

## Checking for feature support

[Picture-in-Picture API support] is different from what you're probably used to. Even in browsers that implement it, the feature may be disabled by the `picture-in-picture` Feature Policy. There is a handy `pictureInPictureEnabled` property that will be present on the `document` in browsers that implement the API and its value will be `true` if Picture-in-Picture mode is allowed.

Be aware any request to enter or leave the Picture-in-Picture mode could fail or may be declined by the browser for other reasons, and so you should account for that:

```html
<video src="video.mp4"></video>
<!-- Disable the button by default. -->
<button disabled>Picture-in-Picture not available</button>

<script>
  const video = document.querySelector('video');
  const button = document.querySelector('button');

  const setupPip = () => {
    // Only enable the button when PiP is enabled.
    if (!document.pictureInPictureEnabled) return;

    button.innerText = 'Toggle Picture-in-Picture';
    button.disabled = false;

    button.addEventListener('click', async () => {
      // Entering and leaving PiP could take a little while, so we'll
      // disable the button while we wait.
      button.disabled = true;
      try {
        document.pictureInPictureElement === video
          ? await document.exitPictureInPicture()
          : await video.requestPictureInPicture();
      } catch (e) {
        // Show or log the error.
      }
      button.disabled = false;
    });
  }
  setupPip();
</script>
```

## Advanced usage

There are several more things you might want to consider to make the Picture-in-Picture experience even better:

1. Use the [Media Session API] action handlers to display more controls in the Picture-in-Picture window.
2. Listen to `enterpictureinpicture` and `leavepictureinpicture` events and update your UI when Picture-in-Picture window is shown or closed.
3. Display a [MediaStream] object such as the user's webcam feed, another application window or canvas contents in the Picture-in-Picture window.

You can find more information and code snippets in a [Google Developers blog post].

## See it in action

When you play the video above, you can click the <span style="border-radius: 8px; background-color: var(--accent-background); width: 48px; height: 48px; display: inline-grid; place-items: center;" aria-label="Toggle picture in picture"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20.25 15v6a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 21V8.25A1.5 1.5 0 0 1 3 6.75h3.75" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9.75 3v7.5a1.5 1.5 0 0 0 1.5 1.5H21a1.5 1.5 0 0 0 1.5-1.5V3A1.5 1.5 0 0 0 21 1.5h-9.75A1.5 1.5 0 0 0 9.75 3Z" stroke="var(--accent)" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="square"></path><path d="M9 18.75V15H5.25M5.25 18.75 9 15" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg></span> button in the top right corner of the video to toggle Picture-in-Picture playback – if your browser supports the API.

## What's next?

Playing videos in a floating window is useful for a local viewing session. However, users often prefer to watch content on other devices such as their televisions. In the [next article] we'll talk about media casting – and Google Cast in particular.

[Picture-in-Picture API support]: https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API#htmlvideoelement.requestpictureinpicture
[Media Session API]: https://web.dev/media-session/
[MediaStream]: https://developer.mozilla.org/en-US/docs/Web/API/MediaStream
[Google Developers blog post]: https://developers.google.com/web/updates/2018/10/watch-video-using-picture-in-picture
[next article]: /google-cast/
