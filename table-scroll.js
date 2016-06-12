/*!
table-scroll plugin for JQuery
Version 2.1.0
Copyright (C) 2016 Tom Phane
Licensed under the GNU Affero GPL v.3 or, at the distributor's discretion, a later version.
See http://www.gnu.org/licenses#AGPL.
*/
/**
 Derived from Github code (C) 2014-2016 by Volodymyr Bobko
 at https://github.com/volodymyr-bobko/table-scroll V.2.0.4

 Enables scrolling of selected tables, with optional freezing of table row(s) and/or column(s).
 Prefers to use CSS3 properties: overflow-x, overflow-y

 Configuration options:
 fixedRowsTop - Default: if the table has a <thead> element, the number of rows in that, or else 1. Number of 'frozen' rows at top of the table.
 fixedRowsBottom - Default: if the table has a <tfoot> element, the number of rows in that, or else 0. Number of 'frozen' rows at the bottom of the table.
 scrollableRows - Default: auto. Number of rows that remain visible in scrollable area.
 visibleHeight - Default: 'auto'. Maximum displayable table-height. Possible values 'auto', a specific size
  'auto' maximum possible consistent with parent object.
  size in any relevent css-unit.
 scrollY - Default 0. Session-start row-scroll count.
 overflowY - Default: 'auto'. Possible values 'scroll', 'auto'.
  'auto' - Scroll appears only if overflowing rows exists.
  'scroll' - Scrollbar is always visible, but will be disabled if there are no overflowing rows.
 fixedColumnsLeft - Default: 0. Number of columns at the left side of the table that will not be scrolled.
 fixedColumnsRight - Default: 0. Number of columns at the right side of the table that will not be scrolled.
 scrollableColumns - Default: auto. Number of columns that remain visible in scrollable area.
 visibleWidth - Default: 'auto'. Maximum displayable table-width. Possible values 'auto', a specific size
  'auto' maximum possible consistent with parent object.
  size in any relevent css-unit.
 scrollX - Default 0. Session-start column-scroll count.
 overflowX - Default: 'auto'. Possible values 'scroll', 'auto'.
  'auto' - Scroll appears only if overflowing columns exists.
  'scroll' - Scrollbar is always visible, but will be disabled if there are no overflowing columns.
*/

