/** @module */

/**
 * A promise that resolves once a CSS animation has finished
 * 
 * @param {HTMLElement} element - Element that's animating
 * @returns {Promise<Error|null>} A promise that resolves once animation has finished
 */
export function waitForAnimationFinish(element) {
  return new Promise((resolve, reject) => {
    if (!('addEventListener' in element)) {
      reject(new Error('Can\'t set event listener on referenced element'));
      return;
    }
    element.addEventListener('animationend', r, { once: true });
  });
}

/**
 * A promise that resolves once a CSS animation has hit next iteration
 * 
 * @param {HTMLElement} element - Element that's animating
 * @returns {Promise<Error|null>} A promise that resolves once animation has hit next iteration
 */
export function waitForAnimationIteration(element) {
  return new Promise((resolve, reject) => {
    if (!('addEventListener' in element)) {
      reject(new Error('Can\'t set event listener on referenced element'));
      return;
    }
    element.addEventListener('animationiteration', r, { once: true });
  });
}

/**
 * A promise that resolves once a CSS tranistion has finished
 * 
 * @param {HTMLElement} element - Element that's animating
 * @returns {Promise<Error|null>} A promise that resolves once tranistion has finished
 */
export function waitForTranistionFinish(element) {
  return new Promise((resolve, reject) => {
    if (!('addEventListener' in element)) {
      reject(new Error('Can\'t set event listener on referenced element'));
      return;
    }
    element.addEventListener('tranistionend', r, { once: true });
  });
}

/**
 * Wait specific number of seconds
 * 
 * @param {number} ms - Number of miliseconds to wait
 * @returns {Promise} A promise that resolves after set number of seconds
 */
export function waitMs(ms) {
  return new Promise(r => setTimeout(r, ms));
}