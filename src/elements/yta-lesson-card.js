/** @module */

import { PolymerElement, html } from '@polymer/polymer';

import '@polymer/iron-flex-layout/iron-flex-layout.js';

import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-styles/color.js';

import { YTALocalizeMixin } from '../js/yta-localize-mixin.js';
import { UIStateStoreMixin } from '../js/redux-stores.js';

import ElementContent from './yta-lesson-card.el.html';

/**
 * @customElement
 * @polymer
 * @extends {PolymerElement}
 * @appliesMixin YTALocalizeMixin 
 */
class YTALessonCard extends UIStateStoreMixin(YTALocalizeMixin(PolymerElement)) {
  static get is() { return 'yta-lesson-card'; }
  static get template() {
    const template = document.createElement('template');
    template.innerHTML = ElementContent;
    return template;
  }
  static get properties() {
    return {
  
      phoneLayout: {
        type: Boolean,
        statePath: state => state.layout === 'phone'
      },
      
      blank: {
        type: Boolean,
        reflectToAttribute: true
      },
      
      color: String,
      
      name: String,
      
      startTime: String,
      
      endTime: String,
      
      classroom: String,

      teacher: String
      
    };
  }
  
  constructor() {
    super();
  }
  
  _isClassNull(classroom) {
    return !classroom;
  }

  _isTeacherNull(teacher) {
    return !teacher;
  }
}

customElements.define(YTALessonCard.is, YTALessonCard);