/**
 * This file contains a Dojo AMD port of the Blockly library
 * @author Chris Jackson
 */

define([
        "dojo/_base/declare",
        "dojo/_base/lang",
        "dijit/layout/ContentPane",
        "dist/core"
    ],
    function (declare, lang, ContentPane, Blockly) {
        return declare(ContentPane, {
            style:"height:100%;width:100%",
            blockly: {
                collapse: true,
                trashcan: true,
                path:"../"
            },

            startup: function () {
                blocklyId = this.domNode.id;
                // Initialise Blockly
                Blockly.inject(document.getElementById(blocklyId), {
                    path: this.blockly.path,
                    collapse: this.blockly.collapse,
                    trashcan: this.blockly.trashcan
                });

                Blockly.Xml.domToWorkspace(Blockly.mainWorkspace, document.getElementById('go'));
            }
        });
    });
