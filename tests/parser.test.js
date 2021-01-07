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
  const parser = new MessageParser(`test test and test`);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Multiple Spaces', () => {
  const parser = new MessageParser(`test          test and test`);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Padded Content', () => {
  const parser = new MessageParser(` test test and test`);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Backslashes before Whitespace', () => {
  const parser = new MessageParser(`\\  test test and  test`);
  expect(parser.parse()).toStrictEqual({
    args: ['\\', 'test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Backslashes before Newlines', () => {
  const parser = new MessageParser(`\\\n\ntest test and  test`);
  expect(parser.parse()).toStrictEqual({
    args: ['\\', 'test', 'test', 'and', 'test'],
    flags: {}
  });
});

test('Dangling Backslashes', () => {
  const parser = new MessageParser(`test test and test \\`);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', 'test', '\\'],
    flags: {}
  });
});

test('Escaped Arguments', () => {
  const parser = new MessageParser(`test \\test and test \\`);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', 'test', '\\'],
    flags: {}
  });
});

test('Custom Newlines', () => {
  const parser = new MessageParser(`test \\test <br />and test \\`, {
    markers: {
      contentMarkers: [
        {
          group: 'Newline',
          start: '<br />'
        }
      ]
    }
  });

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', 'test', '\\'],
    flags: {}
  });
});

test('Dangling Quotes', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser(`test \\test and test "`);
        return parser.parse();
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
        const parser = new MessageParser(`test \\test "and test`);
        return parser.parse();
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
        const parser = new MessageParser(`test \\test and "test\n hey`);
        return parser.parse();
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(NewlineInStringError);
});

test('Well-formatted Strings', () => {
  const parser = new MessageParser(`test \\test and "test hey"`);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', 'test hey'],
    flags: {}
  });
});

test('Well-formatted Strings with escaped Quotes', () => {
  const parser = new MessageParser(`test \\test and "test \\" hey"`);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', 'test " hey'],
    flags: {}
  });
});

test('Dangling Code Block Closers', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser(`test \\test and test \`\`\``);
        return parser.parse();
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
        const parser = new MessageParser(`test \\test \`\`\`and test`);
        return parser.parse();
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(UnclosedCodeBlockError);
});

test('Well-formatted Codeblocks', () => {
  const parser = new MessageParser(`test \\test and \`\`\`test hey\`\`\``);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', '```test hey```'],
    flags: {}
  });
});

test('Well-formatted Codeblocks with escaped Markers', () => {
  const parser = new MessageParser(
    `test \\test and \`\`\`test \\\`\`\` hey\`\`\``
  );

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', '```test ``` hey```'],
    flags: {}
  });
});

test('FlagStarts at the end of input', () => {
  const parser = new MessageParser(
    `test \\test and \`\`\`test \\\`\`\` hey\`\`\` --`
  );

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', '```test ``` hey```', '--'],
    flags: {}
  });
});

test('FlagStarts in the middle of content', () => {
  const parser = new MessageParser(
    `test -- \\test and \`\`\`test \\\`\`\` hey\`\`\` --`
  );

  expect(parser.parse()).toStrictEqual({
    args: ['test', '--', 'test', 'and', '```test ``` hey```', '--'],
    flags: {}
  });
});

test('Nameless shorthand flags at the end', () => {
  expect(
    (() => {
      try {
        const parser = new MessageParser(`test \\test and test --!`);
        return parser.parse();
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
        const parser = new MessageParser(`test \\test and test --a --a`);
        return parser.parse();
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(DuplicateFlagError);
});

test('Shorthand Flags', () => {
  const parser = new MessageParser(
    `test --ba \\test and \`\`\`test \\\`\`\` hey\`\`\` --ab`
  );

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', '```test ``` hey```'],
    flags: {
      ba: true,
      ab: true
    }
  });
});

test('Negated Shorthand Flags', () => {
  const parser = new MessageParser(
    `test --!ba \\test and \`\`\`test \\\`\`\` hey\`\`\` --ab`
  );

  expect(parser.parse()).toStrictEqual({
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
        const parser = new MessageParser(`test \\test and test --!=`);
        return parser.parse();
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
        const parser = new MessageParser(`test \\test and test --=`);
        return parser.parse();
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
        const parser = new MessageParser(`test \\test and test --!a=`);
        return parser.parse();
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
        const parser = new MessageParser(`test \\test and test --a=`);
        return parser.parse();
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
        const parser = new MessageParser(`test \\test --a= and test`);
        return parser.parse();
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(FlagAssignmentError);
});

test('Flags with Code assignment', () => {
  const parser = new MessageParser(
    `test \\test and --code=\`\`\`test \\\`\`\` hey\`\`\``
  );

  expect(parser.parse()).toStrictEqual({
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
        const parser = new MessageParser(
          `test \\test and --code=\`\`\`test \\\`\`\` hey`
        );
        return parser.parse();
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
        const parser = new MessageParser(`test \\test and --code=\`\`\``);
        return parser.parse();
      } catch (error) {
        return error;
      }
    })()
  ).toBeInstanceOf(UnclosedCodeBlockError);
});

test('Flags with custom String assignment', () => {
  const parser = new MessageParser(
    `test \\test and --code=<s>test \\</s> hey</s>`,
    {
      markers: {
        contentMarkers: [
          {
            group: 'String',
            start: '<s>',
            end: '</s>'
          }
        ]
      }
    }
  );

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and'],
    flags: {
      code: 'test </s> hey'
    }
  });
});

test('Flags with argument assignment & boolean conversion', () => {
  const parser = new MessageParser(`test \\test and --code=true --code2=FALSE`);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and'],
    flags: {
      code: true,
      code2: false
    }
  });
});

test('Flags with normal argument assignment', () => {
  const parser = new MessageParser(`test \\test and --code=hallo welt`);

  expect(parser.parse()).toStrictEqual({
    args: ['test', 'test', 'and', 'welt'],
    flags: {
      code: 'hallo'
    }
  });
});
