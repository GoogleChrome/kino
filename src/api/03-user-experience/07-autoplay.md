---
title: Autoplay
description: |
  Learn how to start video playback automatically and employ autoplay strategies that don't lead to degraded user experience.
date: Septembed 22nd, 2021
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/autoplay/manifest.mpd
    type: application/dash+xml
  - src: https://storage.googleapis.com/kino-assets/autoplay/master.m3u8
    type: application/x-mpegURL
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/autoplay/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/autoplay/cap-cs.vtt
    srclang: cz
thumbnail: https://storage.googleapis.com/kino-assets/autoplay/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/autoplay/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/autoplay/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/autoplay/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/autoplay/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/autoplay/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/autoplay/artwork-512x512.png
    type: image/png
autoplay: true
---

## Introduction

Sometimes the video is not just a _part_ of your web page content. Sometimes it
is _the_ content and your users expect it to start playing automatically
as soon as possible.

There are two main ways of accomplishing this autoplay behavior:

1. Using the `<video autoplay>` attribute.
2. Using JavaScript.

Let's take a look at the benefits and limitations of each.

## Using the `autoplay` attribute

The better known and simpler way of instructing browsers to automatically play
a video is using the `autoplay` attribute.

```html
<video controls autoplay>
  <source src="video.mp4" type="video/mp4">
</video>
```

Browsers might not honor the attribute for various reasons, likely
because a given video contains sound. Automatic playback of videos with sound often leads
to poor user experience and browsers use multiple signals to determine
if playback with sound should be allowed.

To improve the chance of browsers starting playback, choose to
play the video muted.

```html
<!-- Browsers will usually allow autoplay when
     the `muted` attribute is also present. -->
<video controls autoplay muted>
  <source src="video.mp4" type="video/mp4">
</video>
```

**Note:** Unless you provide your own UI for the video controls, make sure
to also use the `controls` attribute to let the browser render the default video
controls.

## Using JavaScript

In JavaScript the `<video>` element contains a `play()` method that can be used
to attempt to manually start playback as soon as possible.

```html
<video controls>
  <source src="video.mp4" type="video/mp4">
</video>
<script>
  const videoElement = document.querySelector('video');
  videoElement.play().then(() => { /* video is playing */});
</script>
```

As with the `autoplay` attribute, browsers may choose to not play the
video in this situation, especially if it contains sound and is not muted.

One benefit of calling the `play()` method is that it returns a promise
that resolves when playback starts and rejects when it won't start for any
reason. This gives you a chance to respond.

A good strategy is to mute the video and re-attempt the playback. If
that fails, render a custom play button or don't do anything and let the user use video controls rendered by the browser.

```html
<video controls>
  <source src="video.mp4" type="video/mp4">
</video>
<script>
  const videoElement = document.querySelector('video');

  videoElement.play()
    .catch(() => {
      // Mute video and retry playback.
      videoElement.muted = true;
      videoElement.play()
        .catch(() => {
          // Can't autoplay with sound or muted.
        })
   })

   /**
    * Note: In older browsers the `play()` method may not
    *       return a promise. If you need to support
    *       pre-2019 browsers, you could do:
    *
    * Promise.resolve(videoElement.play())
    *   .catch(() => {
    *     // Mute and try playing again.
    *   })
    *
    * ... to wrap the non-promise return values as promises.
</script>
```

### Unmute button

Refresh this page and you'll likely notice the video now plays muted and there
is a "Tap to unmute" button rendered over it.

That's a custom element styled and positioned to render over the video. When
the button is clicked, simple JavaScript runs and removes the `muted` attribute
from the video and it continues playing with sound.

This strategy combines the best of both worlds. Users are not going to get
startled by sudden loud playback while the action necessary to achieve playback
with sound is handily available.

```html
<section>
  <video controls>
    <source src="video.mp4" type="video/mp4">
  </video>
  <button>🔊</button>
</section>

<style>
  /* Only basic layout, no fancy styling. */
  section {
    display: inline-block;
    position: relative;
  }
  button {
    font-size: 80px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>

<script>
  const videoElement = document.querySelector('video');
  const unmuteButton = document.querySelector('button');

  videoElement.play()
    .catch(() => {
      // Mute video and retry playback.
      videoElement.muted = true;
      videoElement.play()
        .then(() => {
          // When the unmute button is clicked,
          // unmute video and remove the button.
          unmuteButton.addEventListener('click', () => {
            videoElement.muted = false;
            unmuteButton.remove();
          });
        })
        .catch(() => {
          // Can't autoplay with sound or muted.
        })
   })
</script>
```

## Engagement signals

Browsers use various heuristics to determine whether automatic playback with
sound is expected by the user or not. These heuristics differ between browsers,
but here are a few example use cases where autoplay with sound is likely:

* When the newly loaded page is a result of internal navigation initiated by
  the user, e.g. click, tap etc.
* When the user has installed the PWA or added the site to their home screen.
* When user engagement signals are strong, e.g. on video sites where the user
  regularly watches the content.

Find more in-depth information at the [Chrome Developers website].

## What's Next?

In the [next article], we are going explore the Picture-in-Picture API, which can be used to play videos and other media sources in a floating window that stays on top of other applications.

[Chrome Developers website]: https://developer.chrome.com/blog/autoplay/
[next article]: /picture-in-picture/
