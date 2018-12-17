/** @module */

import { PolymerElement, html } from '@polymer/polymer';
import '@polymer/polymer/lib/elements/dom-repeat.js';

import dayjs from 'dayjs';
import dayjsPluginUTC from "dayjs-plugin-utc";
dayjs.extend(dayjsPluginUTC, { parseToLocal: true });

import { DataStoreMixin } from "../js/redux-stores.js";

import ElementContent from './yta-timetable-page.el.html';

/**
 * @customElement
 * @polymer
 * @extends {PolymerElement} 
 */
class YTATimetablePage extends DataStoreMixin(PolymerElement) {
  static get is() { return 'yta-timetable-page'; }
  static get template() {
    const template = document.createElement('template');
    template.innerHTML = ElementContent;
    return template;
  }
  static get properties() {
    return {
      
      data: {
        type: Object,
        statePath: state => state
      }
      
    };
  }

  constructor() {
    super();
  }
  
  connectedCallback() {
    super.connectedCallback();
  }
  
  viewReadable(time) {
    const ampm = this.data.settings.use12hoursClock;
    return dayjs.utc(time)
      .format(`${ampm ? 'hh' : 'HH'}:mm${ampm ? ' a' : ''}`);
  }

  _getTt(tt) {
    const timetable = tt.slice(0);
    switch (Number(this.data.settings.firstDayOfWeek)) {
      case 1:
        timetable.push(timetable.shift());
        break;
      case 6:
        timetable.unshift(timetable.pop());
        break;
    }
    const output = [];
    timetable.forEach(item => {
      if (item) output.push(item);
    });
    return output;
  }
  
  _getDayName(item) {
    const day = this.data.timetable.indexOf(item);
    return dayjs().set('d', day).format('dddd');
  }
  
  _pickLessonColor(name) {
    let config = this.data.config;
    return config[name].color;
  }
}

customElements.define(YTATimetablePage.is, YTATimetablePage);