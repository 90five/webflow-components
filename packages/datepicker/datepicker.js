/*!
 * Datepicker v2.1.0
 * https://github.com/90five/webflow-datepicker
 *
 * Copyright @90five
 * Released under the MIT license
 */
(function (factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    factory(require('jquery'));
  } else if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else {
    factory((typeof globalThis !== 'undefined' ? globalThis : self).jQuery);
  }
})(function ($) {
  'use strict';

  var IS_BROWSER = typeof window !== 'undefined';
  var WINDOW = IS_BROWSER ? window : {};
  var IS_TOUCH_DEVICE = IS_BROWSER && 'ontouchstart' in WINDOW.document.documentElement;

  var NAMESPACE = 'datepicker';
  var EVENT_CLICK = 'click.' + NAMESPACE;
  var EVENT_FOCUS = 'focus.' + NAMESPACE;
  var EVENT_FOCUSOUT = 'focusout.' + NAMESPACE;
  var EVENT_HIDE = 'hide.' + NAMESPACE;
  var EVENT_KEYDOWN = 'keydown.' + NAMESPACE;
  var EVENT_KEYUP = 'keyup.' + NAMESPACE;
  var EVENT_PICK = 'pick.' + NAMESPACE;
  var EVENT_RESIZE = 'resize.' + NAMESPACE;
  var EVENT_SCROLL = 'scroll.' + NAMESPACE;
  var EVENT_SHOW = 'show.' + NAMESPACE;
  var EVENT_TOUCH_START = 'touchstart.' + NAMESPACE;

  var CLASS_HIDE = NAMESPACE + '-hide';
  var CLASS_TOP_LEFT = NAMESPACE + '-top-left';
  var CLASS_TOP_RIGHT = NAMESPACE + '-top-right';
  var CLASS_BOTTOM_LEFT = NAMESPACE + '-bottom-left';
  var CLASS_BOTTOM_RIGHT = NAMESPACE + '-bottom-right';
  var CLASS_PLACEMENTS = [CLASS_TOP_LEFT, CLASS_TOP_RIGHT, CLASS_BOTTOM_LEFT, CLASS_BOTTOM_RIGHT].join(' ');

  var VIEWS = { DAYS: 0, MONTHS: 1, YEARS: 2 };
  var YEARS_PER_PAGE = 12;
  var YEARS_STEP = 10;

  var REGEXP_FORMAT = /(y|m|d)+/g;
  var REGEXP_DIGITS = /\d+/g;

  var uid = 0;

  // Dropdown (non-inline) instances that are currently open, so a hover-triggered
  // nav menu elsewhere on the page can close them even though it never fires a click.
  var openInstances = [];

  var LANGUAGES = {
    de: {
      format: 'dd.mm.yyyy',
      weekStart: 1,
      days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
      daysShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
      daysMin: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
      months: [
        'Januar',
        'Februar',
        'März',
        'April',
        'Mai',
        'Juni',
        'Juli',
        'August',
        'September',
        'Oktober',
        'November',
        'Dezember',
      ],
      monthsShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
      labels: {
        calendar: 'Kalender',
        prevMonth: 'Vorheriger Monat',
        nextMonth: 'Nächster Monat',
        chooseMonth: 'Monat wählen',
        prevYear: 'Vorheriges Jahr',
        nextYear: 'Nächstes Jahr',
        chooseYear: 'Jahr wählen',
        prevYears: 'Vorherige Jahre',
        nextYears: 'Nächste Jahre',
        today: 'Heute',
      },
      dateLabel: function (date, options) {
        return (
          options.days[date.getDay()] +
          ', ' +
          date.getDate() +
          '. ' +
          options.months[date.getMonth()] +
          ' ' +
          date.getFullYear()
        );
      },
    },
    en: {
      format: 'mm/dd/yyyy',
      weekStart: 0,
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
      months: [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ],
      monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      labels: {
        calendar: 'Calendar',
        prevMonth: 'Previous month',
        nextMonth: 'Next month',
        chooseMonth: 'Choose month',
        prevYear: 'Previous year',
        nextYear: 'Next year',
        chooseYear: 'Choose year',
        prevYears: 'Previous years',
        nextYears: 'Next years',
        today: 'Today',
      },
      dateLabel: function (date, options) {
        return (
          options.days[date.getDay()] +
          ', ' +
          options.months[date.getMonth()] +
          ' ' +
          date.getDate() +
          ', ' +
          date.getFullYear()
        );
      },
    },
  };

  // German labels but US format when no language is set, matching v1 behaviour.
  var DEFAULTS = $.extend(
    {
      autoShow: false,
      autoHide: false,
      autoPick: false,
      inline: false,
      container: null,
      trigger: null,
      language: '',
      date: null,
      startDate: null,
      endDate: null,
      startView: VIEWS.DAYS,
      yearFirst: false,
      yearSuffix: '',
      itemTag: 'li',
      mutedClass: 'muted',
      pickedClass: 'picked',
      disabledClass: 'disabled',
      highlightedClass: 'highlighted',
      template:
        '<div class="datepicker-container">' +
        '<div class="datepicker-panel" data-view="years picker">' +
        '<div class="datepicker-nav">' +
        '<button type="button" data-view="years prev">&lsaquo;</button>' +
        '<span data-view="years current"></span>' +
        '<button type="button" data-view="years next">&rsaquo;</button>' +
        '</div>' +
        '<ul data-view="years"></ul>' +
        '</div>' +
        '<div class="datepicker-panel" data-view="months picker">' +
        '<div class="datepicker-nav">' +
        '<button type="button" data-view="year prev">&lsaquo;</button>' +
        '<button type="button" data-view="year current"></button>' +
        '<button type="button" data-view="year next">&rsaquo;</button>' +
        '</div>' +
        '<ul data-view="months"></ul>' +
        '</div>' +
        '<div class="datepicker-panel" data-view="days picker">' +
        '<div class="datepicker-nav">' +
        '<button type="button" data-view="month prev">&lsaquo;</button>' +
        '<button type="button" data-view="month current"></button>' +
        '<button type="button" data-view="month next">&rsaquo;</button>' +
        '</div>' +
        '<ul data-view="week"></ul>' +
        '<ul data-view="days"></ul>' +
        '</div>' +
        '</div>',
      offset: 10,
      zIndex: 1000,
      accentColor: null,
      accentTextColor: null,
      filter: null,
      show: null,
      hide: null,
      pick: null,
    },
    LANGUAGES.de,
    { format: 'mm/dd/yyyy', weekStart: 0 },
  );

  function isString(value) {
    return typeof value === 'string';
  }

  function isNumber(value) {
    return typeof value === 'number' && !isNaN(value);
  }

  function isUndefined(value) {
    return typeof value === 'undefined';
  }

  function isFunction(value) {
    return typeof value === 'function';
  }

  function isDate(value) {
    return Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime());
  }

  var HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return HTML_ESCAPES[char];
    });
  }

  function isValidColor(value) {
    if (!isString(value) || !value) {
      return false;
    }
    if (WINDOW.CSS && isFunction(WINDOW.CSS.supports)) {
      return WINDOW.CSS.supports('color', value);
    }
    return true;
  }

  function selectorOf(view) {
    return '[data-view="' + view + '"]';
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function getDaysInMonth(year, month) {
    return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
  }

  function getMinDay(year, month, day) {
    return Math.min(day, getDaysInMonth(year, month));
  }

  function addMonths(date, count) {
    var total = date.getMonth() + count;
    var year = date.getFullYear() + Math.floor(total / 12);
    var month = ((total % 12) + 12) % 12;
    return new Date(year, month, getMinDay(year, month, date.getDate()));
  }

  function addYears(date, count) {
    var year = date.getFullYear() + count;
    var month = date.getMonth();
    return new Date(year, month, getMinDay(year, month, date.getDate()));
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function addLeadingZero(value, length) {
    var abs = String(Math.abs(value));
    var sign = value < 0 ? '-' : '';
    while (abs.length < (length || 1)) {
      abs = '0' + abs;
    }
    return sign + abs;
  }

  function parseFormat(format) {
    var source = String(format).toLowerCase();
    var parts = source.match(REGEXP_FORMAT);
    if (!parts || parts.length === 0) {
      throw new Error('Invalid date format.');
    }
    var result = { source: source, parts: parts };
    $.each(parts, function (i, part) {
      switch (part) {
        case 'dd':
        case 'd':
          result.hasDay = true;
          break;
        case 'mm':
        case 'm':
          result.hasMonth = true;
          break;
        case 'yyyy':
        case 'yy':
          result.hasYear = true;
          break;
      }
    });
    return result;
  }

  function getScrollParent(element, includeHidden) {
    var $element = $(element);
    var position = $element.css('position');
    var excludeStatic = position === 'absolute';
    var overflow = includeHidden ? /auto|scroll|hidden/ : /auto|scroll/;
    var $parent = $element
      .parents()
      .filter(function (i, parent) {
        var $parent = $(parent);
        if (excludeStatic && $parent.css('position') === 'static') {
          return false;
        }
        return overflow.test($parent.css('overflow') + $parent.css('overflow-y') + $parent.css('overflow-x'));
      })
      .eq(0);
    return position === 'fixed' || !$parent.length ? $(element.ownerDocument || document) : $parent;
  }

  function focusElement(element) {
    if (!element || !isFunction(element.focus)) {
      return;
    }
    try {
      element.focus({ preventScroll: true });
    } catch (err) {
      element.focus();
    }
  }

  function Datepicker(element, options) {
    options = $.isPlainObject(options) ? options : {};
    var language = LANGUAGES[options.language] || null;

    this.$element = $(element);
    this.element = element;
    this.options = $.extend({}, DEFAULTS, language, options);
    this.options.labels = $.extend({}, DEFAULTS.labels, language && language.labels, options.labels);
    this.$scrollParent = getScrollParent(element, true);
    this.id = NAMESPACE + '-' + ++uid;
    this.built = false;
    this.shown = false;
    this.isInput = false;
    this.inline = false;
    this.view = VIEWS.DAYS;
    this.yearsStart = null;
    this.suppressShow = false;
    this.initialValue = '';
    this.initialDate = null;
    this.startDate = null;
    this.endDate = null;

    this.onClick = $.proxy(this.click, this);
    this.onKeydown = $.proxy(this.keydown, this);
    this.onPickerFocusout = $.proxy(this.pickerFocusout, this);
    this.onElementFocus = $.proxy(this.elementFocus, this);
    this.onElementFocusout = $.proxy(this.elementFocusout, this);
    this.onElementKeydown = $.proxy(this.elementKeydown, this);
    this.onElementKeyup = $.proxy(this.update, this);
    this.onTriggerClick = $.proxy(this.triggerClick, this);
    this.onElementClick = $.proxy(this.elementClick, this);
    this.onGlobalClick = $.proxy(this.globalClick, this);
    this.onTouchStart = $.proxy(this.touchstart, this);
    this.onResize = $.proxy(this.place, this);
    this.onScroll = $.proxy(this.place, this);

    this.init();
  }

  Datepicker.prototype = {
    constructor: Datepicker,

    init: function () {
      var $element = this.$element;
      var options = this.options;
      var startDate = options.startDate;
      var endDate = options.endDate;
      var date = options.date;

      this.$trigger = $(options.trigger);
      this.isInput = $element.is('input') || $element.is('textarea');
      this.inline = options.inline && (options.container || !this.isInput);
      this.format = parseFormat(options.format);

      var initialValue = this.getValue();
      this.initialValue = initialValue;
      this.oldValue = initialValue;

      date = this.parseDate(date || initialValue);

      if (startDate) {
        startDate = this.parseDate(startDate);
        if (date.getTime() < startDate.getTime()) {
          date = new Date(startDate);
        }
        this.startDate = startDate;
      }

      if (endDate) {
        endDate = this.parseDate(endDate);
        if (startDate && endDate.getTime() < startDate.getTime()) {
          endDate = new Date(startDate);
        }
        if (date.getTime() > endDate.getTime()) {
          date = new Date(endDate);
        }
        this.endDate = endDate;
      }

      this.date = date;
      this.viewDate = new Date(date);
      this.initialDate = new Date(date);

      if (!this.inline) {
        var $opener = this.getOpener();
        if ($opener) {
          $opener.attr({ 'aria-haspopup': 'dialog', 'aria-expanded': 'false' });
        }
        if ($opener && $opener.is('input') && !$opener.attr('role')) {
          $opener.attr('role', 'combobox');
          this.addedComboboxRole = true;
        }
        if (this.isInput && !$element.attr('autocomplete')) {
          $element.attr('autocomplete', 'off');
        }
      }

      this.bind();

      if (options.autoShow || this.inline) {
        this.show();
      }

      if (options.autoPick) {
        this.pick();
      }
    },

    build: function () {
      if (this.built) {
        return;
      }
      this.built = true;

      var $element = this.$element;
      var options = this.options;
      var labels = options.labels;
      var format = this.format;
      var $picker = $(options.template);

      this.$picker = $picker;
      this.$week = $picker.find(selectorOf('week'));

      this.$yearsPicker = $picker.find(selectorOf('years picker'));
      this.$yearsPrev = $picker.find(selectorOf('years prev'));
      this.$yearsNext = $picker.find(selectorOf('years next'));
      this.$yearsCurrent = $picker.find(selectorOf('years current'));
      this.$years = $picker.find(selectorOf('years'));

      this.$monthsPicker = $picker.find(selectorOf('months picker'));
      this.$yearPrev = $picker.find(selectorOf('year prev'));
      this.$yearNext = $picker.find(selectorOf('year next'));
      this.$yearCurrent = $picker.find(selectorOf('year current'));
      this.$months = $picker.find(selectorOf('months'));

      this.$daysPicker = $picker.find(selectorOf('days picker'));
      this.$monthPrev = $picker.find(selectorOf('month prev'));
      this.$monthNext = $picker.find(selectorOf('month next'));
      this.$monthCurrent = $picker.find(selectorOf('month current'));
      this.$days = $picker.find(selectorOf('days'));

      $picker.attr({
        id: this.id,
        role: this.inline ? 'group' : 'dialog',
        'aria-label': labels.calendar,
      });

      this.$yearsPrev.attr('aria-label', labels.prevYears);
      this.$yearsNext.attr('aria-label', labels.nextYears);
      this.$yearsCurrent.attr('aria-live', 'polite');

      this.$yearPrev.attr('aria-label', labels.prevYear);
      this.$yearNext.attr('aria-label', labels.nextYear);
      this.$yearCurrent.attr({ 'aria-live': 'polite', title: labels.chooseYear });
      if (!format.hasYear) {
        this.$yearCurrent.attr('disabled', 'disabled');
      }

      this.$monthPrev.attr('aria-label', labels.prevMonth);
      this.$monthNext.attr('aria-label', labels.nextMonth);
      this.$monthCurrent.attr({ 'aria-live': 'polite', title: labels.chooseMonth });
      if (!format.hasMonth) {
        this.$monthCurrent.attr('disabled', 'disabled');
      }

      this.$week.attr('aria-hidden', 'true');
      this.$days.add(this.$months).add(this.$years).attr('role', 'listbox');

      if (this.inline) {
        $(options.container || $element).append($picker.addClass(NAMESPACE + '-inline'));
      } else {
        $(document.body).append($picker.addClass(NAMESPACE + '-dropdown'));
        $picker.addClass(CLASS_HIDE).css({ zIndex: parseInt(options.zIndex, 10) });
        var $opener = this.getOpener();
        if ($opener) {
          $opener.attr('aria-controls', this.id);
        }
        $picker.on(EVENT_FOCUSOUT, this.onPickerFocusout);
      }

      if (isValidColor(options.accentColor)) {
        $picker[0].style.setProperty('--dp-accent', options.accentColor);
      }
      if (isValidColor(options.accentTextColor)) {
        $picker[0].style.setProperty('--dp-accent-fg', options.accentTextColor);
      }

      $picker.on(EVENT_CLICK, this.onClick).on(EVENT_KEYDOWN, this.onKeydown);

      this.renderWeek();
    },

    unbuild: function () {
      if (!this.built) {
        return;
      }
      this.built = false;
      this.$picker.off('.' + NAMESPACE).remove();
    },

    bind: function () {
      var options = this.options;
      var $element = this.$element;

      if (isFunction(options.show)) {
        $element.on(EVENT_SHOW, options.show);
      }
      if (isFunction(options.hide)) {
        $element.on(EVENT_HIDE, options.hide);
      }
      if (isFunction(options.pick)) {
        $element.on(EVENT_PICK, options.pick);
      }

      if (this.isInput) {
        $element.on(EVENT_KEYUP, this.onElementKeyup);
      }

      if (this.inline) {
        return;
      }

      if (this.isInput) {
        $element.on(EVENT_KEYDOWN, this.onElementKeydown).on(EVENT_FOCUSOUT, this.onElementFocusout);
      }

      if (options.trigger) {
        this.$trigger.on(EVENT_CLICK, this.onTriggerClick);
      } else if (this.isInput) {
        $element.on(EVENT_FOCUS, this.onElementFocus);
      } else {
        $element.on(EVENT_CLICK, this.onElementClick);
      }
    },

    unbind: function () {
      var options = this.options;
      var $element = this.$element;

      if (isFunction(options.show)) {
        $element.off(EVENT_SHOW, options.show);
      }
      if (isFunction(options.hide)) {
        $element.off(EVENT_HIDE, options.hide);
      }
      if (isFunction(options.pick)) {
        $element.off(EVENT_PICK, options.pick);
      }

      $element
        .off(EVENT_KEYUP, this.onElementKeyup)
        .off(EVENT_KEYDOWN, this.onElementKeydown)
        .off(EVENT_FOCUSOUT, this.onElementFocusout)
        .off(EVENT_FOCUS, this.onElementFocus)
        .off(EVENT_CLICK, this.onElementClick);
      this.$trigger.off(EVENT_CLICK, this.onTriggerClick);
    },

    // The element that carries aria-expanded/aria-controls: the input, or a button-like trigger.
    getOpener: function () {
      if (this.inline) {
        return null;
      }
      if (this.options.trigger) {
        return this.$trigger.is('button, [role="button"]') ? this.$trigger : null;
      }
      return this.$element.is('input') ? this.$element : null;
    },

    setExpanded: function (expanded) {
      var $opener = this.getOpener();
      if ($opener) {
        $opener.attr('aria-expanded', expanded ? 'true' : 'false');
      }
    },

    setDisabled: function ($item, disabled) {
      $item.toggleClass(this.options.disabledClass, !!disabled);
      if ($item.is('button')) {
        $item.attr('aria-disabled', disabled ? 'true' : 'false');
      }
      return $item;
    },

    showView: function (view) {
      var $yearsPicker = this.$yearsPicker;
      var $monthsPicker = this.$monthsPicker;
      var $daysPicker = this.$daysPicker;
      var format = this.format;

      if (!(format.hasYear || format.hasMonth || format.hasDay)) {
        return;
      }

      switch (Number(view)) {
        case VIEWS.YEARS:
          $monthsPicker.addClass(CLASS_HIDE);
          $daysPicker.addClass(CLASS_HIDE);
          if (format.hasYear) {
            this.view = VIEWS.YEARS;
            this.renderYears();
            $yearsPicker.removeClass(CLASS_HIDE);
            this.place();
          } else {
            this.showView(VIEWS.DAYS);
          }
          break;

        case VIEWS.MONTHS:
          $yearsPicker.addClass(CLASS_HIDE);
          $daysPicker.addClass(CLASS_HIDE);
          if (format.hasMonth) {
            this.view = VIEWS.MONTHS;
            this.renderMonths();
            $monthsPicker.removeClass(CLASS_HIDE);
            this.place();
          } else {
            this.showView(VIEWS.YEARS);
          }
          break;

        default:
          $yearsPicker.addClass(CLASS_HIDE);
          $monthsPicker.addClass(CLASS_HIDE);
          if (format.hasDay) {
            this.view = VIEWS.DAYS;
            this.renderDays();
            $daysPicker.removeClass(CLASS_HIDE);
            this.place();
          } else {
            this.showView(VIEWS.MONTHS);
          }
      }
    },

    hideView: function () {
      if (!this.inline && this.options.autoHide) {
        this.hide();
      }
    },

    place: function () {
      if (this.inline) {
        return;
      }

      var $element = this.$element;
      var options = this.options;
      var $picker = this.$picker;
      var containerWidth = $(document).outerWidth();
      var containerHeight = $(document).outerHeight();
      var elementWidth = $element.outerWidth();
      var elementHeight = $element.outerHeight();
      var width = $picker.width();
      var height = $picker.height();
      var offsets = $element.offset();
      var left = offsets.left;
      var top = offsets.top;
      var offset = parseFloat(options.offset);
      var placement = CLASS_TOP_LEFT;

      if (isNaN(offset)) {
        offset = 10;
      }

      if (top > height && top + elementHeight + height > containerHeight) {
        top -= height + offset;
        placement = CLASS_BOTTOM_LEFT;
      } else {
        top += elementHeight + offset;
      }

      if (left + width > containerWidth) {
        left += elementWidth - width;
        placement = placement.replace('left', 'right');
      }

      $picker.removeClass(CLASS_PLACEMENTS).addClass(placement).css({ top: top, left: left });
    },

    trigger: function (type, data) {
      var event = $.Event(type, data);
      this.$element.trigger(event);
      return event;
    },

    createItem: function (data) {
      var options = this.options;
      var tag = options.itemTag;
      var item = $.extend(
        {
          text: '',
          view: '',
          muted: false,
          picked: false,
          disabled: false,
          highlighted: false,
          focused: false,
          current: false,
          label: null,
          index: null,
          option: true,
        },
        data,
      );
      var classes = [];
      var attrs = [];

      if (item.muted) {
        classes.push(options.mutedClass);
      }
      if (item.highlighted) {
        classes.push(options.highlightedClass);
      }
      if (item.picked) {
        classes.push(options.pickedClass);
      }
      if (item.disabled) {
        classes.push(options.disabledClass);
      }

      attrs.push('class="' + escapeHtml(classes.join(' ')) + '"');
      attrs.push('data-view="' + escapeHtml(item.view) + '"');

      if (item.option) {
        attrs.push('role="option"');
        attrs.push('tabindex="' + (item.focused ? '0' : '-1') + '"');
        attrs.push('aria-selected="' + (item.picked ? 'true' : 'false') + '"');
        if (item.disabled) {
          attrs.push('aria-disabled="true"');
        }
        if (item.current) {
          attrs.push('aria-current="date"');
        }
        if (item.label !== null) {
          attrs.push('aria-label="' + escapeHtml(item.label) + '"');
        }
      }

      if (item.index !== null) {
        attrs.push('data-index="' + escapeHtml(item.index) + '"');
      }

      return '<' + tag + ' ' + attrs.join(' ') + '>' + escapeHtml(item.text) + '</' + tag + '>';
    },

    getValue: function () {
      var $element = this.$element;
      return this.isInput ? $element.val() : $element.text();
    },

    setValue: function (value) {
      var $element = this.$element;
      value = isString(value) ? value : '';
      if (this.isInput) {
        $element.val(value);
      } else if (!this.inline || this.options.container) {
        $element.text(value);
      }
    },

    render: function () {
      this.renderYears();
      this.renderMonths();
      this.renderDays();
    },

    renderWeek: function () {
      var self = this;
      var options = this.options;
      var weekStart = parseInt(options.weekStart, 10) % 7;
      var days = options.daysMin.slice(weekStart).concat(options.daysMin.slice(0, weekStart));
      var items = [];

      $.each(days, function (i, day) {
        items.push(self.createItem({ text: day, option: false }));
      });

      this.$week.html(items.join(''));
    },

    renderYears: function () {
      var options = this.options;
      var filter = options.filter;
      var startDate = this.startDate;
      var endDate = this.endDate;
      var yearSuffix = options.yearSuffix;
      var viewYear = this.viewDate.getFullYear();
      var thisYear = new Date().getFullYear();
      var year = this.date.getFullYear();
      var start = this.yearsStart;
      var items = [];
      var prevDisabled = false;
      var nextDisabled = false;
      var i;

      if (!isNumber(start) || viewYear < start || viewYear > start + YEARS_PER_PAGE - 1) {
        start = viewYear - 5;
        this.yearsStart = start;
      }

      for (i = 0; i < YEARS_PER_PAGE; i += 1) {
        var itemYear = start + i;
        var date = new Date(itemYear, 1, 1);
        var disabled = false;

        if (startDate) {
          disabled = itemYear < startDate.getFullYear();
          if (i === 0) {
            prevDisabled = disabled;
          }
        }
        if (!disabled && endDate) {
          disabled = itemYear > endDate.getFullYear();
          if (i === YEARS_PER_PAGE - 1) {
            nextDisabled = disabled;
          }
        }
        if (!disabled && isFunction(filter)) {
          disabled = filter.call(this.$element, date, 'year') === false;
        }

        var picked = itemYear === year;

        items.push(
          this.createItem({
            picked: picked,
            disabled: disabled,
            highlighted: itemYear === thisYear,
            focused: itemYear === viewYear,
            text: itemYear,
            label: itemYear + yearSuffix,
            view: disabled ? 'year disabled' : picked ? 'year picked' : 'year',
          }),
        );
      }

      var title = start + yearSuffix + ' – ' + (start + YEARS_PER_PAGE - 1) + yearSuffix;

      this.setDisabled(this.$yearsPrev, prevDisabled);
      this.setDisabled(this.$yearsNext, nextDisabled);
      this.setDisabled(this.$yearsCurrent, true).text(title);
      this.$years.attr('aria-label', title).html(items.join(''));
    },

    renderMonths: function () {
      var options = this.options;
      var filter = options.filter;
      var startDate = this.startDate;
      var endDate = this.endDate;
      var viewDate = this.viewDate;
      var viewYear = viewDate.getFullYear();
      var viewMonth = viewDate.getMonth();
      var now = new Date();
      var thisYear = now.getFullYear();
      var thisMonth = now.getMonth();
      var year = this.date.getFullYear();
      var month = this.date.getMonth();
      var items = [];
      var prevDisabled = false;
      var nextDisabled = false;
      var i;

      for (i = 0; i <= 11; i += 1) {
        var date = new Date(viewYear, i, 1);
        var disabled = false;

        if (startDate) {
          prevDisabled = date.getFullYear() === startDate.getFullYear();
          disabled = prevDisabled && date.getMonth() < startDate.getMonth();
        }
        if (!disabled && endDate) {
          nextDisabled = date.getFullYear() === endDate.getFullYear();
          disabled = nextDisabled && date.getMonth() > endDate.getMonth();
        }
        if (!disabled && isFunction(filter)) {
          disabled = filter.call(this.$element, date, 'month') === false;
        }

        var picked = viewYear === year && i === month;

        items.push(
          this.createItem({
            disabled: disabled,
            picked: picked,
            highlighted: viewYear === thisYear && i === thisMonth,
            focused: i === viewMonth,
            index: i,
            text: options.monthsShort[i],
            label: options.months[i] + ' ' + viewYear + options.yearSuffix,
            view: disabled ? 'month disabled' : picked ? 'month picked' : 'month',
          }),
        );
      }

      var title = viewYear + options.yearSuffix;

      this.setDisabled(this.$yearPrev, prevDisabled);
      this.setDisabled(this.$yearNext, nextDisabled);
      this.setDisabled(this.$yearCurrent, prevDisabled && nextDisabled).text(title);
      this.$months.attr('aria-label', title).html(items.join(''));
    },

    renderDays: function () {
      var $element = this.$element;
      var options = this.options;
      var labels = options.labels;
      var filter = options.filter;
      var startDate = this.startDate;
      var endDate = this.endDate;
      var viewDate = this.viewDate;
      var weekStart = parseInt(options.weekStart, 10) % 7;
      var viewYear = viewDate.getFullYear();
      var viewMonth = viewDate.getMonth();
      var viewDay = viewDate.getDate();
      var now = new Date();
      var picked = this.date;
      var prevItems = [];
      var items = [];
      var nextItems = [];
      var i;

      var describe = function (date) {
        var disabled = false;
        if (startDate && date.getTime() < startDate.getTime()) {
          disabled = true;
        }
        if (!disabled && endDate && date.getTime() > endDate.getTime()) {
          disabled = true;
        }
        if (!disabled && isFunction(filter)) {
          disabled = filter.call($element, date, 'day') === false;
        }
        var isToday = isSameDay(date, now);
        return {
          text: date.getDate(),
          disabled: disabled,
          picked: isSameDay(date, picked),
          highlighted: isToday,
          current: isToday,
          label: options.dateLabel(date, options) + (isToday ? ', ' + labels.today : ''),
        };
      };

      var prevYear = viewYear;
      var prevMonth = viewMonth - 1;
      if (prevMonth < 0) {
        prevYear -= 1;
        prevMonth = 11;
      }
      var prevLength = getDaysInMonth(prevYear, prevMonth);
      var firstOfMonth = new Date(viewYear, viewMonth, 1);
      var leading = firstOfMonth.getDay() - weekStart;
      if (leading <= 0) {
        leading += 7;
      }
      var prevDisabled = !!startDate && firstOfMonth.getTime() <= startDate.getTime();

      for (i = prevLength - (leading - 1); i <= prevLength; i += 1) {
        prevItems.push(
          this.createItem($.extend(describe(new Date(prevYear, prevMonth, i)), { muted: true, view: 'day prev' })),
        );
      }

      var length = getDaysInMonth(viewYear, viewMonth);
      for (i = 1; i <= length; i += 1) {
        var item = describe(new Date(viewYear, viewMonth, i));
        item.focused = i === viewDay;
        item.view = item.disabled ? 'day disabled' : item.picked ? 'day picked' : 'day';
        items.push(this.createItem(item));
      }

      var nextYear = viewYear;
      var nextMonth = viewMonth + 1;
      if (nextMonth > 11) {
        nextYear += 1;
        nextMonth = 0;
      }
      var trailing = 42 - (prevItems.length + length);
      var lastOfMonth = new Date(viewYear, viewMonth, length);
      var nextDisabled = !!endDate && lastOfMonth.getTime() >= endDate.getTime();

      for (i = 1; i <= trailing; i += 1) {
        nextItems.push(
          this.createItem($.extend(describe(new Date(nextYear, nextMonth, i)), { muted: true, view: 'day next' })),
        );
      }

      var yearText = viewYear + options.yearSuffix;
      var title = options.yearFirst
        ? yearText + ' ' + options.months[viewMonth]
        : options.months[viewMonth] + ' ' + yearText;

      this.setDisabled(this.$monthPrev, prevDisabled);
      this.setDisabled(this.$monthNext, nextDisabled);
      this.setDisabled(this.$monthCurrent, prevDisabled && nextDisabled).text(title);
      this.$days.attr('aria-label', title).html(prevItems.join('') + items.join('') + nextItems.join(''));
    },

    renderView: function () {
      switch (this.view) {
        case VIEWS.YEARS:
          this.renderYears();
          break;
        case VIEWS.MONTHS:
          this.renderMonths();
          break;
        default:
          this.renderDays();
      }
    },

    getList: function () {
      switch (this.view) {
        case VIEWS.YEARS:
          return this.$years;
        case VIEWS.MONTHS:
          return this.$months;
        default:
          return this.$days;
      }
    },

    focusCell: function () {
      if (!this.built) {
        return;
      }
      focusElement(this.getList().find('[tabindex="0"]')[0]);
    },

    hasFocus: function () {
      return this.built && $.contains(this.$picker[0], document.activeElement);
    },

    restoreFocus: function () {
      var target = this.$trigger[0] || this.element;
      this.suppressShow = true;
      focusElement(target);
      this.suppressShow = false;
    },

    click: function (e) {
      var $target = $(e.target).closest('[data-view]');
      e.stopPropagation();
      e.preventDefault();
      if ($target.length && $.contains(this.$picker[0], $target[0])) {
        this.activate($target);
      }
    },

    activate: function ($target) {
      var options = this.options;
      var date = this.date;
      var viewDate = this.viewDate;
      var format = this.format;
      var pickedClass = options.pickedClass;
      var active = document.activeElement;
      var hadFocus = this.hasFocus();

      if ($target.hasClass(options.disabledClass)) {
        return;
      }

      var view = $target.data('view');
      var year = viewDate.getFullYear();
      var month = viewDate.getMonth();
      var day = viewDate.getDate();

      switch (view) {
        case 'years prev':
        case 'years next':
          year = view === 'years prev' ? year - YEARS_STEP : year + YEARS_STEP;
          this.yearsStart += view === 'years prev' ? -YEARS_STEP : YEARS_STEP;
          viewDate.setFullYear(year);
          viewDate.setDate(getMinDay(year, month, day));
          this.renderYears();
          break;

        case 'year prev':
        case 'year next':
          year = view === 'year prev' ? year - 1 : year + 1;
          viewDate.setFullYear(year);
          viewDate.setDate(getMinDay(year, month, day));
          this.renderMonths();
          break;

        case 'year current':
          if (format.hasYear) {
            this.showView(VIEWS.YEARS);
          }
          break;

        case 'year picked':
          if (format.hasMonth) {
            this.showView(VIEWS.MONTHS);
          } else {
            $target
              .siblings('.' + pickedClass)
              .removeClass(pickedClass)
              .data('view', 'year');
            this.hideView();
          }
          this.pick('year');
          break;

        case 'year':
          year = parseInt($target.text(), 10);
          date.setDate(getMinDay(year, month, day));
          date.setFullYear(year);
          viewDate.setDate(getMinDay(year, month, day));
          viewDate.setFullYear(year);
          if (format.hasMonth) {
            this.showView(VIEWS.MONTHS);
          } else {
            $target
              .addClass(pickedClass)
              .data('view', 'year picked')
              .siblings('.' + pickedClass)
              .removeClass(pickedClass)
              .data('view', 'year');
            this.hideView();
          }
          this.pick('year');
          break;

        case 'month prev':
        case 'month next':
          month = view === 'month prev' ? month - 1 : month + 1;
          if (month < 0) {
            year -= 1;
            month += 12;
          } else if (month > 11) {
            year += 1;
            month -= 12;
          }
          viewDate.setFullYear(year);
          viewDate.setDate(getMinDay(year, month, day));
          viewDate.setMonth(month);
          this.renderDays();
          break;

        case 'month current':
          if (format.hasMonth) {
            this.showView(VIEWS.MONTHS);
          }
          break;

        case 'month picked':
          if (format.hasDay) {
            this.showView(VIEWS.DAYS);
          } else {
            $target
              .siblings('.' + pickedClass)
              .removeClass(pickedClass)
              .data('view', 'month');
            this.hideView();
          }
          this.pick('month');
          break;

        case 'month':
          month = parseInt($target.attr('data-index'), 10);
          date.setFullYear(year);
          date.setDate(getMinDay(year, month, day));
          date.setMonth(month);
          viewDate.setFullYear(year);
          viewDate.setDate(getMinDay(year, month, day));
          viewDate.setMonth(month);
          if (format.hasDay) {
            this.showView(VIEWS.DAYS);
          } else {
            $target
              .addClass(pickedClass)
              .data('view', 'month picked')
              .siblings('.' + pickedClass)
              .removeClass(pickedClass)
              .data('view', 'month');
            this.hideView();
          }
          this.pick('month');
          break;

        case 'day prev':
        case 'day next':
        case 'day':
          if (view === 'day prev') {
            month -= 1;
          } else if (view === 'day next') {
            month += 1;
          }
          day = parseInt($target.text(), 10);
          date.setDate(1);
          date.setFullYear(year);
          date.setMonth(month);
          date.setDate(day);
          viewDate.setDate(1);
          viewDate.setFullYear(year);
          viewDate.setMonth(month);
          viewDate.setDate(day);
          this.renderDays();
          if (view === 'day') {
            this.hideView();
          }
          this.pick('day');
          break;

        case 'day picked':
          this.hideView();
          this.pick('day');
          break;
      }

      // A re-render or view switch drops focus to <body>; put it back on the current cell,
      // or back on the input when the pick closed the picker.
      if (!hadFocus) {
        return;
      }
      if (!this.shown) {
        this.restoreFocus();
      } else if (!$.contains(document.documentElement, active) || !$(active).is(':visible')) {
        this.focusCell();
      }
    },

    moveFocus: function (key, shiftKey) {
      var viewDate = this.viewDate;
      var weekStart = parseInt(this.options.weekStart, 10) % 7;
      var year = viewDate.getFullYear();
      var month = viewDate.getMonth();
      var day = viewDate.getDate();
      var next = null;
      var offset;

      switch (this.view) {
        case VIEWS.DAYS:
          switch (key) {
            case 'ArrowLeft':
              next = new Date(year, month, day - 1);
              break;
            case 'ArrowRight':
              next = new Date(year, month, day + 1);
              break;
            case 'ArrowUp':
              next = new Date(year, month, day - 7);
              break;
            case 'ArrowDown':
              next = new Date(year, month, day + 7);
              break;
            case 'Home':
              offset = (viewDate.getDay() - weekStart + 7) % 7;
              next = new Date(year, month, day - offset);
              break;
            case 'End':
              offset = (viewDate.getDay() - weekStart + 7) % 7;
              next = new Date(year, month, day + (6 - offset));
              break;
            case 'PageUp':
              next = shiftKey ? addYears(viewDate, -1) : addMonths(viewDate, -1);
              break;
            case 'PageDown':
              next = shiftKey ? addYears(viewDate, 1) : addMonths(viewDate, 1);
              break;
          }
          break;

        case VIEWS.MONTHS:
          switch (key) {
            case 'ArrowLeft':
              next = addMonths(viewDate, -1);
              break;
            case 'ArrowRight':
              next = addMonths(viewDate, 1);
              break;
            case 'ArrowUp':
              next = addMonths(viewDate, -4);
              break;
            case 'ArrowDown':
              next = addMonths(viewDate, 4);
              break;
            case 'Home':
              next = new Date(year, 0, getMinDay(year, 0, day));
              break;
            case 'End':
              next = new Date(year, 11, getMinDay(year, 11, day));
              break;
            case 'PageUp':
              next = addYears(viewDate, -1);
              break;
            case 'PageDown':
              next = addYears(viewDate, 1);
              break;
          }
          break;

        case VIEWS.YEARS:
          switch (key) {
            case 'ArrowLeft':
              next = addYears(viewDate, -1);
              break;
            case 'ArrowRight':
              next = addYears(viewDate, 1);
              break;
            case 'ArrowUp':
              next = addYears(viewDate, -4);
              break;
            case 'ArrowDown':
              next = addYears(viewDate, 4);
              break;
            case 'Home':
              next = addYears(viewDate, this.yearsStart - year);
              break;
            case 'End':
              next = addYears(viewDate, this.yearsStart + YEARS_PER_PAGE - 1 - year);
              break;
            case 'PageUp':
              this.yearsStart -= YEARS_STEP;
              next = addYears(viewDate, -YEARS_STEP);
              break;
            case 'PageDown':
              this.yearsStart += YEARS_STEP;
              next = addYears(viewDate, YEARS_STEP);
              break;
          }
          break;
      }

      if (!next) {
        return false;
      }

      this.viewDate = next;
      this.renderView();
      this.focusCell();
      return true;
    },

    trapFocus: function (e) {
      var $focusable = this.$picker.find('button:not([disabled]), [tabindex="0"]').filter(':visible');
      if (!$focusable.length) {
        return;
      }
      var first = $focusable[0];
      var last = $focusable[$focusable.length - 1];
      if (e.shiftKey && e.target === first) {
        e.preventDefault();
        focusElement(last);
      } else if (!e.shiftKey && e.target === last) {
        e.preventDefault();
        focusElement(first);
      }
    },

    keydown: function (e) {
      var key = e.key;
      var $target = $(e.target).closest('[data-view]');

      if (key === 'Escape' || key === 'Esc') {
        if (!this.inline) {
          e.preventDefault();
          e.stopPropagation();
          this.hide();
        }
        return;
      }

      if (key === 'Tab') {
        if (!this.inline) {
          this.trapFocus(e);
        }
        return;
      }

      var isActivation = key === 'Enter' || key === ' ' || key === 'Spacebar';

      // Header buttons are native <button>s: Enter/Space fire click on their own.
      if ($target.is('[role="option"]')) {
        if (isActivation) {
          e.preventDefault();
          this.activate($target);
        } else if (this.moveFocus(key, e.shiftKey)) {
          e.preventDefault();
        }
      }
    },

    pickerFocusout: function (e) {
      var related = e.relatedTarget;
      if (!related || !this.shown) {
        return;
      }
      if ($.contains(this.$picker[0], related) || related === this.element || related === this.$trigger[0]) {
        return;
      }
      this.hide();
    },

    elementFocus: function () {
      if (!this.suppressShow) {
        this.show();
      }
    },

    elementFocusout: function (e) {
      var related = e.relatedTarget;
      if (!related || !this.shown || !this.built) {
        return;
      }
      if ($.contains(this.$picker[0], related) || related === this.$trigger[0]) {
        return;
      }
      this.hide();
    },

    elementKeydown: function (e) {
      var key = e.key;
      if (key === 'ArrowDown' || key === 'Down') {
        e.preventDefault();
        if (!this.shown) {
          this.show();
        }
        this.focusCell();
      } else if ((key === 'Escape' || key === 'Esc') && this.shown) {
        e.preventDefault();
        this.hide();
      }
    },

    elementClick: function () {
      this.show();
      this.focusCell();
    },

    triggerClick: function () {
      this.toggle();
      if (this.shown) {
        this.focusCell();
      }
    },

    globalClick: function (e) {
      var target = e.target;
      var element = this.element;
      var trigger = this.$trigger[0];
      var hidden = true;

      while (target !== document) {
        if (target === trigger || target === element) {
          hidden = false;
          break;
        }
        target = target.parentNode;
        if (!target) {
          break;
        }
      }

      if (hidden) {
        this.hide();
      }
    },

    touchstart: function (e) {
      var target = e.target;
      if (this.isInput && target !== this.element && !$.contains(this.$picker[0], target)) {
        this.hide();
        this.element.blur();
      }
    },

    show: function () {
      if (!this.built) {
        this.build();
      }

      if (this.shown || this.trigger(EVENT_SHOW).isDefaultPrevented()) {
        return;
      }

      this.shown = true;
      this.$picker.removeClass(CLASS_HIDE);
      this.showView(this.options.startView);

      if (!this.inline) {
        this.setExpanded(true);
        if (openInstances.indexOf(this) === -1) {
          openInstances.push(this);
        }
        this.$scrollParent.on(EVENT_SCROLL, this.onScroll);
        $(window).on(EVENT_RESIZE, this.onResize);
        $(document).on(EVENT_CLICK, this.onGlobalClick);
        if (IS_TOUCH_DEVICE) {
          $(document).on(EVENT_TOUCH_START, this.onTouchStart);
        }
        this.place();
      }
    },

    hide: function () {
      if (!this.shown || this.trigger(EVENT_HIDE).isDefaultPrevented()) {
        return;
      }

      var hadFocus = this.hasFocus();

      this.shown = false;
      this.$picker.addClass(CLASS_HIDE);

      if (!this.inline) {
        this.setExpanded(false);
        var openIndex = openInstances.indexOf(this);
        if (openIndex !== -1) {
          openInstances.splice(openIndex, 1);
        }
        this.$scrollParent.off(EVENT_SCROLL, this.onScroll);
        $(window).off(EVENT_RESIZE, this.onResize);
        $(document).off(EVENT_CLICK, this.onGlobalClick);
        if (IS_TOUCH_DEVICE) {
          $(document).off(EVENT_TOUCH_START, this.onTouchStart);
        }
      }

      if (hadFocus) {
        this.restoreFocus();
      }
    },

    toggle: function () {
      if (this.shown) {
        this.hide();
      } else {
        this.show();
      }
    },

    update: function () {
      var value = this.getValue();
      if (value !== this.oldValue) {
        this.setDate(value, true);
        this.oldValue = value;
      }
    },

    pick: function (view) {
      var $element = this.$element;
      var date = this.date;

      if (this.trigger(EVENT_PICK, { view: view || '', date: date }).isDefaultPrevented()) {
        return;
      }

      this.setValue(this.formatDate(date));

      if (this.isInput) {
        $element.trigger('input');
        $element.trigger('change');
      }
    },

    reset: function () {
      this.setDate(this.initialDate, true);
      this.setValue(this.initialValue);
      if (this.shown) {
        this.showView(this.options.startView);
      }
    },

    getMonthName: function (month, shortForm) {
      var options = this.options;
      var months = options.months;

      if ($.isNumeric(month)) {
        month = Number(month);
      } else if (isUndefined(shortForm)) {
        shortForm = month;
      }

      if (shortForm === true) {
        months = options.monthsShort;
      }

      return months[isNumber(month) ? month : this.date.getMonth()];
    },

    getDayName: function (day, shortForm, min) {
      var options = this.options;
      var days = options.days;

      if ($.isNumeric(day)) {
        day = Number(day);
      } else {
        if (isUndefined(min)) {
          min = shortForm;
        }
        if (isUndefined(shortForm)) {
          shortForm = day;
        }
      }

      if (min) {
        days = options.daysMin;
      } else if (shortForm) {
        days = options.daysShort;
      }

      return days[isNumber(day) ? day : this.date.getDay()];
    },

    getDate: function (formatted) {
      var date = this.date;
      return formatted ? this.formatDate(date) : new Date(date);
    },

    setDate: function (date, updated) {
      var filter = this.options.filter;

      if (!(isDate(date) || isString(date))) {
        return;
      }

      date = this.parseDate(date);

      if (isFunction(filter) && filter.call(this.$element, date, 'day') === false) {
        return;
      }

      this.date = date;
      this.viewDate = new Date(date);

      if (!updated) {
        this.pick();
      }

      if (this.built) {
        this.render();
      }
    },

    setStartDate: function (date) {
      this.startDate = isDate(date) || isString(date) ? this.parseDate(date) : null;
      if (this.built) {
        this.render();
      }
    },

    setEndDate: function (date) {
      this.endDate = isDate(date) || isString(date) ? this.parseDate(date) : null;
      if (this.built) {
        this.render();
      }
    },

    parseDate: function (date) {
      var format = this.format;
      var parts = [];

      if (!isDate(date)) {
        if (isString(date)) {
          parts = date.match(REGEXP_DIGITS) || [];
        }

        date = date ? new Date(date) : new Date();

        if (!isDate(date)) {
          date = new Date();
        }

        if (parts.length === format.parts.length) {
          // Set year and month before day so the day is clamped against the right month.
          $.each(parts, function (i, part) {
            var value = parseInt(part, 10);
            switch (format.parts[i]) {
              case 'yy':
                date.setFullYear(2000 + value);
                break;
              case 'yyyy':
                date.setFullYear(part.length === 2 ? 2000 + value : value);
                break;
              case 'mm':
              case 'm':
                date.setMonth(value - 1);
                break;
            }
          });
          $.each(parts, function (i, part) {
            var value = parseInt(part, 10);
            switch (format.parts[i]) {
              case 'dd':
              case 'd':
                date.setDate(value);
                break;
            }
          });
        }
      }

      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    },

    formatDate: function (date) {
      var format = this.format;
      var formatted = '';

      if (isDate(date)) {
        var year = date.getFullYear();
        var month = date.getMonth();
        var day = date.getDate();
        var values = {
          d: day,
          dd: addLeadingZero(day, 2),
          m: month + 1,
          mm: addLeadingZero(month + 1, 2),
          yy: String(year).substring(2),
          yyyy: addLeadingZero(year, 4),
        };

        formatted = format.source;
        $.each(format.parts, function (i, part) {
          formatted = formatted.replace(part, values[part]);
        });
      }

      return formatted;
    },

    destroy: function () {
      this.unbind();
      this.unbuild();
      var openIndex = openInstances.indexOf(this);
      if (openIndex !== -1) {
        openInstances.splice(openIndex, 1);
      }
      this.$element.add(this.$trigger).removeAttr('aria-haspopup aria-expanded aria-controls');
      if (this.addedComboboxRole) {
        this.$element.removeAttr('role');
      }
      this.$element.removeData(NAMESPACE);
    },
  };

  Datepicker.setDefaults = function (options) {
    options = $.isPlainObject(options) ? options : {};
    $.extend(DEFAULTS, LANGUAGES[options.language], options);
  };

  // Site navigation (Webflow's Navbar component always renders <nav role="navigation">)
  // can open a mega-menu on hover alone, with no click for our own global-click handler
  // to catch. Without this, an open dropdown is left stranded above or below it,
  // fighting over z-index with every site individually. Close on the way in instead.
  function closeOnNavHover() {
    // Copy first: hide() mutates openInstances while we're iterating it.
    var open = openInstances.slice();
    for (var i = 0; i < open.length; i += 1) {
      open[i].hide();
    }
  }

  if (IS_BROWSER) {
    $(document).on('mouseenter.' + NAMESPACE + '-nav-guard', 'nav, [role="navigation"]', closeOnNavHover);
  }

  if ($.fn) {
    var AnotherDatepicker = $.fn.datepicker;

    $.fn.datepicker = function (option) {
      var args = Array.prototype.slice.call(arguments, 1);
      var result;

      this.each(function (i, element) {
        var $element = $(element);
        var isDestroy = option === 'destroy';
        var datepicker = $element.data(NAMESPACE);

        if (!datepicker) {
          if (isDestroy) {
            return;
          }
          var options = $.extend({}, $element.data(), $.isPlainObject(option) && option);
          datepicker = new Datepicker(element, options);
          $element.data(NAMESPACE, datepicker);
        }

        if (isString(option)) {
          var fn = datepicker[option];
          if (isFunction(fn)) {
            result = fn.apply(datepicker, args);
            if (isDestroy) {
              $element.removeData(NAMESPACE);
            }
          }
        }
      });

      return isUndefined(result) ? this : result;
    };

    $.fn.datepicker.Constructor = Datepicker;
    $.fn.datepicker.languages = LANGUAGES;
    $.fn.datepicker.setDefaults = Datepicker.setDefaults;
    $.fn.datepicker.noConflict = function () {
      $.fn.datepicker = AnotherDatepicker;
      return this;
    };
  }
});
