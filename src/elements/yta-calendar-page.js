/** @module */

import { PolymerElement, html } from '@polymer/polymer';
import '@polymer/polymer/lib/elements/dom-if.js';

// import '@polymer/paper-icon-button/paper-icon-button.js';
// import '@polymer/paper-styles/paper-styles.js';
// import '@polymer/paper-dialog/paper-dialog.js';
// import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
// import '@polymer/paper-item/paper-item-body.js';
// import '@polymer/paper-input/paper-input.js';
// 

// import '@polymer/neon-animation/animations/slide-from-bottom-animation.js';
// import '@polymer/neon-animation/animations/slide-down-animation.js';
// import '@polymer/neon-animation/animations/fade-in-animation.js';
// import '@polymer/neon-animation/animations/fade-out-animation.js';
import '@polymer/paper-toast/paper-toast.js';
import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';

import 'pf-calendar-events';

import dayjs from 'dayjs';

import { DataStore, DataStoreMixin, DataActions } from '../js/redux-stores.js';
import YTAElementBase from '../js/yta-element-base.js';
import { YTALocalizeMixin } from '../js/yta-localize-mixin.js';
import Notifier from '@myfrom/notifier';
import { waitMs } from '../js/wait-utils.js';

import ElementContent from './yta-calendar-page.el.html';

/**
 * @customElement
 * @polymer
 * @extends {PolymerElement}
 * @appliesMixin YTAElementBase
 */
class YTACalendarPage extends YTALocalizeMixin(DataStoreMixin(YTAElementBase(PolymerElement))) {
  static get is() { return 'yta-calendar-page'; }
  static get template() {
    const template = document.createElement('template');
    template.innerHTML = ElementContent;
    return template;
  }
  static get properties() {
    return {
      
      events: {
        type: Object,
        statePath: 'events'
      },

      _selectedMonth: Number
      
    };
  }
  
  constructor() {
    super();
  }
  
  connectedCallback() {
    super.connectedCallback();

    const calendar = this.shadowRoot.querySelector('pf-calendar-events');

    const exec = () => {
      this._createPropertyObserver('events', 'updateEvents');
      if (this.events) {
        this.updateEvents(this.events);
      }
    };
    if (this.resources)
      exec();
    else
      this.addEventListener('app-localize-resources-loaded', exec, { once: true });

    calendar.addEventListener('event-edit', e => this._editEvent(e.detail.event.key));
    calendar.addEventListener('event-delete', e => this._deleteEvent(e.detail.event.key));
  }

  updateEvents(events) {
    /**
     * Output scheme:
     * [
     *   {
     *     eventName: string,
     *     category: 'change'|'test'|'homework',
     *     color: CategoryColor<blue|orange|yellow|green>
     *     date: number<Date>
     *   }
     * ]
     * 
     * Input scheme:
     * {
     *   string<Date(yyyy-mm-dd)>[_<index>]: {
     *     date: string<Date(yyyy-mm-dd)>,
     *     lesson: number,
     *     name: string,
     *     [color]: string<RGBColor>
     *     [to]: object,
     *     [change]: string|true,
     *     [hide]: boolean
     *   }
     * }
     */
    const output = [];
    Object.keys(events).forEach(key => {
      const event = this.events[key];
      if (!event.hide) {
        const entry = { category: null, eventName: null, date: null, color: null, key };
        // entry.category = event.category; TODO: Update the cloud scheme with category
        entry.category = event.change ? this.localize('calendar_change-label') : this.localize('calendar_general-label');
        entry.color = event.change ? 'orange' : 'blue';
        entry.eventName = `${event.name}, ${this.localize('calendar_lesson')} ${event.lesson + 1}`;
        entry.date = dayjs(event.date).valueOf();
        output.push(entry);
      }
    });
    this.shadowRoot.querySelector('pf-calendar-events').data = output;
  }

  _deleteEvent(eventKey) {
    Notifier.askDialog(this.localize('calendar_remove-confirm'), {
      acceptText: this.localize('delete'),
      cancelText: this.localize('cancel')
    })
      .then(() => DataStore.dispatch(DataActions.removeEventByKey(eventKey)))
      .catch(err => {
        if (err.error !== false) throw err;
      });
  }

