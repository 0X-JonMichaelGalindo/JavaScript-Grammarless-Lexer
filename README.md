# JavaScript-Grammarless-Lexer

# Description

Create lexer [rules](#rules) and use them to [parse](#parse) strings or iterables.

No rule grammar exists. [Rules](#rules) are constructed functions.

[Custom rules](#custom-rules) may be defined.<br /><br />

A rule matched against a stream produces the following.
```JavaScript
{
    'stream': iterable, /* The stream matched against. */
    'string': string, /* Matched string at stream[ index ]. */

    'index': index, /* The index matched at. */
    'match-length': int, /* How many characters matched. */
    
    'rule-name': string, /* The name of the rule given at definition. */

    'source-entry-index': int, /* For Union, the index of the rule matched in the Union's rules array. */
    'children': array, /* For Sequence, Star, StarNot, and Union, an array of results from child rule matches. */
}
```

# Example

Extract comments from a javascript file.

In pseudo lexical grammar, the rules defined in this example might be written like this:
```
head = '/' -> '*'

terminator = '*' -> '/'

contentCharacter = [ ! terminator ]*

codeCharacter = [ ! head ]*

comment = head -> contentCharacter -> terminator

codeParser = [ comment | codeCharacter ]*
```

```JavaScript
import { parse, Star, StarNot, Sequence, Union, LiteralStringSequence } from 'lexer.module.min.js';

let myFileComments;

getMyFileComments().then( comments => { myFileComments = comments } );


async function getMyFileComments() {

    const myJSFile = await ( await fetch( 'my-js-file.js' ) ).text();

    const head = LiteralStringSequence( '/*', 'comment-head' ); //start of comment
    const terminator = LiteralStringSequence( '*/', 'comment-terminator' ); //end of comment

    const contentCharacter = StarNot( terminator, 'content-character' ); //0 or more characters not the end of a comment

    const codeCharacter = StarNot( head, 'code-character' ); //0 or more characters not the start of a comment

    const comment = Sequence( [ head, contentCharacter, terminator ], 'js-comment' ); //a comment

    const codeOrComment = Union( [ comment, codeCharacter ], 'code-or-comment' ); //match either 1 full comment, or the text up to the next comment start

    const codeParser = Star( codeOrComment ); //match the entire file, as a list of matches of comments or code characters


    const result = parse( myJSFile ); //apply the rule to the JS text

    const matches = result.stack[ 0 ].children; //get codeParser's list of matches


    const comments = [];

    for( const matchResult of matches ) {

        //each match of comment() or codeCharacter() has 1 result object in its children[] array specifying the rule name matched
        const subRuleMatchedResult = result.children[ 0 ];

        if( subRuleMatchedResult.name === 'js-comment' ) comments.push( matchResult.string );

    }

    return comments;

}


```

<br /><br /><br />

# Index 

- [Usage](#usage)
- [Methods](#methods)
    - [parse( source: string | iterable, rule: function, index?: int ): result](#parse)
- [Helpers](#helpers)
    - [LiteralCharacter( character: string, name: string ): function](#literalcharacter)
    - [LiteralStringSequence( string: string, name: string ): function](#literalstringsequence)
    - [LiteralStringUnion( string: string, name: string ): function](#literalstringunion)
    - [NegativeLiteralCharacter( character: string, name: string ): function](#negativeliteralcharacter)
    - [StreamToString( string: string ): Uint32Array](#streamtostring)
    - [StringToStream( string: string ): Uint32Array](#stringtostream)
- [Rules](#rules)
    - [Literal( source: any, name: string ) : function](#literal)
    - [NegativeLiteral( source: any, name: string ) : function](#negativeliteral)
    - [Sequence( rules: array, name: string ) : function](#sequence)
    - [Star( rule: function, name: string ) : function](#star)
    - [StarNot( rule: function, name: string ) : function](#starnot)
    - [Union( rules: array, name: string ) : function](#union)
- [Custom Rules](#custom-rules)

# Usage 

Download the library to your directory.

Then, include the library.
```HTML
<script src="lexer.min.js"></script>
```

Or, import the library into a JS module.

```JavaScript
import {
    parse, StringToStream, StreamToString,
    AnyLiteral, NegativeLiteral, Literal, Sequence, Union, Star, StarNot,
    NegativeLiteralCharacter, LiteralCharacter, LiteralStringUnion, LiteralStringSequence
} from 'lexer.module.min.js';
```

<br /><br /><br />

# Methods

## parse 

Apply a rule to a stream.

```parse( source: string | iterable, rule: function, index?: int ): result```

```JavaScript
const result = parse( myString, myRule );
```
```JavaScript
const result = parse( myString, myRule, startMatchingAtIndex );
```

The result object has the following structure:
```JavaScript
{
    'string': string, /* The matched string at stream[ 0 | index ] */
    'match-length': int, /* How many characters matched */

    'stack': array, /* An array containing the result of matching the rule */
    'stream': source, 
        /* If parameter source is a string, stream is a Uint32Array representation of that string. 
            If parameter source is an iterable, stream is that iterable. */
    'index', /* The index parameter passed to parser, or 0. */
}
```

<br /><br /><br />

# Helpers

## LiteralCharacter

Convert a character to a literal rule.

```LiteralCharacter( character: string, name: string ): function```

```JavaScript
const literal = LiteralCharacter( myCharacter, 'my-character-literal' );
```

## LiteralStringSequence

Convert a string to a sequence literal rule.

```LiteralStringSequence( string: string, name: string ): function```

```JavaScript
const sequence = LiteralStringSequence( myString, 'my-string-sequence' );
```

Equivalent to

```JavaScript
const myLiterals = [];

for( const letter of myString )
    myLiterals.push( Literal( letter ) );

const sequence = Sequence( myLiterals, 'my-string-sequence' );
```

## LiteralStringUnion

Convert a string to a union literal rule.

```LiteralStringUnion( string: string, name: string ): function```

```JavaScript
const union = LiteralStringUnion( myString, 'my-string-union' );
```

Equivalent to

```JavaScript
const myLiterals = [];

for( const letter of myString )
    myLiterals.push( Literal( letter ) );

const union = Union( myLiterals, 'my-string-union' );
```

## NegativeLiteralCharacter

Convert a character to a negative literal character rule.

```NegativeLiteralCharacter( character: string, name: string ): function```

## StreamToString

Convert a Uint32Array to a string.

```StreamToString( string: string ): Uint32Array```

## StringToStream

Convert a string to a Uint32Array for accurate code-point processing.

```StringToStream( string: string ): Uint32Array```

<br /><br /><br />

# Rules

## Star

Match 0 or more repetitions of its rule.

### Constructor

```Star( rule: function, name: string ) : function```

```JavaScript
const star = Star( myRule, 'my-star' );
```

### Usage

This example matches 0 characters if the first character of the stream is not an 'a'.  
Or, it matches N instances of 'a' starting from the beginning of the stream.  
Or, it matches the entire stream if the entire stream is comprised of 'a'.

```JavaScript
const letterA = Literal( 'a'.codePointAt(0), 'letter-a' )

const startingAs = Star( letterA, 'string-of-starting-as' )

parse( myString, startingAs );
```

## StarNot

Match 0 or more characters, except end of stream, up to and not including the character at the index matching its rule

### Constructor

```StarNot( rule: function, name: string ) : function```

```JavaScript
const starNot = StarNot( myRule, 'my-star-not' );
```

### Usage

This example matches 0 characters if the first character of the stream is 'a'.  
Or, it matches N characters up to the first occurence of 'a' in the stream.  
Or, it matches all the characters in the stream if the stream does not contain an 'a'.

```JavaScript
const letterA = Literal( 'a'.codePointAt(0), 'letter-a' )

const upToA = StarNot( letterA, 'string-up-to-a' )

parse( myString, upToA );
```

## Union

Match 0 rules, or the earliest matching rule in its ordered rules array.

### Constructor

```Union( rules: array, name: string ) : function```

```JavaScript
const union = Union( myRulesArray, 'my-union' );
```

### Usage

This example matches 1 character at the beginning of the stream, if that character is 0, 1, 2, 3, 4, 5, 6, 7, 8, or 9.  
If not, it matches 0 characters.  

```JavaScript
const myRulesArray = [ 
    Literal( '0'.codePointAt(0), 'digit-0' ),
    Literal( '1'.codePointAt(0), 'digit-1' ),
    Literal( '2'.codePointAt(0), 'digit-2' ),
    Literal( '3'.codePointAt(0), 'digit-3' ),
    Literal( '4'.codePointAt(0), 'digit-4' ),
    Literal( '5'.codePointAt(0), 'digit-5' ),
    Literal( '6'.codePointAt(0), 'digit-6' ),
    Literal( '7'.codePointAt(0), 'digit-7' ),
    Literal( '8'.codePointAt(0), 'digit-8' ),
    Literal( '9'.codePointAt(0), 'digit-9' ),
]

const digit = Union( myRulesArray, 'my-digit-rule' )

parse( myString, digit );
```

## Sequence

Match 0 rules, or all of its source rules in its ordered rules array.

### Constructor

```Sequence( rules: array, name: string ) : function```

```JavaScript
const sequence = Sequence( myRulesArray, 'my-sequence' );
```

### Usage

```JavaScript
const myRulesArray = [ 
    Literal( 'c'.codePointAt(0), 'letter-c' ),
    Literal( 'a'.codePointAt(0), 'letter-a' ),
    Literal( 't'.codePointAt(0), 'letter-t' ),
]

const wordCat = Sequence( myRulesArray, 'my-cat-rule' )

parse( myString, wordCat );
```

## Literal

Match 1 character, equal to the source character

### Constructor

```Literal( source: any, name: string ) : function```

```JavaScript
const literal = Literal( 'a'.codePointAt(0), 'my-literal' );
```

### Usage

```JavaScript
const literal = Literal( 'a'.codePointAt(0), 'my-literal' );
parse( myString, literal );
```

## NegativeLiteral

Match any 1 character, except the source character, and except end of stream.

### Constructor

```NegativeLiteral( source: any, name: string ) : function```

```JavaScript
const negativeLiteral = NegativeLiteral( 'a'.codePointAt(0), 'my-negative-literal' );
```

## Usage

```JavaScript
const negativeLiteral = NegativeLiteral( 'a'.codePointAt(0), 'my-negative-literal' );
parse( myString, negativeLiteral );
```

# AnyLiteral

Match any 1 character, except end of stream.

## Constructor

```AnyLiteral( name: string ) : function```

```JavaScript
const anyLiteral = AnyLiteral( 'my-any-literal' );
```

## Usage

```JavaScript
const anyLiteral = AnyLiteral( 'my-any-literal' );
parse( myString, anyLiteral );
```

# Custom Rules

A rule is a function that satisfies the following interface:

```rule( index: int, stream: iterable, stack: array ): true | 0 | int```

A rule must return ```true``` to signify that it should be called again with the same parameters.  
This allows loop management outside the rule's body.

A rule must return ```0``` to signify that it matches 0 characters at the stream index.  
If a rule returns 0, it also should not modify stack[]. (This is best practice, not an enforced behavior.)

A rule must return ```int``` (an integer > 0) to signify that it matches N characters starting at stream[ index ], inclusive.  
If a rule returns an integer > 0, it should also push a token to stack[] containing relevant information. (This is best practice, not an enforced behavior.)  

Standard lexer rules push the following object to stack[] on a match.
```JavaScript
{
    'stream': iterable, /* The stream matched against. */
    'string': string, /* Matched string at stream[ index ]. */

    'index': index, /* The index matched at. */
    'match-length': int, /* How many characters matched. */
    
    'rule-name': string, /* The name of the rule given at definition. */

    'source-entry-index': int, /* For Union, the index of the rule matched in the Union's rules array. */
    'children': array, /* For Sequence, Star, StarNot, and Union, an array of results from child rule matches. */
}
```

The parser returns the following object.
```JavaScript
{
    'string': string, /* The matched string at stream[ 0 | index ] */
    'match-length': int, /* How many characters matched */

    'stack': array, /* An array containing the result of matching the rule */
    'stream': source, 
        /* If parameter source is a string, stream is a Uint32Array representation of that string. 
            If parameter source is an iterable, stream is that iterable. */
    'index', /* The index parameter passed to parser, or 0. */
}
```
