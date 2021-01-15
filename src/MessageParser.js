const { TextPosition } = require('./TextPosition');

const {
  UnclosedCodeBlockError,
  NamelessFlagError,
  FlagAssignmentError,
  DuplicateFlagError,
  NewlineInStringError,
  UnclosedStringError
} = require('./ParserErrors');

/**
 * @typedef {("Code"|"String"|"Whitespace"|"Newline"|"FlagStart"|"FlagNegator"|"FlagAssignment")} MarkerGroup
 */

/**
 * @typedef {Object} Marker
 * @property {String} start
 * @property {String} [end]
 * @property {MarkerGroup} group
 */

/**
 * @typedef {Object} MarkerOptions
 * @property {Array.<Marker>} contentMarkers Defines the start (and end) of
 * content types. For example what the start of a string should look like.
 * @property {Array.<Marker>} segmentMarkers Defines possible segments for
 * a known content type. For example what a flag assignment should look like.
 */

/**
 * @typedef {Object} ParserOptions
 * @property {MarkerOptions} markers
 */

/**
 * The types that parsed data can have.
 * @typedef {String|Number|Boolean} ParsedData
 */

/**
 * The raw arguments (Anything but Flags and Whitespace) that were parsed.
 * @typedef {Array.<ParsedData>} Arguments
 */

/**
 * @typedef {Object.<string, ParserResult>} Flags
 */

/**
 * @typedef {Object} ParserResult
 * @property {Arguments} args
 * @property {Flags} flags
 */

/**
 * Default content markers.
 * @type Array.<Marker>
 */
const contentMarkers = [
  {
    start: '```',
    group: 'Code'
  },
  {
    start: '`',
    group: 'String'
  },
  {
    start: '"',
    group: 'String'
  },
  {
    start: "'",
    group: 'String'
  },
  {
    start: '“',
    end: '”',
    group: 'String'
  },
  {
    start: ' ',
    group: 'Whitespace'
  },
  {
    start: '\t',
    group: 'Whitespace'
  },
  {
    start: '\n',
    group: 'Newline'
  },
  {
    start: '--',
    group: 'FlagStart'
  },
  {
    start: '—',
    group: 'FlagStart'
  }
];

const segmentMarkers = [
  {
    start: '!',
    group: 'FlagNegator'
  },
  {
    start: ':',
    group: 'FlagAssignment'
  },
  {
    start: '=',
    group: 'FlagAssignment'
  }
];

/**
 * Turns a string into a set of flags and arguments.
 */
class MessageParser {
  /**
   * Constructor for the MessageParser class
   * @param {ParserOptions} options Options for the parser.
   */
  constructor(options = {}) {
    this.contentMarkers = contentMarkers;
    this.segmentMarkers = segmentMarkers;

    if (options) {
      if (options.markers && options.markers.contentMarkers) {
        options.markers.contentMarkers.forEach(({ start, end, group }) => {
          const dupeIndex = this.contentMarkers.findIndex(
            (marker) => marker.start === start
          );

          if (dupeIndex !== -1) {
            this.contentMarkers[dupeIndex] = {
              start,
              end,
              group
            };
          } else {
            this.contentMarkers.push({
              start,
              end,
              group
            });
          }
        });
      }

      if (options.markers && options.markers.segmentMarkers) {
        options.markers.segmentMarkers.forEach(({ start, group }) => {
          const dupeIndex = this.segmentMarkers.findIndex(
            (marker) => marker.start === start
          );

          if (dupeIndex !== -1) {
            this.segmentMarkers[dupeIndex] = {
              start,
              group
            };
          } else {
            this.segmentMarkers.push({
              start,
              group
            });
          }
        });
      }
    }

    this.indexMarkerGroups();
  }