  _editEvent(eventKey) {
    if (!(eventKey in this.events)) {
      console.error('%c CALENDAR %c Tried to edit not-existing event:',
        'background-color: purple; font-weight: bold;', '', eventKey);
      return;
    }
    // TODO: User should be able to edit change events as well
    if (this.events[eventKey].change) {
      Notifier.showToast(this.localize('calendar_cant-edit'), {
        btnText: this.localize('calendar_more-info'),
        btnFunction: () => {
          const newTab = window.open('https://example.com', '_blank'); // FIXME: Add real help link
          newTab.focus();
        }
      });
      return;
    }

    const event = this.events[eventKey];

    Notifier.showDialog(this.localize('calendar_edit'), `
      <paper-dialog-scrollable>
        <paper-input class="event-name" no-label-float value="${event.name}" autofocus></paper-input>
        <paper-input type="date" no-label-float value="${event.date}"></paper-input>
        <paper-dropdown-menu no-label-float>
          <paper-listbox selected="${event.lesson}" slot="dropdown-content"></paper-listbox>
        </paper-dropdown-menu>
      </paper-dialog-scrollable>
      <div class="buttons">
        <paper-button dialog-dismiss>${this.localize('cancel')}</paper-button>
        <paper-button dialog-confirm>${this.localize('save')}</paper-button>
      </div>
    `, {
      formatted: true,
      beforeClose: e => {
        const dialog = e.target,
              nameInput = dialog.querySelector('.event-name'),
              dateInput = dialog.querySelector('[type="date"]'),
              lessonInput = dialog.querySelector('paper-dropdown-menu');
        const lessonIndex = /(\d+)\./.test(lessonInput.value) ?
          Number(lessonInput.value.match(/(\d+)\./)[1]) - 1 :
          0;
        return {
          name: nameInput.value,
          date: dateInput.value,
          lesson: lessonIndex
        }
      },
      attributes: {
        id: 'calendar-edit-dialog'
      }
    }).then(newEvent => {
      if (newEvent.date == event.date) {
        DataStore.dispatch(DataActions.updateEvent(eventKey, newEvent));
      } else {
        DataStore.dispatch(DataActions.removeEventByKey(eventKey));
        DataStore.dispatch(DataActions.addEvent(newEvent));
      }
    });

    // TODO: Probably should listen for some DOM events
    waitMs(500).then(() => {
      const dialog = document.querySelector('#calendar-edit-dialog'),
            dateInput = dialog.querySelector('[type="date"]'),
            lessonList = dialog.querySelector('paper-listbox');
      
      const updateLessonList = () => {
        const tt = DataStore.getState().timetable,
              day = dayjs(dateInput.value).day(),
              lessons = tt[day];
        if (lessons == 0) {
          lessonList.innerHTML = `<paper-item>${this.localize('add_all-day')}</paper-item>`;
          return;
        }
        let output = '';
        lessons.forEach((lesson, index) => {
          output += `<paper-item>${index + 1}. ${lesson.name}</paper-item>`;
        });
        lessonList.innerHTML = output;

        lessonList.select(0);
      }

      updateLessonList();
      dateInput.addEventListener('change', updateLessonList.bind(this));
    });
  }

  // _calendarSelected(e) {
  //   const date = e.detail.date,
  //   if (!(this.events)) return;
  //   this._checkForEventsOn(date, this.events).then(dayEvents => {
  //     // Create styles
  //     const styles = `
  //       #dialog {
  //         border-radius: 2px;
  //       }

  //       #dialog .event {
  //         width: 240px;
  //         color: white;
  //         margin: 2px;
  //         border-radius: 2px;
  //         background-color: var(--primary-color);
  //       }

  //       #dialog .event .primary {
  //         display: flex;
  //         flex-direction: row;
  //       }

  //       #dialog .event .primary .header {
  //         flex: 1;
  //       }

  //       #dialog .event .secondary {
  //         color: white;
  //         opacity: var(--light-secondary-opacity);
  //       }

  //       #dialog .event paper-icon-button {
  //         opacity: var(--light-secondary-opacity);
  //         padding: 0 4px;
  //         height: 22px;
  //         width: 30px;
  //       }

