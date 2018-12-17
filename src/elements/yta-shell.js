/** @module */

import '@polymer/polymer/lib/elements/dom-bind.js';
import { PolymerElement } from '@polymer/polymer';
// import { PropertiesMixin } from '@polymer/polymer/lib/mixins/properties-mixin.js';
// Should use this only but mixins ain't ready

import '@polymer/app-layout/app-layout.js';
import '@polymer/app-layout/app-scroll-effects/effects/waterfall.js';

import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-pages/iron-pages.js';

import '@polymer/paper-menu-button/paper-menu-button.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-tabs/paper-tabs.js';
import '@polymer/paper-tabs/paper-tab.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-spinner/paper-spinner.js';
import '@polymer/paper-styles/paper-styles.js';

import '@myfrom/iron-swipeable-pages/iron-swipeable-pages.js';

import { YTALocalizeMixin } from '../js/yta-localize-mixin.js';
import '../js/yta-database.js';
import '../elements/yta-overview-page.js';

import YTAElementBase from '../js/yta-element-base.js';
import { waitMs } from '../js/wait-utils.js'
import { UIStateStore, UIActions, UIStateStoreMixin } from '../js/redux-stores.js';

/**
 * App shell
 * Responsible for handling any app logic.
 * Doesn't have its own DOM, relies on DOM placed in body
 * for faster first paint
 * 
 * @class
 * @appliesMixin YTAElementBase
 * @appliesMixin YTALocalizeMixin
 * @fires YTAShell#shellready
 * @fires switchsection
 * @listens YTADatabase#dataready
 * @listens YTADatabase#requestsignin
 * @listens YTADatabase#requestsetup
 * @listens switchsection
 */
