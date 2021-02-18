import iso8601TimeDurationToSeconds from './Duration.module';

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

  getMinBufferTime() {
    const minBufferTimeDuration = this.internal.root.getAttribute('minBufferTime');
    const minBufferTimeSeconds = iso8601TimeDurationToSeconds(minBufferTimeDuration);

    return minBufferTimeSeconds || 3;
  }

  getDuration() {
    const duration = this.internal.root.getAttribute('mediaPresentationDuration');
    const durationInSeconds = iso8601TimeDurationToSeconds(duration);

    return durationInSeconds;
  }

  queryRepresentations(representationQuery, contentType, lang = null) {
    let adaptationSetsQuery = `AdaptationSet[contentType="${contentType}"]`;
    if (lang) adaptationSetsQuery += `[lang="${lang}"]`;

    const adaptationSet = this.internal.root.querySelector(adaptationSetsQuery);
    if (!adaptationSet) return [];

    const representationElements = [...adaptationSet.querySelectorAll(`Representation${representationQuery}`)];

    return representationElements.map(
      // For each <Representation> return an object mapping its attributes to values.
      (representation) => [...representation.attributes].reduce(
        (carry, attr) => {
          carry[attr.name] = attr.value;
          return carry;
        },
        {},
      ),
    );
  }
}
