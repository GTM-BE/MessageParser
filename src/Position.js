module.exports.Position = class Position {
  constructor(data = {}) {
    this.column = data.column ?? 0;
    this.line = data.line ?? 1;
    this.index = data.index ?? 0;
  }

  advanceLine(step = 1) {
    this.line++;
    this.index += step;
    this.column = 0;
  }

  advanceIndex(step = 1) {
    this.column += step;
    this.index += step;
  }

  toString() {
    return `Line ${this.line}, Column ${this.column}`;
  }
};
