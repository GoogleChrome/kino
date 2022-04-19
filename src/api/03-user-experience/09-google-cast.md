---
title: Google Cast
description: |
  Use the Google Cast SDK and turn your application to a cast sender able to stream your media to a compatible network device.
date: January 31st, 2022
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/google-cast/manifest.mpd
    type: application/dash+xml
    cast: true
  - src: https://storage.googleapis.com/kino-assets/google-cast/master.m3u8
    type: application/x-mpegURL
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/google-cast/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/google-cast/cap-cs.vtt
    srclang: cz
thumbnail: https://storage.googleapis.com/kino-assets/google-cast/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/google-cast/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/google-cast/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/google-cast/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/google-cast/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/google-cast/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/google-cast/artwork-512x512.png
    type: image/png
cast: true
---

## Introduction

When one device controls media content playback on another device, we call it **casting**. These devices have to follow the same protocol in order to communicate. One of the most widely used casting protocols is Google Cast.

## Basic concepts

Before you can use Google Cast to stream your media to other devices, there are a few basic concepts you should understand:

* **Sender application**: A mobile or web application that uses Google Cast SDK to discover target devices on the network and to initialize and remotely control playback of media being cast to receiver.
* **Receiver application**: A web application that runs on a Google Cast compatible device such as a Chromecast dongle or a Chromecast built-in TV or speaker and implements the media player UI and handles messages from the *Sender application*.
* **Google Cast SDK**: Collection of API libraries and code samples to allow Android, iOS and web developers to implement sender and receiver applications.

**Note:** Developing a custom Receiver application is optional in many use cases. Two prebuilt options are available:

* [Default Media Web Receiver] – predefined UI and colors, but you don't need to [register] a custom receiver application.
* [Styled Media Web Receiver] – ability to customize the UI and colors using CSS, but it is necessary to [register] a custom receiver application.

## Using the Cast Application Framework

The [Cast Application Framework] (CAF) is the part of Google Cast SDK which exposes objects, methods and events necessary for building web sender applications.

```html
<script>
// 1. When CAF initializes, the `__onGCastApiAvailable` is called.
window.__onGCastApiAvailable = (isAvailable) => {
  if (isAvailable) initCastApi();
};

function initCastApi() {
  // 2. `CastContext` holds all global context for the CAF.
  const context = cast.framework.CastContext.getInstance();

  // 3. We use a default receiver app ID. If you want custom
  //    styling or features, you must register your own app.
  //
  // @see https://developers.google.com/cast/docs/registration
  const receiverId = chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID;

  context.setOptions({
    receiverApplicationId: receiverId,
  });

  // 4. A `session` is a connection to a target device. Whenever its
  //    state changes, we run the `castVideo` method.
  context.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    e => castVideo(e.sessionState),
  );

  const castVideo = async (state) => {
    // 5. When the `session` state change event is `SESSION_STARTED`,
    //    we try to load the video.
    if (state === 'SESSION_STARTED') {
      const session = context.getCurrentSession();
      const mediaInfo = new chrome.cast.media.MediaInfo(
        'http://example.com/video.mp4',              // Provide a URL.
        'video/mp4; codecs="avc1.640032,mp4a.40.2"', // MIME + codecs.
      );
      const request = new chrome.cast.media.LoadRequest(mediaInfo);

      try {
        // 6. Instruct the receiver application to load the media,
        //    if it fails, be prepared to handle the error.
        await session.loadMedia(request);
      } catch (error) { /* Handle the error. */ }
    }
  }
}
</script>
<script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"></script>

<video src="video.mp4"></video>

<!-- Custom element defined by the framework. -->
<google-cast-launcher></google-cast-launcher>
```

## Metadata

Receiver applications may expose additional information about the media in their UI or provide additional features depending on metadata passed to them.

The [Cast Application Framework] defines several [Metadata classes] that developers can use to convey information like the content title, thumbnail, release dates, authors etc.

