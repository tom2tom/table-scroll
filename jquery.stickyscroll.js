/*!
table sticky-scroll plugin for JQuery
Version 0.8.0
Copyright (C) 2016 Tom Phane
Licensed under the GNU Affero GPL v.3 or, at the distributor's discretion, a later version.
See http://www.gnu.org/licenses#AGPL.
*/
/**
 Inspired by and derived in part from Github code (C) 2014-2016 by Volodymyr Bobko
 v.2.0.4 at https://github.com/volodymyr-bobko/table-scroll

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

Optionally apply CSS for:
td.sg-v-scroll-cell
div.sg-v-scroll-container (located inside td.sg-v-scroll-cell)
td.sg-h-scroll-cell
div.sg-h-scroll-container (located inside td.sg-h-scroll-cell)
*/
;(function($, window, document, undefined) { "$:nomunge, window:nomunge";

    $.fn.stickyscroll = function(options) {

      var CELL_INDEX_DATA = '_sg_index_',
        CELL_SPAN_ADJUSTMENTS = '_sg_adj_',
        defaults = {
          fixedRowsTop: null,
          fixedRowsBottom: null,

          fixedColumnsLeft: 0,
          fixedColumnsRight: 0,

          scrollableRows: 'auto', //integer, auto
          scrollableColumns: 'auto', //integer, auto

          scrollX: 0,
          scrollY: 0,

          overflowY: 'auto', //scroll, auto
          overflowX: 'auto', //scroll, auto

          visibleHeight: 'auto', //auto, specific
          visibleWidth: 'auto' //auto, specific
        };

      function _ensureSettings(cfg) {
        var tbl = cfg.$table[0];
        if (cfg.fixedRowsTop === null) {
          if (tbl.tHead)
            cfg.fixedRowsTop = tbl.tHead.rows.length;
          else
            cfg.fixedRowsTop = 1;
        }

        if (cfg.fixedRowsBottom === null) {
          if (tbl.tFoot)
            cfg.fixedRowsBottom = tbl.tFoot.rows.length;
          else
            cfg.fixedRowsBottom = 0;
        }
      }

      function _NumberOfColumns(cfg) {
        if (cfg._columnsCount != -1)
          return cfg._columnsCount;

        cfg._columnsCount = Math.max.apply(null, $(cfg.$table[0].rows)
          .map(function() {
            return this.cells.length;
          }).get());

        if (cfg.vbar) //$('.sg-v-scroll-cell', cfg.$table).length > 0)
          cfg._columnsCount--;

        return cfg._columnsCount;
      }

      //adapted from blog.stchur.com/2006/09/20/converting-to-pixels-with-javascript
      function _convertToPixels(len, context) {
        if (typeof(len) === 'number' || (/px$/.test(len))) {
          return parseInt(len, 10);
        }

        var $tmp = $('<div></div>');
        $tmp.css({
          'visbility': 'hidden',
          'position': 'absolute',
          'line-height': 0
        });

        if (/%$/.test(len)) {
          context = context.parentNode || context;
          $tmp.css('height', len);
        } else {
          $tmp.css({
            'border-style': 'solid',
            'border-bottom-width': 0,
            'border-top-width': len
          });
        }

        if (!context) {
          context = document.body;
        }

        context.appendChild($tmp[0]);
        var px = $tmp[0].offsetHeight;
        context.removeChild($tmp[0]);

        return px;
      }

      function _countScrollables(cfg) {
        var limit, i, last, sizes, vscroll = false,
          container = null;
        if (cfg.scrollableRows == 'auto' || cfg.autorows) {
          if (cfg.$table[0].rows.length > cfg.fixedRowsTop + cfg.fixedRowsBottom) {
            if (cfg.visibleHeight && cfg.visibleHeight != 'auto') {
              limit = _convertToPixels(cfg.visibleHeight, cfg.$table[0]);
            } else {
              container = cfg.$table.parent();
              limit = container.height() - (cfg.$table.outerHeight() - cfg.$table.height());
            }
            sizes = $('tr', cfg.$table).map(function() {
                return $(this).outerHeight();
            }).get();
            last = cfg.fixedRowsTop;
            if (last) {
              for (i = 0; i < last && limit >= 0; i++) {
                limit -= sizes[i];
              }
              sizes.splice(0, last);
            }
            last = cfg.fixedRowsBottom;
            if (last) {
              for (i = 0; i < last && limit >= 0; i++) {
                limit -= sizes[-i - 1];
              }
              sizes.splice(-1, last);
            }
            last = sizes.length;
            if (last) {
              //count no which fit
              sizes.sort(function(a, b) {
                return b - a;
              });
              for (i = 0; i < last && limit >= 0; i++) {
                limit -= sizes[i];
              }
            }
            if (limit < 0) { //v-scolling needed
              vscroll = true;
              i--; //last row can't fit
            }
            cfg.scrollableRows = Math.max(i, 0);
          } else {
            cfg.scrollableRows = 0;
          }
          cfg.autorows = true;
        }

        if (cfg.scrollableColumns == 'auto' || cfg.autocols) {
          var number = _NumberOfColumns(cfg);
          if (number > cfg.fixedColumnsLeft + cfg.fixedColumnsRight) {
            if (cfg.visibleWidth && cfg.visibleWidth != 'auto') {
              limit = _convertToPixels(cfg.visibleWidth, cfg.$table[0]);
            } else {
              if (container === null)
                container = cfg.$table.parent();
              limit = container.width() - (cfg.$table.outerWidth() - cfg.$table.width());
            }
            sizes = $('tr:first', cfg.$table).children().map(function() {
                return $(this).outerWidth();
            }).get();
            last = cfg.fixedColumnsLeft;
            if (last) {
              for (i = 0; i < last && limit >= 0; i++) {
                limit -= sizes[i] - 1;
              }
              sizes.splice(0, last);
            }
            last = cfg.fixedColumnsRight;
            if (last) {
              for (i = 0; i < last && limit >= 0; i++) {
                limit -= sizes[-i - 1];
              }
              sizes.splice(-1, last);
            }
            last = sizes.length;
            if (last) {
              //count no which fit
              sizes.sort(function(a, b) {
                return b - a;
              });
              for (i = 0; i < last && limit >= 0; i++) {
                limit -= sizes[i];
              }
            }
            if (limit < 0) { //h-scolling needed
              if (vscroll) {
                i -= 2; //hacky space-allowance for vertical scrollbar
//              if (cfg.scrollableRows > 0)
//                   cfg.scrollableRows--; //horiz bar-allowance
              }
            }
            cfg.scrollableColumns = Math.max(i, 0);
          } else {
            cfg.scrollableColumns = 0;
          }
          cfg.autocols = true;
        }
      }

      // horizontal scrolling methods
      function _xNumberOfScrollableColumns(cfg) {
        var number = _NumberOfColumns(cfg) - cfg.fixedColumnsLeft - cfg.fixedColumnsRight;
        if (number < 1)
          return 1;
        return number;
      }

      function _xScrollCount(cfg) {
        var number = _NumberOfColumns(cfg) - cfg.fixedColumnsLeft - cfg.fixedColumnsRight;
        if (number > cfg.scrollableColumns)
          return cfg.scrollableColumns;
        if (number < 1)
          return 1;
        return number;
      }

      function _xScrollNeeded(cfg) {
        var number = _NumberOfColumns(cfg) - cfg.fixedColumnsLeft - cfg.fixedColumnsRight;
        return number > cfg.scrollableColumns;
      }

      function _xInitScroll(cfg) {
        if (_NumberOfColumns(cfg) < (cfg.fixedColumnsLeft + cfg.fixedColumnsRight))
          return;

        if (_xScrollNeeded(cfg) || cfg.overflowX == 'scroll') {
          var tbl = cfg.$table[0],
            row = tbl.insertRow(tbl.rows.length);//insert 'scrollbar' row at end of table

          if (cfg.fixedColumnsLeft > 0) {
          //insert empty 'padding' cell at left of scrollbar-row
            var $cell = $(row.insertCell(0));
            $cell.css({
                'margin': 0,
                'border': 0,
                'padding': 0
              });
            if (cfg.fixedColumnsLeft > 1)
              $cell.attr('colspan', cfg.fixedColumnsLeft); //extend across all fixed left
          }
          //insert 'scrollbar' cell at left of left-most scrollable column
          var $container = $(row.insertCell(-1)),
           //longer bar if vscroll active && right-frozen-columns = 0
           span = _xScrollCount(cfg); // + (cfg.vbar && cfg.fixedColumnsRight == 0); //if vbar not yet known?
          $container.attr('colspan', span)
            .css({'margin-left':0, 'margin-right':0, 'padding-left':0, 'padding-right':0})
            .addClass('sg-h-scroll-cell'); //may provide other styling
          var cw = $container.outerWidth();

          var $widthDivContainer = $('<div></div>');
          $widthDivContainer.css({
              'margin-left': 0, 'margin-right': -20000,
              'padding-left': 0, 'padding-right': 0,
              'overflow-x': 'scroll',
              'overflow': 'scroll'
            })
           .addClass('sg-h-scroll-container')
            .width(cw);

          var $widthDiv = $('<div></div>');
          $widthDiv.height(1).width((_xNumberOfScrollableColumns(cfg) / _xScrollCount(cfg)) * cw)
            .appendTo($widthDivContainer);

          $widthDivContainer.appendTo($container)
            .on('scroll', cfg, function() {
                if (cfg.hscrollTimer === null) {
                    _xUpdateColumnsVisibility(cfg);
                    cfg.hscrollTimer = setTimeout(function() {
                        cfg.hscrollTimer = null;
                    }, 300);
                }
            });
          //insert empty 'padding' cell at right of scrollbar-row
          var cc = cfg.fixedColumnsRight +
              (cfg.vbar ? 1 : 0) //($('.sg-v-scroll-cell', cfg.$table).length > 0 ? 1 : 0);
          if (cc > 0) {
            var $cell = $(row.insertCell(-1));
            $cell.css({
              'margin': 0,
              'border': 0,
              'padding': 0
            });
            if (cc > 1)
              $cell.attr('colspan', cc);
          }
          cfg.hbar = true; //cache bar's presence
        }
      }

      function _xCurrentRelativeScrollLeft(cfg) {
        var $widthDivContainer = $('.sg-h-scroll-container', cfg.$table);
        return $widthDivContainer.scrollLeft() / $widthDivContainer.width();
      }

      function _xScrollDelta(cfg) {
        var $widthDivContainer = $('.sg-h-scroll-container', cfg.$table);
        return $('div', $widthDivContainer).width() - $widthDivContainer.width();
      }

      function _xScrollableColumnsCount(cfg) {
        return _xNumberOfScrollableColumns(cfg) - _xScrollCount(cfg);
      }

      function _xColumnScrollStep(cfg) {
        if (_xScrollableColumnsCount(cfg) === 0)
          return 0;
        return _xScrollDelta(cfg) / _xScrollableColumnsCount(cfg);
      }

      function _xMoveScroll(position, cfg) {
        position = Math.min(_xScrollableColumnsCount(cfg), position);
        if (position < 0)
          position = 0;
        position = _xColumnScrollStep(cfg) * position;
        var $widthDivContainer = $('.sg-h-scroll-container', cfg.$table);
        if ($widthDivContainer.scrollLeft() != position)
          $widthDivContainer.scrollLeft(position);
      }

      function _setColumnVisibility(index, visible, start, end, cfg) {
        var rows = cfg.$table[0].rows;

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
      }

      function _xFirstVisibleColumnWidth(cfg) {
        var tbl = cfg.$table[0],
          i = cfg.fixedRowsTop,
          lasti = tbl.rows.length - cfg.fixedRowsBottom - (cfg.hbar ? 1 : 0); //$('.sg-h-scroll-container', cfg.$table).length;
        for (; i < lasti; i++) {
          if (tbl.rows[i].style.display != 'none') {
            var j = cfg.fixedColumnsLeft,
              lastj = _NumberOfColumns(cfg) - cfg.fixedColumnsRight;
            for (; j < lastj; j++) {
              if (tbl.rows[i].cells[j].style.display != 'none')
                return $(tbl.rows[i].cells[j]).width();
            }
          }
        }
        return 0;
      }

      function _xLastVisibleColumnWidth(cfg) {
        var tbl = cfg.$table[0],
          i = cfg.fixedRowsTop,
          lasti = tbl.rows.length - cfg.fixedRowsBottom - (cfg.hbar ? 1 : 0); //$('.sg-h-scroll-container', cfg.$table).length;
        for (; i < lasti; i++) {
          if (tbl.rows[i].style.display != 'none') {
            var j = _NumberOfColumns(cfg) - cfg.fixedColumnsRight - 1,
              lastj = cfg.fixedColumnsLeft;
            for (; j >= lastj; j--) {
              if (tbl.rows[i].cells[j].style.display != 'none')
                return $(tbl.rows[i].cells[j]).width();
            }
          }
        }
        return 0;
      }

      function _xUpdateScrollWidths(cfg) {

        var $widthDivContainer = $('.sg-h-scroll-container', cfg.$table),
          position = $widthDivContainer.scrollLeft(),
          $widthDiv = $('div', $widthDivContainer),
          $container = $widthDivContainer.closest('td'),
          cw = $container.width(),
          wide = (_xNumberOfScrollableColumns(cfg) / _xScrollCount(cfg)) * cw;
        $widthDivContainer //.hide()
         .width(cw);
        $widthDiv.width(wide);
        $widthDivContainer //.show()
         .scrollLeft(position); //refresh bar to show its proper size
      }

      function _xUpdateColumnsVisibility(cfg) {
        if (!_xScrollNeeded(cfg))
          return;

        var $widthDivContainer = $('.sg-h-scroll-container', cfg.$table),
          startFromX = Math.floor($widthDivContainer.scrollLeft() / _xColumnScrollStep(cfg)),
          relativeLeft = _xCurrentRelativeScrollLeft(cfg),
          i = cfg.fixedColumnsLeft,
          lasti = _NumberOfColumns(cfg) - cfg.fixedColumnsRight;

        for (; i < lasti; i++) {
          var visible = (i >= cfg.fixedColumnsLeft + startFromX &&
            i < cfg.fixedColumnsLeft + startFromX + cfg.scrollableColumns);
          _setColumnVisibility(i, visible, 0, cfg.$table[0].rows.length - 1 /* ignore scrolling row */, cfg);
        }
        _xUpdateScrollWidths(cfg);
      }

      // vertical scrolling methods
      function _yNumberOfScrollableRows(cfg) {
        var tbl = cfg.$table[0],
          number = tbl.rows.length - cfg.fixedRowsTop - cfg.fixedRowsBottom;
        if (cfg.hbar) //($('.sg-h-scroll-container', cfg.$table).length > 0)
          number--;

        if (number < 1)
          return 1;
        return number;
      }

      function _yScrollCount(cfg) {
        var tbl = cfg.$table[0],
          number = tbl.rows.length - cfg.fixedRowsTop - cfg.fixedRowsBottom;
        //allow for possible horz. 'scrollbar' row 
//CHECKME if cfg.hbar
//          number--;

        if (number > cfg.scrollableRows)
          return cfg.scrollableRows;
        if (number < 1)
          return 1;
        return number;
      }

      function _yScrollNeeded(cfg) {
        var tbl = cfg.$table[0],
          number = tbl.rows.length - cfg.fixedRowsTop - cfg.fixedRowsBottom;
        if (cfg.hbar) //($('.sg-h-scroll-container', cfg.$table).length > 0)
          number--;
        return number > cfg.scrollableRows;
      }

      function _yInitScroll(cfg) {
        var tbl = cfg.$table[0];
        if (tbl.rows.length < (cfg.fixedRowsTop + cfg.fixedRowsBottom))
          return;

        if (_yScrollNeeded(cfg) || cfg.overflowY == 'scroll') {
          //insert empty 'padding' cell at end of top-freeze rows
          var $cell = $(tbl.rows[0].insertCell(tbl.rows[0].cells.length));
          if ($cell.prev().is('th')) {
            $cell[0].outerHTML = '<th style="margin:0;border:0;padding:0;"></th>'; //TODO old-browser compatibility
          } else {
            $cell.css({
              'margin': 0,
              'border': 0,
              'padding': 0
            });
          }
          if (cfg.fixedRowsTop > 1) //extend down to cover all frozen top rows
              $cell.attr('rowspan', cfg.fixedRowsTop);

          //insert 'scrollbar' cell at end of top scrollable row
          var bartop = cfg.fixedRowsTop + cfg.startFrom, //row where top of vscroll bar is
           $container = $(tbl.rows[bartop].insertCell(tbl.rows[bartop].cells.length)),
           //longer bar if vscroll active && bottom-frozen-rows = 0
           span = _yScrollCount(cfg);
           //extend down to cover all scrollable rows
           $container.attr('rowspan', span)
            .attr('width', 1)
            .css({'margin-top':0, 'margin-bottom':0, 'padding-top':0, 'padding-bottom':0})
            .addClass('sg-v-scroll-cell'); //maybe additional styling from this
          var ch = $container.outerHeight();

          var $heightDivContainer = $('<div></div>');
          $heightDivContainer.css({
              'margin-top': 0, 'margin-bottom': 0,
              'padding-top': 0, 'padding-bottom': 0,
              'overflow-y': 'scroll',
              'overflow': 'scroll'
            })
            .addClass('sg-v-scroll-container') //maybe more styling
            .height(ch);

          var $heightDiv = $('<div></div>');
          $heightDiv.width(1).height((_yNumberOfScrollableRows(cfg) / _yScrollCount(cfg)) * ch)
            .appendTo($heightDivContainer);
          $heightDivContainer.appendTo($container)
            .on('scroll', cfg, function() {
                if (cfg.vscrollTimer === null) {
                    _yUpdateRowsVisibility(cfg);
                    cfg.vscrollTimer = setTimeout(function() {
                        cfg.vscrollTimer = null;
                    }, 300);
                }
            });

          if (cfg.fixedRowsBottom !== 0) {
           //insert empty 'padding' cell at end of bottom-freeze rows
            var firstBotomRow = tbl.rows[_yNumberOfScrollableRows(cfg) + cfg.fixedRowsTop];
            var $bottomCell = $(firstBotomRow.insertCell(firstBotomRow.cells.length));
            $bottomCell.css({
              'margin': 0,
              'border': 0,
              'padding': 0
            });
            if (cfg.fixedRowsBottom > 1)
                $bottomCell.attr('rowspan', cfg.fixedRowsBottom);
          }
          cfg.vbar = true; //cache bar's presence
        }
      }

      function _yCurrentRelativeScrollTop(cfg) {
        var $heightDivContainer = $('.sg-v-scroll-container', cfg.$table);
        return $heightDivContainer.scrollTop() / $heightDivContainer.height();
      }

      function _yScrollDelta(cfg) {
        var $topContainer = $('.sg-v-scroll-container', cfg.$table);
        return $('div', $topContainer).height() - $topContainer.height();
      }

      function _yScrollableRowsCount(cfg) {
        return _yNumberOfScrollableRows(cfg) - _yScrollCount(cfg);
      }

      function _yRowScrollStep(cfg) {
        if (_yScrollableRowsCount(cfg) === 0)
          return 0;
        return _yScrollDelta(cfg) / _yScrollableRowsCount(cfg);
      }

      function _yMoveScroll(position, cfg) {
        position = Math.min(_yScrollableRowsCount(cfg), position);
        if (position < 0)
          position = 0;
        var step = _yRowScrollStep(cfg);
        position = step * position;
        var $heightDivContainer = $('.sg-v-scroll-container', cfg.$table);
        if ($heightDivContainer.scrollTop() != position)
          $heightDivContainer.scrollTop(position + step / 2);
      }

      function _yMoveScrollToRightRow(oldRelativeTop, cfg) {
        var trCurrentContainer = $('.sg-v-scroll-cell', cfg.$table).closest('tr')[0],
          trTargetContainer = cfg.$table[0].rows[cfg.fixedRowsTop + cfg.startFrom],
          $heightDivContainer = $('.sg-v-scroll-container', cfg.$table),
          $heightDiv = $('div', $heightDivContainer);

        if (trCurrentContainer != trTargetContainer) {
          var $newCell = $(trTargetContainer.insertCell(trTargetContainer.cells.length));
          $newCell.attr('rowspan', _yScrollCount(cfg))
            .addClass('sg-v-scroll-cell')
            .attr('width', '1px');

          var $scrollDiv = $('.sg-v-scroll-container', $(trCurrentContainer));
          $scrollDiv.height(0)
            .appendTo($newCell);
          trCurrentContainer.deleteCell(trCurrentContainer.cells.length - 1);

          $heightDivContainer.height($newCell.height());
          $heightDiv.height((_yNumberOfScrollableRows(cfg) / _yScrollCount(cfg)) * $newCell.height());

          $heightDivContainer.scrollTop(oldRelativeTop * $heightDivContainer.height());
          $heightDivContainer[0]; //?
        }
      }

      function _yUpdateScrollHeights(cfg) {

        var $topContainer = $('.sg-v-scroll-container', cfg.$table),
          position = $topContainer.scrollTop(),
          $heightDiv = $('div', $topContainer),
          $container = $topContainer.closest('td'),
          ch = $container.height(),
          high = (_yNumberOfScrollableRows(cfg) / _yScrollCount(cfg)) * ch;
        $topContainer //.hide()
          .height(ch);
        $heightDiv.height(high);
        $topContainer //.show()
        .scrollTop(position); //refresh bar to show its proper size
      }

      function _yFirstVisibleRowHeight(cfg) {
        var tbl = cfg.$table[0],
          i = cfg.fixedRowsTop,
          lasti = tbl.rows.length - cfg.fixedRowsBottom - (cfg.hbar ? 1 : 0); //$('.sg-h-scroll-container', cfg.$table).length;
        for (; i < lasti; i++) {
          if (tbl.rows[i].style.display != 'none') {
            return $(tbl.rows[i]).height();
          }
        }
        return 0;
      }

      function _yLastVisibleRowHeight(cfg) {
        var tbl = cfg.$table[0],
          i = tbl.rows.length - cfg.fixedRowsBottom - (cfg.hbar ? 1 : 0) - 1; //$('.sg-h-scroll-container', cfg.$table).length - 1,
          lasti = cfg.fixedRowsTop;
        for (; i >= lasti; i--) {
          if (tbl.rows[i].style.display != 'none') {
            return $(tbl.rows[i]).height();
          }
        }
        return 0;
      }

      function _yUpdateRowsVisibility(cfg) {

        if (!_yScrollNeeded(cfg))
          return;

        var $topContainer = $('.sg-v-scroll-container', cfg.$table);

        var startFrom = Math.floor($topContainer.scrollTop() / _yRowScrollStep(cfg));
        var relativeTop = _yCurrentRelativeScrollTop(cfg);

        var tbl = cfg.$table[0],
          i = cfg.fixedRowsTop,
          lasti = tbl.rows.length - cfg.fixedRowsBottom - (cfg.hbar ? 1 : 0); //$('.sg-h-scroll-container', cfg.$table).length;
        for (; i < lasti; i++) {
          if (i >= cfg.fixedRowsTop + startFrom &&
            i < cfg.fixedRowsTop + startFrom + cfg.scrollableRows) {
            $(tbl.rows[i]).show();
          } else {
            $(tbl.rows[i]).hide();
          }
        }

        if (cfg.startFrom != startFrom) {
          cfg.startFrom = startFrom;
          _yMoveScrollToRightRow(relativeTop, cfg);
        }
      }

      // event handling
      function _tableMouseWheel(event) {

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

        var cfg = event.data,
         $heightDivContainer = $('.sg-v-scroll-container', cfg.$table),
          delta = 0;

        if (up)
          delta = _yRowScrollStep(cfg) + 1;
        if (down)
          delta = -_yRowScrollStep(cfg) - 1;

        if (delta !== 0) {
          $heightDivContainer.scrollTop($heightDivContainer.scrollTop() - delta);
        }
        event.preventDefault();
      }

      function _touchStart(event) {
        if (event.originalEvent.touches && event.originalEvent.touches.length == 1) {
          var cfg = event.data,
           touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];
          cfg._currentTouch = {
            X: touch.pageX,
            Y: touch.pageY
          };
          event.preventDefault();
          event.stopPropagation();
        }
      }

      function _touchMove(event) {
        var cfg = event.data;
        if (event.originalEvent.touches && event.originalEvent.touches.length == 1 && cfg._currentTouch !== null) {
          var touch = event.originalEvent.touches[0] || event.originalEvent.changedTouches[0];

          var newTouch = {
              X: touch.pageX,
              Y: touch.pageY
            },
            deltaX = cfg._currentTouch.X - newTouch.X,
            deltaY = cfg._currentTouch.Y - newTouch.Y;

          var $heightDivContainer = $('.sg-v-scroll-container', cfg.$table);
          if (deltaY > 0) {
            var rowToHideHeight = _yFirstVisibleRowHeight(cfg);
            if (rowToHideHeight !== 0 && deltaY > rowToHideHeight) {
              $heightDivContainer.scrollTop($heightDivContainer.scrollTop() + (_yRowScrollStep(cfg) + 1));
              cfg._currentTouch.Y -= rowToHideHeight;
              _yUpdateRowsVisibility(cfg);
            }
          } else {
            var rowToHideHeight = _yLastVisibleRowHeight(cfg);
            if (rowToHideHeight !== 0 && deltaY < -1 * rowToHideHeight) {
              $heightDivContainer.scrollTop($heightDivContainer.scrollTop() - (_yRowScrollStep(cfg) + 1));
              cfg._currentTouch.Y += rowToHideHeight;
              _yUpdateRowsVisibility(cfg);
            }
          }

          var $widthDivContainer = $('.sg-h-scroll-container', cfg.$table);
          if (deltaX > 0) {
            var columnToHideWidth = _xFirstVisibleColumnWidth(cfg);
            if (columnToHideWidth !== 0 && deltaX > columnToHideWidth) {
              $widthDivContainer.scrollLeft($widthDivContainer.scrollLeft() + (_xColumnScrollStep(cfg) + 1));
              cfg._currentTouch.X -= rowToHideHeight;
            }
          } else {
            var columnToHideWidth = _xLastVisibleColumnWidth(cfg);
            if (columnToHideWidth !== 0 && deltaX < -1 * columnToHideWidth) {
              $widthDivContainer.scrollLeft($widthDivContainer.scrollLeft() - (_xColumnScrollStep(cfg) + 1));
              cfg._currentTouch.X += columnToHideWidth;
            }
          }
          event.preventDefault();
          event.stopPropagation();
        }
      }

      function _touchEnd(event) {
         var cfg = event.data;
         cfg._currentTouch = null;
      }

      function _reSize(event) {
        var cfg = event.data;
        if (cfg.resizeTimer === null) {
          _countScrollables(cfg); //count before detaching ! (uses parent)
          if (cfg.scrollableRows == 'auto' || cfg.autorows) {
            if(!cfg.vbar)
              _yInitScroll(cfg);
            _yUpdateRowsVisibility(cfg);
            _yUpdateScrollHeights(cfg);
            if (!cfg.autorows) {
              cfg.scrollableRows == 'auto';
              cfg.vbar = false;
            }
          }
          if (cfg.scrollableColumns == 'auto' || cfg.autocols) {
            if(!cfg.hbar)
              _xInitScroll(cfg);
            _xUpdateColumnsVisibility(cfg);
            _xUpdateScrollWidths(cfg);
            if (!cfg.autocols) {
              cfg.scrollableRows == 'auto';
              //TODO remove scrollbar bits
              cfg.hbar = false;
            }
          }
          cfg.resizeTimer = setTimeout(function() {
            cfg.resizeTimer = null;
          }, 333);
        }
      }

      //misc
      //setup for merged-cell processing
      function _setActualCellIndexes(cfg) {
        var rows = cfg.$table[0].rows,
           lastr = rows.length;

        for (var rowIndex = 0; rowIndex < lastr; rowIndex++) {
          var row = rows[rowIndex],
            lastc = row.cells.length,
            indAdjustments = row[CELL_SPAN_ADJUSTMENTS];
          if (!indAdjustments)
            indAdjustments = [];

          for (var cellIndex = 0; cellIndex < lastc; cellIndex++) {
            var prevCellEndsAt = cellIndex - 1;
            if (cellIndex > 0) {
              var $prevCell = $(row.cells[cellIndex - 1]);
              prevCellEndsAt = $prevCell[0][CELL_INDEX_DATA];
              if ($prevCell.attr('colspan')) {
                prevCellEndsAt += _getColSpan($prevCell) - 1;
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

            var span = $cell.attr('rowspan');
            if (span > 1) {
              for (var rowShift = rowIndex + 1; rowShift < rowIndex + span && rowShift < lastr; rowShift++) {
                var shiftedRow = rows[rowShift],
                  adjustments = shiftedRow[CELL_SPAN_ADJUSTMENTS];
                if (!adjustments)
                  adjustments = [];
                adjustments.push({
                  index: indexToSet,
                  adjustment: _getColSpan($cell)
                });
                shiftedRow[CELL_SPAN_ADJUSTMENTS] = adjustments;
              }
            }
          }
        }
      }

      function _getColSpan($cell) {
        if ($cell.data('scroll-span'))
          return $cell.data('scroll-span');

        if ($cell.attr('colspan'))
          return $cell.attr('colspan') * 1;

        return 1;
      }

      return this.each(function() {
        var $elem = $(this);
        if (!$elem.is('table'))
          return this;
        if ($.data(this, '_sg_config'))
          return this; //already bound

        var cfg = $.extend({}, defaults, {
          $table: $elem, //cache
          _columnsCount: -1,
          _currentTouch: null,
          startFrom: 0, //index of top displayed row
          hbar: false, //whether horz bar is displayed
          vbar: false, //whether vertical bar is displayed
          hscrollTimer: null,
          vscrollTimer: null,
          resizeTimer: null
        }, options || {});

        _ensureSettings(cfg); //set top/bottom fixed rows
        _countScrollables(cfg);

        _setActualCellIndexes(cfg); //arrange to manage merged cells

        _yInitScroll(cfg);
        _yUpdateScrollHeights(cfg);
        _xInitScroll(cfg);
        _xUpdateScrollWidths(cfg);

        if (cfg.scrollY)
            _yMoveScroll(cfg.scrollY, cfg);
        _yUpdateRowsVisibility(cfg);
        if (cfg.scrollX)
            _xMoveScroll(cfg.scrollX, cfg);
        _xUpdateColumnsVisibility(cfg);

        $elem.on('mousewheel', cfg, _tableMouseWheel)
          .on('DOMMouseScroll', cfg, _tableMouseWheel) // for Firefox
          .on('touchstart', cfg, _touchStart)
          .on('touchmove', cfg, _touchMove)
          .on('touchend', cfg, _touchEnd);
        $(window).on('resize', cfg, _reSize);

        $.data(this, '_sg_config', 'set'); //for duplication-check
        return this;
      });
    };

})(jQuery, window, document);
