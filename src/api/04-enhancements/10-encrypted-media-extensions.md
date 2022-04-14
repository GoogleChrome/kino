---
title: Encrypted Media Extensions
description: |
  Protect your content by encrypting it, then use the Encrypted Media Extensions API to securely decrypt it within your application.
date: January 31st, 2022
length: '1:04'
video-sources:
  - src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/encrypted.mp4
    type: video/mp4; codecs="avc1.640032,mp4a.40.2"
video-subtitles:
  - default: true
    kind: captions
    label: English
    src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/cap-en.vtt
    srclang: en
  - default: false
    kind: captions
    label: Česky
    src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/cap-cs.vtt
    srclang: cz
thumbnail: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/thumbnail.png
media-session-artwork:
  - sizes: 96x96
    src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/artwork-96x96.png
    type: image/png
  - sizes: 128x128
    src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/artwork-128x128.png
    type: image/png
  - sizes: 192x192
    src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/artwork-192x192.png
    type: image/png
  - sizes: 256x256
    src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/artwork-256x256.png
    type: image/png
  - sizes: 384x384
    src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/artwork-384x384.png
    type: image/png
  - sizes: 512x512
    src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/artwork-512x512.png
    type: image/png
encryption:
  type: org.w3.clearkey
  src: https://storage.googleapis.com/kino-assets/encrypted-media-extensions/encrypted.mp4
  mimeCodec: video/mp4; codecs="avc1.640032, mp4a.40.2"
  mediaKeySystemConfig:
    initDataTypes:
      - cenc
    videoCapabilities:
      - contentType: video/mp4; codecs="avc1.640032"
    audioCapabilities:
      - contentType: audio/mp4; codecs="mp4a.40.2"
  key:
    id: 279926496a7f5d25da69f2b3b216bfa6
    value: ccc0f2b3b279926496a7f5d25da692f6
---

## Introduction

Web developers use tags like `<video>` and `<audio>` to embed media files on web pages. Browsers then offer users options of what to do with these embeds. One of those options is to download the media file, share it with others and play it back locally at any later time.

This default behavior is too permissive for many use cases, though. This is where the Encrypted Media Extensions API comes into play.

## Securing video playback

The simplest way to protect any data from being viewable is encryption. Even if you download an encrypted media file, you are going to need a key to actually play it.

