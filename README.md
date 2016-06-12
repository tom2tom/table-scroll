# Table Scroll
jQuery table-scroll plugin.

Try it here - http://volodymyr-bobko.github.io/table-scroll
## Features
  * Vertical scrolling with possibility to specify top and/or bottom fixed/frozen rows.
  * Horizontal scrolling with possibility to specify left and/or right fixed/frozen columns.
  * Whole-cell-at-a-time scrolling.
  * Can auto-detect scrollable area of the table.
  * Touch screen support.
  * Doesn't clone table elements - so the table's events stay bound.
  * Doesn't divide the table into separate parts for scrolling, so that the sizes of fixed-row and fixed-column cells remain in sync with related cells' sizes.
# Dependencies
* jquery >= 1.7
* jquery-ui >= 1.8
* Prefers to use CSS3 properties: overflow-x, overflow-y
# License
GNU Affero GPL v.3 or, at the distributor's discretion, a later version. See http://www.gnu.org/licenses#AGPL
## Usage
```
<head>
    <script type="text/javascript" src="some-root-url/jquery.min.js"></script>
    <script type="text/javascript" src="some-root-url/jquery-ui.min.js"></script>
</head>
<body>
<table id='scroller'>
table contents
</table>
$('#scroller').table_scroll({
 options
});
</body>
```
## API Options
* **fixedRowsTop** - Default: if the table has a `<thead`> element, the number of rows in that, or else 1. Number of 'frozen' rows at top of the table.
* **fixedRowsBottom** - Default: if the table has a `<tfoot`> element, the number of rows in that, or else 0. Number of 'frozen' rows at the bottom of the table.
* **scrollableRows** - Default: 10. Number of rows that remain visible in scrollable area. May be 'auto' to determine the number at runtime.
* **visibleHeight** - Default: 'auto'. Maximum displayable table-height. Possible values 'auto', a specific size
  * 'auto' maximum possible consistent with parent object.
  * size in any relevent css-unit.
* **scrollY** - Default: 0. Session-start row-scroll count.
* **overflowY** - Default: 'auto'. Possible values 'scroll', 'auto'.
  * 'auto' - Scroll appears only if overflowing rows exists.
  * 'scroll' - Scroll is always visible, but will be disabled if there are no overflowing rows.
* **fixedColumnsLeft** - Default: 0. Number of columns at the left side of the table that will not be scrolled.
* **fixedColumnsRight** - Default: 0. Number of columns at the right side of the table that will not be scrolled.
* **scrollableColumns** - Default: 5. Number of columns that remain visible in scrollable area. May be 'auto' to determine the number at runtime.
* **visibleWidth** - Default: 'auto'. Maximum displayable table-width. Possible values 'auto', a specific size
  * 'auto' maximum possible consistent with parent object.
  * size in any relevent css-unit.
* **scrollX** - Default: 0. Session-start column-scroll count.
* **overflowX** - Default: 'auto'. Possible values 'scroll', 'auto'.
  * 'auto' - Scroll appears only if overflowing columns exists.
  * 'scroll' - Scroll is always visible, but will be disabled if there are no overflowing columns.
### Deprecated
* **rowsInHeader** - migrate to fixedRowsTop
* **rowsInFooter** - migrate to fixedRowsBottom
* **rowsInScrollableArea** - migrate to scrollableRows
* **columnsInScrollableArea** - migrate to scrollableColumns
