/** @module */
//@ts-check

import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';

import { DataActions, DataStore } from './redux-stores.js';

/**
 * A class instantiated on global scope, responsible for handling singing in and out
 * as well as data changes.
 * 
 * @class
 * @fires YTADatabase#firebaseuserready
 * @fires YTADatabase#databaseready
 * @fires YTADatabase#requestsignin
 * @fires YTADatabase#requestsetup
 * @fires YTADatabase#dataready
 * @listens YTAShell#shellready
 */
class YTADatabase {

  /**
   * Allowed Firebase Auth providers
   * 
   * @constant
   * @type {string[]}
   * @default
   */
  get ALLOWED_PROVIDERS() {
    return ['google']
  }

  /**
   * Data paths in database that can be easily replaced
   * 
   * @constant
   * @type {string[]}
   * @default
   */
  get MOD_DATA_PATHS() {
    return ['config', 'settings']
  }

  /** @protected */
  get _auth() {
    return firebase.auth();
  }

  /** @protected */
  get _database() {
    return firebase.database();
  }

  /**
   * Get current user or `null` if signed out
   * 
   * @type {?object}
   */
  get user() {
    return this._auth.currentUser;
  }

  /**
   * Set up everything
   */
  constructor() {
    // Set up Firebase project
    const FIREBASE_CONFIG = {
      apiKey: 'AIzaSyDaMune3u4WZMti3aB66FWjX9aA_lWTLkQ',
      authDomain: 'your-timetable.firebaseapp.com',
      databaseURL: 'https://your-timetable.firebaseio.com',
      projectId: 'your-timetable'
    };
    firebase.initializeApp(FIREBASE_CONFIG);

    // Set up authentication
    this._auth.onAuthStateChanged(user => {
      if (user) {
        /**
         * Indicates the user has successfully signed in
         * 
         * @event YTADatabase#firebaseuserready
         */
        window.dispatchEvent(new CustomEvent('firebaseuserready'));
        console.log('%c DATABASE %c User signed in', 'background-color: purple; font-weight: bold;', '');
        this._fetchData();
      } else {
        this._askForSignIn();
        console.log('%c DATABASE %c User not signed in', 'background-color: purple; font-weight: bold;', '');
        console.log('%c DATABASE %c Requesting sign-in prompt', 'background-color: purple; font-weight: bold;', 'color: purple');
      }
    });

    this._setupLocalData();
    
    window.AppState.readyCheck.database = true;
    /** @event YTADatabase#databaseready */
    window.dispatchEvent(new CustomEvent('databaseready'));
    console.log('%c DATABASE %c Attached class', 'background-color: purple; font-weight: bold;', '');
  }

  /**
   * Sends an event requesting to show sign-in prompt
   */
  _askForSignIn() {
    /**
     * Requests to show sign-in prompt
     * 
     * @event YTADatabase#requestsignin
     */
    const exec = () =>
      window.dispatchEvent(new CustomEvent('requestsignin'));

    if (window.AppState.readyCheck.shell)
      exec();
    else
      window.addEventListener('shellready', exec, { once: true });
  }

  /**
   * Starts a sign-in operation
   * 
   * @param {string} provider - Provider to be used to sign in
   * @returns {Promise<firebase.auth.UserCredential|Error>} - Returns a Promise that resolves if the sign in is successful
   */
  signIn(provider) {
    // TODO: Add user-timings to check how long it took to log-in
    return new Promise((resolve, reject) => {
      if (typeof provider === 'string' &&
        !this.ALLOWED_PROVIDERS.includes(provider.toLowerCase()))
      {
        reject(new Error('Improper provider'));
        console.error('%c DATABASE %c Called `signIn` with improper method',
          'background-color: purple; font-weight: bold;', '');
      }

      const providerName = provider.substring(0, 1).toUpperCase() + provider.substring(1),
            firebaseProvider = new firebase.auth[providerName + 'AuthProvider']();
      // TODO: Needs to pass chosen language to provider
      this._auth.signInWithPopup(firebaseProvider)
        .then(result => {
          requestIdleCallback(() => gtag('event', 'sign-in', {
            event_category: 'User'
          }));
          resolve(result);
        }, err => reject(err));
    });
  }

