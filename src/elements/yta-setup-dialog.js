/** @module */

import { PolymerElement, html } from '@polymer/polymer';
import '@polymer/polymer/lib/elements/dom-repeat.js';

import '@polymer/iron-selector/iron-selector.js';

import '@polymer/paper-styles/paper-styles.js'; // Replace with smaller package
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-spinner/paper-spinner-lite.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';

import '@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light.js';

import dayjs from 'dayjs';

import YTAElementBase from '../js/yta-element-base.js';
import { YTALocalizeMixin } from '../js/yta-localize-mixin.js';
import { UIStateStore, DataStoreMixin, DataStore, DataActions } from "../js/redux-stores.js";
import { waitMs } from '../js/wait-utils.js';

import ElementContent from './yta-setup-dialog.el.html';

/**
 * @customElement
 * @polymer
 * @extends {PolymerElement}
 * @appliesMixin YTALocalizeMixin
 * @appliesMixin YTAElementBase
 */
class YTASetupDialog extends DataStoreMixin(YTALocalizeMixin(YTAElementBase(PolymerElement))) {
  static get is() { return 'yta-setup-dialog'; }
  static get template() {
    const template = document.createElement('template');
    template.innerHTML = ElementContent;
    return template;
  }
  static get properties() {
    return {
      
      // Days in which user goes to school
      weekDays: {
        type: Array,
        value: () => []
      },
      
      // User data
      appData: {
        type: Object,
        statePath: state => state
      },
      
      // Arrays of lessons in certain days contained in array
      _lessonsOnDays: {
        type: Array,
        value: () => []
      },
      
      // Lesson names and their info that was used in any field
      _lessonsInfo: {
        type: Array,
        value: () => []
      }
    };
  }

  constructor() {
    super();
  }
  
  ready() {
    super.ready();
    
    // Init variables with defaults
    this.weekDays = ['1','2','3','4','5'];
    this._lessonTime = 2700000;
    this._breakTime = 600000;
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    // Add event listeners
    window.appShell.addEventListener('open-setup-dialog', () => this.open());
    window.appShell.addEventListener('close-setup-dialog', () => this.close());
    
    // Init worker
    this._worker = new Worker('/src/js/depr-setup-dialog-worker.js');
    
    // Async check l10n
    setTimeout(async () => {
      // Start loading locale ahead of time
      if (navigator.language !== 'en-US') var localeDownload = this._loadLocale(navigator.language);
      // Reference menu elements
      const firstDayOfWeekEl = this.shadowRoot.querySelector('#firstDayOfWeek > paper-listbox'),
            clock12El = this.$.clock12;
      // Make sure correct locale is loaded
      if (navigator.language !== 'en-US') {
        await localeDownload;
      }
      // Read l10n
      // firstDayOfWeekEl.selected = moment.localeData().firstDayOfWeek(); FIXME: Requires workaround
      clock12El.checked = new Date().toLocaleString().slice(-1) === 'M';
    }, 0);
  }
  
  disconnectedCallback() {
    if (!window.appShell) return;
    
    // Remove event listeners
    window.appShell.removeEventListener('open-setup-dialog', () => this.open());
    window.appShell.removeEventListener('close-setup-dialog', () => this.close());
    
    // Kill worker
    this._worker.terminate();
  }
  
  open() {
    this.style.transition = 'transform 200ms ease-out';
    this._computeTransitionTimes();
    requestAnimationFrame(() => { 
      this.classList.add('open');
    });
  }
  
