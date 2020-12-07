/**
 * @typedef {Object} PositionData
 * @property {Number} column
 * @property {Number} line
 * @property {Number} cursor
 */

/**
 * Keeps track of the line, cursor and position within a string.
 */
class TextPosition {
  /**
   * The options to override the default positions.
   * @param {PositionData} [data]
   */
  constructor(data = {}) {
    this.column = data.column ?? 0;
    this.cursor = data.cursor ?? 0;
    this.line = data.line ?? 1;
  }

  /**
   * Jumps **n** chars ahead
   * @param {Number} amount The amount of chars to jump ahead.
   */
  advanceCursor(amount = 1) {
    this.column += amount;
    this.cursor += amount;
  }

  /**
   * Jumps to the next line
   * @param {Number} length The length of the newline segment
   */
  advanceLine(length = 1) {
    ++this.line;
    this.column += length;
    this.cursor += length;
  }

  /**
   * Returns a string representation of the TextPosition.
   * @return {String} A string representation of the TextPosition.
   */
  toString() {
    return `Line: ${this.line}, Column: ${this.column}`;
  }
}

exports.default = TextPosition;
exports.TextPosition = TextPosition;