  /**
   * Signs the user out
   * 
   * @returns {Promise<void|Error>} - Returns a Promise that resolves if sign-out was successful
   */
  signOut() {
    return this._auth.signOut().then(result => {
      gtag('event', 'sign-out', {
        event_category: 'User'
      });
      return result;
    });
  }

  _fetchData() {
    // TODO: Temporary workaround, remove after moving to Firesotre
    if (!navigator.onLine) {
      (async () => {
        await this._setupLocalData();
        const localdata = await this._getLocalData();
        if (!localdata) return;
        const timetable = localdata.timetable;
        for (let i = 0; i < timetable.length; i++) {
          if (timetable[i] === 0) continue;
          for (let j = 0; j < timetable[i].length; j++) {
            DataStore.dispatch(DataActions.modifyLesson(i, j, timetable[i][j]));
          }
        }
        const events = localdata.events;
        for (let key in events) {
          DataStore.dispatch(DataActions.addEvent(events[key]));
        }
        DataStore.dispatch(DataActions.config(localdata.config));
        DataStore.dispatch(DataActions.settings(localdata.settings));
        this._readFromLocalData = true;
        /** @event YTADatabase#dataready */
        window.dispatchEvent(new CustomEvent('dataready'));
        window.AppState.dataReady = true;
      })();
      window.addEventListener('online', this._fetchData.bind(this));
    }

    const database = this._database,
          uid = this.user.uid;

    const settingsRef = database.ref(`users/${uid}/settings`),
          configRef = database.ref(`users/${uid}/config`), // TODO: If missing, recreate instead of starting setup
          timetableRef = database.ref(`users/${uid}/timetable`),
          eventsRef = database.ref(`users/${uid}/events`); // The only one that doesn't init setup

    const promiseList = [];
        
    const updateInStore = (path, snapshot) => {
      if (!this.MOD_DATA_PATHS.includes(path))
        console.error('%c DATABASE %c Specified path can\'t be modded',
          'background-color: purple; font-weight: bold;', path);
      if (!snapshot.exists()) {
        /**
         * Data is incomplete. Init setup flow.
         * 
         * @event YTADatabase#requestsetup
         */
        window.dispatchEvent(new CustomEvent('requestsetup'));
        console.log('%c DATABASE %c Requesting setup',
          'background-color: purple; font-weight: bold;', '');
        return;
      }
      // Addition for beta surveys acceptance
      // TODO: Remove after beta ends
      if (path === 'settings' && window.AppState.BETA_betaSurveys) {
        const settings = snapshot.val();
        settings.receiveBetaSurveys = true;
        this._preventUpload = true;
        DataStore.dispatch(DataActions.settings(settings));
        this._preventUpload = false;
        settingsRef.update({ receiveBetaSurveys: true });
        return;
      }
      this._preventUpload = true;
      const action = DataActions[path](snapshot.val());
      DataStore.dispatch(action);
      this._preventUpload = false;
    }
    
    settingsRef.on('value', snapshot => updateInStore('settings', snapshot));
    configRef.on('value', snapshot => updateInStore('config', snapshot));

    promiseList.push(timetableRef.once('value').then(snapshot => {
      if (this._firebaseTimetableRead) return;
      if (!snapshot.exists() ||
        (snapshot.val() instanceof Array && !(snapshot.val().reduce((a, b) => a || b)))) {
        /**
         * Data is incomplete. Init setup flow.
         * 
         * @event YTADatabase#requestsetup
         */
        window.dispatchEvent(new CustomEvent('requestsetup'));
        console.log('%c DATABASE %c Requesting setup',
          'background-color: purple; font-weight: bold;', '');
        this._firebaseTimetableRead = true;
        return;
      }
      const timetable = snapshot.val();
      for (let i = 0; i < timetable.length; i++) {
        if (timetable[i] === 0) continue;
        for (let j = 0; j < timetable[i].length; j++) {
          DataStore.dispatch(DataActions.modifyLesson(i, j, timetable[i][j]));
        }
      }
      this._firebaseTimetableRead = true;
      this._preventUpload = false;
    }));
    const timetableChildHandler = snapshot => {
      if (this._preventDownload || !this._firebaseTimetableRead) return;
      let ref = snapshot.ref,
          path = [];
      while (ref.key !== 'timetable') {
        path.push(ref.key);
        ref = ref.parent;
      }
      this._preventUpload = true;
      if (path.length === 2) {
        // Added new lesson
        const weekday = Number(path[1]),
              lessonIndex = Number(path[0]);
        DataStore.dispatch(DataActions.modifyLesson(weekday, lessonIndex, snapshot.val()));
      } else if (path.length === 1) {
        const weekday = Number(path[0]),
              dayTimetable = snapshot.val();
        if (dayTimetable === 0) {
          DataStore.dispatch(DataActions.emptyDay(weekday));
        } else {
          for (let lessonIndex = 0; lessonIndex < dayTimetable.length; lessonIndex++) {
            DataStore.dispatch(DataActions.modifyLesson(weekday, lessonIndex, dayTimetable[lessonIndex]));
          }
        }
      } else {
        console.error('%c DATABASE %c Unknown path in timetable child_added/edited handler',
          'background-color: purple; font-weight: bold;', snapshot.ref.toString());
      }
      this._preventUpload = false;
    };
    timetableRef.on('child_added', timetableChildHandler);
    timetableRef.on('child_changed', timetableChildHandler);
    timetableRef.on('child_removed', snapshot => {
      if (this._preventDownload) return;
      let ref = snapshot.ref,
          path = [];
      while (ref.key !== 'timetable') {
        path.push(ref.key);
        ref = ref.parent;
      }
      if (path.length !== 2) {
        console.error('%c DATABASE %c Unknown path in timetable child_removed handler',
          'background-color: purple; font-weight: bold;', snapshot.ref.toString());
        throw new Error('Unknown path in timetable child_removed handler');
      }
      const weekday = Number(path[1]),
            lessonIndex = Number(path[0]);
      this._preventUpload = true;
      DataStore.dispatch(DataActions.removeLesson(weekday, lessonIndex));
      this._preventUpload = false;
    });

    promiseList.push(eventsRef.once('value').then(snapshot => {
      if (!snapshot.exists()) return;
      const events = snapshot.val();
      this._preventUpload = true;
      for (let key in events) {
        DataStore.dispatch(DataActions.addEvent(events[key]));
      }
      this._preventUpload = false;
      this._firebaseEventsRead = true;
    }));
    eventsRef.on('child_added', snapshot => {
      if (this._preventDownload || !this._firebaseEventsRead) return;
      if (snapshot.ref.parent.key !== 'events') {
        console.error('%c DATABASE %c Unknown path in events child_added handler',
          'background-color: purple; font-weight: bold;', snapshot.ref.toString());
        throw new Error('Unknown path in timetable child_removed handler');
      }
      this._preventUpload = true;
      DataStore.dispatch(DataActions.addEvent(snapshot.val()));
      this._preventUpload = false;
    });
    eventsRef.on('child_changed', snapshot => {
      if (this._preventDownload || !this._firebaseEventsRead) return;
      this._preventUpload = true;
      let ref = snapshot.ref;
      // Matches such pattern: yyyy-mm-dd_i
      while (!(/\d{4}(-\d{2}){2}_?(\d+)?/.test(ref.key))) {
        ref = ref.parent
      }
      if (ref !== snapshot.ref) {
        const key = ref.key;
        ref.once('value', snapshot =>
          DataStore.dispatch(DataActions.updateEvent(key, snapshot.val())));
      } else {
        DataStore.dispatch(DataActions.updateEvent(snapshot.key, snapshot.val()));
      }
      this._preventUpload = false;
    });
    eventsRef.on('child_removed', snapshot => {
      if (this._preventDownload) return;
      if (snapshot.ref.parent.key !== 'events') {
        console.error('%c DATABASE %c Unknown path in events child_added handler',
          'background-color: purple; font-weight: bold;', snapshot.ref.toString());
        throw new Error('Unknown path in timetable child_removed handler');
      }
      this._preventUpload = true;
      DataStore.dispatch(DataActions.removeEventByKey(snapshot.key));
      this._preventUpload = false;
    });

    Promise.all(promiseList).then(() => {
      /** @event YTADatabase#dataready */
      window.dispatchEvent(new CustomEvent('dataready'));
      window.AppState.dataReady = true;
      this._previousFlattedData = Object.keys(this._flatterData(DataStore.getState()));
    });
    this._reactToDataChanges();
  }

