/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2011 Google Inc.
 * https://blockly.googlecode.com/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Library for creating scrollbars.
 * @author fraser@google.com (Neil Fraser)
 * @author Chris Jackson
 */
'use strict';

define([
        "dojo/_base/declare",
        "dojo/dom-construct"
    ],
    function (declare, domConstruct) {
        return declare([], {


            /**
             * Class for a pair of scrollbars.  Horizontal and vertical.
             * @param {!Blockly.Workspace} workspace Workspace to bind the scrollbars to.
             * @constructor
             */
            constructor: function (workspace) {
                this.workspace_ = workspace;
                this.oldHostMetrics_ = null;
                this.hScroll = new Blockly.Scrollbar(workspace, true, true);
                this.vScroll = new Blockly.Scrollbar(workspace, false, true);
                this.corner_ = Blockly.createSvgElement('rect',
                    {'height': Blockly.Scrollbar.scrollbarThickness,
                        'width': Blockly.Scrollbar.scrollbarThickness,
                        'style': 'fill: #fff'}, null);
                Blockly.Scrollbar.insertAfter_(this.corner_, workspace.getBubbleCanvas());
            },

            /**
             * Dispose of this pair of scrollbars.
             * Unlink from all DOM elements to prevent memory leaks.
             */
            dispose: function () {
                Blockly.unbindEvent_(this.onResizeWrapper_);
                this.onResizeWrapper_ = null;
                domConstruct.destroy(this.corner_);
                this.corner_ = null;
                this.workspace_ = null;
                this.oldHostMetrics_ = null;
                this.hScroll.dispose();
                this.hScroll = null;
                this.vScroll.dispose();
                this.vScroll = null;
            },

            /**
             * Recalculate both of the scrollbars' locations and lengths.
             * Also reposition the corner rectangle.
             */
            resize: function () {
                // Look up the host metrics once, and use for both scrollbars.
                var hostMetrics = this.workspace_.getMetrics();
                if (!hostMetrics) {
                    // Host element is likely not visible.
                    return;
                }

                // Only change the scrollbars if there has been a change in metrics.
                var resizeH = false;
                var resizeV = false;
                if (!this.oldHostMetrics_ ||
                    this.oldHostMetrics_.viewWidth != hostMetrics.viewWidth ||
                    this.oldHostMetrics_.viewHeight != hostMetrics.viewHeight ||
                    this.oldHostMetrics_.absoluteTop != hostMetrics.absoluteTop ||
                    this.oldHostMetrics_.absoluteLeft != hostMetrics.absoluteLeft) {
                    // The window has been resized or repositioned.
                    resizeH = true;
                    resizeV = true;
                } else {
                    // Has the content been resized or moved?
                    if (!this.oldHostMetrics_ ||
                        this.oldHostMetrics_.contentWidth != hostMetrics.contentWidth ||
                        this.oldHostMetrics_.viewLeft != hostMetrics.viewLeft ||
                        this.oldHostMetrics_.contentLeft != hostMetrics.contentLeft) {
                        resizeH = true;
                    }
                    if (!this.oldHostMetrics_ ||
                        this.oldHostMetrics_.contentHeight != hostMetrics.contentHeight ||
                        this.oldHostMetrics_.viewTop != hostMetrics.viewTop ||
                        this.oldHostMetrics_.contentTop != hostMetrics.contentTop) {
                        resizeV = true;
                    }
                }
                if (resizeH) {
                    this.hScroll.resize(hostMetrics);
                }
                if (resizeV) {
                    this.vScroll.resize(hostMetrics);
                }

                // Reposition the corner square.
                if (!this.oldHostMetrics_ ||
                    this.oldHostMetrics_.viewWidth != hostMetrics.viewWidth ||
                    this.oldHostMetrics_.absoluteLeft != hostMetrics.absoluteLeft) {
                    this.corner_.setAttribute('x', this.vScroll.xCoordinate);
                }
                if (!this.oldHostMetrics_ ||
                    this.oldHostMetrics_.viewHeight != hostMetrics.viewHeight ||
                    this.oldHostMetrics_.absoluteTop != hostMetrics.absoluteTop) {
                    this.corner_.setAttribute('y', this.hScroll.yCoordinate);
                }

                // Cache the current metrics to potentially short-cut the next resize event.
                this.oldHostMetrics_ = hostMetrics;
            },

            /**
             * Set the sliders of both scrollbars to be at a certain position.
             * @param {number} x Horizontal scroll value.
             * @param {number} y Vertical scroll value.
             */
            set: function (x, y) {
                /* HACK:
                 Two scrollbars are about to have their sliders moved.  Moving a scrollbar
                 will normally result in its onScroll function being called.  That function
                 will update the contents.  At issue is what happens when two scrollbars are
                 moved.  Calling onScroll twice may result in two rerenderings of the content
                 and increase jerkiness during dragging.
                 In the case of native scrollbars (currently used only by Firefox), onScroll
                 is called as an event, which means two separate renderings of the content are
                 performed.  However in the case of SVG scrollbars (currently used by all
                 other browsers), onScroll is called as a function and the browser only
                 rerenders the contents once at the end of the thread.
                 */
                if (Blockly.Scrollbar === Blockly.ScrollbarNative) {
                    // Native scrollbar mode.
                    // Set both scrollbars and suppress their two separate onScroll events.
                    this.hScroll.set(x, false);
                    this.vScroll.set(y, false);
                    // Redraw the surface once with the new settings for both scrollbars.
                    var xyRatio = {};
                    xyRatio.x = (this.hScroll.outerDiv_.scrollLeft /
                        this.hScroll.innerImg_.offsetWidth) || 0;
                    xyRatio.y = (this.vScroll.outerDiv_.scrollTop /
                        this.vScroll.innerImg_.offsetHeight) || 0;
                    this.workspace_.setMetrics(xyRatio);
                } else {
                    // SVG scrollbars.
                    // Set both scrollbars and allow each to call a separate onScroll execution.
                    this.hScroll.set(x, true);
                    this.vScroll.set(y, true);
                }
            }
        });
    });
