import debounce from 'lodash.debounce';
import matchRule from './rules/match';
import referenceRule from './rules/reference';
import remoteRule from './rules/remote';
import enLocale from './locales/en';

/**
 * EagerForm
 */
export default class EagerForm {
  /**
   * Version
   *
   * @type {String}
   */
  static version = '1.0.5';

  /**
   * The prefix for data attributes
   *
   * @type {String}
   */
  static RULE_PREFIX = 'eager';

  /**
   * Rules registry
   *
   * @type {Object}
   */
  static rules = {};

  /**
   * Locale registry
   *
   * @type {Object}
   */
  static messages = {};

  /**
   * Reserved words that can't be used as rule name
   *
   * @type {Array}
   */
  static reservedWords = ['error', 'debounce', 'delay'];

  /**
   * Default options
   *
   * @type {Object}
   *
   * @property {string}    locale                       =>   The locale for EagerForm
   * @property {Boolean}      showSuccessState             =>   Whether to show success state or not
   * @property {Boolean}      focusFirstError              =>   Whether to focus first error or not
   * @property {Boolean}      autoScroll                   =>   Whether to autoscroll to first error or not
   * @property {Number}   offsetFocus                  =>   First element with error focus offset
   * @property {Array}     revalidate                   =>   List of JS events to that triggers the validation
   * @property {Boolean}      noTriggerOnTab               =>   Whether to run validation when element comes into
   *                                                    focus by pressing the tab key
   * @property {object}    delay                        =>   Delay for specific revalidate events
   * @property {object}    debounce                     =>   Debounce for specific revalidate events
   * @property {Boolean}      validateWithoutName          =>   Whether to validate inputs without a "name" attribute
   * @property {Boolean}      captureSubmit                =>   Whether to capture the form submit or not
   * @property {Boolean}      disableSubmit                =>   Whether to disable submit on submit capture or
   *                                                    not,`captureSubmit` must be set to true.
   * @property {Boolean}      captureReset                 =>   Whether to capture the form reset or not
   * @property {string}    parentSelector               =>   Parent CSS selector, defaults to element.parentNode
   * @property {string}    invalidFeedbackName          =>   Invalid feedback HTML element name, default is `div`
   * @property {string}    invalidFeedbackPosition      =>   Invalid feedback HTML element position, value must be
   *                                                    one of these: "beforebegin", "afterbegin", "beforeend",
   *                                                    "afterend"
   * @property {string}    invalidFeedbackSelector      =>   If provided, we will use this element to append the errors,
   *                                                    both input and this element must belong to the same parent node.
   *                                                    Defaults to: .invalid-feedback
   * @property {object}    classes                      =>   List of various classess used by the library
   * @property {string}    classes.formValidatedClass   =>   Class name to add when form validation is done
   * @property {string}    classes.inputValidClass      =>   Class name to add when input is valid
   * @property {string}    classes.inputInvalidClass    =>   Class name to add when input is invalid
   * @property {string}    classes.parentValidClass     =>   Class name to add to parent element of the input when
   *                                                      input is valid
   * @property {string}    classes.parentInvalidClass   =>   Class name to add to parent element of the input when
   *                                                      input is invalid
   * @property {string}    classes.invalidFeedbackClass =>   Class name to add to the invalid feedback element
   * @property {string}    classes.disabled             =>   Class name to add to disable elements/form
   */
  static defaultOptions = {
    locale: 'en',
    showSuccessState: true,
    autoScroll: true,
    focusFirstError: true,
    offsetFocus: 50,
    revalidate: ['blur', 'change', 'input'],
    noTriggerOnTab: true,
    delay: {},
    debounce: {
      blur: 100
    },
    validateWithoutName: false,
    captureSubmit: true,
    disableSubmit: true,
    captureReset: true,
    parentSelector: null,
    invalidFeedbackName: 'div',
    invalidFeedbackPosition: 'afterend',
    invalidFeedbackSelector: '.invalid-feedback',
    changedAttribute: 'eager-changed',
    classes: {
      formValidatedClass: 'was-validated',
      inputValidClass: 'is-valid',
      inputInvalidClass: 'is-invalid',
      parentValidClass: 'has-valid-input',
      parentInvalidClass: 'has-invalid-input',
      invalidFeedbackClass: 'invalid-feedback',
      disabled: 'disabled'
    }
  };