  /**
   * Parses the given data.
   * @param {string} content The data to parse
   * @return {ParserResult} The parsed data.
   */
  parse(content = '') {
    this.content = content;

    /**
     * @type Arguments
     */
    this.args = [];

    /**
     * @type Flags
     */
    this.flags = {};

    /**
     * Shortcut to make sure that we don't waste time setting up the parsing.
     * Instead we just return an empty ParserResult
     */
    if (!this.content || !this.content.trim()) {
      return {
        args: this.args,
        flags: this.flags
      };
    }

    this.textPosition = new TextPosition();

    while (this.hasNext() && this.getCurrentCharacter()) {
      /**
       * @type Marker
       */
      let matchedContentMarker;

      for (const marker of this.contentMarkers) {
        if (
          !this.isEscaped() &&
          this.getStringForRange(marker.start) === marker.start
        ) {
          matchedContentMarker = marker;
          break;
        }
      }

      if (matchedContentMarker && matchedContentMarker.group) {
        switch (matchedContentMarker.group) {
          case 'Whitespace': {
            this.handleWhitespace(matchedContentMarker);
            break;
          }
          case 'Newline': {
            this.handleNewline(matchedContentMarker);
            break;
          }
          case 'String': {
            this.args.push(this.handleString(matchedContentMarker));
            break;
          }
          case 'Code': {
            this.args.push(this.handleCode(matchedContentMarker));
            break;
          }
          case 'FlagStart': {
            this.handleFlag(matchedContentMarker);
            break;
          }
          default: {
            this.handleArgument();
            break;
          }
        }
      } else {
        this.handleArgument();
      }
    }

    return {
      args: this.args,
      flags: this.flags
    };
  }

  /**
   * Parses any sequence of characters that isn't a whitespace or newline.
   */
  handleArgument() {
    const start = this.textPosition.cursor;

    while (this.hasNext() && this.getCurrentCharacter()) {
      if (this.checkAgainstIndexedGroups('Whitespace', 'Newline')) {
        break;
      } else {
        this.textPosition.advanceCursor();
      }
    }

    const out = this.content.slice(start, this.textPosition.cursor);

    if (
      new RegExp(
        `^\\\\(?:${this.indexedGroups.contentMarkers.Whitespace.join(
          '|'
        )}|${this.indexedGroups.contentMarkers.Newline.join('|')}|$)`
      ).test(out)
    ) {
      this.args.push('\\');
    } else {
      this.args.push(
        out.replace(/^\\.{1,}/, (match) => match.replace(/^\\/, ''))
      );
    }
  }

  /**
   * Skips whitespace until its end is found.
   * @param {Marker} marker
   */
  handleWhitespace(marker) {
    while (this.hasNext()) {
      if (this.getStringForRange(marker.start) === marker.start) {
        this.textPosition.advanceCursor(marker.start.length);
      } else {
        break;
      }
    }
  }

  /**
   * Jumps to the next line.
   * @param {Marker} marker
   */
  handleNewline(marker) {
    this.textPosition.advanceLine(marker.start.length);
    return;
  }

  /**
   * Parses a string
   * @param {Marker} marker
   * @return {String} The parsed string data
   */
  handleString(marker) {
    const start = this.textPosition.cursor;

    const startQuote = marker.start;
    const endQuote = marker.end || marker.start;

    this.textPosition.advanceCursor(startQuote.length);

    if (!this.hasNext() || !this.getCurrentCharacter()) {
      throw new UnclosedStringError(
        `**__Dangling Quote found at the end of the Input__**\n\n${
          this.textPosition
        }: ${this.content.slice(0, start)}**${this.content.slice(start)}**`
      );
    }

    const contentStartPos = this.textPosition.cursor;

    while (this.hasNext()) {
      if (!this.getCurrentCharacter()) {
        throw new UnclosedStringError(
          `**Unclosed String found__**\n\n${
            this.textPosition
          }: ${this.content.slice(0, start)}**${this.content.slice(start)}**`
        );
      } else if (this.checkAgainstIndexedGroups('Newline')) {
        throw new NewlineInStringError(
          `**__Linebreak in String found__**\n\n${
            this.textPosition
          }: ${this.content.slice(0, start)}**${this.content.slice(
            start,
            this.textPosition.cursor
          )}**`
        );
      } else if (
        !this.isEscaped() &&
        this.getStringForRange(endQuote) === endQuote
      ) {
        const contentEndPos = this.textPosition.cursor;
        this.textPosition.advanceCursor(endQuote.length);

        return this.content
          .slice(contentStartPos, contentEndPos)
          .replace(RegExp(`\\\\${endQuote}`, 'g'), endQuote)
          .trim();
      } else {
        this.textPosition.advanceCursor();
      }
    }
  }

