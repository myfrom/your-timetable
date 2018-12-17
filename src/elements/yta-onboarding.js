/** @module */

import { PolymerElement, html } from '@polymer/polymer';
import '@polymer/polymer/lib/elements/dom-if.js';

import '@myfrom/iron-swipeable-pages/iron-swipeable-pages.js';

import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-checkbox/paper-checkbox.js';
import '@polymer/paper-fab/paper-fab.js';
import '@myfrom/paper-pager/paper-pager.js';
import '@polymer/paper-styles/paper-styles.js';

import YTAElementBase from '../js/yta-element-base.js';
import { YTALocalizeMixin } from '../js/yta-localize-mixin.js';
import { DataStore, DataActions } from '../js/redux-stores.js';

import ElementContent from './yta-onboarding.el.html';

/**
 * @class
 * @customElement
 * @polymer
 * @extends {PolymerElement} 
 * @appliesMixin YTALocalizeMixin
 * @appliesMixin YTAElementBase
 */
class YTAOnboarding extends YTALocalizeMixin(YTAElementBase(PolymerElement)) {
  static get is() { return 'yta-onboarding'; }
  static get template() {
    const template = document.createElement('template');
    template.innerHTML = ElementContent;
    return template;
  }
  static get properties() {
    return {
      
      /* NOT SURE IF NESSCESSARY
      // Boolean indicating state of element
      isActive: {
        type: Boolean,
        value: false
      },*/
      
      // Selected page
      selected: {
        type: Number,
        value: 0,
        observer: '_selectedChanged'
      },
      
      // Color of current page
      color: {
        type: String,
        notify: true,
        reflectToAttribute: true,
        value: '#FFFFFF',
        observer: '_colorChanged'
      }
      
    };
  }

  constructor() {
    super();
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    // Add event listeners
    window.appShell.addEventListener('open-onboarding', () => this.open());
    window.appShell.addEventListener('close-onboarding', () => this.close());
    
    // #64 of GeoloeG/iron-swipeable-pages fix
    if (!this._isSW()) {
      this.shadowRoot.querySelector('[color="#64B5F6"]').delete();
    }
  }
  
  disconnectedCallback() {
    if (!window.appShell) return;
    
    // Remove event listeners
    window.appShell.removeEventListener('open-onboarding', () => this.open());
    window.appShell.removeEventListener('close-onboarding', () => this.close());
  }
  
  open() {
    this.style.transition = 'transform 200ms ease-out';
    this._computeTransitionTimes();
    requestAnimationFrame(() => { 
      this.classList.add('open');
      this.$.pager._selectedChanged(0, this._isSW() ? 3 : 2);
    });
  }
  
  close() {
    this.style.transition = 'transform 200ms ease-in';
    this._computeTransitionTimes();
    this.classList.remove('open');
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
  
  async _signIn() {
    this.$.signinBtn.classList.add('waiting');
    this._waitUntilReady('database');
    Database.signIn('google').then(() => {
      // Sign in successful - proceed
      if (this.shadowRoot.querySelector('#beta-checkbox').checked) {
        // Save the decision about beta notifications,
        // TODO: Remove after beta ends
        window.AppState.BETA_betaSurveys = true;
      }
      this.color = '#673ab7';
      this._fire('switchsection', { action: 'closeOnboarding' }, true, window.appShell);
    }, () => {
      // Sign in failed, reset
      requestAnimationFrame(() => {
        this.$.signinBtn.classList.remove('waiting');
        this.$.signinBtn.classList.add('failed');
      });
      setTimeout(() => {
        requestAnimationFrame(() => {
          this.$.signinBtn.classList.remove('failed');
        });
      }, 500);
    });
  }
  
  _selectedChanged(selected) {
    if (selected === null) {
      this.selected = 0;
      return;
    }
    if (!this.shadowRoot) return;
    const selectedEl = this.shadowRoot.querySelector(`.page[i="${selected + 1}"]`);
    this.color = selectedEl.getAttribute('color');
    if (this.layout !== 'desktop' && selected === this._pagesCount() - 1) {
      this.$.pager.style.display = 'none';
    } else {
      if (this.$.pager.style.display === 'initial') return;
      this.$.pager.style.display = 'initial';
    }
  }
  
  _colorChanged(color) {
    document.head.querySelector('#themeColor').setAttribute('content', color);
    if (!this.shadowRoot) return;
    const pager = this.shadowRoot.querySelector('#pager');
    pager.updateStyles({ '--paper-pager-color': this.layout === 'desktop' ? color
                                                                   : '#FFFFFF' });
    if (this.layout === 'desktop') {
      requestAnimationFrame(() => {
        const nextFab = this.shadowRoot.querySelector('.fab.right');
        const previousFab = this.shadowRoot.querySelector('.fab.left');
        color = color === '#FFFFFF' ? 'black' : color; 
        nextFab.style.color = color;
        previousFab.style.color = color;
      });
    }
  }
  
  _listenFotSignIn() {
    return new Promise((resolve, reject) => {
      window.addEventListener('firebasesignedin', resolve);
      window.addEventListener('firebasesigninfailed', reject);
    });
  }
  
  _isSW() {
    return 'serviceWorker' in navigator;
  }
  
  _pagesCount() {
    return this._isSW() ? 4
                        : 3;
  }
  
  _nextSlide() {
    if (this.selected + 1 !== this._pagesCount()) {
      this.selected++;
      if (this.selected + 1 === this._pagesCount()) {
        this.shadowRoot.querySelector('.fab.right').disabled = true;
      } else {
        this.shadowRoot.querySelector('.fab.right').disabled = false;
      }
      if (this.selected === 0) {
        this.shadowRoot.querySelector('.fab.left').disabled = true;
      } else {
        this.shadowRoot.querySelector('.fab.left').disabled = false;
      }
    }
  }
  
  _previousSlide() {
    if (this.selected !== 0) {
      this.selected--;
      if (this.selected + 1 === this._pagesCount()) {
        this.shadowRoot.querySelector('.fab.right').disabled = true;
      } else {
        this.shadowRoot.querySelector('.fab.right').disabled = false;
      }
      if (this.selected === 0) {
        this.shadowRoot.querySelector('.fab.left').disabled = true;
      } else {
        this.shadowRoot.querySelector('.fab.left').disabled = false;
      }
    }
  }
}

customElements.define(YTAOnboarding.is, YTAOnboarding);