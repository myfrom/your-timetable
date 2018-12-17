/** @module */

import { PolymerElement } from '@polymer/polymer';
import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';

import '@polymer/iron-flex-layout/iron-flex-layout.js';

import './yta-lesson-card.js';

import dayjs from 'dayjs';
import dayjsPluginUTC from "dayjs-plugin-utc";
dayjs.extend(dayjsPluginUTC, { parseToLocal: true });

import YTAElementBase from '../js/yta-element-base.js';
import { DataStoreMixin } from '../js/redux-stores.js';

import ElementContent from './yta-overview-page.el.html';

/**
 * @customElement
 * @polymer
 * @extends {PolymerElement} 
 * @appliesMixin YTAElementBase
 * @fires YTAOverviewPage#overviewpageready
 */
class YTAOverviewPage extends DataStoreMixin(YTAElementBase(PolymerElement)) {
  static get is() { return 'yta-overview-page'; }
  static get template() {
    const template = document.createElement('template');
    template.innerHTML = ElementContent;
    return template;
  }
  static get properties() {
    return {
      
      // Inherited from MainView
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
    /** @event YTAOverviewPage#overviewpageready */
    this._fire('overviewpageready', null, true, window);
    window.AppState.readyCheck.overviewpage = true;
  }
  
  lessonsToday(tt, events) {
    if (tt == null) {
      return [];
    } else {
      const timetable = Object.assign({}, tt);
      let day = dayjs().day(),
          showHeader = false,
          firstRun = true;
      for (let i = 0; i < 7; i++) {
        if (events) {
          Object.keys(events).forEach(key => {
            if (!key) return;
            const event = events[key];
            if (event.change && event.date === dayjs().add(i, 'd').format('YYYY-MM-DD')) {
              const eventDay = dayjs(event.date).day();
              timetable[eventDay][event.lesson] = event.to ? event.to : undefined;
            }
          });
        }
        if (timetable[day] !== 0) {
          const minute = dayjs().minute(),
                hour = dayjs().hour(),
                time = dayjs().utc().set({year: 1970, month: 0, date: 1, minute, hour}).valueOf();
          if (!firstRun || timetable[day][timetable[day].length - 1].endTime > time) {
            if (!firstRun) this._showHeader(day);
            return timetable[day];
          }
        }
        day = day === 6 ? 0 : day + 1;
        firstRun = false;
      }
    }
  }
  
  viewReadable(time) {
    const ampm = this.data.settings.use12hoursClock;
    return dayjs.utc(time)
      .format(`${ampm ? 'hh' : 'HH'}:mm${ampm ? ' a' : ''}`);
  }

  _showHeader(day) {
    requestAnimationFrame(() => {
      const header = this.shadowRoot.querySelector('h2');
      if (header) {
        header.textContent = dayjs().set('d', day).format('dddd');
      } else {
        const el = document.createElement('h2');
        el.textContent = dayjs().set('d', day).format('dddd');
        this.shadowRoot.insertBefore(el, this.shadowRoot.firstChild);
      }
    });
  }
  
  _pickLessonColor(name) {
    const config = this.data.config;
    return config[name].color;
  }
}

customElements.define(YTAOverviewPage.is, YTAOverviewPage);