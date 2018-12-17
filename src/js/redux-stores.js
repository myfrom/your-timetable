/** 
 * A module containing Redux Stores and their helper functions and mixins
 * @module redux-stores
 */
//@ts-check
import { createStore } from 'redux';
import PolymerRedux from 'polymer-redux';


/**
 * A collection of actions on UIStateStore
 * 
 * @namespace UIActions
 */
const UIActions = {
  /**
   * Update app language
   * @param {string} newLang - New language code
   * @member
   */
  updateLanguage: newLang => { return { type: 'UPDATE_LANG', language: newLang } },
  /**
   * Update UI layout
   * Available: 'phone', 'tablet', 'desktop'
   * @param {string} layout
   * @member
   */
  updateLayout: layout => { return { type: 'UPDATE_LAYOUT', layout } }
}

const uiReducer = (previousState, action) => {
  switch (action.type) {
    case 'UPDATE_LANG':
      return Object.assign({}, previousState, {
        language: action.language
      });
    case 'UPDATE_LAYOUT':
      return Object.assign({}, previousState, {
        layout: action.layout
      });
    default:
      return previousState;
  }
}

/** @type {import('redux').Store} */
const UIStateStore = createStore(uiReducer, {
  language: navigator.language.slice(0,2),
  layout: 'phone'
});


/**
 * A collection of actions on DataStore
 * 
 * @namespace DataActions
 */
const DataActions = {
  /**
   * Marks the day as empty (sets it to 0)
   * @param {number} weekday - Day of the week (0 = Sun, 1 = Mon, etc)
   * @member
   */
  emptyDay: weekday => 
    { return { type: 'EMPTY_DAY', weekday } },
  /**
   * Modifies indexed lesson.
   * If necessary adds it.
   * @param {number} weekday - Day of the week (0 = Sun, 1 = Mon, etc)
   * @param {number} lessonIndex - Index of the lesson on set day
   * @param {Object} lesson - New lesson
   * @member
   */
  modifyLesson: (weekday, lessonIndex, lesson) =>
    { return { type: 'MOD_LESSON', weekday, lessonIndex, lesson } },
  /**
   * Removes indexed lesson
   * @param {number} weekday - Day of the week (0 = Sun, 1 = Mon, etc)
   * @param {number} lessonIndex - Index of the lesson on set day
   * @member
   */
  removeLesson: (weekday, lessonIndex) =>
    { return { type: 'DEL_LESSON', weekday, lessonIndex } },
  /**
   * Adds an event to the list
   * @param {Object} event - The event to be added
   * @member
   */
  addEvent: event =>
    { return { type: 'ADD_EVENT', event } },
  /**
   * Removes set event from the list but identifies the event by key
   * @param {string} key - Event key
   * @member
   */
  updateEvent: (key, event) =>
    { return { type: 'UPDATE_EVENT', key, event } },
  /**
   * Removes set event from the list
   * @param {string} date - Date of the event (yyyy-mm-dd)
   * @param {number} index - Index of the event on selected day
   * @member
   */
  removeEvent: (date, index) =>
    { return { type: 'DEL_EVENT', date, index } },
  /**
   * Removes set event from the list but identifies the event by key
   * @param {string} key - Event key
   * @member
   */
  removeEventByKey: key =>
    { return { type: 'DEL_EVENT_KEY', key } },

  user: user => { return { type: 'MOD_USER', user } },
  config: config => { return { type: 'MOD_CONFIG', config } },
  settings: settings => { return { type: 'MOD_SETTINGS', settings } }
}

const dataReducer = (previousState, action) => {
  switch (action.type) {
    case 'EMPTY_DAY': {
      const timetable = previousState.timetable.slice(0);
      timetable[action.weekday] = 0;
      return Object.assign({}, previousState, { timetable });
    }
    case 'MOD_LESSON': {
      const weekday = action.weekday,
            lessonIndex = action.lessonIndex,
            timetable = previousState.timetable.slice(0);
      if (!timetable[weekday]) {
        timetable[weekday] = [ action.lesson ];
      } else if (timetable[weekday].length - 1 <= lessonIndex) {
        timetable[weekday][lessonIndex] = action.lesson;
      } else {
        timetable[weekday].push(action.lesson);
      }
      return Object.assign({}, previousState, { timetable });
    }
    case 'DEL_LESSON': {
      const weekday = action.weekday,
            lessonIndex = action.lessonIndex,
            timetable = previousState.timetable.slice(0);
      if (!timetable[weekday] || lessonIndex > timetable[weekday].length - 1) {
        return previousState;
      } else {
        timetable[weekday].splice(lessonIndex, 1);
      }
      return Object.assign({}, previousState, { timetable });
    }
    case 'ADD_EVENT': {
      const usedKeys = Object.keys(previousState.events);
      let name = `${action.event.date}`;
      for (let i = 0; usedKeys.includes(name); i++)
        name = `${action.event.date}_${i}`;
      const events =
        Object.assign({}, previousState.events, { [name]: action.event });
      return Object.assign({}, previousState, { events });
    }
    case 'UPDATE_EVENT': {
      const events = Object.assign({}, previousState.events);
      if (action.key in events)
        events[action.key] = action.event;
      return Object.assign({}, previousState, { events });
    }
    case 'DEL_EVENT': {
      const events = Object.assign({}, previousState.events),
            eventsKeys = Object.keys(events),
            query = new RegExp(`${action.date}(_\d+)?`),
            index = action.index,
            matchedKeys = eventsKeys.filter(key => query.test(key));
      if (typeof events[matchedKeys[index]].change === 'string') {
        const eventChangeId = events[matchedKeys[index]].change;
        const remainingKeys = eventsKeys.filter(key => events[key].change === eventChangeId);
        remainingKeys.forEach(key => delete events[key]);
      }
      delete events[matchedKeys[index]];
      return Object.assign({}, previousState, { events });
    }
    case 'DEL_EVENT_KEY': {
      const events = Object.assign({}, previousState.events);
      if (action.key in events)
        delete events[action.key];
      return Object.assign({}, previousState, { events });
    }
    case 'MOD_USER': {
      const user = action.user;
      return Object.assign({}, previousState, { user });
    }
    case 'MOD_CONFIG': {
      const config = action.config;
      return Object.assign({}, previousState, { config });
    }
    case 'MOD_SETTINGS': {
      const settings = action.settings;
      return Object.assign({}, previousState, { settings });
    }
    default:
      return previousState;
  }
}

/** @type {import('redux').Store} */
const DataStore = createStore(dataReducer, {
  timetable: [0,0,0,0,0,0,0], events: {}, user: {}, config: {}, settings: {}
});


/**
 * Adds PolymerRedux bindings for UIStateStore
 * @mixinFunction
 */
const UIStateStoreMixin = PolymerRedux(UIStateStore);
/**
 * Adds PolymerRedux bindings for DataStore
 * @mixinFunction
 */
const DataStoreMixin = PolymerRedux(DataStore);

export { UIActions, UIStateStore, UIStateStoreMixin, DataActions, DataStore, DataStoreMixin };