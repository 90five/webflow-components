# Webflow Datepicker

A small jQuery date picker built for Webflow forms. Drop it on any text field and it opens a calendar below the input, writes the selected date back into the field, and submits with the rest of the form.

- Days, months and years view
- Min/max dates and custom filters
- German and English built in, other languages via label options
- Themeable through CSS variables
- Fully keyboard operable and screen-reader labelled (WCAG 2.1 AA, see [Accessibility](#accessibility))
- Origin-aware open/close animation, `prefers-reduced-motion` aware
- Closes itself when the page's own navigation opens (see [Coexisting with site navigation](#coexisting-with-site-navigation))

## Files

| File | Purpose |
| --- | --- |
| `datepicker.css` | Styles. Load in the `<head>`. |
| `datepicker.min.js` | The plugin, minified. Load after jQuery, before your init script. |
| `datepicker.js` | Readable source. `npm run build` produces the `.min.js` from it. |

Serve them from a CDN that mirrors this repo, for example jsDelivr:

```
https://cdn.jsdelivr.net/gh/90five/webflow-components@main/packages/datepicker/datepicker.css
https://cdn.jsdelivr.net/gh/90five/webflow-components@main/packages/datepicker/datepicker.min.js
```

`@main` is fine while building a site. Before go-live, pin the commit (see [Security](#security)).

## Setting it up in Webflow

### 1. Add a normal text field to the form

In the Designer, add a **Text Field** (Form block → Input) to your form like any other field. Set:

- **Name** – e.g. `Datum` (this is what shows up in the form submission)
- **ID** – e.g. `date` (the init script targets this)
- **Placeholder** – e.g. `Datum wählen`
- Optional: turn on **Required**

No other changes to the field are needed. It stays a regular input, so form validation, submissions, integrations and the success/error states all keep working. The plugin sets `autocomplete="off"` on it automatically so the browser's autofill menu doesn't cover the calendar. Don't add `inputmode="none"`: typing the date is the fallback for assistive tech users on phones.

### 2. Add the CSS

Project settings → **Custom code** → **Head code** (or Page settings → Inside `<head>` tag for a single page):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/90five/webflow-components@main/packages/datepicker/datepicker.css">
```

### 3. Add the script and initialise it

Project settings → **Custom code** → **Footer code** (or Page settings → Before `</body>` tag). Webflow already loads jQuery on published sites, so you don't need to add it yourself. Just make sure the plugin comes after Webflow's own scripts, which is what the footer slot does:

```html
<script src="https://cdn.jsdelivr.net/gh/90five/webflow-components@main/packages/datepicker/datepicker.min.js"></script>
<script>
  $(function () {
    $('#date').datepicker({
      language: 'de',
      autoHide: true,
      accentColor: '#1d4ed8'
    });
  });
</script>
```

Publish the site. Custom code doesn't run inside the Designer, so test on the published or staging domain.

### Several date fields on one page

Give each field its own ID and initialise each one, or share a class and initialise them all at once:

```html
<script>
  $(function () {
    $('.datepicker-field').datepicker({ format: 'dd.mm.yyyy', autoHide: true, weekStart: 1 });
  });
</script>
```

### Only allow future dates (e.g. appointment booking)

```js
$('#date').datepicker({
  format: 'dd.mm.yyyy',
  autoHide: true,
  weekStart: 1,
  startDate: new Date()
});
```

### Block weekends

```js
$('#date').datepicker({
  format: 'dd.mm.yyyy',
  autoHide: true,
  weekStart: 1,
  filter: function (date, view) {
    if (view === 'day') {
      var day = date.getDay();
      return day !== 0 && day !== 6;
    }
  }
});
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `format` | `'mm/dd/yyyy'` | Output format. Supports `d`, `dd`, `m`, `mm`, `yy`, `yyyy`. |
| `date` | `null` | Initial date (`Date` or string in `format`). Defaults to the field value or today. |
| `startDate` | `null` | Earliest selectable date. |
| `endDate` | `null` | Latest selectable date. |
| `filter` | `null` | `function (date, view)` returning `false` to disable a day/month/year. |
| `autoHide` | `false` | Close after picking a day. |
| `autoShow` | `false` | Open immediately on init. |
| `autoPick` | `false` | Write the initial date into the field on init. |
| `startView` | `0` | `0` days, `1` months, `2` years. |
| `weekStart` | `0` | `0` Sunday, `1` Monday. |
| `yearFirst` | `false` | Show `2026 September` instead of `September 2026` in the header. |
| `yearSuffix` | `''` | Appended to years in the UI. |
| `inline` | `false` | Render the calendar inside `container` instead of as a dropdown. |
| `container` | `null` | Element/selector for inline mode. |
| `trigger` | `null` | Element/selector that toggles the picker instead of focusing the input. |
| `accentColor` | `null` | Brand color for the selected date, e.g. `'#1d4ed8'`. Falls back to black. |
| `accentTextColor` | `null` | Text color on the selected date. Falls back to white; set to `'#000'` for light accents. |
| `offset` | `10` | Gap in px between input and dropdown. |
| `zIndex` | `1000` | `z-index` of the dropdown. |
| `language` | `''` | `'de'` or `'en'` (see [Language](#language)). Empty uses German labels. |
| `days`, `daysShort`, `daysMin`, `months`, `monthsShort` | German | Label arrays. Override for a language that isn't built in. |
| `labels` | German | Screen-reader labels: `calendar`, `prevMonth`, `nextMonth`, `chooseMonth`, `prevYear`, `nextYear`, `chooseYear`, `prevYears`, `nextYears`, `today`. Merged, so you can override single keys. |
| `dateLabel` | German | `function (date, options)` returning the spoken label of a day, e.g. `Dienstag, 22. September 2026`. |
| `show`, `hide`, `pick` | `null` | Event callbacks. |

Options can also be set as `data-*` attributes on the field, e.g. `data-format="dd.mm.yyyy"`, `data-auto-hide="true"`.

### Methods

```js
$('#date').datepicker('show');
$('#date').datepicker('hide');
$('#date').datepicker('getDate');          // Date object
$('#date').datepicker('getDate', true);    // formatted string
$('#date').datepicker('setDate', '24.12.2026');
$('#date').datepicker('setStartDate', new Date());
$('#date').datepicker('reset');
$('#date').datepicker('destroy');
```

### Events

`show.datepicker`, `hide.datepicker` and `pick.datepicker` fire on the field:

```js
$('#date').on('pick.datepicker', function (e) {
  console.log(e.date, e.view); // Date object, 'day' | 'month' | 'year'
});
```

## Theming

### Brand color per site

The stylesheet ships with a black accent. Pass the site's brand color in the init script and it's used for the selected date on that site only:

```js
$('#date').datepicker({
  format: 'dd.mm.yyyy',
  autoHide: true,
  weekStart: 1,
  accentColor: '#1d4ed8'
});
```

For a light brand color add `accentTextColor: '#000'` so the selected date stays readable.

The same works without touching the script, as custom attributes on the field in the Designer: `data-accent-color` = `#1d4ed8` (and optionally `data-accent-text-color`).

### Language

Two language packs are built in. Pick one per site with `language`:

```js
// German site: Montag–Sonntag, "September 2026", writes 22.09.2026
$('#date').datepicker({ language: 'de', autoHide: true });

// US site: Sunday–Saturday, writes 09/22/2026
$('#date').datepicker({ language: 'en', autoHide: true });
```

Each pack sets the labels plus the conventions that go with them: `de` uses `dd.mm.yyyy` and starts the week on Monday, `en` uses `mm/dd/yyyy` and starts on Sunday. Anything you pass explicitly still wins, so `{ language: 'en', format: 'dd/mm/yyyy', weekStart: 1 }` gives you a UK-style picker.

As with every option this also works as a custom attribute on the field: `data-language` = `en`.

Without `language` the labels are German and the format is `mm/dd/yyyy`, so set it on every site.

### Everything else

The calendar inherits the page font. Everything else is a CSS variable on `.datepicker-container`, so you can match it to the site from Webflow's head code without touching the stylesheet:

```html
<style>
  .datepicker-container {
    --dp-accent: #1d4ed8;      /* selected day background */
    --dp-accent-fg: #fff;      /* selected day text */
    --dp-fg: #111;             /* text */
    --dp-muted: #8b8b8b;       /* weekday labels, other-month days, arrows */
    --dp-faint: #c9c9c9;       /* disabled days */
    --dp-hover: rgba(0, 0, 0, 0.05);
    --dp-bg: #fff;
    --dp-radius: 8px;          /* day cell radius; the card radius follows it */
    --dp-cell: 40px;           /* cell size; the card width follows it */
  }
</style>
```

Today is marked with a dot under the number. The selected date uses `--dp-accent`.

## Accessibility

The picker follows the WAI-ARIA date picker combobox pattern and passes an axe-core WCAG 2.1 AA scan.

- The field gets `role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded` and `aria-controls`. The calendar is a labelled `role="dialog"` (or `role="group"` when inline).
- Every day, month and year is a `role="option"` with a full spoken label (`Dienstag, 22. September 2026, Heute`), `aria-selected`, `aria-disabled` and `aria-current="date"` on today.
- The month/year heading is a live region, so moving between months is announced.
- Text and controls meet the 4.5:1 contrast ratio; focus is shown with a visible ring; motion respects `prefers-reduced-motion`.
- Typing a date into the field always works as a fallback.

Keyboard:

| Key | In the field | In the calendar |
| --- | --- | --- |
| `↓` | Open the calendar and focus the selected day | Next week / row |
| `↑` `←` `→` | | Move by a week or a day (month, year in the other views) |
| `Home` / `End` | | First / last day of the week (month / year of the page in the other views) |
| `PageUp` / `PageDown` | | Previous / next month (`Shift` for year) |
| `Enter` / `Space` | Submit the form as usual | Pick the focused date / press the focused button |
| `Tab` / `Shift+Tab` | Leave the field, closes the calendar | Cycle between the ‹ › buttons, the heading and the grid |
| `Esc` | Close the calendar | Close and return focus to the field |

When the calendar is opened from a `trigger` button, focus moves into the calendar on open and back to the button on close.

## Coexisting with site navigation

The dropdown renders in a fixed-position element appended to `<body>`, above the page's normal content. If a site's main navigation opens a mega-menu or overlay **on hover** (no click), an open calendar has nothing telling it to close, since it only listens for clicks, focus changes and Escape. Left open, it fights the nav for stacking order — on sites where the nav overlay's `z-index` is lower than the calendar's, the calendar visibly floats over it, unblurred, looking broken.

Webflow's own Navbar component always renders its menu as `<nav role="navigation">`, so the plugin listens for the pointer entering any `nav` or `[role="navigation"]` element on the page and closes every open calendar at that moment — no per-site setup, no `zIndex` tuning. This runs once per page regardless of how many fields use the plugin.

If a date field itself lives inside a `<nav>` (unusual, but possible in a nav-embedded search/booking widget), don't rely on this: the guard will close the calendar as soon as the pointer re-enters that nav region, including the field itself.

## Security

- Everything the plugin renders (day numbers, month names, labels, `yearSuffix`) is HTML-escaped. Only the `template` option is inserted as raw HTML: it's the picker's own markup, so keep it under your control and never fill it from user or CMS input.
- `accentColor` / `accentTextColor` are validated with `CSS.supports('color', …)` before being applied.
- The plugin reads and writes the field's value only; it makes no network requests and stores nothing.
- **Pin the version on live sites.** `@main` means the site executes whatever is on the branch at the time the visitor loads it. Once a site is done, replace `@main` in both URLs with the commit hash you tested, and add Subresource Integrity so the browser refuses a file that doesn't match:

  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/90five/webflow-components@<commit>/packages/datepicker/datepicker.css"
        integrity="sha384-…" crossorigin="anonymous">
  <script src="https://cdn.jsdelivr.net/gh/90five/webflow-components@<commit>/packages/datepicker/datepicker.min.js"
          integrity="sha384-…" crossorigin="anonymous"></script>
  ```

  Get the hashes with `openssl dgst -sha384 -binary datepicker.min.js | openssl base64 -A` at that commit (jsDelivr also shows them on the file page). To update a site later, change the commit and both hashes together.

## Development

```sh
pnpm install                              # from the repo root
pnpm --filter webflow-datepicker build    # datepicker.js -> datepicker.min.js
```

Edit `datepicker.js` and `datepicker.css`, run the build, commit all three files.

## Browser support

Any evergreen browser. The open/close animation uses `@starting-style` and `transition-behavior: allow-discrete`; browsers without them simply show and hide the calendar instantly.

## License

MIT
