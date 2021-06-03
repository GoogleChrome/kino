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
 * Converts ISO 8601 time only (!) duration string to seconds.
 *
 * Example:
 *
 * "PT20.4S" -> 20.4
 * "PT14M41.6S" -> 881.6
 *
 * @param {string} duration Duration in the ISO 8601 format. Time only.
 * @returns {number} Number of seconds.
 * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
 */
function iso8601TimeDurationToSeconds(duration) {
  const partToSeconds = {
    H: 3600,
    M: 60,
    S: 1,
  };
  let seconds = 0;
  let currentValue = '';

  [...duration].forEach(
    (char) => {
      if (Object.keys(partToSeconds).includes(char)) {
        seconds += parseFloat(currentValue) * partToSeconds[char];
        currentValue = '';
      } else if (char.match(/^[0-9.,]$/)) {
        currentValue += char;
      }
    },
  );
  return seconds;
}

export default iso8601TimeDurationToSeconds;
