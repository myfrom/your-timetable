/** @module */

import { PolymerElement, html } from '@polymer/polymer';
import '@polymer/polymer/lib/elements/dom-repeat.js';
import '@polymer/polymer/lib/elements/dom-if.js';

import '@polymer/iron-pages/iron-pages.js';

import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/paper-tabs/paper-tab.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-radio-group/paper-radio-group.js';
import '@polymer/paper-radio-button/paper-radio-button.js';

import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-toast/paper-toast.js';
import '@polymer/neon-animation/animations/fade-in-animation.js';
import '@polymer/neon-animation/animations/fade-out-animation.js';
import '@polymer/neon-animation/animations/slide-from-bottom-animation.js';
import '@polymer/neon-animation/animations/slide-down-animation.js';

import '@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light.js';

import { YTALocalizeMixin } from '../js/yta-localize-mixin.js';
import { UIStateStore, DataStore, DataStoreMixin, DataActions } from '../js/redux-stores.js';

import Notifier from '@myfrom/notifier';

import YTAElementBase from '../js/yta-element-base.js';

import ElementContent from './yta-add-dialog.el.html';

/**
 * @customElement
 * @polymer
 * @extends {PolymerElement} 
 * @appliesMixin YTALocalizeMixin
 * @appliesMixin YTAElementBase
 */
class YTAAddDialog extends DataStoreMixin(YTALocalizeMixin(YTAElementBase(PolymerElement))) {
  static get is() { return 'yta-add-dialog'; }
  static get template() {
    const template = document.createElement('template');
    template.innerHTML = ElementContent;
    return template;
  }
  static get properties() {
    return {

      // Inherited from shell
      data: {
        type: Object,
        statePath: state => state
      },

      // Currently viewed editor (lesson/event)
      selectedView: Number,

      // List of lessons being edited/added
      lessons: Array,

      // List of events being added
      events: Array

    };
  }

  constructor() {
    super();
  }

  ready() {
    super.ready();

    // Initialize default values
    this.selectedView = 0;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Add event listeners
    window.appShell.addEventListener('open-add-dialog', e => this.open(e));
    window.appShell.addEventListener('close-add-dialog', e => this.close(e));
  }