  /**
   * Create a new instance of EagerForm
   *
   * @param  {HTMLFormElement|String} element Element or Query string
   * @param  {Object} options
   * @return EagerForm
   */
  constructor(element, options = {}) {
    /**
     * The form instance
     * @type {HTMLFormElement}
     */
    this.form
      = typeof element === 'object' ? element : document.querySelector(element);

    /**
     * Try to find the submit button
     *
     * @type {HTMLElement}
     */
    this.submitBtn = this.form.querySelector('[type="submit"]');

    /**
     * To store settimeouts
     *
     * @type {Object}
     */
    this.intervals = {};

    /**
     * Whether currently focusing an invalid element or not
     *
     * @type {boolean}
     */
    this.isFocusing = false;

    /**
     * Types of event that do not bubble
     *
     * @type {string[]}
     */
    this.unBubbledEvents = ['blur', 'focus'];

    /**
     * Merge with the default options
     *
     * @type {Object}
     */
    this.options = { ...EagerForm.defaultOptions, ...options };

    // Make sure the locale exists
    if (!EagerForm.messages[this.options.locale]) {
      throw new Error(`The locale ${this.options.locale} is not loaded.`);
    }

    // Store the binded functions so they can be detached later
    this.submitHandler = this.handleSubmit.bind(this);
    this.inputHandler = this.handleInput.bind(this);
    this.resetHandler = this.handleReset.bind(this);

    // One instance per form element, sorry
    if (!this.form.EagerForm) {
      this.start();
      this.form.EagerForm = this;
    } else {
      return this.form.EagerForm;
    }

    return this;
  }

  /**
   * Starts validation on the form
   *
   * @return void
   */
  start() {
    this.attachEvents();
    this.form.setAttribute('novalidate', 'true');
  }

  /**
   * Attaches events to the form
   *
   * @return void
   */
  attachEvents() {
    if (this.options.revalidate) {
      this.options.revalidate.forEach((event) => {
        let useCapture = false;
        if (this.unBubbledEvents.includes(event)) {
          useCapture = true;
        }

        this.form.addEventListener(event, this.inputHandler, useCapture);
      });
    }

    // Capture submission
    if (this.options.captureSubmit) {
      this.form.addEventListener('submit', this.submitHandler);
    }

    // Handle form reset
    if (this.options.captureReset) {
      this.form.addEventListener('reset', this.resetHandler);
    }
  }

  /**
   * Detach all registered events
   *
   * @return void
   */
  detachEvents() {
    if (this.options.revalidate) {
      this.options.revalidate.forEach((event) => {
        let useCapture = false;

        if (this.unBubbledEvents.includes(event)) {
          useCapture = true;
        }

        this.form.removeEventListener(event, this.inputHandler, useCapture);
      });
    }

    // Remove submit event
    if (this.options.captureSubmit) {
      this.form.removeEventListener('submit', this.submitHandler);
    }

    // Remove reset event
    if (this.options.captureReset) {
      this.form.addEventListener('reset', this.resetHandler);
    }
  }

  /**
   * Add locale
   *
   * @param {String} name
   * @param {Object} messages
   *
   * @return void
   */
  static addLocale(name, messages) {
    this.messages[name] = messages;
  }

  /**
   * Add/replace message to current locale
   *
   * @param {[type]} key
   * @param {[type]} message
   *
   * @return EagerForm
   */
  addMessage(key, message) {
    EagerForm.messages[this.options.locale][key] = message;
    return this;
  }

  /**
   * Set/overwrite messages
   *
   * @param {Object} messages
   * @return EagerForm
   */
  setMessages(messages) {
    EagerForm.messages[this.options.locale] = {
      ...EagerForm.messages[this.options.locale],
      ...messages
    };
    return this;
  }

  /**
   * Define a global validation rule
   *
   * @param  {String} name
   * @param  {Function} callback
   *
   * @return void
   */
  static rule(name, callback) {
    if (EagerForm.reservedWords.includes(name)) {
      throw new Error(`${name} is a reserved word`);
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback must be a callable function');
    }

    EagerForm.rules[name] = callback;
  }

  /**
   * Validate the entire form
   *
   * @return void
   */
  validate() {
    Array.prototype.filter.call(this.form.elements, (element) => {
      if (element.tagName !== 'FIELDSET') {
        this.validateField(element);
      }
    });
  }

