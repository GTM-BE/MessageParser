# About

This MessageParser is designed to take care of user input and to transform it into
useful and useable data for our Discord Bots.

Other parsers we have seen, either didn't offer some features we needed, or were too
relaxed with errors, or gave bad responses (if any).

Our parser was designed to be modular and easily extendable.
Simply adding a new String Marker would allow to handle SmartQuotes for example, without
the need for further code modifications.

We also support escaping, so Users can still write Markers literally if they are escaped properly

# Parsing

---

#### Arguments

Arguments are any sequence of characters that don't have whitespace or newlines within them,
and don't start with any of the other content types

Input

```
Hello, this is a text
```

Output

```js
const out = {
  args: ['Hello,', 'this', 'is', 'a', 'text'],
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
will not be part of the arguments. If your string is only **true** or **false** after trimming,
they will be converted to Booleans.

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
    false
  ],
  flags: {}
};
```

---

#### Flags

Flags are one of our most wanted and useful features.
You can assign values to them directly, or use our shorthand syntax
Assigning no value to a flag will assign **true** to it
Using Negators like an exclamation mark in front of the flag name does the opposite.
You can assign **true** or **false** directly as well.

Any of the previous content types can also be used as value to them.
Strings, Code Blocks, Values and Booleans. Their position in the text doesn't matter

Input

````
--!shortHand --a --b=text --c=```hey``` --d="false" --e=true
````

Output

````js
const out = {
  args: [],
  flags: {
    shortHand: false,
    a: true,
    b: 'true',
    c: '```hey```',
    d: false,
    e: true
  }
};
````

# Errors

- Flags that have a value assignment CAN'T make use of the shorthand syntax
- Duplicate Flags aren't allowed
- Flags always need a name with at least one character
- Strings always need to be closed
- Code Blocks need to be closed
