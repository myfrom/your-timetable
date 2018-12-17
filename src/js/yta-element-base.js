/**
 * Provides base functionality for elements, such as
 * `_fire`, `_waitFor` functions
 * 
 * @module yta/element-base
 * @param {Class} superclass - Class to be extended from
 * @returns {Class} Extended class
 * @mixinFunction
 */

import { UIStateStore } from "./redux-stores.js";

export default function(superclass) {
  return class YTAElementBase extends superclass {

    constructor() {
      super();
    }

    /**
     * Get the current device type for layout,
     * available: 'phone', 'tablet', 'desktop'
     */
    get layout() {
      return UIStateStore.getState().layout;
    }

    /**
     * Basic event dispatching functionality,
     * streamlined into one function
     * 
     * @param {string} name - Name of the event
     * @param {*} [detail=null] - Details of the object
     * @param {boolean} [bubbles=true]
     * @param {Element} [target=this] - Element on which the event should fire
     */
    _fire(name, detail = null, bubbles = true, target) {
      target = target || this;
      const evt = new CustomEvent(name, { detail, bubbles, composed: true });
      target.dispatchEvent(evt);
    }

    /**
     * Wait for an YTA class to get loaded
     * 
     * @param {string} classname - Name of the class to wait for
     * @returns {Promise} A Promise that resolves when specified YTA class loads
     */
    _waitUntilReady(classname) {
      return new Promise(r => 
        window.addEventListener(classname + 'ready', r, { once: true }));
    }
  }
}