class YTAShell extends
  YTALocalizeMixin(UIStateStoreMixin(YTAElementBase(PolymerElement))) {
  static get is() { return 'yta-shell' }
  static get properties() {
    return {
    
      selectedSection: {
        type: String,
        value: 'main',
      },
      
      /**
       * Currently selected page
       * Available: overview, timetable, search, calendar
       */
      selectedPage: {
        type: String,
        value: 'overview',
        observer: 'resolveSelected'
      }
      
    };
  }

  /**
   * Returns the user from Database or null if Database not yet initiated
   * 
   * @type {?object}
   */
  get user() {
    return window.AppState.readyCheck.database ?
      Database.user :
      null;
  }

  /**
   * Valid page names
   * 
   * @constant
   * @type {string[]}
   * @default
   */
  get VALID_PAGES() {
    return ['overview', 'timetable', 'search', 'calendar']
  }

  constructor() {
    super();

    this._body = document.body;

    // this._enableProperties();
      
    this._addEventListeners();

    this._initDataBinding();
    
    super.ready();

    /**
     * Indicates the shell has loaded
     * 
     * @event YTAShell#shellready
     */
    window.AppState.readyCheck.shell = true;
    this._fire('shellready');
  }


  /**
   * Query selector shortcut on this._body
   * 
   * @protected
   * @param {string} selector - CSS selector
   * @returns {HTMLElement|null} Returns the element if found or null if not
   */
  $$(selector) {
    return this._body.querySelector(selector);
  }

  _addEventListeners() {
    // Show overview page once data has loaded
    window.addEventListener('dataready', () => {
      this._loadOverviewPage();
      this.$$('#avatar-menu').setAttribute('src', this.user.photoURL);
    }, { once: true});

    // Show FAB after going back from AddDialog
    window.addEventListener('close-add-dialog', () => {
      let time = 300;
      if (this.layout === 'desktop') time = 100;
      if (this.layout === 'tablet') time = 390;
      setTimeout(() => requestAnimationFrame(() => {
        this.$$('#fab').classList.remove('hidden');
      }), time);
    });
    
    // Database says user data needs to be set-up
    window.addEventListener('requestsetup', () => {
      setTimeout(() => {
        this._fire('switchsection', { action: 'openSetupDialog' }, true, this);
      }, 500);
    });
    
    // Database requests sign in
    window.addEventListener('requestsignin', () => {
      this._fire('switchsection', { action: 'openOnboarding' }, true, this);
    }, { once: true });
    
    // Handle section switch request
    this.addEventListener('switchsection', this._switchRoute);

    // Show and hide offline avatar when needed
    const networkChange = e => {
      this.$$('#avatar-menu').setAttribute('src',
        navigator.onLine ? this.user.photoURL : '/images/offline-avatar.svg');
    };
    window.addEventListener('online', networkChange);
    window.addEventListener('offline', networkChange);

    // Set correct layout on resize
    window.addEventListener('resize', this._resizeHandler.bind(this));
    this._resizeHandler();

    // Add markup event listeners
    const elementsWithHandlers = this._body.querySelectorAll('[data-on-click]');
    Array.prototype.forEach.call(elementsWithHandlers, el => {
      const handlerFunction = el.getAttribute('data-on-click');
      if (!handlerFunction in this) {
        console.error(`%c SHELL %c Not existing handler ${handlerFunction} assigned to click event on element`,
          'background-color: purple; font-weight: bold;', '', el);
        return;
      }
      el.addEventListener('tap', this[handlerFunction].bind(this));
    });
  }

  _resizeHandler() {
    /** @constant */
    const PHONE_MEDIA_QUERY = '(max-width: 959px) and (orientation: landscape), (max-width: 599px) and (orientation: portrait)',
          TABLET_MEDIA_QUERY = '(min-width: 600px) and (max-width: 839px) and (orientation: portrait), (min-width: 960px) and (max-width: 1279px) and (orientation: landscape)';
    let layout;
    if (window.matchMedia(PHONE_MEDIA_QUERY).matches)
      layout = 'phone';
    else if (window.matchMedia(TABLET_MEDIA_QUERY).matches)
      layout = 'tablet';
    else
      layout = 'desktop';
    UIStateStore.dispatch(UIActions.updateLayout(layout));

    // Move the FAB accordingly
    const fab = this._body.querySelector('#fab'),
          toolbarEl = this._body.querySelector('#header app-toolbar[sticky]');
    if (layout === 'desktop' && fab.parentElement !== toolbarEl)
      toolbarEl.appendChild(fab);
    else if (layout !== 'desktop' && fab.parentElement !== this._body)
      this._body.appendChild(fab);

    
    // Show correct labels on tabs
    // Waits for the localize API
    const exec = () => {
      const tabsElements = this._body.querySelectorAll('[data-tab]');
      Array.prototype.forEach.call(tabsElements, tabEl => {
        const tabKey = tabEl.getAttribute('data-tab');
        if (layout !== 'phone')
          tabEl.innerHTML = this.localize(tabKey === 'search' ? 'search' : 'shell_' + tabKey);
        else {
          let tabIcon;
          switch (tabKey) {
            case 'overview':
              tabIcon = 'home';
              break;
            case 'timetable':
              tabIcon = 'view-list';
              break;
            case 'search':
              tabIcon = 'search';
              break;
            case 'calendar':
              tabIcon = 'event';
              break;
            default:
              console.error('%c SHELL %c Unexpected tab when setting tab headers',
                'background-color: purple; font-weight: bold;', '', el);
          }
          tabEl.innerHTML = `<iron-icon icon="ycons:${tabIcon}"></iron-icon>`;
        }
      });
    };
    if (this.localize)
      exec();
    else
      this.addEventListener('app-localize-resources-loaded', exec);
  }

  _initDataBinding() {
    // Localization stuff
    const exec = () => {
      const localizedElements = this._body.querySelectorAll('[data-localize]');
      Array.prototype.forEach.call(localizedElements, el => {
        const localeString = el.getAttribute('data-localize');
        el.textContent = this.localize(localeString);
      });
    };
    if (this.localize)
      exec();
    else
      this.addEventListener('app-localize-resources-loaded', exec);
    

    // Data binding
    this._manualDataBinding = this._manualDataBinding || {};
    const bindingElements = this._body.querySelectorAll('[data-bind-attr]');
    Array.prototype.forEach.call(bindingElements, el => {
      const bindAttr = el.getAttribute('data-bind-attr'),
            bindValueName = el.getAttribute('data-bind-value');
      if (!(bindValueName in this))
        console.error('%c SHELL %c Trying to bind to not-existing property',
          'background-color: purple; font-weight: bold;', '', bindValueName);
      el.setAttribute(bindAttr, this[bindValueName]);
      const bindAttrDashed = bindAttr.replace(/[A-Z](?!$)/g, match =>
        `-${match.toLowerCase()}`);
      el.addEventListener(`${bindAttrDashed}-changed`, e => this[bindValueName] = e.detail.value);
      const entry = { el, bindAttr }
      this._manualDataBinding[bindValueName] ?
        this._manualDataBinding[bindValueName].push(entry) :
        this._manualDataBinding[bindValueName] = [ entry ];
    });

    // Event handling
    const clickableElements = this._body.querySelectorAll('[data-on-tap]');
    Array.prototype.forEach.call(clickableElements, el => {
      const handler = el.getAttribute('data-on-tap');
      if (!(typeof this[handler] === 'function'))
        console.error('%c SHELL %c Trying to bind to not-existing handler',
          'background-color: purple; font-weight: bold;', '', handler, el);
      el.addEventListener('click', this[handler].bind(this));
    })
  }

  _propertiesChanged(currentProps, changedProps, oldProps) {
    super._propertiesChanged(currentProps, changedProps, oldProps);
    for (let prop in changedProps) {
      if (this._manualDataBinding && prop in this._manualDataBinding) {
        const value = changedProps[prop];
        this._manualDataBinding[prop].forEach(entry =>
          entry.el[entry.bindAttr] = value);
      }
    }
  }
  
  async _switchRoute(e) {
    let clientRect;
    switch (e.detail.action) {
      case 'openAddDialog':
        await import('../elements/yta-add-dialog.js');
        this._body.style.overflowY = 'hidden';
        const withAnimation = this.selectedSection === 'main' ? true : false;
        clientRect = this.layout === 'desktop' ? null : e.detail.clientRect;
        this._fire('open-add-dialog', { clientRect, withAnimation });
        this._updateSelectedSection('add');
        break;
      case 'closeAddDialog':
        if (this.layout === 'desktop') {
          clientRect = null;
        } else {
          const fab = this.$$('#fab');
          fab.classList.remove('hidden');
          clientRect = fab.getBoundingClientRect();
          fab.classList.add('hidden');
        }
        this._fire('close-add-dialog', { clientRect, withAnimation: true });
        await waitMs(390);
        this._body.style.overflowY = null;
        this._updateSelectedSection('main');
        fab.classList.remove('hidden');
        break;
      case 'openOnboarding':
        await import('../elements/yta-onboarding.js');
        this._body.style.overflowY = 'hidden';
        this._fire('open-onboarding');
        this._updateSelectedSection('onboarding');
        break;
      case 'closeOnboarding':
        this._fire('close-onboarding');
        await waitMs(260);
        this._body.style.overflowY = null;
        this._updateSelectedSection('main');
        break;
      case 'openSetupDialog':
        await import('../elements/yta-setup-dialog.js');
        this._body.style.overflowY = 'hidden';
        this._fire('open-setup-dialog');
        this._updateSelectedSection('setup');
        break;
      case 'closeSetupDialog':
        this._fire('close-setup-dialog');
        await waitMs(260);
        this._body.style.overflowY = null;
        this._updateSelectedSection('main');
        break;
      case 'openSettings':
        await import('../elements/yta-settings.js');
        this._body.style.overflowY = 'hidden';
        this._fire('open-settings');
        this._updateSelectedSection('settings');
        break;
      case 'closeSettings':
        this._fire('close-settings');
        await waitMs(260);
        this._body.style.overflowY = null;
        this._updateSelectedSection('main');
        break;
      default:
        console.error('%c SHELL %c `switchsection` event fired without or with unknown action!',
            'background-color: purple; font-weight: bold;', '', el);
    }
  }

  _updateSelectedSection(selected) {
    this.selectedSection = selected;
    const elementsToUpdate = this._body.querySelectorAll('[data-bind-value="selectedSection"]');
    Array.prototype.forEach.call(elementsToUpdate, el => {
      const attrName = el.getAttribute('data-bind-attr');
      el.setAttribute(attrName, selected);
    });
  }
  
  async signOut() {
    if (!AppState.readyCheck.database) await _waitUntilReady('database');
    return await Database.signOut();
  }
  
  resolveSelected(selectedString) {
    if (!this.VALID_PAGES.includes(selectedString)) {
      console.error('%c SHELL %c Tried to resolve unknown page!',
          'background-color: purple; font-weight: bold;', '', selectedString);
      return;
    }
    if (selectedString !== 'overview') {
      const selectedItemWaiter = this.$$(`#${selectedString} > .waiter`);
      if (selectedItemWaiter) {
        import(`./yta-${selectedString}-page.js`).then(() => {
          requestAnimationFrame(() => {
            const anim = selectedItemWaiter.animate([
              { opacity: 1 },
              { opacity: 0 }
            ], {
              duration: 150
            });
            anim.onfinish = () => {
              selectedItemWaiter.remove();
            };
          });
        });
      }
    }
  }
  
  _openAddDialog() {
    const fab = this.$$('#fab');
    const clientRect = fab.getBoundingClientRect();
    this._fire('switchsection', {
      action: 'openAddDialog',
      clientRect: clientRect
    });
    fab.classList.add('hidden');
  }
  
  _loadOverviewPage() {
    const selectedItemWaiter = this.$$('#overview > .waiter');
    if (selectedItemWaiter) {
      const exec = () => requestAnimationFrame(() => {
        const anim = selectedItemWaiter.animate([
          { opacity: 1 },
          { opacity: 0 }
        ], {
          duration: 150
        });
        anim.onfinish = () => selectedItemWaiter.remove();
      });
      if (window.AppState.readyCheck.overviewpage)
        exec();
      else
        window.addEventListener('overviewpageready', exec, { once: true });
    }
  }
  
  async _menuItemClicked(e) {
    const cmd = e.target.getAttribute('key');
    switch (cmd) {
      case 'settings':
        this._fire('switchsection', { action: 'openSettings' });
        break;
      
      case 'feedback': {
        await import('../elements/yta-feedback-dialog.js');
        const dialog = this.$$('#feedbackDialog');
        dialog.style.display = 'block';
        dialog.addEventListener('iron-overlay-closed',
          () => dialog.style.display = 'none', { once: true });
        requestAnimationFrame(() =>
          requestAnimationFrame(() => dialog.open()));
        break;
      }
      
      case 'about': {
        await import('../elements/yta-about-page.js');
        const dialog = this.$$('#aboutDialog');
        dialog.style.display = 'block';
        dialog.addEventListener('iron-overlay-closed',
          () => dialog.style.display = 'none', { once: true });
        requestAnimationFrame(() =>
          requestAnimationFrame(() => dialog.open()));
        break;
      }
      
      /* case 'help':
        // redirect to help page
        break; */
        
      case 'signout':
        await this.signOut();
        location.reload(); // TODO: Rethink
        break;
      
      default:
        console.error('%c SHELL %c _menuItemClicked fired without key',
          'background-color: purple; font-weight: bold;', '', el);
    }
  }
}

/**
 * Requests to switch shell section
 * @event switchsection
 */


customElements.define(YTAShell.is, YTAShell);