  _reactToDataChanges() {
    // TODO: Move to idle task (and subscribe to `beforeunload`) or off-thread
    const globalRef = this._database.ref(`/users/${this.user.uid}/`);
    DataStore.subscribe(() => {
      this._readFromLocalData && this._setupLocalData().then(() => this._updateLocalData());
      if (this._preventUpload || !this._firebaseTimetableRead) return;
      const state = DataStore.getState(),
            updates = this._flatterData(state),
            promiseList = [];
      // Detect removals
      const keysNew = Object.keys(updates),
            keysOld = this._previousFlattedData;
      keysOld.forEach(key => {
        if (!keysNew.includes(key)) {
          this._preventDownload = true;
          promiseList.push(globalRef.child(key).remove());
        }
      });
      this._previousFlattedData = Object.keys(updates);
      this._preventDownload = true;
      promiseList.push(globalRef.update(updates));
      Promise.all(promiseList).then(() => this._preventDownload = false);
    });
  }

  _flatterData(state) {
    const output = {},
          flatter =
      (currentKey, input, output) => {
        for (let key in input) {
          if (input.hasOwnProperty(key)) {
            let newKey = key;
            let newVal = input[key];
            if (newVal === undefined) continue;
            if (currentKey.length > 0) {
              newKey = currentKey + '/' + key;
            }
            if (typeof newVal === "object") {
              flatter(newKey, newVal, output);
            } else {
              output[newKey] = newVal;
            }
          }
        }
      }
    flatter('', state, output);
    return output;
  }

