/**
 * Helper class to make sure we don't call <SourceBuffer>.appendBuffer()
 * before the last append action finished successfully.
 *
 * Without the queueing system in place the buffer would randomly
 * fail with the following error:
 *
 * `Error: This SourceBuffer is still processing an 'appendBuffer' or 'remove' operation."`
 */
export default class BufferQueue {
  constructor(buffer, mediaSource) {
    this.data = [];
    this.buffer = buffer;
    this.mediaSource = mediaSource;
    this.endStream = false;

    /**
     * Only append more data when the previous append succeeded.
     */
    this.buffer.onupdateend = this.step.bind(this);
  }

  /**
   * Add more data to the internal queue of data
   * waiting to be appended to the buffer.
   *
   * @param {Uint8Array[]} data Binary data.
   */
  add(data) {
    this.data.push(data);
    this.step();
  }

  /**
   * Append another piece of data if the buffer is not
   * in a blocked state.
   */
  step() {
    if (this.buffer.updating) return;
    if (this.data.length) {
      const currentData = this.data.shift();
      if (currentData) this.buffer.appendBuffer(currentData);
    } else if (this.endStream) {
      this.mediaSource.endOfStream();
    }
  }

  /**
   * Signalize that the stream can be ended once
   * all data are appended to the buffer.
   */
  endOfStream() {
    this.endStream = true;
    this.step();
  }
}
