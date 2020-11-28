'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
class Position {
  constructor(
    { column = 0, line = 1, index = 0 } = {
      column: 0,
      line: 0,
      index: 0
    }
  ) {
    this.column = column ?? 0;
    this.line = line ?? 1;
    this.index = index ?? 0;
  }
  /**
   * Advances Line Count and Position by a specific amount
   * @param {number} step
   */
  advanceLine(step = 1) {
    this.line++;
    this.index += step;
    this.column = 0;
  }
  /**
   * Advances Position by a specific amount
   * @param {number} step
   */
  advanceIndex(step = 1) {
    this.column += step;
    this.index += step;
  }
  toString() {
    return `Line ${this.line}, Column ${this.column}`;
  }
}
exports.default = Position;