(function ($, window) { "$:nomunge, window:nomunge";

    var CELL_INDEX_DATA = '_sg_index_',
        CELL_SPAN_ADJUSTMENTS = '_sg_adj_';

    $.widget('custom.table_scroll', {
        version: '1.8', //min jQui version
        options:
        {
            fixedRowsTop: null,
            fixedRowsBottom: null,

            fixedColumnsLeft: 0,
            fixedColumnsRight: 0,

            scrollableRows: 10,  /*number, auto*/
            scrollableColumns: 5,  /*number, auto*/

            scrollX: 0,
            scrollY: 0,

            overflowY: 'auto', /*scroll, auto*/
            overflowX: 'auto', /*scroll, auto*/

            visibleHeight: 'auto', /*auto, specific*/
            visibleWidth: 'auto' /*auto, specific*/
        },

        _create: function () {
            var current = ['fixedRowsTop','fixedRowsBottom','scrollableRows','scrollableColumns'],
                 deprec = ['rowsInHeader','rowsInFooter','rowsInScrollableArea','columnsInScrollableArea'];
            for (var i = 0; i < deprec.length; i++) {
                if (this.hasOwnProperty(deprec[i])) {
                    this[current[i]] = this[deprec[i]];
                    delete this[deprec[i]];
                }
            }

            this.$table = this.widget(); /*cache to avoid context changes*/

            this._columnsCount = -1;
            this._currentTouch = null;

            this._ensureSettings();

            this.startFrom = 0;

            this._setActualCellIndexes();

            this._yInitScroll();
            this._yUpdateRowsVisibility();

            this._xInitScroll();
            this._xUpdateColumnsVisibility();

            this._yUpdateScrollHeights();

            this.$table.on('mousewheel', $.proxy(this._tableMouseWheel, this));
            this.$table.on('DOMMouseScroll', $.proxy(this._tableMouseWheel, this)); // Firefox
            this.$table.on('touchstart', $.proxy(this._touchStart, this));
            this.$table.on('touchmove', $.proxy(this._touchMove, this));
            this.$table.on('touchend', $.proxy(this._touchEnd, this));
            $(window).on('resize', $.proxy(this._reSize, this));

            this._xMoveScroll(this.options.scrollX);
            this._yMoveScroll(this.options.scrollY);
            this._yUpdateRowsVisibility();
            this._xUpdateColumnsVisibility();
        },

        _ensureSettings: function() {
            var tbl = this.$table[0];
            if (this.options.fixedRowsTop === null) {
                if (tbl.tHead)
                    this.options.fixedRowsTop = tbl.tHead.rows.length;
                else
                    this.options.fixedRowsTop = 1;
            }

            if (this.options.fixedRowsBottom === null) {
                if (tbl.tFoot)
                    this.options.fixedRowsBottom = tbl.tFoot.rows.length;
                else
                    this.options.fixedRowsBottom = 0;
            }
            this._CountScrollables();
        },

        _NumberOfColumns: function () {
            if (this._columnsCount != -1)
                return this._columnsCount;

           this._columnsCount = Math.max.apply(null, $(this.$table[0].rows).map(function () {
               return this.cells.length;
           }).get());

            if ($('.sg-v-scroll-cell', this.$table).length > 0)
                this._columnsCount--;

            return this._columnsCount;
        },

        _CountScrollables: function () {
            var limit, i, last, sizes, container = null;
            if (this.options.scrollableRows == 'auto' || this.autorows) {
                if (this.$table[0].rows.length > this.options.fixedRowsTop + this.options.fixedRowsBottom) {
                    if (this.options.visibleHeight && this.options.visibleHeight != 'auto') {
                        limit = this.options.visibleHeight; //TODO support all CSS units
                    } else {
                        container = this.$table.parent();
                        limit = container.height();
                    }
                    sizes = $('tr', this.$table).map(function() {
                        return $(this).outerHeight();
                    }).get();
                    last = this.options.fixedRowsTop;
                    if (last) {
                        for (i = 0; i < last && limit >= 0; i++) {
                            limit -= sizes[i];
                        }
                        sizes.splice(0, last);
                    }
                    last = this.options.fixedRowsBottom;
                    if (last) {
                        for (i = 0; i < last && limit >= 0; i++) {
                            limit -= sizes[-i-1];
                        }
                        sizes.splice(-1, last);
                    }
                    last = sizes.length;
                    if (last) {
                        //count no which fit
                        sizes.sort(function(a, b){return b-a;});
                        for (i = 0; i < last && limit >= 0; i++) {
                            limit -= sizes[i];
                        }
                    }
                    if (i < last)
                       i -= 2;
                    this.options.scrollableRows = i;
                } else {
                    this.options.scrollableRows = 0;
                }
                this.autorows = true;
            }

            if (this.options.scrollableColumns == 'auto' || this.autocols) {
                var number = this._NumberOfColumns();
                if(number > this.options.fixedColumnsLeft + this.options.fixedColumnsRight) {
                    if (this.options.visibleWidth && this.options.visibleWidth != 'auto') {
                        limit = this.options.visibleWidth;
                    } else {
                        if (container === null)
                            container = this.$table.parent();
                        limit = container.height();
                    }
                    limit = container.width();
                    sizes = $('tr:first', this.$table).children().map(function() {
                        return $(this).outerWidth();
                    }).get();
                    last = this.options.fixedColumnsLeft;
                    if (last) {
                        for (i = 0; i < last && limit >= 0; i++) {
                            limit -= sizes[i];
                        }
                        sizes.splice(0, last);
                    }
                    last = this.options.fixedColumnsRight;
                    if (last) {
                        for (i = 0; i < last && limit >= 0; i++) {
                            limit -= sizes[-i-1];
                        }
                        sizes.splice(-1, last);
                    }
                    last = sizes.length;
                    if (last) {
                        //count no which fit
                        sizes.sort(function(a, b){return b-a;});
                        for (i = 0; i < last && limit >= 0; i++) {
                            limit -= sizes[i];
                        }
                    }
                    if (i < last)
                       i -= 2;
                    this.options.scrollableColumns = i;
                } else {
                    this.options.scrollableColumns = 0;
                }
                this.autocols = true;
            }
        },

        // horizontal scrolling methods
        _xNumberOfScrollableColumns: function() {
            var number = this._NumberOfColumns() - this.options.fixedColumnsLeft - this.options.fixedColumnsRight;
            if(number < 1)
                return 1;
            return number;
        },

        _xScrollCount: function() {
            var number = this._NumberOfColumns() - this.options.fixedColumnsLeft - this.options.fixedColumnsRight;
            if (number > this.options.scrollableColumns)
                return this.options.scrollableColumns;
            if (number < 1)
                return 1;
            return number;
        },

        _xScrollNeeded: function() {
            var number = this._NumberOfColumns() - this.options.fixedColumnsLeft - this.options.fixedColumnsRight;
            return number > this.options.scrollableColumns;
        },

        _xInitScroll: function() {
            if (this._NumberOfColumns() < (this.options.fixedColumnsLeft + this.options.fixedColumnsRight))
                return;

            if (this._xScrollNeeded() || this.options.overflowX == 'scroll') {
                var tbl = this.$table[0],
                    row = tbl.insertRow(tbl.rows.length);

                if (this.options.fixedColumnsLeft > 0) {
                    var $cell = $(row.insertCell(0));
                    $cell.attr('colspan', this.options.fixedColumnsLeft);
                }

                var $container = $(row.insertCell(1));
                $container.attr('colspan', this._xScrollCount());
                $container.addClass('sg-x-scroll-cell');

                var $widthDivContainer = $('<div class="sg-h-scroll-container"></div>');
                $widthDivContainer.css({ 'overflow-x': 'scroll', 'overflow': 'scroll', 'margin-right': '-20000px' });
                $widthDivContainer.width($container.width());

                var $widthDiv = $('<div style="height: 1px;"></div>');
                $widthDiv.width((this._xNumberOfScrollableColumns() / this._xScrollCount()) * $container.width());
                $widthDiv.appendTo($widthDivContainer);

                $widthDivContainer.appendTo($container);
                $widthDivContainer.scroll($.proxy(this._xUpdateColumnsVisibility, this));

                if (this.options.fixedColumnsRight > 0) {
                    var $cell = $(row.insertCell(2));
                    $cell.attr('colspan', this.options.fixedColumnsRight +
                        ($('.sg-v-scroll-cell', this.$table).length > 0 ? 1 : 0));
                }
            }
        },

        _xCurrentRelativeScrollLeft: function () {
            var $widthDivContainer = $('.sg-h-scroll-container', this.$table);
            return $widthDivContainer.scrollLeft() / $widthDivContainer.width();
        },

        _xScrollDelta: function () {
            var $widthContainer = $('.sg-h-scroll-container', this.$table);
            return $('div', $widthContainer).width() - $widthContainer.width();
        },

        _xScrollableColumnsCount: function () {
            return this._xNumberOfScrollableColumns() - this._xScrollCount();
        },

        _xColumnScrollStep: function () {
            if (this._xScrollableColumnsCount() === 0)
                return 0;
            return this._xScrollDelta() / this._xScrollableColumnsCount();
        },

        _xMoveScroll: function(position) {
            position = Math.min(this._xScrollableColumnsCount(), position);
            position = Math.max(position, 0);

            position = this._xColumnScrollStep() * position;
            var $widthDivContainer = $('.sg-h-scroll-container', this.$table);
            if ($widthDivContainer.scrollLeft() != position)
                $widthDivContainer.scrollLeft(position);
        },

        _setColumnVisibility: function(index, visible, start, end) {
            var rows = this.$table[0].rows;

            for (var rowIndex = start; rowIndex < end; rowIndex++) {
                var row = rows[rowIndex];

                for (var cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {

                    //in this cycle body we don't use jQuery because this code is critical for performance

                    var cell = row.cells[cellIndex],
                      cIndex = cell[CELL_INDEX_DATA];
                    if (cIndex == index) {

                        if (!cell.colSpan || cell.colSpan == 1) // apply visibility only for cells with colspan = 1
                        {
                            if (visible && cell.style.display == 'none')
                                cell.style.display = '';

                            if (!visible && cell.style.display != 'none')
                                cell.style.display = 'none';
                        }
                    }
                }
            }
        },

        _xFirstVisibleColumnWidth: function () {
            var tbl = this.$table[0],
             i = this.options.fixedRowsTop,
             lasti = tbl.rows.length - this.options.fixedRowsBottom - $('.sg-h-scroll-container', this.$table).length;
            for (; i < lasti; i++) {
                if ($(tbl.rows[i]).css('display') != 'none') {
                    var j = this.options.fixedColumnsLeft,
                     lastj = this._NumberOfColumns() - this.options.fixedColumnsRight;
                    for (; j < lastj; j++) {
                        if ($(tbl.rows[i].cells[j]).css('display') != 'none')
                            return $(tbl.rows[i].cells[j]).width();
                    }
                }
            }
            return 0;
        },

        _xLastVisibleColumnWidth: function () {
            var tbl = this.$table[0],
            i = this.options.fixedRowsTop,
            lasti = tbl.rows.length - this.options.fixedRowsBottom - $('.sg-h-scroll-container', this.$table).length;
            for (; i < lasti; i++) {
                if ($(tbl.rows[i]).css('display') != 'none') {
                    var j = this._NumberOfColumns() - this.options.fixedColumnsRight - 1,
                    lastj = this.options.fixedColumnsLeft;
                    for (; j >= lastj; j--) {
                        if ($(tbl.rows[i].cells[j]).css('display') != 'none')
                            return $(tbl.rows[i].cells[j]).width();
                    }
                }
            }
            return 0;
        },

        _xUpdateScrollWidths: function () {

            var $leftContainer = $('.sg-h-scroll-container', this.$table),
                    $container = $leftContainer.closest('td');
            $leftContainer.width($container.width());
            var $widthDiv = $('div', $leftContainer);
            $widthDiv.width((this._xNumberOfScrollableColumns() / this._xScrollCount()) * $container.width());
        },

        _xUpdateColumnsVisibility: function() {
            if (!this._xScrollNeeded())
                return;

            var $leftContainer = $('.sg-h-scroll-container', this.$table),
             startFromX = Math.floor($leftContainer.scrollLeft() / this._xColumnScrollStep()),
             relativeLeft = this._xCurrentRelativeScrollLeft(),
             i = this.options.fixedColumnsLeft,
             lasti = this._NumberOfColumns() - this.options.fixedColumnsRight;

            for (; i < lasti; i++) {
                var visible = (i >= this.options.fixedColumnsLeft + startFromX &&
                    i < this.options.fixedColumnsLeft + startFromX + this.options.scrollableColumns);
                this._setColumnVisibility(i, visible, 0, this.$table[0].rows.length - 1 /* ignore scrolling row */);
            }
            this._xUpdateScrollWidths();
        },

        // vertical scrolling methods
        _yNumberOfScrollableRows: function () {
            var tbl = this.$table[0],
             number = tbl.rows.length - this.options.fixedRowsTop - this.options.fixedRowsBottom;
            if ($('.sg-h-scroll-container', this.$table).length > 0)
                number--;

            if (number < 1)
                return 1;
            return number;
        },

        _yScrollCount: function() {
            var tbl = this.$table[0],
             number = tbl.rows.length - this.options.fixedRowsTop - this.options.fixedRowsBottom;
            if ($('.sg-h-scroll-container', this.$table).length > 0)
                number--;

            if (number > this.options.scrollableRows)
                return this.options.scrollableRows;
            if (number < 1)
                return 1;
            return number;
        },

        _yScrollNeeded: function() {
            var tbl = this.$table[0],
             number = tbl.rows.length - this.options.fixedRowsTop - this.options.fixedRowsBottom;
            if ($('.sg-h-scroll-container', this.$table).length > 0)
                number--;
            return number > this.options.scrollableRows;
        },

        _yInitScroll: function () {
            var tbl = this.$table[0];
            if (tbl.rows.length < (this.options.fixedRowsTop + this.options.fixedRowsBottom))
                return;

            if (this._yScrollNeeded() || this.options.overflowY == 'scroll') {
                var $cell = $(tbl.rows[0].insertCell(tbl.rows[0].cells.length));
                if ($cell.prev().is('th'))
                  $cell[0].outerHTML = '<th></th>';
                $cell.attr('rowspan', this.options.fixedRowsTop);

                var $container = $(tbl.rows[this.options.fixedRowsTop + this.startFrom].insertCell(tbl.rows[this.options.fixedRowsTop + this.startFrom].cells.length));
                $container.attr('rowspan', this._yScrollCount());
                $container.attr('width', '1px');
                $container.addClass('sg-v-scroll-cell');

                var $heightDivContainer = $('<div class="sg-v-scroll-container"></div>');
                $heightDivContainer.css({'overflow-y': 'scroll', 'overflow': 'scroll'});
                $heightDivContainer.height($container.height());

                var $heightDiv = $('<div style="width: 1px;"></div>');
                $heightDiv.height((this._yNumberOfScrollableRows() / this._yScrollCount()) * $container.height());
                $heightDiv.appendTo($heightDivContainer);

                $heightDivContainer.appendTo($container);
                this._attachToEndScrolling($heightDivContainer, $.proxy(this._yUpdateRowsVisibility, this));

                if (this.options.fixedRowsBottom !== 0) {
                    var firstBotomRow = tbl.rows[this._yNumberOfScrollableRows() + this.options.fixedRowsTop];
                    var $bottomCell = $(firstBotomRow.insertCell(firstBotomRow.cells.length));
                    $bottomCell.attr('rowspan', this.options.fixedRowsBottom);
                }
            }
        },

        _yCurrentRelativeScrollTop: function() {
            var $heightDivContainer = $('.sg-v-scroll-container', this.$table);
            return $heightDivContainer.scrollTop() / $heightDivContainer.height();
        },

        _yScrollDelta: function () {
            var $topContainer = $('.sg-v-scroll-container', this.$table);
            return $('div', $topContainer).height() - $topContainer.height();
        },

        _yScrollableRowsCount: function () {
            return this._yNumberOfScrollableRows() - this._yScrollCount();
        },

        _yRowScrollStep: function () {
            if (this._yScrollableRowsCount() === 0)
                return 0;
            return this._yScrollDelta() / this._yScrollableRowsCount();
        },

        _yMoveScroll: function(position) {
            position = Math.min(this._yScrollableRowsCount(), position);
            position = Math.max(position, 0);

            var step = this._yRowScrollStep();
            position = step * position;
            var $heightDivContainer = $('.sg-v-scroll-container', this.$table);
            if ($heightDivContainer.scrollTop() != position)
                $heightDivContainer.scrollTop(position + step / 2);
        },

        _yMoveScrollToRightRow: function(oldRelativeTop) {
            var trCurrentContainer = $('.sg-v-scroll-cell', this.$table).closest('tr')[0],
             trTargetContainer = this.$table[0].rows[this.options.fixedRowsTop + this.startFrom],
             $heightDivContainer = $('.sg-v-scroll-container', this.$table),
             $heightDiv = $('div', $heightDivContainer);

            if (trCurrentContainer != trTargetContainer) {
                var $newCell = $(trTargetContainer.insertCell(trTargetContainer.cells.length));
                $newCell.attr('rowspan', this._yScrollCount());
                $newCell.addClass('sg-v-scroll-cell');
                $newCell.attr('width', '1px');

                var $scrollDiv = $('.sg-v-scroll-container', $(trCurrentContainer));
                $scrollDiv.height(0);
                $scrollDiv.appendTo($newCell);
                trCurrentContainer.deleteCell(trCurrentContainer.cells.length - 1);

                $heightDivContainer.height($newCell.height());
                $heightDiv.height((this._yNumberOfScrollableRows() / this._yScrollCount()) * $newCell.height());

                $heightDivContainer.scrollTop(oldRelativeTop * $heightDivContainer.height());
                $heightDivContainer[0]; //?
            }
        },

        _yUpdateScrollHeights: function () {

            var $topContainer = $('.sg-v-scroll-container', this.$table),
                $container = $topContainer.closest('td');
            $topContainer.hide();
            $topContainer.height($container.height());
            var $heightDiv = $('div', $topContainer);
            $heightDiv.height((this._yNumberOfScrollableRows() / this._yScrollCount()) * $container.height());
            $topContainer.show();
        },

        _yFirstVisibleRowHeight: function (){
            var tbl = this.$table[0],
            i = this.options.fixedRowsTop,
            lasti = tbl.rows.length - this.options.fixedRowsBottom - $('.sg-h-scroll-container', this.$table).length;
            for (; i < lasti; i++) {
                if ($(tbl.rows[i]).css('display') != 'none') {
                    return $(tbl.rows[i]).height();
                }
            }
            return 0;
        },

        _yLastVisibleRowHeight: function () {
            var tbl = this.$table[0],
            i = tbl.rows.length - this.options.fixedRowsBottom - $('.sg-h-scroll-container', this.$table).length - 1,
            lasti = this.options.fixedRowsTop;
            for (; i >= lasti; i--) {
                if ($(tbl.rows[i]).css('display') != 'none') {
                    return $(tbl.rows[i]).height();
                }
            }
            return 0;
        },

        _yUpdateRowsVisibility: function () {

            if (!this._yScrollNeeded())
                return;

            var $topContainer = $('.sg-v-scroll-container', this.$table);

            var startFrom = Math.floor($topContainer.scrollTop() / this._yRowScrollStep());
            var relativeTop = this._yCurrentRelativeScrollTop();

            var tbl = this.$table[0],
            i = this.options.fixedRowsTop,
            lasti = tbl.rows.length - this.options.fixedRowsBottom - $('.sg-h-scroll-container', this.$table).length;
            for (; i < lasti; i++) {
                if (i >= this.options.fixedRowsTop + startFrom &&
                    i < this.options.fixedRowsTop + startFrom + this.options.scrollableRows) {
                    $(tbl.rows[i]).show();
                } else {
                    $(tbl.rows[i]).hide();
                }
            }

            if (this.startFrom != startFrom) {
                this.startFrom = startFrom;
                this._yMoveScrollToRightRow(relativeTop);
            }
        },

        // event handling
        _attachToEndScrolling: function (element, handler) {
            element.scroll(function() {
                clearTimeout(element.data('scrollTimer'));

                $.data(this, 'scrollTimer', setTimeout(function () {
                    handler.apply(this);
                }, 300));
            });
        },

        _tableMouseWheel: function (event) {

            var up = false,
             down = false,
             original = event.originalEvent;
            if (original.wheelDelta) {
                if (original.wheelDelta >= 120) {
                    up = true;
                } else if (original.wheelDelta <= -120) {
                    down = true;
                }
            }

            if (original.detail) {
                if (original.detail == -3) {
                    up = true;
                } else if (original.detail == 3) {
                    down = true;
                }
            }

            var $heightDivContainer = $('.sg-v-scroll-container', this.$table),
             delta = 0;

            if (up)
                delta = this._yRowScrollStep() + 1;
            if(down)
                delta = - this._yRowScrollStep() - 1;

            if (delta !== 0) {
                $heightDivContainer.scrollTop($heightDivContainer.scrollTop() - delta);
            }
            event.preventDefault();
        },

        _touchStart: function (event) {
            if (event.originalEvent.touches && event.originalEvent.touches.length == 1) {
                var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
                this._currentTouch = { X: touch.pageX, Y: touch.pageY };
                event.preventDefault();
                event.stopPropagation();
            }
        },

        _touchMove: function (event) {
            if (event.originalEvent.touches && event.originalEvent.touches.length == 1 && this._currentTouch !== null) {
                var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];

                var newTouch = { X: touch.pageX, Y: touch.pageY },
                 deltaX = this._currentTouch.X - newTouch.X,
                 deltaY = this._currentTouch.Y - newTouch.Y;

                var $heightDivContainer = $('.sg-v-scroll-container', this.$table);
                if (deltaY > 0) {
                    var rowToHideHeight = this._yFirstVisibleRowHeight();
                    if (rowToHideHeight !== 0 && deltaY > rowToHideHeight) {
                        $heightDivContainer.scrollTop($heightDivContainer.scrollTop() + (this._yRowScrollStep() + 1));
                        this._currentTouch.Y -= rowToHideHeight;
                        this._yUpdateRowsVisibility();
                    }
                } else {
                    var rowToHideHeight = this._yLastVisibleRowHeight();
                    if (rowToHideHeight !== 0 && deltaY < -1 * rowToHideHeight) {
                        $heightDivContainer.scrollTop($heightDivContainer.scrollTop() - (this._yRowScrollStep() + 1));
                        this._currentTouch.Y += rowToHideHeight;
                        this._yUpdateRowsVisibility();
                    }
                }

                var $widthDivContainer = $('.sg-h-scroll-container', this.$table);
                if (deltaX > 0) {
                    var columnToHideWidth = this._xFirstVisibleColumnWidth();
                    if (columnToHideWidth !== 0 && deltaX > columnToHideWidth) {
                        $widthDivContainer.scrollLeft($widthDivContainer.scrollLeft() + (this._xColumnScrollStep() + 1));
                        this._currentTouch.X -= rowToHideHeight;
                    }
                } else {
                    var columnToHideWidth = this._xLastVisibleColumnWidth();
                    if (columnToHideWidth !== 0 && deltaX < -1 * columnToHideWidth) {
                        $widthDivContainer.scrollLeft($widthDivContainer.scrollLeft() - (this._xColumnScrollStep() + 1));
                        this._currentTouch.X += columnToHideWidth;
                    }
                }
                event.preventDefault();
                event.stopPropagation();
            }
        },

        _touchEnd: function (event) {
            this._currentTouch = null;
        },

        _reSize: function (event) {
            this._CountScrollables();
            if (this.options.scrollableRows == 'auto' || this.autorows)
              this._yUpdateRowsVisibility();
            if (this.options.scrollableColumns == 'auto' || this.autocols)
              this._xUpdateColumnsVisibility();
        },

        _setActualCellIndexes: function() {
            var rows = this.$table[0].rows;

            for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                var row = rows[rowIndex],
                 indAdjustments = row[CELL_SPAN_ADJUSTMENTS];
                if (!indAdjustments)
                    indAdjustments = [];

                for (var cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {

                    var prevCellEndsAt = cellIndex - 1;

                    if (cellIndex > 0) {
                        var $prevCell = $(row.cells[cellIndex - 1]);
                        prevCellEndsAt = $prevCell[0][CELL_INDEX_DATA];
                        if ($prevCell.attr('colspan')) {
                            prevCellEndsAt += this._getColSpan($prevCell) - 1;
                        }
                    }

                    var $cell = $(row.cells[cellIndex]),
                    indexToSet = prevCellEndsAt + 1;

                    for (var i = 0; i < indAdjustments.length; i++) {
                        if (indAdjustments[i].index <= indexToSet) {
                            indexToSet += indAdjustments[i].adjustment;
                            indAdjustments[i].adjustment = 0;
                        }
                    }

                    $cell[0][CELL_INDEX_DATA] = indexToSet;

                    if ($cell.attr('rowspan') > 1 ) {
                        var span = $cell.attr('rowspan');

                        for (var rowShift = rowIndex + 1; rowShift < rowIndex + span && rowShift < rows.length; rowShift++) {
                            var shiftedRow = rows[rowShift],
                             adjustments = shiftedRow[CELL_SPAN_ADJUSTMENTS];
                            if (!adjustments)
                                adjustments = [];
                            adjustments.push({ index: indexToSet, adjustment: this._getColSpan($cell) });
                            shiftedRow[CELL_SPAN_ADJUSTMENTS] = adjustments;
                        }
                    }
                }
            }
        },

        _getColSpan: function($cell) {
            if ($cell.data('scroll-span'))
                return $cell.data('scroll-span');

            if ($cell.attr('colspan'))
                return $cell.attr('colspan') * 1;

            return 1;
        }
    });

})(jQuery, window);