```js
const mediaInfo = new chrome.cast.media.MediaInfo(
  'http://example.com/video.mp4',              // Provide a URL.
  'video/mp4; codecs="avc1.640032,mp4a.40.2"', // MIME + codecs.
);

// Image URLs need to be "wrapped" by the Image class.
const thumbnail = new chrome.cast.Image('http://example.com/thumb.jpg');

// Our video is a short clip, but if it was a full-length movie,
// we would use `MovieMediaMetadata` here.
mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
mediaInfo.metadata.title = 'My Dog Chasing Geese';
mediaInfo.metadata.images = [ thumbnail ];

// mediaInfo is later used to create a `LoadRequest`
// const request = new chrome.cast.media.LoadRequest(mediaInfo);
```

## Captions and subtitles

Media can contain additional [tracks of different types]. You can use text tracks to provide captions or subtitles for your videos.

```js
const mediaInfo = new chrome.cast.media.MediaInfo(
  'http://example.com/video.mp4',              // Provide a URL.
  'video/mp4; codecs="avc1.640032,mp4a.40.2"', // MIME + codecs.
);

// Instantiate the Track object first.
const captionsTrack = new chrome.cast.media.Track(
  'captions-en', // Unique track identifier.
  chrome.cast.media.TrackType.TEXT,
);

captionsTrack.trackContentId = 'http://example.com/captions-en.vtt';
captionsTrack.subtype = chrome.cast.media.TextTrackType.CAPTIONS;
captionsTrack.name = 'English CC';
captionsTrack.language = 'en-US'; // RFC 5646 Language Tag.
captionsTrack.trackContentType = 'text/vtt';

// The `MediaInfo` object may contain several tracks of various types,
// how and whether additional tracks are exposed in the UI depends
// on the receiver application implementation.
mediaInfo.tracks = [ captionsTrack ];

// mediaInfo is later used to create a `LoadRequest`
// const request = new chrome.cast.media.LoadRequest(mediaInfo);
```

## UX considerations

When the casting session starts, video playback pauses in the sender application and the `<google-cast-launcher>` changes its styling to indicate the session in progress.

However, in many cases it is useful to provide additional indication. One of the common patterns is to render a video overlay along with displaying a name of the device to which the media is being cast.

To achieve this, we can listen for `SESSION_STATE_CHANGED` events and add or remove an overlay element when session is started and ended:

```html
<div class="cast-overlay" hidden>
  Casting to <span class="cast-target"></span>
</div>

<script>
  // The following code should be defined within
  // `function initCastApi() { ... }` defined previously.
  const context = cast.framework.CastContext.getInstance();

  const overlay = document.querySelector('.cast-overlay');
  const target = document.querySelector('.cast-target');

  // Bind the overlay visibility state to session state changes.
  context.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    e => {
      switch (e.sessionState) {
        case 'SESSION_ENDED':
          overlay.setAttribute('hidden', '');
          break;
        case 'SESSION_STARTED':
        case 'SESSION_RESUMED':
          const session = context.getCurrentSession();
          target.innerText = session.getCastDevice().friendlyName;
          overlay.removeAttribute('hidden');
      }
    },
  );
</script>
```

## What's next?

In the [next article], we will shift gears and talk about media encryption and the Encrypted Media Extensions API.

[Default Media Web Receiver]: https://developers.google.com/cast/docs/web_receiver#default_media_web_receiver
[Styled Media Web Receiver]: https://developers.google.com/cast/docs/web_receiver#styled_media_web_receiver
[register]: https://developers.google.com/cast/docs/registration
[Cast Application Framework]: https://developers.google.com/cast/docs/web_sender
[Metadata classes]: https://developers.google.com/cast/docs/reference/web_sender/chrome.cast.media?hl=en
[tracks of different types]: https://developers.google.com/cast/docs/reference/web_sender/chrome.cast.media#.TrackType
[next article]: /encrypted-media-extensions/