  /**
   * Handles form submit
   *
   * @param  {Event} event
   */
  handleSubmit(event) {
    this.validate();

    this.form.classList.add(this.options.classes.formValidatedClass);

    const firstErrorElement = this.getFirstError();

    if (firstErrorElement) {
      event.preventDefault();
      event.stopPropagation();

      if (this.options.disableSubmit) {
        this.disableSubmit();
      }

      this.hightlightErrors(firstErrorElement);
    }

    this.complete();
  }

  /**
   * Enable the submit button
   *
   * @return void
   */
  enableSubmit() {
    this.submitBtn.removeAttribute('disabled');
    this.submitBtn.classList.remove(this.options.classes.disabled);
  }

  /**
   * Disable the submit button
   *
   * @return void
   */
  disableSubmit() {
    this.submitBtn.setAttribute('disabled', 'disabled');
    this.submitBtn.classList.add(this.options.classes.disabled);
  }

  /**
   * Handles form reset
   *
   * @param  {Object} event
   *
   * @return void
   */
  handleReset(event) {
    this.restoreState();
  }

  /**
   * Focuses a given input element
   *
   * @param  {HTMLFormElement} element
   *
   * @return void
   */
  hightlightErrors(element) {
    // Already focusing
    if (this.isFocusing) {
      return;
    }

    if (this.options.autoScroll) {
      // Set state
      this.isFocusing = true;

      window.scrollTo({
        top: Math.round(element.getBoundingClientRect().top)
          + Math.round(window.scrollY)
          + -this.options.offsetFocus,
        behavior: 'smooth'
      });

      setTimeout(() => {
        this.isFocusing = false;
      }, 500);
    }

    if (this.options.focusFirstError) {
      element.focus();
    }
  }

  /**
   * Fires an event after the validate() method is finished
   *
   * @return void
   */
  complete() {
    this.form.dispatchEvent(new Event('eager:done', { bubbles: true }));
  }

  /**
   * Get the first error element (ignores elements that contain novalidate attribute)
   *
   * @return {HTMLFormElement} Returns the very first invalid element's object if found else null
   */
  getFirstError() {
    // Hotfix for fieldset elements
    let element = this.form.querySelector('input:invalid,select:invalid,textarea:invalid');

    if (!element) {
      return null;
    }

    // Ignore if explicitly told
    // meaning, the novalidate attribute exists, and it's value is not false
    // any other value (even empty no value) will be treated as true
    if (element.hasAttribute('novalidate') && element.getAttribute('novalidate') !== 'false') {
      return null;
    }

    // Ignore element without name unless told otherwise
    if (!this.options.validateWithoutName && !element.getAttribute('name')) {
      return null;
    }

    return element;
  }

  /**
   * Checks if form is valid or not by checking if at least one invalid element is present
   *
   * @return {Boolean}
   */
  isValid() {
    return this.getFirstError() == null;
  }

  /**
   * Handles the form/input change, blur or any kind of events that is registered
   *
   * @param  {Event|KeyboardEvent|MouseEvent|CustomEvent} event
   *
   * @return void
   */
  handleInput(event) {
    let cancelled = !event.target.dispatchEvent(new Event('eager:before-validate', { bubbles: true }));

    if (cancelled) {
      return;
    }

    // Don't validate on intial tabbed switch (if enabled)
    if (this.options.noTriggerOnTab && event.key && event.key === 'Tab') {
      return;
    }

    // On a form change, enable the submit button back
    if (event.type === 'change' && this.options.disableSubmit) {
      if (this.isValid()) {
        this.enableSubmit();
      }
    }

    // Bind this to callback
    let callback = this.validateField.bind(this);
    // Debounce attribute
    let debounceAttribute = `data-${EagerForm.RULE_PREFIX}-debounce`;
    // event specific debounce attribute
    let specificDebounceAttribute = `data-${EagerForm.RULE_PREFIX}-${event.type}-debounce`;
    // Zero by default
    let bounce = 0;

    // First check for event specific attribute
    if (event.target.hasAttribute(specificDebounceAttribute)) {
      bounce = parseInt(event.target.getAttribute(specificDebounceAttribute));
    } else if (event.target.hasAttribute(debounceAttribute)) {
      bounce = parseInt(event.target.getAttribute(debounceAttribute));
    } else if (this.options.debounce[event.type]) {
      // Fall back to global debounce values, if defined
      bounce = this.options.debounce[event.type];
    }

    if (bounce > 0) {
      callback = debounce(callback, bounce);
    }

    let delayAttribute = `data-${EagerForm.RULE_PREFIX}-delay`;

    // event specific delay attribute
    let specificDelayAttribute = `data-${EagerForm.RULE_PREFIX}-${event.type}-delay`;

    let delay = 0;

    // First check for event specific attribute
    if (event.target.hasAttribute(specificDelayAttribute)) {
      delay = parseInt(event.target.getAttribute(specificDelayAttribute));
    } else if (event.target.hasAttribute(delayAttribute)) {
      delay = parseInt(event.target.getAttribute(delayAttribute));
    } else if (this.options.delay[event.type]) {
      // Fallback to global delay values, if defined
      delay = this.options.delay[event.type];
    }

    if (delay > 0) {
      // clear any old delays first
      clearTimeout(this.intervals[event.type]);

      this.intervals[event.type] = setTimeout(() => {
        callback(event.target);
      }, delay);
    } else {
      callback(event.target);
    }

    event.target.dispatchEvent(new Event('eager:after-validate', { bubbles: true }));
  }