**Try it:** [Download this video](https://storage.googleapis.com/kino-assets/encrypted-media-extensions/encrypted.mp4) and try playing it in any video player on your device. You'll notice you won't be able to. But when you run the same video in this application, it plays just fine.

The [Encrypted Media Extensions API] allows applications to decrypt media on the fly. It handles media keys and license exchange and can also directly render the media.

The main components the Encrypted Media Extensions API interacts with are:

* **Application:** Your video application, usually written in HTML5 and JS.
* **Key System:** A decryption or protection system, e.g. Clear Key, Widevine etc.
* **License Server:** Static data or a web server returning the decrpytion keys.
* **Content Decryption Module (CDM):** Software or firmware decrypting the media.

**Note:** Some CDM systems have direct access to the device's hardware. Those systems don't return decrypted data back to the browser. Instead they decrypt, decode and output the media themselves.

Check out the diagram in the Encrypted Media Extensions [specification] for a detailed overview of the decryption flow.

## Encrypting video

To encrypt a video file, you need a few things:

* The **video** in an appropriate format.
* One of more **cipher keys** to be used for encyrption.
* Decision on which **encryption method** you want to use.

We already [discussed video formats] and determined that a safe common denominator for most simple use cases is using the Common Media Application Format (CMAF), i.e. fragmented MP4 files.

Moreover, to improve interoperability between different key systems, a standard called **Common Encryption (CENC)** emerged that defines allowed decryption and encryption techniques as well as a common format for key mapping.

In a real world commercial application, source video files would almost always be encoded, encrypted and packaged using tools like [Shaka Packager] into one or more streaming formats. However, for demonstration purposes, we'd want to keep things simple and just encrypt a single MP4 file.

First, you should take a look if your source MP4 file is fragmented. To find out, you can use the [mp4info] CLI tool from the [Bento4 toolkit].

```
$ mp4info video.mp4

File:
  major brand:      iso5
  minor version:    200
  compatible brand: iso6
  compatible brand: mp41
  fast start:       yes

Movie:
  duration:   0 (media timescale units)
  duration:   0 (ms)
  time scale: 1000
  fragments:  yes   <----   THIS IS WHAT YOU'RE LOOKING FOR

Found 2 Tracks
...
...
```

If your file is not already fragmented, you can use ffmpeg to fragment it:

```
ffmpeg -i video.mp4
  -vcodec copy -acodec copy
  -movflags frag_keyframe+empty_moov+default_base_moof
  fragmented.mp4
```

Then you should decide which key system you're going to use. In this tutorial we will be using a ClearKey protection just to illustrate the basic concepts of Encrypted Media Extensions usage.

**Note:** ClearKey protection does not hide the keys from users. In fact the keys are going to be easily obtainable from the license server or the application source code. To ensure your keys are not exposed to users, use a content protection system like [Widevine].

Because CENC requires us to use some variant of AES-128 encryption, both our key ID and the key itself are going to be 128 bits long. You can use a random sequence of 128 bits in this case, because the cipher is symmetric and we use the same key to encrypt and decrypt the data.

```
$ openssl rand -hex 16
c77fee35e51fd615a7b91afcb1091c5e <--- OUR KEY ID

$ openssl rand -hex 16
eecdb2b549f02a7c97ce50c17f494ca0 <--- OUR KEY DATA
```

Then we're going to encrypt the video using the [mp4encrypt] tool from the Bento4 toolkit:

```
mp4encrypt
  --method MPEG-CENC
  --key 1:eecdb2b549f02a7c97ce50c17f494ca0:random
  --property 1:KID:c77fee35e51fd615a7b91afcb1091c5e
  --key 2:9abb7ab6cc4ad3b86c2193dadb1e786c:random
  --property 2:KID:045f7ecc35848ed7b3c012ea7614422f
  --global-option mpeg-cenc.eme-pssh:true
  fragmented.mp4 encrypted.mp4
```

**Note:** The example above uses two different keys. One encrypts the video track (track #1) and the other encrypts audio (track #2).

Now your MP4 file is encrypted and ready to be played back in the browser using the [Encrypted Media Extensions API].

## Encrypted Media Extensions API usage

When web browsers download the `encrypted.mp4` file, they will determine the file is encrypted. The [PSSH box] included in the MP4 file also contains list of IDs of keys necessary to decrypt the video.

This information is sent to the ClearKey CDM, which in turn requests a license (i.e. the actual keys) from our application. In our case, the decryption keys are stored as plain text in the application.

This allows us to directly satisfy the license request without the use of any license server.

```js
/**
 * KID:key pairs as non-padded base64 values.
 */
const KEYS = {
  x3_uNeUf1hWnuRr8sQkcXg: '7s2ytUnwKnyXzlDBf0lMoA',
  'BF9-zDWEjtezwBLqdhRCLw': 'mrt6tsxK07hsIZPa2x54bA',
};

/**
 * Generates a license for the given key IDs ("kids").
 *
 * @link https://www.w3.org/TR/encrypted-media/#clear-key-request-format
 * @link https://www.w3.org/TR/encrypted-media/#clear-key-license-format
 *
 * @param {Uint8Array} message Key session message.
 * @returns {Uint8Array} License data.
 */
const generateLicense = (message) => {
  const request = JSON.parse(new TextDecoder().decode(message));
  const keys = [];

  request.kids.forEach((kid) => {
    keys.push({
      kty: 'oct',
      alg: 'A128KW',
      kid,
      k: KEYS[kid],
    });
  });

  return new TextEncoder().encode(JSON.stringify({
    keys,
  }));
};

const video = document.querySelector('video');

/**
 * When browser encounters a PSSH box in the MP4 file,
 * it will emit an `encrypted` event and include any initData
 * that will be used by CDM to generate the license request.
 */
video.addEventListener(
  'encrypted',
  async ({ initDataType, initData }) => {
    const mediaKeySystemAccess = await navigator.requestMediaKeySystemAccess(
      'org.w3.clearkey',
      [
        {
          initDataTypes: ['cenc'],
          videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.640032"' }],
          audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }],
        }
      ],
    );

    const mediaKeys = await mediaKeySystemAccess.createMediaKeys();
    await video.setMediaKeys(mediaKeys);
    const keySession = mediaKeys.createSession();

    keySession.addEventListener('message', async (e) => {
      const license = generateLicense(e.message);
      await keySession.update(license).catch( /* Handle error. */ );
    }, false);

    /**
     * This will prompt the CDM to generate a license request.
     */
    await keySession.generateRequest(initDataType, initData);
  }
);
```

**Note:** The `<video>` source should not be a static file. Instead web browsers usually require that the [Media Source Extensions API] is used to read the encrypted video data.

## What's Next?

[In the next article] we're going to open the topic of playback performance and talk about the Video Playback Quality API and the Media Capabilities API.

[Encrypted Media Extensions API]: https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API
[specification]: https://www.w3.org/TR/encrypted-media/#introduction
[Shaka Packager]: https://github.com/google/shaka-packager
[discussed video formats]: /streaming-basics/#media-chunks-format
[mp4info]: https://www.bento4.com/documentation/mp4info/
[Bento4 toolkit]: https://www.bento4.com/documentation/
[Widevine]: https://www.widevine.com/
[mp4encrypt]: https://www.bento4.com/documentation/mp4encrypt/
[PSSH box]: https://www.w3.org/TR/eme-stream-mp4/#init-data
[license format]: https://www.w3.org/TR/encrypted-media/#clear-key-license-format
[Media Source Extensions API]: /streaming-basics/#media-source-extensions
[In the next article]: /playback-performance/
