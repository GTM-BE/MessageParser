const { MessageParser } = require('../src/MessageParser');

const {
  UnclosedStringError,
  NewlineInStringError,
  UnclosedCodeBlockError,
  NamelessFlagError,
  DuplicateFlagError,
  FlagAssignmentError
} = require('../src/ParserErrors');

test('Arguments', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test test and test`)).toStrictEqual({
    args: ['test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Multiple Spaces', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test          test and test`)).toStrictEqual({
    args: ['test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Padded Content', () => {
  const parser = new MessageParser();

  expect(parser.parse(` test test and test`)).toStrictEqual({
    args: ['test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Backslashes before Whitespace', () => {
  const parser = new MessageParser();
  expect(parser.parse(`\\  test test and  test`)).toStrictEqual({
    args: ['\\', 'test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Backslashes before Newlines', () => {
  const parser = new MessageParser();
  expect(parser.parse(`\\\n\ntest test and  test`)).toStrictEqual({
    args: ['\\', 'test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Dangling Backslashes', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test test and test \\`)).toStrictEqual({
    args: ['test', 'test', 'and', 'test', '\\'],
    flags: {}
  });
});

test('Escaped Arguments', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test \\test and test \\`)).toStrictEqual({
    args: ['test', 'test', 'and', 'test', '\\'],
    flags: {}
  });
});

test('Custom Newlines', () => {
  const parser = new MessageParser({
    markers: {
      contentMarkers: [
        {
          group: 'Newline',
          start: '<br />'
        }
      ]
    }
  });

  expect(parser.parse(`test \\test <br />and test \\`)).toStrictEqual({
    args: ['test', 'test', 'and', 'test', '\\'],
    flags: {}
  });
});

test('Dangling Quotes', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and test "`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(UnclosedStringError);
});

test('Unclosed Strings', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test "and test`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(UnclosedStringError);
});

test('Newlines in Strings', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and "test\n hey`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(NewlineInStringError);
});

test('Well-formatted Strings', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test \\test and "test hey"`)).toStrictEqual({
    args: ['test', 'test', 'and', 'test hey'],
    flags: {}
  });
});

test('Well-formatted Strings with escaped Quotes', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test \\test and "test \\" hey"`)).toStrictEqual({
    args: ['test', 'test', 'and', 'test " hey'],
    flags: {}
  });
});

test('Dangling Code Block Closers', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and test \`\`\``);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(UnclosedCodeBlockError);
});

test('Unclosed Codeblocks', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test \`\`\`and test`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(UnclosedCodeBlockError);
});

test('Well-formatted Codeblocks', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test \\test and \`\`\`test hey\`\`\``)).toStrictEqual({
    args: ['test', 'test', 'and', '```test hey```'],
    flags: {}
  });
});

test('Well-formatted Codeblocks with escaped Markers', () => {
  const parser = new MessageParser();

  expect(
    parser.parse(`test \\test and \`\`\`test \\\`\`\` hey\`\`\``)
  ).toStrictEqual({
    args: ['test', 'test', 'and', '```test ``` hey```'],
    flags: {}
  });
});

test('FlagStarts at the end of input', () => {
  const parser = new MessageParser();

  expect(
    parser.parse(`test \\test and \`\`\`test \\\`\`\` hey\`\`\` --`)
  ).toStrictEqual({
    args: ['test', 'test', 'and', '```test ``` hey```', '--'],
    flags: {}
  });
});

test('FlagStarts in the middle of content', () => {
  const parser = new MessageParser();

  expect(
    parser.parse(`test -- \\test and \`\`\`test \\\`\`\` hey\`\`\` --`)
  ).toStrictEqual({
    args: ['test', '--', 'test', 'and', '```test ``` hey```', '--'],
    flags: {}
  });
});

test('Nameless shorthand flags at the end', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and test --!`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(NamelessFlagError);
});

test('Duplicate Flags', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and test --a --a`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(DuplicateFlagError);
});

test('Shorthand Flags', () => {
  const parser = new MessageParser();

  expect(
    parser.parse(`test --ba \\test and \`\`\`test \\\`\`\` hey\`\`\` --ab`)
  ).toStrictEqual({
    args: ['test', 'test', 'and', '```test ``` hey```'],
    flags: {
      ba: true,
      ab: true
    }
  });
});

