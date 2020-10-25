const { Position } = require('./Position');

module.exports.MessageParser = class MessageParser {
  constructor(content = '') {
    this.content = content;
    this.position = new Position();

    this.out = {
      args: [],
      flags: {}
    };

    this.contentMarkers = [
      {
        character: '```',
        group: 'Code'
      },
      {
        character: '`',
        group: 'String'
      },
      {
        character: '"',
        group: 'String'
      },
      {
        character: "'",
        group: 'String'
      },
      {
        character: ['“', '”'],
        group: 'String'
      },
      {
        character: ' ',
        group: 'Whitespace'
      },
      {
        character: '\t',
        group: 'Whitespace'
      },
      {
        character: '\n',
        group: 'Newline'
      },
      {
        character: '--',
        group: 'Flag'
      },
      {
        character: '—',
        group: 'Flag'
      }
    ];

    this.dataMarkers = [
      {
        character: '!',
        group: 'Negator'
      },
      {
        character: ':',
        group: 'FlagAssignment'
      },
      {
        character: '=',
        group: 'FlagAssignment'
      }
    ];

    this.staticCharacterSets = this.buildStaticCharacterSets();

    while (this.hasNext() && this.getCurrentCharacter()) {
      let match;

      for (const set of this.contentMarkers) {
        const [start] = Array.isArray(set.character)
          ? set.character
          : [set.character];

        if (
          !this.isEscaped() &&
          this.content.slice(
            this.position.index,
            this.position.index + start.length
          ) === start
        ) {
          match = set;
          break;
        }
      }

      this[`handle${[match?.group ?? 'Argument']}`](match);
    }

    return this.out;
  }

  handleFlag(matchedEntry = {}) {
    const flagStartPos = this.position.index;

    const [start] = Array.isArray(matchedEntry.character)
      ? matchedEntry.character
      : [matchedEntry.character];

    this.position.advanceIndex(start.length);

    if (
      !this.hasNext() ||
      !this.getCurrentCharacter() ||
      this.testAgainstCharacterSet('Whitespace') ||
      this.testAgainstCharacterSet('Newline')
    ) {
      this.out.args.push(this.content.slice(flagStartPos, this.position.index));
      return;
    }

    let isShortHandFlag = false;

    if (this.testAgainstCharacterSet('Negator')) {
      this.position.advanceIndex(
        this.testAgainstCharacterSet('Negator').length
      );
      isShortHandFlag = true;
    }

    if (
      isShortHandFlag &&
      (!this.hasNext() ||
        !this.getCurrentCharacter() ||
        this.testAgainstCharacterSet('Whitespace') ||
        this.testAgainstCharacterSet('Newline'))
    ) {
      throw new Error(
        `**__Flag without Name found__**\n\n${
          this.position
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.position.index
        )}**${this.content.slice(this.position.index)}`
      );
    }

    const flagDescriptorStart = this.position.index;
    let hasAssignment;

    while (this.hasNext()) {
      if (
        !this.getCurrentCharacter() ||
        this.testAgainstCharacterSet('Whitespace') ||
        this.testAgainstCharacterSet('Newline')
      ) {
        break;
      } else if (this.testAgainstCharacterSet('FlagAssignment')) {
        hasAssignment = true;
        break;
      } else {
        this.position.advanceIndex();
      }
    }

    const flagDescriptor = this.content.slice(
      flagDescriptorStart,
      this.position.index
    );

    if (flagDescriptor in this.out.flags) {
      throw new Error(
        `**__Duplicate Flag '${flagDescriptor}' found__**\n\n${
          this.position
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.position.index
        )}**${this.content.slice(this.position.index)}`
      );
    }

    if (!hasAssignment) {
      this.out.flags[flagDescriptor] = !isShortHandFlag;
      return;
    }

    if (flagDescriptorStart === this.position.index && isShortHandFlag) {
      throw new Error(
        `**__Flag without Name found that also contains an illegal Negator__**\n\n${
          this.position
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.position.index +
            this.testAgainstCharacterSet('FlagAssignment').length
        )}**${this.content.slice(
          this.position.index +
            this.testAgainstCharacterSet('FlagAssignment').length
        )}`
      );
    } else if (flagDescriptorStart === this.position.index) {
      throw new Error(
        `**__Flag without Name found__**\n\n${
          this.position
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.position.index +
            this.testAgainstCharacterSet('FlagAssignment').length
        )}**${this.content.slice(
          this.position.index +
            this.testAgainstCharacterSet('FlagAssignment').length
        )}`
      );
    } else if (isShortHandFlag) {
      throw new Error(
        `**__Illegal Negator found in Flag with Assignment__**\n\n${
          this.position
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.position.index +
            this.testAgainstCharacterSet('FlagAssignment').length
        )}**${this.content.slice(
          this.position.index +
            this.testAgainstCharacterSet('FlagAssignment').length
        )}`
      );
    }

    this.position.advanceIndex(
      this.testAgainstCharacterSet('FlagAssignment').length
    );

    if (
      !this.getCurrentCharacter() ||
      this.testAgainstCharacterSet('Newline') ||
      this.testAgainstCharacterSet('Whitespace')
    ) {
      throw new Error(
        `**__Incorrect Flag Value Assignment found__**\n\n${
          this.position
        }: ${this.content.slice(0, flagStartPos)}**${this.content.slice(
          flagStartPos,
          this.position.index
        )}**${this.content.slice(this.position.index)}`
      );
    }

    const flagValueSectionStart = this.position.index;

    if (this.testAgainstCharacterSet('Code')) {
      const markerSet = this.testAgainstCharacterSet('Code');

      let [startQuote, endQuote] = Array.isArray(markerSet)
        ? markerSet
        : [markerSet, markerSet];

      if (!endQuote) endQuote = startQuote;

      const startPos = this.position.index;

      this.position.advanceIndex(startQuote.length);

      if (!this.hasNext() || !this.getCurrentCharacter()) {
        throw new Error(
          `**__Flag with Dangling CodeBlock Start found at the end of the Input__**\n\n${
            this.position
          }: ${this.content.slice(0, startPos)}**${this.content.slice(
            startPos
          )}**`
        );
      }

      while (this.hasNext()) {
        if (!this.getCurrentCharacter()) {
          throw new Error(
            `**__Flag with Unclosed CodeBlock found__**\n\n${
              this.position
            }: ${this.content.slice(0, startPos)}**${this.content.slice(
              startPos
            )}**`
          );
        } else if (
          this.content.slice(
            this.position.index,
            this.position.index + endQuote.length
          ) === endQuote &&
          !this.isEscaped()
        ) {
          this.position.advanceIndex(endQuote.length);
          this.out.flags[flagDescriptor] = this.content.slice(
            startPos,
            this.position.index
          );
          break;
        } else {
          this.position.advanceIndex();
        }
      }
    } else if (this.testAgainstCharacterSet('String')) {
      const foundMatch = this.testAgainstCharacterSet('String');

      let [stringStart, stringEnd] = Array.isArray(foundMatch)
        ? foundMatch
        : [foundMatch, foundMatch];

      if (!stringEnd) stringEnd = stringStart;

      const stringStartPos = this.position.index;

      this.position.advanceIndex(stringStart.length);

      if (!this.hasNext() || !this.getCurrentCharacter()) {
        throw new Error(
          `**__Flag with dangling Quote found at the end of the Input__**\n\n${
            this.position
          }: ${this.content.slice(0, stringStartPos)}**${this.content.slice(
            stringStartPos
          )}**`
        );
      }

      const contentStartPos = this.position.index;

      while (this.hasNext()) {
        if (!this.getCurrentCharacter()) {
          throw new Error(
            `**__Flag with unclosed Quote found__**\n\n${
              this.position
            }: ${this.content.slice(0, stringStartPos)}**${this.content.slice(
              stringStartPos
            )}**`
          );
        } else if (this.testAgainstCharacterSet('Newline')) {
          throw new Error(
            `*__Flag with illegal Newline found in String__**\n\n${
              this.position
            }: ${this.content.slice(0, stringStartPos)}**${this.content.slice(
              stringStartPos,
              this.position.index
            )}**`
          );
        } else if (
          this.content.slice(
            this.position.index,
            this.position.index + stringEnd.length
          ) === stringEnd &&
          !this.isEscaped()
        ) {
          let stringContent = this.content
            .slice(contentStartPos, this.position.index)
            .replace(RegExp(`\\\\${stringEnd}`, 'g'), stringEnd)
            .replace(RegExp(`\\\\${stringStart}`, 'g'), stringStart)
            .trim();

          if (/true/i.test(stringContent)) {
            stringContent = true;
          } else if (/false/i.test(stringContent)) {
            stringContent = false;
          }

          this.out.flags[flagDescriptor] = stringContent;

          this.position.advanceIndex(stringEnd.length);
          break;
        } else {
          this.position.advanceIndex();
        }
      }
    } else {
      while (this.hasNext()) {
        if (
          !this.getCurrentCharacter() ||
          this.testAgainstCharacterSet('Whitespace') ||
          this.testAgainstCharacterSet('Newline')
        ) {
          let flagValue = this.content.slice(
            flagValueSectionStart,
            this.position.index
          );

          if (/true/i.test(flagValue)) {
            flagValue = true;
          } else if (/false/i.test(flagValue)) {
            flagValue = false;
          }

          this.out.flags[flagDescriptor] = flagValue;
          break;
        } else {
          this.position.advanceIndex();
        }
      }
    }
  }

  handleWhitespace(matchedEntry = {}) {
    const [start] = Array.isArray(matchedEntry.character)
      ? matchedEntry.character
      : [matchedEntry.character];

    while (this.hasNext()) {
      if (
        this.content.slice(
          this.position.index,
          this.position.index + start.length
        ) === start
      ) {
        this.position.advanceIndex(start.length);
      } else break;
    }
  }

  isEscaped() {
    return this.content[this.position.index - 1] === '\\';
  }

  getCurrentCharacter() {
    return this.content[this.position.index];
  }

  handleString(matchedEntry = {}) {
    let [startQuote, endQuote] = Array.isArray(matchedEntry.character)
      ? matchedEntry.character
      : [matchedEntry.character, matchedEntry.character];

    if (!endQuote) endQuote = startQuote;

    const startPos = this.position.index;

    this.position.advanceIndex(startQuote.length);

    if (!this.hasNext() || !this.getCurrentCharacter()) {
      throw new Error(
        `**__Dangling Quote found at the end of the Input__**\n\n${
          this.position
        }: ${this.content.slice(0, startPos)}**${this.content.slice(
          startPos
        )}**`
      );
    }

    const contentStartPos = this.position.index;

    while (this.hasNext()) {
      if (!this.getCurrentCharacter()) {
        throw new Error(
          `**__Unclosed Quote found__**\n\n${
            this.position
          }: ${this.content.slice(0, startPos)}**${this.content.slice(
            startPos
          )}**`
        );
      } else if (this.testAgainstCharacterSet('Newline')) {
        throw new Error(
          `**__Illegal Newline found in String__**\n\n${
            this.position
          }: ${this.content.slice(0, startPos)}**${this.content.slice(
            startPos,
            this.position.index
          )}**`
        );
      } else if (
        this.content.slice(
          this.position.index,
          this.position.index + endQuote.length
        ) === endQuote &&
        !this.isEscaped()
      ) {
        this.out.args.push(
          this.content
            .slice(contentStartPos, this.position.index)
            .replace(RegExp(`\\\\${endQuote}`, 'g'), endQuote)
            .replace(RegExp(`\\\\${startQuote}`, 'g'), startQuote)
            .trim()
        );
        this.position.advanceIndex(endQuote.length);
        break;
      } else {
        this.position.advanceIndex();
      }
    }
  }

  handleArgument() {
    const startPos = this.position.index;
    this.position.advanceIndex();

    while (this.hasNext()) {
      if (
        this.testAgainstCharacterSet('Whitespace') ||
        this.testAgainstCharacterSet('Newline')
      ) {
        break;
      }
      this.position.advanceIndex();
    }

    this.out.args.push(
      this.content.slice(startPos, this.position.index).replace('\\', '')
    );

    return;
  }

  handleCode(matchedEntry = {}) {
    let [startQuote, endQuote] = Array.isArray(matchedEntry.character)
      ? matchedEntry.character
      : [matchedEntry.character, matchedEntry.character];

    if (!endQuote) endQuote = startQuote;

    const startPos = this.position.index;

    this.position.advanceIndex(startQuote.length);

    if (!this.hasNext() || !this.getCurrentCharacter()) {
      throw new Error(
        `**__Dangling CodeBlock Start found at the end of the Input__**\n\n${
          this.position
        }: ${this.content.slice(0, startPos)}**${this.content.slice(
          startPos
        )}**`
      );
    }

    while (this.hasNext()) {
      if (!this.getCurrentCharacter()) {
        throw new Error(
          `**__Unclosed CodeBlock found__**\n\n${
            this.position
          }: ${this.content.slice(0, startPos)}**${this.content.slice(
            startPos
          )}**`
        );
      } else if (
        this.content.slice(
          this.position.index,
          this.position.index + endQuote.length
        ) === endQuote &&
        !this.isEscaped()
      ) {
        this.position.advanceIndex(endQuote.length);
        this.out.args.push(
          this.content
            .slice(startPos, this.position.index)
            .replace(RegExp(`\\\\${endQuote}`, 'g'), endQuote)
            .replace(RegExp(`\\\\${startQuote}`, 'g'), startQuote)
        );
        break;
      } else {
        this.position.advanceIndex();
      }
    }
  }

  handleNewline(matchedEntry = {}) {
    const [start] = Array.isArray(matchedEntry.character)
      ? matchedEntry.character
      : [matchedEntry.character];
    this.position.advanceLine(start.length);
    return;
  }

  hasNext() {
    return this.content.length >= this.position.index;
  }

  buildStaticCharacterSets() {
    const res = {};
    [...this.contentMarkers, ...this.dataMarkers].forEach(
      ({ character, group }) => {
        const [start] = Array.isArray(character) ? character : [character];
        if (!res[group]) {
          res[group] = [start];
        } else res[group].push(start);
      }
    );

    return res;
  }

  testAgainstCharacterSet(type) {
    return (this.staticCharacterSets[type] ?? []).filter(
      (start) =>
        !this.isEscaped() &&
        this.content.slice(
          this.position.index,
          this.position.index + start.length
        ) === start
    )[0];
  }
};