  //       #dialog paper-input, #dialog paper-dropdown-menu {
  //         --paper-input-container-color: white;
  //         --paper-input-container-focus-color: white;
  //         --paper-input-container-input-color: white;
  //       }
  //     `
  //     // Add content
  //     this.shadowRoot.querySelector('#dialog > h2').textContent = dayjs(date).format('D MMMM YYYY');
  //     // Refresh events items to remove previous states
  //     this.shadowRoot.querySelectorAll('#dialog .edit-domif').forEach(item => item.if = false);
  //     this.shadowRoot.querySelectorAll('#dialog .show-domif').forEach(item => item.if = true);
  //     //this.shadowRoot.querySelectorAll('#dialog paper-dialog-scrollable > .event').forEach(item => item.remove());
  //     // Render new elements
  //     const domRepeat = this.shadowRoot.querySelector('#dialog dom-repeat');
  //     domRepeat.items = dayEvents;
  //     domRepeat.notifySplices('items');
  //     domRepeat.render();
  //     domRepeat.items;
  //     // Asign callbacks
  //     this.shadowRoot.querySelectorAll('#dialog .edit-button').forEach(item => item.addEventListener('click', this._editEvent.bind(this)));
  //     this.shadowRoot.querySelectorAll('#dialog .delete-button').forEach(item => item.addEventListener('click', this._deleteEventBtnPress.bind(this)));
  //     // Open dialog
  //     this._openDialog(this.$.dialog, styles);
  //   }, err => { if (err !== 'noevents') throw err })
  // }

  // _checkForEventsOn(date, events) {
  //   return new Promise((resolve, reject) => {
  //     const regexp = new RegExp(`^${date}.+`, 'g'),
  //           output = [];
  //     Object.keys(events).forEach(key => {
  //       if (key.match(regexp) && !events[key].hide) output.push(events[key]);
  //     });
  //     if (!output.length) {
  //       reject('noevents');
  //     } else {
  //       output.sort((a, b) => a.lesson - b.lesson);
  //       resolve(output);
  //     }
  //   });
  // }

  // _editEvent(e) {
  //   const domIfs = e.target.parentElement.parentElement.parentElement.querySelectorAll('dom-if'),
  //         date = e.target.parentElement.getAttribute('info').slice(0, 10);
  //   domIfs[1].if = false;
  //   domIfs[2].if = true;
  //   // First one can hide asynchronously but second needs to be rendered
  //   domIfs[2].render();
  //   const lessons = [],
  //         tt = this.data.timetable[dayjs(date).day()],
  //         domRepeat = document.querySelector('#dialog paper-listbox dom-repeat');
  //   if (tt) {
  //     tt.forEach((item, index) => {
  //       lessons.push(index + 1 + '. ' + item.name);
  //     });
  //     domRepeat.set('items', lessons);
  //   }
  // }

  // _finishedEditing(e) {
  //   const primary = e.target.parentElement.parentElement,
  //         secondary = primary.parentElement.children[2],
  //         info = e.target.getAttribute('info'),
  //         dateOld = info.slice(0, 10),
  //         indexOld = Number(info.slice(10, 11)),
  //         name = primary.children[0].value,
  //         date = secondary.children[0].value,
  //         lesson = secondary.children[1].value,
  //         lessonIndex = lesson ? Number(lesson.match(/^(\d+)\..+/)[1]) - 1 : 0,
  //         dialog = document.querySelector('#dialog');
  //   this._deleteEvent(dateOld, indexOld, [{ name, date, lesson: lessonIndex }]);
  //   dialog.close();
  // }

  // _showLessons(e) {
  //   const lessons = [],
  //         tt = this.data.timetable[dayjs(e.detail.value).day()],
  //         listOfLessons = e.target.parentElement.children[1].children[0].children,
  //         domRepeat = listOfLessons[listOfLessons.length - 1];
  //   if (tt) {
  //     tt.forEach((item, index) => {
  //       lessons.push(index + 1 + '. ' + item.name);
  //     });
  //     domRepeat.items = lessons;
  //   }
  // }

  // _deleteEventBtnPress(e) {
  //   const events = this.data.events,
  //         info = e.target.parentElement.getAttribute('info'),
  //         date = info.slice(0, 10),
  //         index = Number(info.slice(10, 11));
  //   this._deleteEvent(date, index);
  //   document.querySelector('#dialog #eventsRepeater').splice('items', index, 1);
  // }