  /**
   * Validates a field
   *
   * @param  {HTMLFormElement} element
   *
   * @return void
   */
  validateField(element) {
    // Make sure the element is supported by HTML5 constraints
    // Also skip any button, submit or reset elements
    if (!element.checkValidity || ['button', 'submit', 'reset'].includes(element.type)) {
      return;
    }

    // Ignore if explicitly told
    // meaning, the novalidate attribute exists, and it's value is not false
    // any other value (even empty no value) will be treated as true
    if (element.hasAttribute('novalidate') && element.getAttribute('novalidate') !== 'false') {
      return;
    }

    // Ignore element without name unless told otherwise
    if (!this.options.validateWithoutName && !element.getAttribute('name')) {
      return;
    }

    // Determiner for default native error
    let hasDefaultError, hasCustomError = false;

    // run HTML5 validation first
    if (element.checkValidity) {
      if (!element.checkValidity()) {
        for (let key in element.validity) {
          // We will deal with it later
          if (key === 'customError') {
            hasCustomError = true;
            continue;
          }
          if (element.validity[key] === true) {
            this.setError(element, key);
            hasDefaultError = true;
          }
        }
      }
    }

    // HTML5 native validation failed, return
    if (hasDefaultError) {
      return;
    } else if (!hasCustomError) {
      // clear the native errors, but don't return  yet, we still need to run custom rules
      this.clearError(element);
    }

    // Validate custom rules
    for (let key in EagerForm.rules) {
      let attribute = `data-${EagerForm.RULE_PREFIX}-${key}`;
      // Check if the attribute is present
      if (!element.hasAttribute(attribute)) {
        continue;
      }

      let rule = EagerForm.rules[key];

      rule
        .bind(this, element, attribute)()
        .then(() => {
          // Field is valid, clear errors and return status
          element.setCustomValidity('');
          this.clearError(element);
        })
        .catch((err) => {
          let msg = '';
          // Check if we have a dedicated error message attribute
          if (element.hasAttribute(`${attribute}-error`)) {
            msg = element.getAttribute(`${attribute}-error`);
          } else if (element.hasAttribute(`data-${EagerForm.RULE_PREFIX}-error`)) {
            // Or a global error attribute
            msg = element.getAttribute(`data-${EagerForm.RULE_PREFIX}-error`);
          } else if (err && err.toString().length) {
            msg = err;
          }

          element.setCustomValidity(msg);

          // report the custom error
          this.setError(element, 'customError');
        });
    }
  }

  /**
   * Set error status and messages to a field
   *
   * @param {HTMLFormElement} element
   * @param {String} validityType The validity type from ValidityState
   *
   * @return void
   */
  setError(element, validityType) {
    // Add the invalid class first
    element.classList.add(this.options.classes.inputInvalidClass);
    // Remove valid class
    element.classList.remove(this.options.classes.inputValidClass);

    // Find the parent element
    let parent = this.findParent(element);

    if (parent) {
      // Parent exists, so add the invalid classe
      parent.classList.add(this.options.classes.parentInvalidClass);
      // Also remove the valid class from parent
      parent.classList.remove(this.options.classes.parentValidClass);

      // Set validation status to same named inputs (usually checkboxes/radios)
      let siblings = parent.querySelectorAll(`[name="${element.getAttribute('name')}"]`);

      if (siblings.length > 1) {
        // Loop through the siblings to add appropriate classes, this is useful for checkboxes and radios
        for (let index = 0; index < siblings.length; index++) {
          // For each sibling, add the invalid class
          siblings[index].classList.add(this.options.classes.inputInvalidClass);
          // .. and remove the valid class
          siblings[index].classList.remove(
            this.options.classes.inputValidClass
          );
        }
      }
    }

    // Display the feedback messages
    this.displayError(element, validityType);
  }

