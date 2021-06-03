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
 * Fixed size buffer that flushes and resets its internal pointser
 * when it would overflow.
 */
export default class {
  /**
   * @param {number} sizeInBytes Buffer size in bytes.
   */
  constructor(sizeInBytes) {
    this.buffer = {
      pointerPosition: 0,
      size: sizeInBytes,
      uint8: new Uint8Array(sizeInBytes),
    };
    this.buffer.ab = this.buffer.uint8.buffer;
  }

  get bytesLeft() {
    return this.buffer.size - this.buffer.pointerPosition;
  }

  /**
   * @param {Uint8Array} data Data to be added to the buffer.
   */
  add(data) {
    let offset = 0;

    while (offset < data.length) {
      const chunkLength = this.bytesLeft;
      const dataChunk = this.crop(data, [offset, chunkLength]);

      this.buffer.uint8.set(dataChunk, this.buffer.pointerPosition);
      this.buffer.pointerPosition += dataChunk.length;

      if (this.buffer.pointerPosition === this.buffer.size) {
        this.flush();
      }
      offset += chunkLength;
    }
  }

  /**
   * Returns a buffer view represented by the provided bounds.
   *
   * @param {Uint8Array} data        Data to be split by position
   * @param {Array}      offsetData  Bounds of the data view on top of underlying ArrayBuffer.
   * @returns {Uint8Array} A view on the underlying data buffer.
   */
  crop(data, offsetData) {
    const [offset, availableBufferLength] = offsetData;
    const length = Math.min(availableBufferLength, data.length - offset);

    return new Uint8Array(data.buffer, offset, length);
  }

  /**
   * Resets the pointer position and calls `onflush` with current buffer data.
   *
   * @param {object} opts Any options to be piped to callback.
   */
  flush(opts = {}) {
    const data = new Uint8Array(this.buffer.ab, 0, this.buffer.pointerPosition);

    /**
     * We need to clone the data to ensure they are don't change while
     * the `onflush` handlers run.
     */
    const clonedData = this.cloneBuffer(data);

    if (this.onflush) this.onflush(clonedData, opts);
    this.buffer.pointerPosition = 0;
  }

  /**
   * Clones an `Uint8Array` object.
   *
   * @param {Uint8Array} source Source buffer typed array.
   * @returns {Uint8Array} Cloned array;
   */
  cloneBuffer(source) {
    const clone = new Uint8Array(source.length);
    clone.set(source);

    return clone;
  }
}
