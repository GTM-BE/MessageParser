# About

This MessageParser is designed to take care of user input and to transform it into
useful and useable data for our Discord Bots.

Other parsers we have seen, either didn't offer some features we needed, or were too
relaxed with errors, or gave bad responses (if any).

Our parser was designed to be modular and easily extendable.
Simply adding a new String Marker would allow to handle SmartQuotes for example, without
the need for further code modifications.

We also support escaping, so Users can still write Markers literally if they are escaped properly

<br>
<br>
<br>

# How to contribute

We are always open for contributions to make
execution faster and memory consumption smaller.

Found a complaint? Open an issue

PRs are very welcome

<br>
<br>
<br>

# Installing and Use

Import: `npm i GTM-BE/MessageParser`

```js
const { MessageParser } = require('message-parser'); // Import Parser

const parser = new MessageParser(); // Create Parser instance
const output = parser.parse(`--a hello world --b=false`); // Parse the input

console.log(output); // Log the parsed data
```

<br>
<br>
<br>

# Adding or Modifying Markers

Import: `npm i GTM-BE/MessageParser`

```js
const { MessageParser } = require('message-parser'); // Import Parser

const parser = new MessageParser({
  markers: {
    contentMarkers: [
      {
        group: 'String',
        start: '<=',
        end: '=>'
      }
    ],
    segmentMarkers: [
      {
        group: 'FlagAssignment',
        start: '.'
      }
    ]
  }
}); // Create Parser Instance

const output = parser.parse(
  `--a hello world --b.false  <= I am a custom String =>`
); // Parse the input

console.log(output); // Log the parsed data
```

<br>
<br>
<br>

# Parsing

---

#### Arguments

Arguments are any sequence of characters that don't have whitespace or newlines within them,
and don't start with any of the other content types

Input

```
Hello, \\ \\this is a text
```

Output

```js
const out = {
  args: ['Hello,', '\\', 'this', 'is', 'a', 'text'],
  flags: {}
};
```

---

#### Code Blocks

Code Blocks will be parsed up to their end and the backticks will remain as part of the argument

Input

````
Hello, this is a text ```text```
````

Output

````js
const out = {
  args: ['Hello,', 'this', 'is', 'a', 'text', '```text```'],
  flags: {}
};
````

---

#### Strings

Strings will be parsed just how you'd expect it. Their surrounding quotes
will not be part of the arguments.

```
"Hello, this" is a text. "This is a quote \" in a String" "false    "
```

Output

```js
const out = {
  args: [
    'Hello, this',
    'is',
    'a',
    'text.',
    'This is a quote " in a String',
    'false'
  ],
  flags: {}
};
```

---

#### Flags

Flags are one of our most useful features.
You can assign values to them directly, or use our shorthand syntax
Assigning no value to a flag will assign **true** to it
Using Negators like an exclamation mark in front of the flag name does the opposite.
You can assign **true** or **false** directly as well.

Any of the previous content types can also be used as value to them.
Strings, Code Blocks, Values and Booleans. Their position in the text doesn't matter

Input

````
--!shortHand --a --b=text --c=```hey``` --d="FALSE" --e=true --f=TRUE
````

Output

````js
const out = {
  args: [],
  flags: {
    shortHand: false,
    a: true,
    b: 'text',
    c: '```hey```',
    d: 'FALSE',
    e: true,
    f: true
  }
};
````

# Errors

The User will get a descriptive Error Message and the Position of the Problem.
The wrong part will also be highlighted to find the errors easier

- Flags that have a value assignment CAN'T make use of the shorthand syntax
- Duplicate Flags aren't allowed
- Flags always need a name with at least one character
- Strings always need to be closed
- Code Blocks need to be closed