  /**
   * Parses a code block.
   * @param {Marker} marker
   * @return {string} Parsed Codeblock Data
   */
  handleCode(marker) {
    const start = this.textPosition.cursor;

    const startQuote = marker.start;
    const endQuote = marker.end || marker.start;

    this.textPosition.advanceCursor(startQuote.length);

    if (!this.hasNext() || !this.getCurrentCharacter()) {
      throw new UnclosedCodeBlockError(
        `**__Dangling Codeblock Start found at the end of the Input__**\n\n${
          this.textPosition
        }: ${this.content.slice(0, start)}**${this.content.slice(start)}**`
      );
    }

    while (this.hasNext()) {
      if (!this.getCurrentCharacter()) {
        throw new UnclosedCodeBlockError(
          `**__Unclosed Code Block found__**\n\n${
            this.textPosition
          }: ${this.content.slice(0, start)}**${this.content.slice(start)}**`
        );
      } else if (
        !this.isEscaped() &&
        this.getStringForRange(endQuote) === endQuote
      ) {
        this.textPosition.advanceCursor(endQuote.length);

        return this.content
          .slice(start, this.textPosition.cursor)
          .replace(RegExp(`\\\\${endQuote}`, 'g'), endQuote);
      } else {
        this.textPosition.advanceCursor();
      }
    }
  }

  /**
   * Parses a Flag.
   * @param {Marker} marker
   */
  handleFlag(marker) {
    const flagStartPos = this.textPosition.cursor;
    this.textPosition.advanceCursor(marker.start.length);

    if (
      !this.getCurrentCharacter() ||
      this.checkAgainstIndexedGroups('Newline', 'Whitespace')
    ) {
      this.args.push(
        this.content.slice(flagStartPos, this.textPosition.cursor)
      );

      return;
    }

    let isShortHandFlag = false;

    const negatedMarker = this.checkAgainstIndexedGroups('FlagNegator');

    if (negatedMarker) {
      this.textPosition.advanceCursor(negatedMarker.start.length);
      isShortHandFlag = true;
    }

    if (
      isShortHandFlag &&
      (!this.hasNext() ||
        !this.getCurrentCharacter() ||
        this.checkAgainstIndexedGroups('Whitespace', 'Newline'))
    ) {
      throw new NamelessFlagError(
        `**__Flag without Name found__**\n\n${
          this.textPosition
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.textPosition.cursor
        )}**${this.content.slice(this.textPosition.cursor)}`
      );
    }

    const flagDescriptorStart = this.textPosition.cursor;

    let hasAssignment = false;
    let assignmentMarker;

    while (this.hasNext()) {
      if (
        !this.getCurrentCharacter() ||
        this.checkAgainstIndexedGroups('Whitespace', 'Newline')
      ) {
        break;
      } else if (this.checkAgainstIndexedGroups('FlagAssignment')) {
        assignmentMarker = this.checkAgainstIndexedGroups('FlagAssignment');
        hasAssignment = true;
        break;
      } else {
        this.textPosition.advanceCursor();
      }
    }

    const flagDescriptor = this.content.slice(
      flagDescriptorStart,
      this.textPosition.cursor
    );

    if (flagDescriptor in this.flags) {
      throw new DuplicateFlagError(
        `**__Duplicate Flag '${flagDescriptor}' found__**\n\n${
          this.textPosition
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.textPosition.cursor
        )}**${this.content.slice(this.textPosition.cursor)}`
      );
    }

    if (!hasAssignment) {
      this.flags[flagDescriptor] = !isShortHandFlag;
      return;
    }

    if (flagDescriptorStart === this.textPosition.cursor) {
      if (isShortHandFlag) {
        throw new NamelessFlagError(
          `**__Shorthand flag without name and with assignment found__**\n\n${
            this.textPosition
          }:  ${this.content.slice(0, flagStartPos)}**${this.content.slice(
            flagStartPos,
            this.textPosition.cursor + assignmentMarker.start.length
          )}**${this.content.slice(
            this.textPosition.cursor + assignmentMarker.start.length
          )}`
        );
      } else {
        throw new NamelessFlagError(
          `**__Flag without Name found__**\n\n${
            this.textPosition
          }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
            flagStartPos,
            this.textPosition.cursor + assignmentMarker.start.length
          )}**${this.content.slice(
            this.textPosition.cursor + assignmentMarker.start.length
          )}`
        );
      }
    }

    if (isShortHandFlag) {
      throw new FlagAssignmentError(
        `**__Illegal Negator found in Flag with Assignment__**\n\n${
          this.textPosition
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.textPosition.cursor + assignmentMarker.start.length
        )}**${this.content.slice(
          this.textPosition.cursor + assignmentMarker.start.length
        )}`
      );
    }

    this.textPosition.advanceCursor(assignmentMarker.start.length);

    if (
      !this.getCurrentCharacter() ||
      this.checkAgainstIndexedGroups('Newline', 'Whitespace')
    ) {
      throw new FlagAssignmentError(
        `**__Incorrect Flag Value Assignment found__**\n\n${
          this.textPosition
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.textPosition.cursor
        )}**${this.content.slice(this.textPosition.cursor)}`
      );
    }

    const flagValueSectionStart = this.textPosition.cursor;

    if (this.checkAgainstIndexedGroups('Code')) {
      this.flags[flagDescriptor] = this.handleCode(
        this.checkAgainstIndexedGroups('Code')
      );
    } else if (this.checkAgainstIndexedGroups('String')) {
      this.flags[flagDescriptor] = this.handleString(
        this.checkAgainstIndexedGroups('String')
      );
    } else {
      while (this.hasNext()) {
        if (
          !this.getCurrentCharacter() ||
          this.checkAgainstIndexedGroups('Newline', 'Whitespace')
        ) {
          let flagValue = this.content.slice(
            flagValueSectionStart,
            this.textPosition.cursor
          );
          if (/true/i.test(flagValue)) {
            flagValue = true;
          } else if (/false/i.test(flagValue)) {
            flagValue = false;
          }
          this.flags[flagDescriptor] = flagValue;
          break;
        } else {
          this.textPosition.advanceCursor();
        }
      }
    }
  }

