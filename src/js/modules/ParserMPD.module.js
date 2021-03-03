import iso8601TimeDurationToSeconds from './Duration.module';

/**
 * Replaces MPD variables in the chunk URL string with proper values.
 *
 * @param {string} chunkURL             URL of the chunk file with MPD variable intact.
 * @param {object} representationObject Representation object.
 * @param {number} chunkIndex           Index of the chunk to be returned.
 *
 * @returns {string} Interpolated chunk URL.
 */
const interpolateChunkURL = (chunkURL, representationObject, chunkIndex = 0) => {
  chunkIndex = chunkIndex.toString();

  const replaceTuples = [
    [/\$RepresentationID\$/, representationObject.id],
    [/\$Number%([0-9]+)d\$/, (_, repeats) => chunkIndex.padStart(parseInt(repeats, 10), 0)],
  ];

  replaceTuples.forEach(
    ([from, to]) => {
      chunkURL = chunkURL.replace(from, to);
    },
  );
  return chunkURL;
};

/**
 * Returns the segment filename based on the index requested.
 *
 * @param {object} representationObject Representation object.
 * @param {number} index                Chunk index.
 *
 * @returns {string} Interpolated chunk filename.
 */
const getSegmentByIndex = (representationObject, index) => {
  const segmentTemplate = representationObject.element.querySelector('SegmentTemplate');
  const chunkURLTemplate = segmentTemplate.getAttribute('media');

  return interpolateChunkURL(chunkURLTemplate, representationObject, index);
};

/**
 * Returns the initial segment filename.
 *
 * @param {RepresentationObject} representationObject Representation object.
 *
 * @returns {string} Interpolated chunk filename.
 */
const getInitialSegment = (representationObject) => {
  const segmentTemplate = representationObject.element.querySelector('SegmentTemplate');
  const chunkURLTemplate = segmentTemplate.getAttribute('initialization');

  return interpolateChunkURL(chunkURLTemplate, representationObject);
};

/**
 * Returns the index of the segment that corresponds with the provided time.
 *
 * @param {RepresentationObject} representationObject         The representation object.
 * @param {Element}              representationObject.element The <Representation> element.
 * @param {number}               time                         Time in seconds.
 *
 * @returns {number} Chunk index.
 */
const getSegmentIndexByTime = (representationObject, time) => {
  const segmentTemplate = representationObject.element.querySelector('SegmentTemplate');
  const segmentTimeline = segmentTemplate.querySelector('SegmentTimeline');
  const segmentElements = [...segmentTimeline.querySelectorAll('S')];
  const timescale = Number(segmentTemplate.getAttribute('timescale'));

  if (!timescale) return null;

  const requestedTimeInTimescale = time * timescale;

  let currentStart = 0;
  let currentEnd = 0;
  let currentIndex = 1;
  let returnIndex = null;

  /**
   * Iterate over all <S> elements and find out which <S>
   * element corresponds with the provided `time`.
   *
   * Then figure out the chunk index based on information
   * associated with the `<S>` element.
   */
  segmentElements.forEach(
    (segmentEl) => {
      const duration = Number(segmentEl.getAttribute('d'));
      const repeats = Number(segmentEl.getAttribute('r') || '0') + 1;

      currentStart = Number(segmentEl.getAttribute('t')) || currentStart;
      currentEnd = currentStart + (duration * repeats);

      if (requestedTimeInTimescale >= currentStart && requestedTimeInTimescale < currentEnd) {
        const timeIntoSegment = requestedTimeInTimescale - currentStart;
        returnIndex = currentIndex + Math.floor(timeIntoSegment / duration);
      }

      currentIndex += repeats;
      currentStart = currentEnd;
    },
  );

  return returnIndex;
};

/**
 * @typedef  {object}  RepresentationObject
 * @property {string}  id                    Representation ID.
 * @property {string}  mimeType              Representation MIME type.
 * @property {string}  codecs                Representation codec.
 * @property {string}  bandwidth             Bandwidth in bits required to play media.
 * @property {string}  width                 [Video] Width of the video frame.
 * @property {string}  height                [Video] Height of the video frame.
 * @property {string}  frameRate             [Video] Framerate.
 * @property {string}  audioSamplingRate     [Audio] Audio sampling rate.
 * @property {Element} element               The <Representation> element.
 * @property {number}  maxChunkIndex         The last media chunk index.
 */

/**
 * Converts the <Represenetation> element from the MPD to a more
 * structured `representation` object containing information associated
 * with the representation.
 *
 * @param {Element} representationElement The <Representation> element from MPD.
 *
 * @returns {RepresentationObject} Representation object.
 */
const representationElementToObject = (representationElement) => {
  const representation = [...representationElement.attributes].reduce(
    (carry, attr) => {
      carry[attr.name] = attr.value;
      return carry;
    },
    {},
  );

  representation.element = representationElement;
  representation.maxChunkIndex = [...representationElement.querySelectorAll('S')].reduce(
    (chunkIndex, segmentEl) => chunkIndex + 1 + Number(segmentEl.getAttribute('r') || '0'),
    0,
  );

  representation.getInitialSegment = getInitialSegment.bind(null, representation);
  representation.getSegmentByIndex = getSegmentByIndex.bind(null, representation);
  representation.getSegmentIndexByTime = getSegmentIndexByTime.bind(null, representation);

  return representation;
};

export default class {
  constructor(manifest) {
    const domParser = new DOMParser();

    this.internal = {};
    this.internal.manifest = domParser.parseFromString(manifest, 'text/xml');
    this.internal.bandwidth = 10 * 1000 * 1000; // Assume broadband connection.

    this.internal.root = this.internal.manifest.querySelector('MPD');
    if (!this.internal.root) {
      throw new Error('[ParserMPD] Invalid manifest document');
    }
    if (this.internal.root.querySelectorAll('Period').length > 1) {
      throw new Error('[ParserMPD] Manifests containing more than one <Period> are not yet supported.');
    }

    // Public properties.
    this.minBufferTime = this.getMinBufferTime();
    this.duration = this.getDuration();
  }

  /**
   * Returns the minimum healthy buffer duration.
   *
   * @returns {number} Healthy buffer duration.
   */
  getMinBufferTime() {
    const minBufferTimeDuration = this.internal.root.getAttribute('minBufferTime');
    const minBufferTimeSeconds = iso8601TimeDurationToSeconds(minBufferTimeDuration);

    return minBufferTimeSeconds || 3;
  }

  /**
   * Returns the duration of the whole media in seconds.
   *
   * @returns {number} Media duration.
   */
  getDuration() {
    const duration = this.internal.root.getAttribute('mediaPresentationDuration');
    const durationInSeconds = iso8601TimeDurationToSeconds(duration);

    return durationInSeconds;
  }

  /**
   * Queries the representations.
   *
   * @param {string} representationQuery Query representation attrs, e.g. '[mimeType="video/webm"]'
   * @param {string} contentType         Requested content type, e.g. 'video'.
   * @param {string} lang                Requested language.
   *
   * @returns {RepresentationObject[]} Representation objects.
   */
  queryRepresentations(representationQuery, contentType, lang = '') {
    let adaptationSetsQuery = `AdaptationSet[contentType="${contentType}"]`;
    if (lang) adaptationSetsQuery += `[lang="${lang}"]`;

    const adaptationSet = this.internal.root.querySelector(adaptationSetsQuery);
    if (!adaptationSet) return [];

    const representationElements = [...adaptationSet.querySelectorAll(`Representation${representationQuery}`)];
    const representationObjects = representationElements.map(representationElementToObject);

    return representationObjects;
  }
}