  open(e) {
    this.lessons = [{ selectedChangeType: '0' }];
    this.events = [{}];

    const withAnimation = e.detail.withAnimation,
          fabClientRect = e.detail.clientRect;
    
    if (withAnimation && fabClientRect) {
      // Show advanced animation
      // Initial render to get BoundingClientRect
      this.style.display = 'block';
      this.style.opacity = 0;
      this.style.overflow = 'hidden';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        // Main element
        const clientRect = this.getBoundingClientRect(),
              content = this.shadowRoot.querySelector('#content'),
              screenWidth = document.body.clientWidth,
              screenHeight = window.innerHeight,
              scaleX = 56 / clientRect.width,
              scaleY = 56 / clientRect.height,
              translateX = fabClientRect.left - screenWidth / 2 + 28,
              translateY = fabClientRect.top - screenHeight / 2 + 28;
        this.style.borderRadius = '50%';
        this.style.transform =
          `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
        // Content's counter transform
        const counterScaleX = 1 / scaleX,
              counterScaleY = 1 / scaleY,
              counterTranslateX = -translateX,
              counterTranslateY = -translateY;
        content.style.transform =
          `translate(${counterTranslateX}px, ${counterTranslateY}px) scale(${counterScaleX}, ${counterScaleY})`;
        // Reset opacity after transforms are applied
        this.style.opacity = 1;

        // Run dynamic animation
        const element = this,
              animationDuration = this.layout === 'phone' ? 300 : 400,
              startTime = performance.now();
        let currentTranslateX = translateX,
            currentTranslateY = translateY,
            currentScaleX = scaleX,
            currentScaleY = scaleY;
        const animate = () => {
          // Main element
          const timeElapsed = performance.now() - startTime,
                timeRemaining = animationDuration - timeElapsed,
                steps = timeRemaining / 60;
          // When time ran out, reset styles
          if (steps <= 0) {
            element.removeAttribute('style');
            content.removeAttribute('style');
            return;
          }
          currentTranslateX -= currentTranslateX / steps,
          currentTranslateY -= currentTranslateY / steps,
          currentScaleX += 1 / steps,
          currentScaleY += 1 / steps;
          element.style.transform =
            `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScaleX}, ${currentScaleY})`;
          // Content's counter scale
          const currentCounterScaleX = 1 / currentScaleX,
                currentCounterScaleY = 1 / currentScaleY,
                currentCounterTranslateX = -currentTranslateX,
                currentCounterTranslateY = -currentTranslateY;
          content.style.transform =
            `translate(${currentCounterTranslateX}px, ${currentCounterTranslateY}px) scale(${currentCounterScaleX}, ${currentCounterScaleY})`;
          // Schedule next iteration
          requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }));
    } else {
      // SHow simple slide-up transition
      this.style.opacity = 0;
      this.style.transform = 'translateY(10px)';
      this.style.transition = 'transform 150ms ease-out, opacity 150ms ease-out';
      this.addEventListener('transitionend', () => {
        this.style.transition = 'none';
      }, { once: true });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.style.opacity = 1;
        this.style.transform = 'none';
      }));
    }
    // 
    // let transitionTiming;
    // content.style.display = 'none';
    // animator.classList.remove('static');
    // if (withAnimation && clientRect) {
    //   // Set initial styles
    //   animator.style.height = clientRect.height + 'px';
    //   animator.style.width = clientRect.width + 'px';
    //   animator.style.left = clientRect.left + 'px';
    //   animator.style.top = clientRect.top + 'px';
    //   animator.style.borderRadius = '50%';

    //   // Compute transition timing
    //   transitionTiming = this.layout === 'tablet' ? 250 : 325;

    //   // Compute distance
    //   const a = clientRect.left + clientRect.width / 2,
    //         b = clientRect.top + clientRect.height / 2,
    //         c = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2)),
    //         scale = c / (clientRect.height / 2);

    //   // Animate!
    //   requestAnimationFrame(() => {
    //     animator.animate([
    //       { transform: 'scale(1)' },
    //       { transform: `scale(${scale})` }
    //     ], {
    //       duration: transitionTiming,
    //       easing: 'ease-in'
    //     }).onfinish = () => {
    //       animator.removeAttribute('style');
    //       animator.classList.add('static');
    //       content.style.display = 'block';
    //     }
    //   });
    //   requestAnimationFrame(() => {
    //     content.animate([
    //       {
    //         opacity: 0,
    //         transform: 'translateY(10px)'
    //       },
    //       {
    //         opacity: 1,
    //         transform: 'translateY(0)'
    //       }
    //     ],{
    //       duration: 100,
    //       delay: transitionTiming
    //     });
    //   });
    // } else {
    //   content.style.display = 'block';
    //   animator.classList.remove('static');
    //   const animation =
    //     [
    //       {
    //         opacity: 0,
    //         transform: 'translateY(10px)'
    //       },
    //       {
    //         opacity: 1,
    //         transform: 'translateY(0)'
    //       }
    //     ],
    //         timing =
    //     {
    //       duration: 150
    //     };
    //   requestAnimationFrame(() => {
    //     animator.animate(animation, timing).onfinish = () => {
    //       animator.classList.add('static');
    //     };
    //     content.animate(animation, timing);
    //   });
    // }
  }

  close(e) {
    const element = this;
    // Show simple slide-down transition
    element.style.opacity = 1;
    element.style.transform = 'none';
    element.style.transition = 'transform 150ms ease-out, opacity 150ms ease-out';
    if (this.layout !== 'desktop')
      element.style.transitionTiming = '260';
    element.addEventListener('transitionend', () => {
      element.removeAttribute('style');
      // Reset values
      this.lessons = this.events = [];
    });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      element.style.opacity = 0;
      element.style.transform = 'translateY(10px)';
    }));
  }

  _getLessonsNames(config) {
    return Object.keys(config);
  }

  _clearInvalid(e) {
    e.target.invalid = false;
  }

  _setLessons(e) {
    const timetable = this.data.timetable,
          day = e.target.selected,
          lessonInput = e.target.parentElement.parentElement.children[1],
          domRepeat = lessonInput.querySelector('dom-repeat'),
          output = [];
    if (timetable[day]) {
      timetable[day].forEach((item, index) => {
        output.push(`${index + 1}. ${item.name}`);
      });
    }
    if (!e.target.getAttribute('in')) output.push(this.localize('add_new'));
    domRepeat.items = output;
    lessonInput.setAttribute('day', day);
    lessonInput.children[0].selected = null;
  }

  _setLessonsAndWhen(e) {
    this._setLessons(e);
    const yearInput = e.target.parentElement.parentElement.parentElement
                       .parentElement.querySelector('.third-line .year');
    if (yearInput) {
      const fakeEvent = { target: yearInput };
      this._setDaysOfMonth(fakeEvent);
    }
  }

  _autofillInputs(e) {
    const day = Number(e.target.parentElement.getAttribute('day')),
          lessonI = e.target.selected,
          lesson = this.data.timetable[day][lessonI],
          parent = e.target.parentElement.parentElement.parentElement.parentElement;
    parent.querySelector('paper-radio-group').selected = '0';
    if (!lesson) {
      parent.querySelector('paper-radio-group [name="1"]').disabled = true;
      parent.querySelector('paper-radio-group [name="2"]').disabled = true;
      return;
    } else {
      parent.querySelector('paper-radio-group [name="1"]').disabled = false;
      parent.querySelector('paper-radio-group [name="2"]').disabled = false;

    };
    parent.querySelector('.lesson-name-input').value = lesson.name;
    parent.querySelector('.classroom-input').value = lesson.classroom;
    parent.querySelector('.teacher-input').value = lesson.teacher;
    parent.querySelector('.time-input.start-time').value = this._toHour(lesson.startTime);
    parent.querySelector('.time-input.end-time').value = this._toHour(lesson.endTime);
  }

  _addItem() {
    if (this.selectedView === 0) {
      this.lessons.push({ selectedChangeType: '0' });
      this.notifySplices('lessons')
    } else {
      this.events.push({});
      this.notifySplices('events')
    }
  }

  _removeLesson(e) {
    const index = e.target.getAttribute('index');
    this.lessons.splice(index, 1);
    this.notifySplices('lessons');
  }

  _removeEvent(e) {
    const index = e.target.getAttribute('index');
    this.events.splice(index, 1);
    this.notifySplices('events');
  }

  save() {
    let cantSave = false,
        timetable = [0,0,0,0,0,0,0];
    this.data.timetable.forEach((day, dayIndex) => {
      if (day) {
        day.forEach(lesson => {
          if (!timetable[dayIndex]) timetable[dayIndex] = [];
          timetable[dayIndex].push(lesson);
        });
      }
    });
    let j = 0, changeId;
    const lessonsList = this.shadowRoot.querySelectorAll('.lesson');
    Array.prototype.forEach.call(lessonsList, (lesson, index) => {
      const from = {
        weekday: lesson.querySelector('.from-weekday').children[0].selected,
        lessonI: lesson.querySelector('.from-lessoni').children[0].selected
      };
      if (from.weekday === undefined || from.weekday === null || from.lessonI === undefined || from.lessonI === null) return;
      const isPermanent = this.lessons[index].permanent;
      let when;
      if (!isPermanent) {
        const year = lesson.querySelector('.input.year').value;
        let month = lesson.querySelector('.month').selected + 1,
            day = lesson.querySelector('.day').selectedItem.textContent;
        if (month.toString().length === 1) month = '0' + month;
        if (day.toString().length === 1) day = '0' + day;
        when = `${year}-${month}-${day}`;
      }
      const changeType = lesson.querySelector('.change-type').selected;
      switch (changeType) {
        case '0':
          const name = lesson.querySelector('.lesson-name-input').value,
                classroom = lesson.querySelector('.classroom-input').value,
                teacher = lesson.querySelector('.teacher-input').value,
                startTime = this._convertTime(lesson.querySelector('.time-input.start-time').value),
                endTime = this._convertTime(lesson.querySelector('.time-input.end-time').value);
          if (!this.data.config[name]) {
            const colors = [
              '#f44336', '#E91E63', '#9c27b0', '#3f51b5', '#2196F3',
              '#009688', '#ff9800', '#ff5722', '#795548', '#4caf50'
            ];
            DataStore.dispatch(
              DataActions.config(Object.assign(
                this.data.config, { [name]: { color: colors[Math.round(Math.random() * 9)]} })));
          }
          if (isPermanent) {
            timetable[from.weekday][from.lessonI] = { name, classroom, teacher, startTime, endTime };
          } else {
            const changeName = timetable[from.weekday].length <= from.lessonI ?
              `Added ${name}` :
              `${timetable[from.weekday][from.lessonI].name} -> ${name}`;
            this.events.push({
              name: changeName,
              change: true,
              date: when,
              lesson: from.lessonI,
              to: { name, classroom, teacher, startTime, endTime },
              color: '#FBC02D'
            });
          }
          break;
        case '1':
          const withObj = {
            lessonI: lesson.querySelector('.with-lessoni').selected
          };
          if (isPermanent) {
            withObj.weekday = lesson.querySelector('.with-weekday').selected;
          } else {
            withObj.date = lesson.querySelector('.with-date').value;
            withObj.weekday = new Date(withObj.date).getDay();
          }
          if (withObj.weekday === undefined || withObj.weekday === null
              || withObj.lessonI === undefined || withObj.lessonI === null) {
            if (lesson.querySelector('.with-weekday')) {
              lesson.querySelector('.with-weekday').parentElement.invalid = true;
            } else {
              lesson.querySelector('with-date').invalid = true;
            }
            lesson.querySelector('.with-lessoni').parentElement.invalid = true;
            cantSave = true;
            return;
          }
          changeId = !isPermanent ? when + '-' + j : undefined;
          j++;
          timetable = this._switchLessons(timetable, from, withObj, isPermanent, when, false, changeId);
          break;
        case '2':
          let slice;
          changeId = !isPermanent ? when + '-' + j : undefined;
          j++;
          switch (Number(lesson.querySelector('.delete-behavior').selected)) {
            case 0:
              if (isPermanent) {
                timetable[from.weekday].splice(from.lessonI, 1);
              } else {
                this.events.push({
                  name: `- ${timetable[from.weekday][from.lessonI].name}`,
                  change: true,
                  date: when,
                  lesson: from.lessonI,
                  to: 0,
                  color: '#FBC02D'
                });
              }
              break;
            case 1:
              slice = timetable[from.weekday].slice(0, from.lessonI);
              slice.reverse();
              slice.forEach((item, index) => {
                index = slice.length - 1 - index;
                timetable = this._switchLessons(timetable, { weekday: from.weekday, lessonI: index }, 
                                                {lessonI: index + 1, weekday: from.weekday, date: when},
                                                isPermanent, when, true, changeId);
              });
              if (isPermanent) {
                timetable[from.weekday].shift();
              } else {
                this.events.push({
                  name: `- ${timetable[from.weekday][0].name}`,
                  change: changeId,
                  date: when,
                  lesson: 0,
                  to: 0,
                  color: '#FBC02D'
                });
              }
              break;
            case 2:
              slice = timetable[from.weekday].slice(from.lessonI + 1);
              slice.forEach((item, index) => {
                timetable = this._switchLessons(timetable, { weekday: from.weekday, lessonI: from.lessonI + index }, 
                                                {lessonI: from.lessonI + index + 1, weekday: from.weekday, date: when},
                                                isPermanent, when, true, changeId);
              });
              if (isPermanent) {
                timetable[from.weekday].pop();
              } else {
                this.events.push({
                  name: `- ${timetable[from.weekday][timetable[from.weekday].length - 1].name}`,
                  change: changeId,
                  date: when,
                  lesson: timetable[from.weekday].length - 1,
                  to: 0,
                  color: '#FBC02D'
                });
              }
              break;
          }
          break; 
      }
      j++;
      if (!timetable[from.weekday].length) timetable[from.weekday] = 0;
    });

    const addedEvents = this.events.filter(item => Object.keys(item).length);
    if (addedEvents.length)
      addedEvents.forEach(event => 
        DataStore.dispatch(DataActions.addEvent(event)));

    if (!cantSave) {
      for (let i = 0; i < timetable.length; i++) {
        for (let j = 0; j < timetable[i]; j++) {
          DataStore.dispatch(DataActions.modifyLesson(i, j, timetable[i][j]));
        }
      }
      this._close(null, null, true);
    }
  }

  _close(e, detail, saved = false) {
    if (saved) {
      this._fire('switchsection', { action: 'closeAddDialog' }, true, window.appShell);
    } else {
      Notifier.askDialog(this.localize('discard-changes-question'), {
        acceptText: this.localize('discard-changes'),
        cancelText: this.localize('keep-editing'),
        innerMsg: this.localize('discard-changes-content')
      }).then(() => {
        this._fire('switchsection', { action: 'closeAddDialog' }, true, window.appShell);
      }, err => {
        if (err) throw err;
      });
    }
  }

  _switchLessons(timetable, from, withObj, isPermanent, when, hide = false, changeId = true) {
    const oldLesson = Object.assign({}, timetable[from.weekday][from.lessonI]),
          newLesson = Object.assign({}, timetable[withObj.weekday][withObj.lessonI]),
          tempTime = { start: oldLesson.startTime, end: oldLesson.endTime };
    oldLesson.startTime = newLesson.startTime;
    oldLesson.endTime = newLesson.endTime;
    newLesson.startTime = tempTime.start;
    newLesson.endTime = tempTime.end;
    if (isPermanent) {
      timetable[from.weekday][from.lessonI] = newLesson;
      timetable[withObj.weekday][withObj.lessonI] = oldLesson;
    } else {
      const name = [
        timetable[withObj.weekday][withObj.lessonI].name,
        timetable[from.weekday][from.lessonI].name
      ];
      this.events.push({
        name: name.join(' -> '),
        change: changeId,
        date: withObj.date,
        lesson: withObj.lessonI,
        to: oldLesson,
        color: '#FBC02D',
        hide
      },{
        name: name.reverse().join(' -> '),
        change: changeId,
        date: when,
        lesson: from.lessonI,
        to: newLesson,
        color: '#FBC02D',
        hide
      });
    }
    return timetable;
  }

  _convertTime(time) {
    const date = new Date(0),
          timeRegExp = time.match(/(\d+):(\d+)/),
          timeUnix = date.setUTCHours(timeRegExp[1], timeRegExp[2]);
    return timeUnix;
  }

  _setLessonsInWith(e) {
    const day = e.target.tagName === 'PAPER-INPUT' ? new Date(e.target.value).getDay()
                                                   : e.target.selected,
          domRepeat = e.target.parentElement.parentElement.querySelector('dom-repeat'),
          items = this.data.timetable[day],
          output = [];
    if (items.length) {
      items.forEach((item, index) => output.push(`${index + 1}. ${item.name}`));
    } else {
      e.target.tagName === 'PAPER-INPUT' ? e.target.invalid = true
                                         : e.target.parentElement.invalid = true;
    }
    domRepeat.set('items', output);
    domRepeat.parentElement.selected = null;
  }

  _setLessonsInEvent(e) {
    const day = new Date(e.target.value).getDay(),
          domRepeat = e.target.parentElement.querySelector('dom-repeat'),
          items = this.data.timetable[day],
          output = [];
    if (items.length) {
      items.forEach((item, index) => output.push(`${index + 1}. ${item.name}`));
    } else {
      output.push(this.localize('add_all-day'));
    }
    domRepeat.set('items', output);
    domRepeat.parentElement.selected = null;
  }

  _getCurrentYear() {
    return new Date().getFullYear();
  }

  _getCurrentMonth() {
    return new Date().getMonth();
  }

  _setDaysOfMonth(e) {
    const parent = e.target.parentElement,
          year = Number(parent.querySelector('.year').value),
          month = parent.querySelector('.month').selected,
          dayInput = parent.querySelector('.day'),
          dayDomRepeat = parent.querySelector('.day dom-repeat');
    if (!year || !month) return;
    dayInput.selected = null;
    if (year === this._getCurrentYear() && month < this._getCurrentMonth()) {
      parent.querySelector('.month').invalid = true;
      return;
    }
    parent.querySelector('.month').invalid = false;
    const weekday = e.target.parentElement.parentElement.parentElement
      .querySelector('.from-weekday > paper-listbox').selected;
    const weekdaysOccurances = 
    dayDomRepeat.items = this._getDaysFromMonth(month, weekday);
    dayInput.selected = 0;
  }

  _validateDay(e) {
    const parent = e.target.parentElement,
          year = Number(parent.querySelector('.year').value),
          month = parent.querySelector('.month').selected,
          dayInput = parent.querySelector('.day');
    if (dayInput.selected === null || dayInput.selected === undefined) return;
    const day = Number(dayInput.parentElement.value);
    if (year === this._getCurrentYear() && month === this._getCurrentMonth() &&
        day < new Date().getDate()) {
      e.target.invalid = true;
    } else {
      e.target.invalid = false
    }
  }

  _getDaysFromMonth(month, weekday = new Date().getDay()) {
    const d = new Date(),
          days = [];
    d.setMonth(month);
    d.setDate(1);
    while (d.getDay() !== weekday) {
        d.setDate(d.getDate() + 1);
    }
    while (d.getMonth() === month) {
        days.push(d.getDate());
        d.setDate(d.getDate() + 7);
    }
    return days;
  }

  _isSelected(a, b) {
    return a == b;
  }

  _toHour(time) {
    let timeDate = new Date(time),
    timeReadable = timeDate.getUTCHours().toString().length === 1 ? '0' + timeDate.getUTCHours()
                                                          : timeDate.getUTCHours();
    timeReadable += ':' + (timeDate.getUTCMinutes().toString().length === 1 ? '0' + timeDate.getUTCMinutes()
                                                                            : timeDate.getUTCMinutes());
    return timeReadable;
  }

}

window.customElements.define(YTAAddDialog.is, YTAAddDialog);