class UnclosedStringError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnclosedStringError';
  }
}

class NewlineInStringError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NewlineInStringError';
  }
}

class UnclosedCodeBlockError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnclosedCodeBlockError';
  }
}

class NamelessFlagError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NamelessFlagError';
  }
}

class DuplicateFlagError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateFlagError';
  }
}

class FlagAssignmentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FlagAssignmentError';
  }
}

exports.DuplicateFlagError = DuplicateFlagError;
exports.FlagAssignmentError = FlagAssignmentError;
exports.NamelessFlagError = NamelessFlagError;
exports.UnclosedCodeBlockError = UnclosedCodeBlockError;
exports.UnclosedStringError = UnclosedStringError;
exports.NewlineInStringError = NewlineInStringError;
