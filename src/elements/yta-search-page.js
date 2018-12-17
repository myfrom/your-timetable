/** @module */

import { PolymerElement, html } from '@polymer/polymer';
import '@polymer/polymer/lib/elements/dom-repeat.js';

import '@polymer/iron-icon/iron-icon.js';

import '@polymer/paper-styles/paper-styles.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item-body.js';

import dayjs from 'dayjs';
import dayjsPluginUTC from "dayjs-plugin-utc";
dayjs.extend(dayjsPluginUTC, { parseToLocal: true });

import { YTALocalizeMixin } from '../js/yta-localize-mixin.js';
import { DataStoreMixin } from "../js/redux-stores.js";

import ElementContent from './yta-search-page.el.html';

/**
 * @customElement
 * @polymer
 * @extends {PolymerElement}
 * @appliesMixin YTALocalizeMixin
 */
class YTASearchPage extends DataStoreMixin(YTALocalizeMixin(PolymerElement)) {
  static get is() { return 'yta-search-page'; }
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
      },

      _results: Object
      
    };
  }
  
  constructor() {
    super();
  }

  searchEvent(e) {
    if (this._runningSearch) clearTimeout(this._runningSearch);
    this._runningSearch = setTimeout(() => {
      const data = this.data
      const query = this.shadowRoot.querySelector('#search paper-input').value;
      if (query === '') {
        this._results = [];
        return;
      };
      const results = [];
      data.timetable.forEach((day, dayIndex) => {
        if (day) {
          day.forEach((lesson, lessonIndex) => {
            if (lesson.name.includes(query) || (lesson.teacher && lesson.teacher.includes(query)) || (lesson.classroom && lesson.classroom.includes(query))) {
              results.push(Object.assign(lesson, {
                day: dayIndex,
                lesson: lessonIndex
              }));
            }
          });
        }
      });
      if (data.events) {
        Object.keys(data.events).forEach(key => {
          if (!data.events[key]) return;
          if (data.events[key].name.includes(query))
            results.unshift(Object.assign(data.events[key], { isEvent: true }));
        });
      }
      this._results = results;
    }, 0);
  }

  _displayReadable(day, startTime, endTime) {
    const firstDayOfWeek = this.data.settings.firstDayOfWeek;
    return dayjs().set('d', day).format('dddd, ') + this._readTime(startTime) + ' - ' + this._readTime(endTime);
  }

  _readTime(time, use12hoursClock = false) {
    const ampm = this.data.settings.use12hoursClock;
    return dayjs.utc(time)
      .format(`${ampm ? 'hh' : 'HH'}:mm${ampm ? ' a' : ''}`);
  }

  _readDate(date) {
    date = dayjs(date);
    return date.format('ddd, MMM D YYYY');
  }

  _readLesson(event) {
    const day = dayjs(event.date).day(),
          index = event.lesson,
          timetable = this.data.timetable[day];
    return timetable ? `${index + 1}. ${timetable[index].name}`
                     : this.localize('add_all-day');
  }

  _readIndex(i) {
    return i + 1;
  }
}

customElements.define(YTASearchPage.is, YTASearchPage);