  _setupLocalData() {
    return new Promise((resolve, reject) => {
      // Resolve if this function has been already called
      if (this.__localDataReady) resolve();
      
      // Resolve if SW reports it has got database working
      sendMessage({ cmd: 'setupDexie' }).then(() => {
        this.__localDataReady = true;
        resolve();
      }).catch(err => {
        if (err.name !== 'NoUID') reject(err);
        // Otherwise, init database on SW
        new Promise(r => {
          if (this.user)
            r();
          else
            window.addEventListener('firebaseuserready', r);
        }).then(() => {
          sendMessage({ cmd: 'setupDexie', uid: this.user.uid }).then(() => {
            this.__localDataReady = true;
            resolve();
          }).catch(err => {
            reject(err);
          });
        });
      });
    });
  }

  _updateLocalData() {
    return sendMessage({ cmd: 'pushToDB', data: DataStore.getState() });
  }

  _getLocalData() {
    return sendMessage({ cmd: 'readData' });
  }

  async removeEvent(eventKey) {
    const eventsRef = this._database.ref(`users/${this.user.uid}/events`),
          snapshot = await eventsRef.once('value'),
          exists = await snapshot.hasChild(eventKey);
    if (!exists) {
      return;
    } else {
      await this._database.ref(`users/${this.user.uid}/events/${eventKey}`).remove();
      return;
    }
  }
}

// From https://googlechrome.github.io/samples/service-worker/post-message/
/**
 * Send a massage to the Service Worker and await a response
 * @param {any} message - Message to be sent to Service Worker
 * @returns {Promise} A promise that will resolve with the answer or reject with error thrown at SW level
 */
function sendMessage(message) {
  return new Promise(function(resolve, reject) {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = event => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };
    
    navigator.serviceWorker.ready.then(reg => reg.active.postMessage(message,[messageChannel.port2]));
  });
}


/** @global */
window.Database = new YTADatabase();