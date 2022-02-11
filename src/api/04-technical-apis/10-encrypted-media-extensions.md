---
title: Encrypted Media Extensions
description: |
  Protect your content by encrypting it, then use the Encrypted Media Extensions API to decrypt it securely within your application.
date: January 31st, 2022
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/encrypted.mp4
    type: video/mp4; codecs="avc1.640032,mp4a.40.2"
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

Web developers use tags like `<video>` and `<audio>` to embed media files on web pages and browsers offer users few option of what to do with such embed. One of those options is to download the media file, share it with other and play it back locally at any later time.

This default behavior is too permissive for many business models and use cases, though. This is where the Encrypted Media Extensions API comes into play.

## Securing video playback

The simplest way of protecting any data from viewing it is encryption. Even if you download an encrypted media file, you are going to need a key to actually play it.

**Try it:** [Download this video](https://storage.googleapis.com/kino-assets/encrypted-media-extensions/encrypted.mp4) and try playing it in any video player on your device. You'll notice you won't be able to. But the same video plays just fine on this page.

The [Encrypted Media Extensions API] allows web application developers to interact with a set of components that can make sure the decryption and playback only takes place for users that are allowed to access that particular piece of media content.

These are the main components the Encrypted Media Extensions API interacts with:

* **Application:** Your video application, usually written in HTML5 and JS.
* **License Server:** Static data or a web server returning the decrpytion keys.
* **Content Decryption Module (CDM):** 3rd party software decrypting the media.

**Note:** Some CDM systems not only decrypt the media, but also decode a output it directly having a direct access to the graphics or audio hardware, never returning the decrypted data back to the browser.

For a more detailed overview of the decryption flow make sure to check out the full data flow diagram in the Encrypted Media Extensions [specification].

[Encrypted Media Extensions API]: https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API
[specification]: https://www.w3.org/TR/encrypted-media/#introduction