test('Negated Shorthand Flags', () => {
  const parser = new MessageParser();

  expect(
    parser.parse(`test --!ba \\test and \`\`\`test \\\`\`\` hey\`\`\` --ab`)
  ).toStrictEqual({
    args: ['test', 'test', 'and', '```test ``` hey```'],
    flags: {
      ba: false,
      ab: true
    }
  });
});

test('Shorthand Flags with empty Descriptor and Assignment', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and test --!=`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(NamelessFlagError);
});

test('Flags with empty Descriptor and Assignment', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and test --=`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(NamelessFlagError);
});

test('Shorthand Flags with illegal Assignment', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and test --!a=`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(FlagAssignmentError);
});

test('Flags with empty assignment at the end of input', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and test --a=`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(FlagAssignmentError);
});

test('Flags with empty assignment', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test --a= and test`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(FlagAssignmentError);
});

test('Flags with Code assignment', () => {
  const parser = new MessageParser();

  expect(
    parser.parse(`test \\test and --code=\`\`\`test \\\`\`\` hey\`\`\``)
  ).toStrictEqual({
    args: ['test', 'test', 'and'],
    flags: {
      code: '```test ``` hey```'
    }
  });
});

test('Flags with unclosed Code assignment', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and --code=\`\`\`test \\\`\`\` hey`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(UnclosedCodeBlockError);
});

test('Flags with unclosed Code assignment at the of input', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and --code=\`\`\``);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(UnclosedCodeBlockError);
});

test('Flags with custom String assignment', () => {
  const parser = new MessageParser({
    markers: {
      contentMarkers: [
        {
          group: 'String',
          start: '<s>',
          end: '</s>'
        }
      ]
    }
  });

  expect(
    parser.parse(`test \\test and --code=<s>test \\</s> hey</s>`)
  ).toStrictEqual({
    args: ['test', 'test', 'and'],
    flags: {
      code: 'test </s> hey'
    }
  });
});

test('Flags with argument assignment & boolean conversion', () => {
  const parser = new MessageParser();

  expect(
    parser.parse(`test \\test and --code=true --code2=FALSE`)
  ).toStrictEqual({
    args: ['test', 'test', 'and'],
    flags: {
      code: true,
      code2: false
    }
  });
});

test('Flags with normal argument assignment', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test \\test and --code=hallo welt`)).toStrictEqual({
    args: ['test', 'test', 'and', 'welt'],
    flags: {
      code: 'hallo'
    }
  });
});

test('Multiple parse Calls on same Parser', () => {
  const parser = new MessageParser();

  parser.parse(`test \\test and --code=hallo welt`);

  expect(parser.parse(`test2 \\test2 and --code=hallo! welt2`)).toStrictEqual({
    args: ['test2', 'test2', 'and', 'welt2'],
    flags: {
      code: 'hallo!'
    }
  });
});

test('Empty / Nullish Parser call', () => {
  const parser = new MessageParser();

  expect(parser.parse()).toStrictEqual({
    args: [],
    flags: {}
  });
});

test('BoolFlags', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test \\test and -code welt -ye`)).toStrictEqual({
    args: ['test', 'test', 'and', 'welt'],
    flags: {
      code: true,
      ye: true
    }
  });
});

test('BoolFlags with illegal Assignment', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser();
        return parser.parse(`test \\test and test -a=b`);
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(FlagAssignmentError);
});

test('BoolFlags with Shorthand Negate', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test \\test and -code welt -!ye`)).toStrictEqual({
    args: ['test', 'test', 'and', 'welt'],
    flags: {
      code: true,
      ye: false
    }
  });
});

test('Escaped BoolFlags', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test \\test and \\-code welt -ye`)).toStrictEqual({
    args: ['test', 'test', 'and', '-code', 'welt'],
    flags: {
      ye: true
    }
  });
});

test('Dashes in Text', () => {
  const parser = new MessageParser();

  expect(parser.parse(`test - \\test and \\-code welt -ye`)).toStrictEqual({
    args: ['test', '-', 'test', 'and', '-code', 'welt'],
    flags: {
      ye: true
    }
  });
});

test('Dashes at the End', () => {
  const parser = new MessageParser();

  expect(
    parser.parse(`test - \\test and \\-code welt -ye -!- --`)
  ).toStrictEqual({
    args: ['test', '-', 'test', 'and', '-code', 'welt', '--'],
    flags: {
      // eslint-disable-next-line quote-props
      ye: true,
      '-': false
    }
  });
});
