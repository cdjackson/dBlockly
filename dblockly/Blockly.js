/**
 * This file contains a Dojo AMD port of the Blockly library
 * @author Chris Jackson
 */

define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dojo/dom-geometry",
        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane",
        "dijit/layout/AccordionContainer",
        "dist/core"
    ],
    function (declare, lang, domGeometry, Border, ContentPane, Accordion, Blockly) {
        return declare(Border, {
            design: 'sidebar',
            gutters: true,
            liveSplitters: true,
            style: "height:100%;width:100%;",
            blockly: {
                collapse: true,
                trashcan: true,
                path: "../"
            },

            postCreate: function () {
                this.blocklyPane = new ContentPane({
                    style: "height:100%;width:100%;padding:0px;border:none;",
                    region: "center",
                    splitter: true,
                    resize: function (size) {
                        domGeometry.setContentSize(this.domNode, size);
                        if (Blockly.svg != null) {
                            Blockly.svgResize();
                        }
                    }
                });
                this.addChild(this.blocklyPane);

                var acc = new Accordion({
                    style: "height:100%;width:300px;",
                    splitter: true,
                    region: 'leading'
                });

                var ruleList = new ContentPane({
                    title: "Rules"
                });
                acc.addChild(ruleList);
                var ruleList = new ContentPane({
                    title: "Rules"
                });
                acc.addChild(ruleList);
                this.addChild(acc);
                acc.startup();

            },
            startup: function () {
                this.inherited(arguments);
                // Initialise Blockly
                Blockly.inject(document.getElementById(this.blocklyPane.domNode.id), {
                    path: this.blockly.path,
                    collapse: this.blockly.collapse,
                    trashcan: this.blockly.trashcan
                });

                Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, document.getElementById('go'));

                this.resize();
            }
        });
    });
