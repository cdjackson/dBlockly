/**
 * @license
 * Visual Blocks Editor
 *
 * Copyright 2012 Google Inc.
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
 * @fileoverview Utility functions for generating executable code from
 * Blockly code.
 * @author fraser@google.com (Neil Fraser)
 */
'use strict';

/**
 * Class for a code generator that translates the blocks into a language.
 * @param {string} name Language name of this generator.
 * @constructor
 */
Blockly.Generator = function (name) {
    this.name_ = name;
    this.RESERVED_WORDS_ = '';
};

/**
 * Category to separate generated function names from variables and procedures.
 */
Blockly.Generator.NAME_TYPE = 'generated_function';

/**
 * Generate code for all blocks in the workspace to the specified language.
 * @return {string} Generated code.
 */
Blockly.Generator.prototype.workspaceToCode = function () {
    var code = [];
    this.init();
    var blocks = Blockly.mainWorkspace.getTopBlocks(true);
    for (var x = 0, block; block = blocks[x]; x++) {
        var line = this.blockToCode(block);
        if (line instanceof Array) {
            // Value blocks return tuples of code and operator order.
            // Top-level blocks don't care about operator order.
            line = line[0];
        }
        if (line) {
            if (block.outputConnection && this.scrubNakedValue) {
                // This block is a naked value.  Ask the language's code generator if
                // it wants to append a semicolon, or something.
                line = this.scrubNakedValue(line);
            }
            code.push(line);
        }
    }
    code = code.join('\n');  // Blank line between each section.
    code = this.finish(code);
    // Final scrubbing of whitespace.
    code = code.replace(/^\s+\n/, '');
    code = code.replace(/\n\s+$/, '\n');
    code = code.replace(/[ \t]+\n/g, '\n');
    return code;
};

// The following are some helpful functions which can be used by multiple
// languages.

/**
 * Prepend a common prefix onto each line of code.
 * @param {string} text The lines of code.
 * @param {string} prefix The common prefix.
 * @return {string} The prefixed lines of code.
 */
Blockly.Generator.prototype.prefixLines = function (text, prefix) {
    return prefix + text.replace(/\n(.)/g, '\n' + prefix + '$1');
};

/**
 * Recursively spider a tree of blocks, returning all their comments.
 * @param {!Blockly.Block} block The block from which to start spidering.
 * @return {string} Concatenated list of comments.
 */
Blockly.Generator.prototype.allNestedComments = function (block) {
    var comments = [];
    var blocks = block.getDescendants();
    for (var x = 0; x < blocks.length; x++) {
        var comment = blocks[x].getCommentText();
        if (comment) {
            comments.push(comment);
        }
    }
    // Append an empty string to create a trailing line break when joined.
    if (comments.length) {
        comments.push('');
    }
    return comments.join('\n');
};

/**
 * Generate code for the specified block (and attached blocks).
 * @param {Blockly.Block} block The block to generate code for.
 * @return {string|!Array} For statement blocks, the generated code.
 *     For value blocks, an array containing the generated code and an
 *     operator order value.  Returns '' if block is null.
 */
Blockly.Generator.prototype.blockToCode = function (block) {
    if (!block) {
        return '';
    }
    if (block.disabled) {
        // Skip past this block if it is disabled.
        var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
        return this.blockToCode(nextBlock);
    }

    var func = this[block.type];
    if (!func) {
        throw 'Language "' + this.name_ + '" does not know how to generate code ' +
            'for block type "' + block.type + '".';
    }
    // First argument to func.call is the value of 'this' in the generator.
    // Prior to 24 September 2013 'this' was the only way to access the block.
    // The current prefered method of accessing the block is through the second
    // argument to func.call, which becomes the first parameter to the generator.
    var code = func.call(block, block);
    if (code instanceof Array) {
        // Value blocks return tuples of code and operator order.
        return [this.scrub_(block, code[0]), code[1]];
    } else {
        return this.scrub_(block, code);
    }
};

/**
 * Generate code representing the specified value input.
 * @param {!Blockly.Block} block The block containing the input.
 * @param {string} name The name of the input.
 * @param {number} order The maximum binding strength (minimum order value)
 *     of any operators adjacent to "block".
 * @return {string} Generated code or '' if no blocks are connected or the
 *     specified input does not exist.
 */
