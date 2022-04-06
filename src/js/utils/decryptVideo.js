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
 * Converting a regular MP4 video to an encrypted one that will actually
 * play in browsers using MSE+EME is a two-step process.
 *
 * First, we need to fragment the video if its not fragmented already:
 *
 * ```
 * ffmpeg -i video.mp4 -vcodec copy -acodec copy
 * -movflags frag_keyframe+empty_moov+default_base_moof fragmented.mp4
 * ```
 *
 * Then, we need to encrypt the fragmented video and make sure the encrypted MP4
 * contains the PSSH atom. We use Bento4's `mp4encrypt` tool to do this:
 *
 * ```
 * mp4encrypt
 *  --method MPEG-CENC
 *  --key 1:eecdb2b549f02a7c97ce50c17f494ca0:random
 *  --property 1:KID:c77fee35e51fd615a7b91afcb1091c5e
 *  --key 2:9abb7ab6cc4ad3b86c2193dadb1e786c:random
 *  --property 2:KID:045f7ecc35848ed7b3c012ea7614422f
 *  --global-option mpeg-cenc.eme-pssh:true fragmented.mp4 encrypted.mp4
 * ```
 *
 * This example expects the media file to contain exactly two tracks. In our case
 * track `1` is the video, track `2` the audio.
 *
 * Substitute your own keys and KIDs – 32 hex characters each.
 *
 * {@link https://ffmpeg.org/}
 * {@link https://www.bento4.com/documentation/mp4encrypt/}
 */

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

/**
 * Uses Encrypted Media Extensions to decrypt the video.
 *
 * @param {HTMLMediaElement} videoElement                    Video element.
 * @param {object}           encryption                      Encryption data.
 * @param {string}           encryption.src                  Encrypted video source URL.
 * @param {string}           encryption.type                 Encryption type.
 * @param {string}           encryption.mimeCodec            Media MIME type and codec string.
 * @param {object}           encryption.mediaKeySystemConfig Key system config.
 * @param {object}           [encryption.key]                Encryption key.
 * @param {string}           [encryption.key.id]             Key ID as a hexadecimal string.
 * @param {string}           [encryption.key.value]          Key value as a hexadecimal string.
 * @returns {void}
 */
export default function decryptVideo(videoElement, encryption) {
  const handleEncrypted = async ({ initDataType, initData }) => {
    const mediaKeySystemAccess = await navigator.requestMediaKeySystemAccess(
      encryption.type,
      [encryption.mediaKeySystemConfig],
    );
    const mediaKeys = await mediaKeySystemAccess.createMediaKeys();
    await videoElement.setMediaKeys(mediaKeys);

    const keySession = mediaKeys.createSession();
    keySession.addEventListener('message', async (e) => {
      const license = generateLicense(e.message);
      await keySession.update(license).catch(
        /* eslint-disable-next-line no-console */
        (updateError) => console.error(`keySession.update() failed with error: ${updateError}`),
      );
    }, false);
    await keySession.generateRequest(initDataType, initData);
  };

  videoElement.addEventListener('encrypted', handleEncrypted, false);

  if ('MediaSource' in window && MediaSource.isTypeSupported(encryption.mimeCodec)) {
    const mediaSource = new MediaSource();
    videoElement.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', () => {
      const sourceBuffer = mediaSource.addSourceBuffer(encryption.mimeCodec);

      fetch(encryption.src).then((response) => {
        response.arrayBuffer().then((arrayBuffer) => {
          sourceBuffer.addEventListener(
            'updateend',
            () => {
              if (!sourceBuffer.updating && mediaSource.readyState === 'open') {
                mediaSource.endOfStream();
              }
            },
            false,
          );
          sourceBuffer.appendBuffer(arrayBuffer);
        });
      })
        /* eslint-disable-next-line no-console */
        .catch((e) => console.error(`Encrypted media fetch failed with error: ${e}`));
    });
  } else {
    /* eslint-disable-next-line no-console */
    console.error('Unsupported MIME type or codec: ', encryption.mimeCodec);
  }
}
