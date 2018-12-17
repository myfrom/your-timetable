/** @module */

import { PolymerElement, html } from '@polymer/polymer';

import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';

import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-styles/paper-styles.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';

import YTAElementBase from '../js/yta-element-base.js';
import { YTALocalizeMixin } from '../js/yta-localize-mixin.js';
import { DataStore, DataStoreMixin, UIStateStore, DataActions } from "../js/redux-stores.js";

import ElementContent from './yta-settings.el.html';

/**
 * @customElement
 * @polymer
 * @extends {PolymerElement}
 * @appliesMixin YTALocalizeMixin
 * @appliesMixin YTAElementBase
 */
class YTASettings extends DataStoreMixin(YTALocalizeMixin(YTAElementBase(PolymerElement))) {
  static get is() { return 'yta-settings'; }
  static get template() {
    const template = document.createElement('template');
    template.innerHTML = ElementContent;
    return template;
  }
  static get properties() {
    return {
      
      // User data
      appData: {
        type: Object,
        statePath: state => state
      },

      language: {
        value: () => window.appLang,
        observer: '_langChanged'
      },

    };
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();

    // Add event listeners
    window.appShell.addEventListener('open-settings', () => this.open());
    window.appShell.addEventListener('close-settings', () => this.close());
  }

   open() {
    document.head.querySelector('#themeColor').setAttribute('content', '#263238');
    this.style.transition = 'transform 200ms ease-out';
    this._computeTransitionTimes();
    requestAnimationFrame(() => { 
      this.classList.add('open');
    });
    this._ampmListener = e => {
      const value = e.target.checked;
      DataStore.dispatch(DataActions.settings(Object.assign(this.appData.settings, { use12hoursClock: value })))
    };
    this.shadowRoot.querySelector('#ampmToggle').addEventListener('checked-changed', this._ampmListener);
    this._firstDayListener = e => {
      const value = e.target.selected;
      DataStore.dispatch(DataActions.settings(Object.assign(this.appData.settings, { firstDayOfWeek: Number(value) })))
    };
    this.shadowRoot.querySelector('#firstDaySelection').addEventListener('selected-changed', this._firstDayListener);
    this._betaSurveysListener = e => {
      const value = e.target.checked;
      DataStore.dispatch(DataActions.settings(Object.assign(this.appData.settings, { receiveBetaSurveys: value })))
    };
    this.shadowRoot.querySelector('#betaSurveysToggle').addEventListener('checked-changed', this._betaSurveysListener);
  }
  
  close() {
    document.head.querySelector('#themeColor').setAttribute('content', '#673ab7');
    this.style.transition = 'transform 200ms ease-in';
    this._computeTransitionTimes();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.classList.remove('open');
      });
    });
    this.shadowRoot.querySelector('#ampmToggle').removeEventListener('checked-changed', this._ampmListener);
    this.shadowRoot.querySelector('#firstDaySelection').removeEventListener('selected-changed', this._firstDayListener);
  }

  _sendClose() {
    this._fire('switchsection', { action: 'closeSettings' }, false, window.appShell);
  }

  _langChanged(language) {
    if (!language || !this.appData) return;
    DataStore.dispatch(
      DataActions.settings(Object.assign(this.appData.settings, { language })));
  }

  _computeTransitionTimes() {
    if (this._lastTransTimeChange &&
        this._lastTransTimeChange[0] === this.tabletLayout &&
        this._lastTransTimeChange[1] === this.desktopLayout)
    {
      return;
    }
    if (this.tabletLayout) {
      this.style.transitionDuration = '260ms';
    } else if (this.desktopLayout) {
      this.style.transitionDuration = '150ms';
    } else {
      this.style.transitionDuration = '200ms';
    }
    this._lastTransTimeChange = [this.layout === 'tablet', this.layout === 'desktop'];
  }

  _isFalse(a, b) {
    return !a && !b;
  }
}

customElements.define(YTASettings.is, YTASettings);