  /**
   * Display error feedback for an element
   *
   * @param  {HTMLFormElement} element
   * @param {String} validityType The validity type from ValidityState
   *
   * @return void
   */
  displayError(element, validityType) {
    let parent = this.findParent(element);
    let errorMessage = this.getMessage(element, validityType);

    if (parent) {
      let feedBackElement = parent.querySelector(this.options.invalidFeedbackSelector);

      // Already created, or manually set by the DOM, so just set the error and be done with it
      if (feedBackElement) {
        feedBackElement.textContent = errorMessage;
        feedBackElement.setAttribute('aria-live', 'polite');
        return;
      }

      // Not available, let's create it
      if (!feedBackElement) {
        let errorContainer = document.createElement(
          this.options.invalidFeedbackName
        );
        errorContainer.className = this.options.classes.invalidFeedbackClass;
        errorContainer.textContent = errorMessage;
        errorContainer.setAttribute('aria-live', 'polite');
        element.insertAdjacentElement(
          this.options.invalidFeedbackPosition,
          errorContainer
        );
      }
    }
  }

  /**
   * Get feedback message for an element
   *
   * @param  {HTMLFormElement} element
   * @param {String} validityType The validity type from ValidityState
   *
   * @return {String}
   */
  getMessage(element, validityType) {
    if (validityType === 'customError') {
      return element.validationMessage;
    }

    let msg;

    let type = element.type.toLowerCase();

    let specificKey = `${validityType}${
      type.charAt(0).toUpperCase() + type.slice(1)
    }`;

    let inline
      = `data-${EagerForm.RULE_PREFIX}-`
      + validityType.replace(/[A-Z]/g, '-$&').toLowerCase()
      + '-error';

    let inlineGlobal = `data-${EagerForm.RULE_PREFIX}-error`;

    // First check for rule specific custom error message
    if (element.hasAttribute(inline)) {
      msg = element.getAttribute(inline);
    } else if (element.hasAttribute(inlineGlobal)) {
      // failed, so try to fetch from the global attribute
      msg = element.getAttribute(inlineGlobal);
    }

    if (!msg) {
      switch (validityType) {
        case 'valueMissing':
        case 'typeMismatch':
        case 'rangeOverflow':
        case 'rangeUnderflow':
        case 'badInput':
          msg = this.translate(specificKey);

          if (!msg) {
            msg = this.translate(validityType);
          }
          break;
        default:
          msg = this.translate(validityType);
          break;
      }
    }

    // If no translation is found, fall back to browser default, that is really low
    if (msg == null) {
      return element.validationMessage;
    }

    let data = {
      count: this.translateNumbers(EagerForm.unicodeStrLen(element.value.toString())),
      maxlength: this.translateNumbers(element.getAttribute('maxlength')),
      minlength: this.translateNumbers(element.getAttribute('minlength')),
      step: this.translateNumbers(element.getAttribute('step'))
    };


    switch (type) {
      case 'number':
      case 'range':
        data.min = this.translateNumbers(data.min);
        data.max = this.translateNumbers(data.max);
        break;
      case 'date':
      case 'datetime-local':
        data.min = new Date(data.min).toLocaleString(this.options.locale);
        data.max = new Date(data.max).toLocaleString(this.options.locale);
        break;
    }

    return EagerForm.strtpl(msg, data);
  }

  /**
   * patch String.length to account for non-BMP characters
   *
   * @see https://mathiasbynens.be/notes/javascript-unicode
   * We do not use the simple [...str].length, because it needs a ton of
   * polyfills in older browsers.
   */