  close() {
    this.style.transition = 'transform 200ms ease-in';
    this._computeTransitionTimes();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.classList.remove('open');
      });
    });
    waitMs(300).then(() => this.remove());
  }
  
  _afterInit() {
    const firstDayOfWeek = this.shadowRoot.querySelector('#firstDayOfWeek > paper-listbox').selected;
    if (!firstDayOfWeek) {
      this.$.firstDayOfWeek.invalid = true;
      return;
    }
    DataStore.dispatch(DataActions.settings({
      use12hoursClock: this.$.clock12.checked,
      firstDayOfWeek
    }));
    this._openWaiter();
    this.$.init.style.display = 'none';
    this.$.daySection.style.display = 'block';
    this.weekDays.sort((a,b) => {
      switch (Number(firstDayOfWeek)) {
        case 1:
          a = a == 0 ? 6 : Number(a) - 1;
          b = b == 0 ? 6 : Number(b) - 1;
          return a - b;
        case 0:
          return Number(a) - Number(b);
        case 6:
          a = a == 6 ? 0 : Number(a) + 1;
          b = b == 6 ? 0 : Number(b) + 1;
          return a - b;
      }
    });
    this._currentEditedDay = Number(this.weekDays.shift());
    const dayReadable = dayjs().set('d', this._currentEditedDay).format('dddd');
    this.$.daySection.children[0].textContent = `${this.localize('setup_enterLessonsOn')} ${dayReadable}`;;
    this.$.daySection.children[1].items = this._lessonsOn(this._currentEditedDay);
    this._closeWaiter();
  }
  
  _openWaiter() {
    const waiter = this.$.spinner,
          spinner = waiter.children[0];
    spinner.active = true;
    waiter.setAttribute('class', 'right');
    waiter.setAttribute('style', '');
    waiter.classList.add('animate');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        waiter.classList.remove('right');
      });
    }));
  }
  
  _closeWaiter() {
    const waiter = this.$.spinner,
          spinner = waiter.children[0];
    spinner.active = false;
    waiter.setAttribute('class', 'animate hidden');
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          waiter.style.display = 'none';
        });
      });
    }, 250);
  }
  
  _lessonsOn(day) {
    const emptyDay = [{},{},{},{},{},{},{},{}];
    if (this._lessonsOnDays.length === 0) this._lessonsOnDays = [emptyDay,emptyDay,emptyDay,emptyDay,emptyDay,emptyDay,emptyDay];
    if (this._lessonsOnDays[day].length === 0) this._lessonsOnDays[day] = [{},{},{},{},{},{},{},{}];
    return this._lessonsOnDays[day];
  }
  
  _computeTransitionTimes() {
    if (this._lastTransTimeChange &&
        this._lastTransTimeChange[0] === this.layout === 'tablet' &&
        this._lastTransTimeChange[1] === this.layout === 'desktop')
    {
      return;
    }
    if (this.layout === 'tablet') {
      this.style.transitionDuration = '260ms';
    } else if (this.layout === 'desktop') {
      this.style.transitionDuration = '150ms';
    } else {
      this.style.transitionDuration = '200ms';
    }
    this._lastTransTimeChange = [this.layout === 'tablet', this.layout === 'desktop'];
  }
  
  _addLesson(e) {
    const day = this._currentEditedDay;
    this._lessonsOnDays[day].push({});
    this.notifySplices('_lessonsOnDays');
    this._refreshDayPlaceholder(day);
  }
  
  _removeLesson(e) {
    const day = this._currentEditedDay;
    const lesson = e.target.parentElement.l;
    this._lessonsOnDays[day].splice(lesson, 1);
    this.notifySplices('_lessonsOnDays');
    this._refreshDayPlaceholder(day);
  }
  
  _refreshDayPlaceholder(day) {
    this.shadowRoot.querySelector('.lesson-placeholder').render();
  }
  
  _processCustomLessonInputValue(e) {
    if (!e.detail || e.detail == {}) return;
    const val = e.detail;
    const capVal = val.charAt(0).toUpperCase() + val.slice(1);
    e.preventDefault();
    this.push('_lessonsInfo', { name: capVal });
    e.target.value = capVal;
  }
  
  _changeFirstDayOfWeek(e) {
    const weekDays = this.shadowRoot.querySelector('#weekDays'),
          sat = this.shadowRoot.querySelector('#weekDays [i="6"]'),
          sun = this.shadowRoot.querySelector('#weekDays [i="0"]');
    switch (e.detail.value) {
      case "Saturday":
        weekDays.insertBefore(sun, weekDays.firstChild);
        weekDays.insertBefore(sat, weekDays.firstChild);
        break;
      case "Sunday":
        weekDays.appendChild(sat);
        weekDays.insertBefore(sun, weekDays.firstChild);
        break;
      case "Monday":
        weekDays.appendChild(sat);
        weekDays.appendChild(sun);
        break;
    }
    this.$.firstDayOfWeek.invalid = false;
  }
  
  _lessonSet(e) {
    let lessonWrapper = e.target;
    while (!lessonWrapper.classList.contains('lesson'))
      lessonWrapper = lessonWrapper.parentElement;
    const lessonIndex = lessonWrapper.getAttribute('l'),
          val = e.target.value;
    if (!val) return;
    this._askWorker([val, this._lessonsInfo]).then(result => {
      if (result.data.class) {
        this.shadowRoot.querySelector(`[l="${lessonIndex}"] .class-input`).value = result.data.class;
      }
      if (result.data.teacher) {
        this.shadowRoot.querySelector(`[l="${lessonIndex}"] .teacher-input`).value = result.data.teacher;
      }
    });
    if (lessonIndex == 0) return;
    const lastLessonEnds = this.shadowRoot.querySelector(`[l="${lessonIndex - 1}"] .end-time-input`).value;
    if (!lastLessonEnds) return;
    this._askWorker([this._lessonTime, this._breakTime, lastLessonEnds], 'calculateTime').then(result => {
      this.shadowRoot.querySelector(`[l="${lessonIndex}"] .start-time-input`).value = result.data[0];
      this.shadowRoot.querySelector(`[l="${lessonIndex}"] .end-time-input`).value = result.data[1];
    });
  }

  _proceed() {
    this._openWaiter();
    const day = this._currentEditedDay,
          output = [],
          config = this.appData.config || {},
          inputs = this.shadowRoot.querySelectorAll('.lesson'),
          colorsPalette =
            [
              '#f44336', '#E91E63', '#9c27b0', '#3f51b5', '#2196F3',
              '#009688', '#ff9800', '#ff5722', '#795548', '#4caf50'
            ];
    let availableColors = colorsPalette;
    inputs.forEach((lesson, index) => {
      const lessonIndex = lesson.getAttribute('l'),
            lessonName = this.shadowRoot.querySelector(`[l="${lessonIndex}"] .lesson-name-input`).value;
      if (!lessonName) return;
      const startTimeVal = this.shadowRoot.querySelector(`[l="${lessonIndex}"] .start-time-input`).value,
            endTimeVal = this.shadowRoot.querySelector(`[l="${lessonIndex}"] .end-time-input`).value;
      if (!startTimeVal || !endTimeVal) {
        window.alert('Make sure you filled all time inputs'); // Think of switching to internal alert manager
        this._closeWaiter();
        return;
      }
      const date = new Date(0),
            startTimeRegExp = startTimeVal.match(/(\d+):(\d+)/),
            endTimeRegExp = endTimeVal.match(/(\d+):(\d+)/),
            startTimeUnix = date.setUTCHours(startTimeRegExp[1], startTimeRegExp[2]),
            endTimeUnix = date.setUTCHours(endTimeRegExp[1], endTimeRegExp[2]);
      output.push({
        name: lessonName,
        classroom: this.shadowRoot.querySelector(`[l="${lessonIndex}"] .class-input`).value,
        teacher: this.shadowRoot.querySelector(`[l="${lessonIndex}"] .teacher-input`).value,
        startTime: startTimeUnix,
        endTime: endTimeUnix
      });
      this.shadowRoot.querySelector(`[l="${lessonIndex}"] .lesson-name-input`).value = undefined;
      this.shadowRoot.querySelector(`[l="${lessonIndex}"] .class-input`).value = undefined;
      this.shadowRoot.querySelector(`[l="${lessonIndex}"] .teacher-input`).value = undefined;
      this.shadowRoot.querySelector(`[l="${lessonIndex}"] .start-time-input`).value = undefined;
      this.shadowRoot.querySelector(`[l="${lessonIndex}"] .end-time-input`).value = undefined;
      if (!config[lessonName]) {
        if (availableColors.length === 0) availableColors = colorsPalette;
        config[lessonName] = { color: availableColors.pop() };
      }
    });
    DataStore.dispatch(DataActions.config(config));
    const timetable = this.appData.timetable.slice(0);
    output.forEach((item, index) => {
      output[index] = Object.keys(item)
                            .filter(key => typeof item[key] !== 'undefined')
                            .reduce((res, key) => Object.assign(res, { [key]: item[key] }), {});
    });
    if (output.length)
      timetable[day] = output;
    for (let i = 0; i < timetable[day].length; i++) {
      DataStore.dispatch(DataActions.modifyLesson(day, i, timetable[day][i]));
    }
    if (this.weekDays.length === 0) {
      // Save and exit setup
      this._fire('switchsection', { action: 'closeSetupDialog' }, false, window.appShell);
    } else {
      // Open another input page for next day
      this._currentEditedDay = Number(this.weekDays.shift());
      const dayReadable = dayjs().set('d', this._currentEditedDay).format('dddd');
      this.$.daySection.children[0].textContent = `${this.localize('setup_enterLessonsOn')} ${dayReadable}`;
      this.shadowRoot.querySelector('#daySection dom-repeat').items = this._lessonsOn(this._currentEditedDay);
      this.$.main.scrollTop = 0;
    }
    this._closeWaiter();
  }
  
  _computeNewInputTeacher(e) {
    this._updateLessonsInfo('teacher', e);
  }
  
  _computeNewInputClass(e) {
    this._updateLessonsInfo('class', e);
  }
  
  _computeNewInputTime(e) {
    const val = e.target.value;
    if (!val) return;
    const lessonIndex = e.target.parentElement.parentElement.parentElement.getAttribute('l'),
          startTime = this.shadowRoot.querySelector(`[l="${lessonIndex}"] .start-time-input`),
          endTime = this.shadowRoot.querySelector(`[l="${lessonIndex}"] .end-time-input`);
    endTime.invalid = false;
    startTime.invalid = false;
    if (!startTime.value || !endTime.value) return;
    const date = new Date(0),
                 startTimeRegExp = startTime.value.match(/(\d+):(\d+)/),
                 endTimeRegExp = endTime.value.match(/(\d+):(\d+)/),
                 startTimeUnix = date.setUTCHours(startTimeRegExp[1], startTimeRegExp[2]),
                 endTimeUnix = date.setUTCHours(endTimeRegExp[1], endTimeRegExp[2]);
    if (startTimeUnix >= endTimeUnix) {
      endTime.invalid = true;
      startTime.invalid = true;
      return;
    }
    this._lessonTime = endTimeUnix - startTimeUnix;
    if (lessonIndex != 0) {
      const lastLessonVal = this.shadowRoot.querySelector(`[l="${lessonIndex - 1}"] .end-time-input`).value;
      if (!lastLessonVal) return;
      const lastLessonEndsRegExp = lastLessonVal.match(/(\d+):(\d+)/),
            lastLessonEnds = date.setUTCHours(lastLessonEndsRegExp[1], lastLessonEndsRegExp[2]);
      if (startTimeUnix <= lastLessonEnds) {
        endTime.invalid = true;
        startTime.invalid = true;
        return;
      }
      this._breakTime = startTimeUnix - lastLessonEnds;
    }
  }
  
  _updateLessonsInfo(type, e) {
    const val = e.target.value;
    if (!val) return;
    const lesson = e.target.parentElement.parentElement.firstElementChild.value;
    this._askWorker([lesson, type, val, this._lessonsInfo], 'push').then(result => this._lessonsInfo = result.data);
  }
  
  _loadLocale(locale) {
    return import(`dayjs/locale/${locale}.js`);
  }
  
  _askWorker(details, job = 'find') {
    return new Promise((resolve, reject) => {
      if (job !== 'find' && job !== 'push' && job !== 'calculateTime') {
        reject(new Error('Invalid job for Worker'));
        return;
      }
      const messageChannel = new MessageChannel();
      details.unshift(job);
      messageChannel.port1.onmessage = resolve;
      this._worker.postMessage(details, [messageChannel.port2]);
    });
  }
}

customElements.define(YTASetupDialog.is, YTASetupDialog);