  // _deleteEvent(date, index, /* added = [] */) {
  //   /* const events = this.data.events,
  //         regexp = new RegExp(`^${date}.+`, 'g'),
  //         filteredObj = {},
  //         untouchedObj = {},
  //         reserved = [],
  //         giveName = (event, i) => {
  //           return event.date + '_' + i;
  //         };
  //   let filtered = [],
  //       untouched = added;
  //   Object.keys(events).forEach(key => {
  //     key.match(regexp) && !events[key].hide ? filtered.push(events[key]) : untouched.push(events[key]);
  //   });
  //   const eventChangeId = filtered[index].change;
  //   filtered.splice(index, 1);
  //   if (typeof eventChangeId === 'string') {
  //     filtered = filtered.filter(item => item.change === eventChangeId);
  //     untouched = untouched.filter(item => item.change !== eventChangeId);
  //   }
  //   filtered.forEach((item, index) => {
  //     const name = giveName(item, index);
  //     Object.assign(filteredObj, { [name]: item });
  //     reserved.push(name);
  //   });
  //   untouched.forEach(item => {
  //     let index = 0,
  //         name = giveName(item, index);
  //     for (; reserved.includes(name); index++) name = giveName(item, index);
  //     Object.assign(untouchedObj, { [name]: item });
  //     reserved.push(name);
  //   });
  //   this.data.events = Object.assign(untouchedObj, filteredObj);
  //   this.notifyPath('data.events'); */
  //   DataStore.dispatch(DataActions.removeEvent(date, index));
  // }

  // _getLessonName(date, index) {
  //   let day = dayjs(date).day();
  //   if (this.data.timetable[day] && this.data.timetable[day][index]) {
  //     return index + 1 + '. ' + this.data.timetable[day][index].name;
  //   } else {
  //     return '';
  //   }
  // }

  // _openDialog(dialog, style = null, animations) {
  //   // Setup animations
  //   dialog.animationConfig = animations || {
  //     entry: [{
  //       name: 'slide-from-bottom-animation',
  //       node: dialog,
  //       timing: {
  //         easing: 'ease-out',
  //         duration: 250
  //       }
  //     },{
  //       name: 'fade-in-animation',
  //       node: dialog,
  //       timing: {
  //         easing: 'ease-out',
  //         duration: 250
  //       }
  //     }],
  //     exit: [{
  //       name: 'slide-down-animation',
  //       node: dialog,
  //       timing: {
  //         easing: 'ease-in',
  //         duration: 250
  //       }
  //     },{
  //       name: 'fade-out-animation',
  //       node: dialog,
  //       timing: {
  //         easing: 'ease-in',
  //         duration: 250
  //       }
  //     }],
  //   };
  //   // Create nescessary styles
  //   let styleEl;
  //   if (style) {
  //     styleEl = document.createElement('style');
  //     styleEl.innerHTML = style;
  //     document.head.appendChild(styleEl);
  //   }
  //   // Remember current parent to...
  //   const parent = dialog.parentNode;
  //   // ...move it back when it closes
  //   dialog.addEventListener('iron-overlay-closed', e => {
  //     if (e.target !== dialog) return;
  //     if (styleEl) styleEl.remove();
  //     parent.appendChild(dialog);
  //   });
  //   // Move element
  //   document.body.appendChild(dialog);
  //   dialog.open();
  // }

  // _processEvents(events) {
  //   if (!events || Object.keys(events).length === 0) return;
  //   const output = [];
  //   Object.keys(events).forEach(key => {
  //     if(!events[key].hide) output.push(events[key])
  //   });
  //   return output;
  // }
  
  // _computeMonthName(month) {
  //   return dayjs(month).format('MMMM');
  // }

  // _nextMonth() {
  //   this._selectedMonth = dayjs(this._selectedMonth).add(1, 'months').valueOf();
  // }

  // _previousMonth() {
  //   this._selectedMonth = dayjs(this._selectedMonth).subtract(1, 'months').valueOf();
  // }

  // _today() {
  //   this._selectedMonth = dayjs().valueOf();
  // }
}

customElements.define(YTACalendarPage.is, YTACalendarPage);