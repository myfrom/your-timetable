/** @module */

import { PolymerElement, html } from '@polymer/polymer';

import '@polymer/iron-icon/iron-icon.js';

import '@polymer/paper-dialog/paper-dialog.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-item/paper-icon-item.js';
import '@polymer/paper-item/paper-item-body.js';

import { YTALocalizeMixin } from '../js/yta-localize-mixin.js';

import ElementContent from './yta-feedback-dialog.el.html';

/**
 * @customElement
 * @polymer
 * @extends {PolymerElement}
 * @appliesMixin YTALocalizeMixin
 */
class YTAFeedbackDialog extends YTALocalizeMixin(PolymerElement) {
  static get is() { return 'yta-feedback-dialog'; }
  static get template() {
    const template = document.createElement('template');
    template.innerHTML = ElementContent;
    return template;
  }

  constructor() {
    super();
  }

  open() {
    this.$.dialog.open();
  }

}

window.customElements.define(YTAFeedbackDialog.is, YTAFeedbackDialog);