  /**
   * Checks whether the previous character was a backslash.
   * @return {boolean}
   */
  isEscaped() {
    return this.content[this.textPosition.cursor - 1] === '\\';
  }

  /**
   *
   * @param  {...MarkerGroup} groups
   * @return {Marker|null}
   */
  checkAgainstIndexedGroups(...groups) {
    for (const group of groups) {
      if (['FlagAssignment', 'FlagNegator'].includes(group)) {
        /**
         * @type string
         */
        const matchedSequence = (
          this.indexedGroups.segmentMarkers[group] ?? []
        ).find(
          (character) =>
            !this.isEscaped() && this.getStringForRange(character) === character
        );

        if (matchedSequence) {
          return this.segmentMarkers.find(
            (marker) => marker.start === matchedSequence
          );
        }
      } else {
        /**
         * @type string
         */
        const matchedSequence = (
          this.indexedGroups.contentMarkers[group] ?? []
        ).find(
          (character) =>
            !this.isEscaped() && this.getStringForRange(character) === character
        );

        if (matchedSequence) {
          return this.contentMarkers.find(
            (marker) => (marker.start || marker.end) === matchedSequence
          );
        }
      }
    }

    return null;
  }

  /**
   * Returns a string for the current position depending on the length
   *  of the range. This is used to check if the current position matches
   * a specific marker.
   * @param {String|Number} range
   * @return {String} The sliced string
   */
  getStringForRange(range) {
    return this.content.slice(
      this.textPosition.cursor,
      this.textPosition.cursor +
        Number(typeof range === 'string' ? range.length : range)
    );
  }

  /**
   * Returns the character at the current position.
   * @return {String}
   */
  getCurrentCharacter() {
    return this.content[this.textPosition.cursor];
  }

  /**
   * Returns whether we have reached the end of the input.
   * @return {Boolean}
   */
  hasNext() {
    return this.content.length >= this.textPosition.cursor;
  }

  /**
   * Turns the sets of segment and content markers into an
   * indexed object where each group has an array of possible starts.
   * This is used to find out if the next **n** chars come from a specific
   * group.
   */
  indexMarkerGroups() {
    this.indexedGroups = {
      contentMarkers: {},
      segmentMarkers: {}
    };

    this.contentMarkers.forEach(({ start, group }) => {
      if (!this.indexedGroups.contentMarkers[group]) {
        this.indexedGroups.contentMarkers[group] = [start];
      } else {
        this.indexedGroups.contentMarkers[group].push(start);
      }
    });

    this.segmentMarkers.forEach(({ start, group }) => {
      if (!this.indexedGroups.segmentMarkers[group]) {
        this.indexedGroups.segmentMarkers[group] = [start];
      } else {
        this.indexedGroups.segmentMarkers[group].push(start);
      }
    });
  }
}

exports.default = MessageParser;
exports.MessageParser = MessageParser;
exports.contentMarkers = contentMarkers;
exports.segmentMarkers = segmentMarkers;
