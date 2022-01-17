/**
 * Returns the total download progress for the video.
 *
 * @param {FileMeta[]} fileMetas File meta objects to calculate progress for.
 * @returns {number} Percentage progress for the video in the range 0–100.
 */
export default function getProgress(fileMetas) {
  const pieceValue = 1 / fileMetas.length;
  const percentageProgress = fileMetas.reduce(
    (percentage, fileMeta) => {
      if (fileMeta.done) {
        percentage += pieceValue;
      } else if (fileMeta.bytesDownloaded === 0 || !fileMeta.bytesTotal) {
        percentage += 0;
      } else {
        const percentageOfCurrent = fileMeta.bytesDownloaded / fileMeta.bytesTotal;
        percentage += percentageOfCurrent * pieceValue;
      }
      return percentage;
    },
    0,
  );
  const clampedPercents = Math.max(0, Math.min(percentageProgress, 1));

  return clampedPercents;
}