  static unicodeStrLen(str) {
    if (!str) {
      return 0;
    }
    return str.match(
      /[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g
    ).length;
  }

  /**
   * Clear errors from an element
   *
   * @param  {HTMLFormElement} element
   *
   * @return void
   */
  clearError(element) {
    let parent = this.findParent(element);

    element.classList.remove(this.options.classes.inputInvalidClass);

    if (parent) {
      if (this.options.showSuccessState) {
        parent.classList.add(this.options.classes.parentValidClass);
      }

      parent.classList.remove(this.options.classes.parentInvalidClass);

      let feedBackElement = parent.querySelector(this.options.invalidFeedbackSelector);

      // Clear any invalid feedback
      if (feedBackElement) {
        feedBackElement.textContent = '';
      }

      // Clear validation status from same named inputs (usually checkboxes/radios)
      let siblings = parent.querySelectorAll(`[name="${element.getAttribute('name')}"]`);

      if (siblings.length > 1) {
        for (let index = 0; index < siblings.length; index++) {
          siblings[index].classList.remove(
            this.options.classes.inputInvalidClass
          );

          if (this.options.showSuccessState) {
            siblings[index].classList.add(this.options.classes.inputValidClass);
          }
        }
      }
    }

    if (this.options.showSuccessState) {
      element.classList.add(this.options.classes.inputValidClass);
    }
  }

  /**
   * Clear all kinds of validation state including classes and text feedback from an input element
   *
   * @param  {HTMLFormElement} element
   *
   * @return void
   */
  clearValidation(element) {
    // Remove validation classes from the element
    element.classList.remove(
      this.options.classes.inputInvalidClass,
      this.options.classes.inputValidClass
    );

    let parent = this.findParent(element);

    // Make sure parent exists
    if (parent) {
      // Remove the validation classes
      parent.classList.remove(
        this.options.classes.parentInvalidClass,
        this.options.classes.parentValidClass
      );

      // Find the feedback element
      let feedBackElement = parent.querySelector(this.options.invalidFeedbackSelector);

      // Clear any invalid feedback
      if (feedBackElement) {
        feedBackElement.textContent = '';
      }
    }
  }

  /**
   * Restore a form to it's original state by removing all validation classes and messages.
   * While keeping all the values, just remove the state
   *
   * @return void
   */
  restoreState() {
    this.form.classList.remove(this.options.classes.formValidatedClass);

    if (this.options.disableSubmit) {
      this.enableSubmit();
    }

    Array.prototype.filter.call(this.form.elements, (element) => {
      this.clearValidation(element);
    });
  }

  /**
   * Destroy current EagerForm instance from the form
   *
   * The event listeners are removed, and the EagerForm property is removed from the form
   * @param {Boolean} restore
   *
   * @return void
   */
  destroy(restore = true) {
    if (restore) {
      this.restoreState();
    }

    this.detachEvents();
    delete this.form.EagerForm;
  }

  /**
   * Find the parent element, if parent class is specified, use that, or simply return the parentNode
   *
   * @param  {HTMLElement} element
   *
   * @return {ParentNode|HTMLElement}
   */
  findParent(element) {
    let parent;
    // Try to match the parent
    if (this.options.parentSelector) {
      parent = element.closest(this.options.parentSelector);
    }

    if (parent) {
      return parent;
    }

    // fallback to parentNode in case of missing node/selector
    return element.parentNode;
  }

  /**
   * Translate a key
   *
   * @param  {String} key
   * @param  {String|Object} fallback
   * @return {String}
   */
  translate(key, fallback = null) {
    if (EagerForm.messages[this.options.locale][key]) {
      return EagerForm.messages[this.options.locale][key];
    }

    return fallback;
  }

  /**
   * Translate numeric digits using a loop
   *
   * @param      {String|Null|Number}  string  The string
   * @return     {String}
   */
  translateNumbers(string) {
    if (string === undefined || string === null) {
      return string;
    }
    string = string.toString();
    const numbers = this.translate('numbers', {});
    for (let x in numbers) {
      string = string.replace(new RegExp(x, 'g'), numbers[x]);
    }

    return string;
  }

  /**
   * Perform basic string templating
   *
   * @param  {String} text
   * @param  {Object} replacements
   * @return {String}
   */
  static strtpl(text, replacements) {
    text = text.replace(
      /\{(\s*?[\w.]+\s*?)}/gm,
      function (match, contents, offset, input_string) {
        if (contents in replacements) {
          return replacements[contents];
        }

        return '';
      }
    );
    return text;
  }
}

// Register default locale
EagerForm.addLocale('en', enLocale);

// Register default rules
EagerForm.rule('match', matchRule);
EagerForm.rule('reference', referenceRule);
EagerForm.rule('remote', remoteRule);
