import '../typedefs';
import iso8601TimeDurationToSeconds from './Duration.module';
import selectRepresentations from '../utils/selectRepresentations';

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
  constructor(manifest, manifestSrc) {
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
    this.baseURL = this.getBaseUrl(manifestSrc);
  }

  /**
   * Returns the directory URL of the current manifest.
   *
   * @param {string} manifestSrc URL of the current manifest.
   *
   * @returns {string} Directory URL of the current manifest.
   */
  getBaseUrl(manifestSrc) {
    const manifestURL = new URL(manifestSrc);
    const manifestPathDir = manifestURL.pathname.replace(/[^/]+$/, ''); // Strip trailing filename.

    return `${manifestURL.origin}${manifestPathDir}`;
  }

  /**
   * Returns the manifest as a Blob.
   *
   * @returns {Blob} Manifest data as a blob.
   */
  toBlob() {
    const manifestMarkup = this.internal.manifest.documentElement.outerHTML;
    return new Blob([manifestMarkup], { type: 'application/dash+xml' });
  }

  /**
   * Returns a list of all chunk files referenced in the manifest.
   *
   * @param {Array[]} additionalFileTuples List of tuples in the format [fileId, URL].
   *
   * @returns {string[]} List of all chunk files referenced in the manifest.
   */
  listAllChunkURLs(additionalFileTuples = [[]]) {
    const repObjects = [...this.internal.root.querySelectorAll('Representation')].map(representationElementToObject);
    const initialSegmentFiles = repObjects.map(getInitialSegment);

    const dataChunkFiles = [];
    repObjects.forEach(
      (rep) => {
        for (let i = 1; i <= rep.maxChunkIndex; i += 1) {
          dataChunkFiles.push(rep.getSegmentByIndex(i));
        }
      },
    );

    const prependBaseURL = (filename) => this.baseURL + filename;
    const fileTuples = [...initialSegmentFiles, ...dataChunkFiles].map(
      (file) => [file, prependBaseURL(file)],
    );
    return [...fileTuples, ...additionalFileTuples];
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

  /**
   * Removes all `Representation` elements other than one for video and optionally
   * one for audio from the manifest.
   *
   * @returns {boolean} Whether the operation succeeded.
   */
  prepareForOffline() {
    const targetResolutionW = 1280;

    /**
     * This process is potentially destructive. Clone the root <MPD> element first.
     */
    const RootElementClone = this.internal.root.cloneNode(true);
    const videoAdaptationSets = [...RootElementClone.querySelectorAll('AdaptationSet[contentType="video"]')];
    const audioAdaptationSets = [...RootElementClone.querySelectorAll('AdaptationSet[contentType="audio"]')];

    /**
     * Remove all video and audio Adaptation sets apart from the first ones.
     */
    const videoAS = videoAdaptationSets.shift();
    const audioAS = audioAdaptationSets.shift();
    [...videoAdaptationSets, ...audioAdaptationSets].forEach(
      (as) => as.parentNode.removeChild(as),
    );

    /**
     * Remove all but first audio representation from the document.
     */
    if (audioAS) {
      const audioRepresentations = [...audioAS.querySelectorAll('Representation')];
      audioRepresentations.shift();
      audioRepresentations.forEach(
        (rep) => rep.parentNode.removeChild(rep),
      );
    }

    /**
     * Select the video representation closest to the target resolution and remove the rest.
     */
    if (videoAS) {
      const videoRepresentations = selectRepresentations(this).video;
      if (!videoRepresentations) return false;
      let candidate;

      videoRepresentations.forEach(
        (videoRep) => {
          const satisifiesTarget = Number(videoRep.width) >= targetResolutionW;
          const lessData = Number(videoRep.bandwidth) < Number(candidate?.bandwidth || Infinity);

          if (satisifiesTarget && lessData) {
            candidate = videoRep;
          }
        },
      );

      if (!candidate) return false;

      while (videoAS.firstChild) videoAS.removeChild(videoAS.firstChild);
      videoAS.appendChild(candidate.element);
    }

    /**
     * Everything was OK, assign the altered document as root again.
     */
    this.internal.root.innerHTML = RootElementClone.innerHTML;
    return true;
  }
}