Blockly.Generator.prototype.valueToCode = function (block, name, order) {
    if (isNaN(order)) {
        throw 'Expecting valid order from block "' + block.type + '".';
    }
    var targetBlock = block.getInputTargetBlock(name);
    if (!targetBlock) {
        return '';
    }
    var tuple = this.blockToCode(targetBlock);
    if (tuple === '') {
        // Disabled block.
        return '';
    }
    if (!(tuple instanceof Array)) {
        // Value blocks must return code and order of operations info.
        // Statement blocks must only return code.
        throw 'Expecting tuple from value block "' + targetBlock.type + '".';
    }
    var code = tuple[0];
    var innerOrder = tuple[1];
    if (isNaN(innerOrder)) {
        throw 'Expecting valid order from value block "' + targetBlock.type + '".';
    }
    if (code && order <= innerOrder) {
        if (order == innerOrder || (order == 0 || order == 99)) {
            // 0 is the atomic order, 99 is the none order.  No parentheses needed.
            // In all known languages multiple such code blocks are not order
            // sensitive.  In fact in Python ('a' 'b') 'c' would fail.
        } else {
            // The operators outside this code are stonger than the operators
            // inside this code.  To prevent the code from being pulled apart,
            // wrap the code in parentheses.
            // Technically, this should be handled on a language-by-language basis.
            // However all known (sane) languages use parentheses for grouping.
            code = '(' + code + ')';
        }
    }
    return code;
};

/**
 * Generate code representing the statement.  Indent the code.
 * @param {!Blockly.Block} block The block containing the input.
 * @param {string} name The name of the input.
 * @return {string} Generated code or '' if no blocks are connected.
 */
Blockly.Generator.prototype.statementToCode = function (block, name) {
    var targetBlock = block.getInputTargetBlock(name);
    var code = this.blockToCode(targetBlock);
    if (!typeof code == "string") {
        // Value blocks must return code and order of operations info.
        // Statement blocks must only return code.
        throw 'Expecting code from statement block "' + targetBlock.type + '".';
    }
    if (code) {
        code = this.prefixLines(/** @type {string} */ (code), '  ');
    }
    return code;
};

/**
 * Add one or more words to the list of reserved words for this language.
 * @param {string} words Comma-separated list of words to add to the list.
 *     No spaces.  Duplicates are ok.
 */
Blockly.Generator.prototype.addReservedWords = function (words) {
    this.RESERVED_WORDS_ += words + ',';
};

/**
 * This is used as a placeholder in functions defined using
 * Blockly.Generator.provideFunction_.  It must not be legal code that could
 * legitimately appear in a function definition (or comment), and it must
 * not confuse the regular expression parser.
 */
Blockly.Generator.prototype.FUNCTION_NAME_PLACEHOLDER_ = '{leCUI8hutHZI4480Dc}';
Blockly.Generator.prototype.FUNCTION_NAME_PLACEHOLDER_REGEXP_ =
    new RegExp(Blockly.Generator.prototype.FUNCTION_NAME_PLACEHOLDER_, 'g');

/**
 * Define a function to be included in the generated code.
 * The first time this is called with a given desiredName, the code is
 * saved and an actual name is generated.  Subsequent calls with the
 * same desiredName have no effect but have the same return value.
 *
 * It is up to the caller to make sure the same desiredName is not
 * used for different code values.
 *
 * The code gets output when Blockly.Generator.finish() is called.
 *
 * @param {string} desiredName The desired name of the function (e.g., isPrime).
 * @param {!Array.<string>} code A list of Python statements.
 * @return {string} The actual name of the new function.  This may differ
 *     from desiredName if the former has already been taken by the user.
 * @private
 */
Blockly.Generator.prototype.provideFunction_ = function (desiredName, code) {
    if (!this.definitions_[desiredName]) {
        var functionName =
            this.variableDB_.getDistinctName(desiredName, this.NAME_TYPE);
        this.functionNames_[desiredName] = functionName;
        this.definitions_[desiredName] = code.join('\n').replace(
            this.FUNCTION_NAME_PLACEHOLDER_REGEXP_, functionName);
    }
    return this.functionNames_[desiredName];
};
