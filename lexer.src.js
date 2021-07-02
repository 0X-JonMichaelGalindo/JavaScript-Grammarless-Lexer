/* 

JavaScript-Grammarless-Lexer

----------------------------------------------------------------------------

A library for building lexer rules for converting streams to tokens. 

----------------------------------------------------------------------------

MIT License

Copyright (c) 2021 0X-JonMichaelGalindo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

const _LIBRARY_NAME_ = 'JavaScript-Grammarless-Lexer';

const Fail = ( kind, name, result, stream, index ) => {

    console.error( 
        `${kind}{${name}} <source()> returned `, result , 
        '\n\nat index: ', index, 
        `\n(${String.fromCodePoint( ...stream.subarray( index, Math.min( index+20, stream.length ) ) ) })`,
        '\nstream: ', stream 
    );

    throw `${_LIBRARY_NAME_} <source()> Definition`;

}


//helper constructors

const parse = ( source, rule, index = 0 ) => {

    if( typeof source === 'string' ) source = StringToStream( source );

    if( index >= source.length ) return null;

    const stack = [];
    let i = index;

    while( true ) {

        let result = rule( i, source, stack );

        if( result === true && i < source.length ) continue;

        i = result;

        break;

    };

    return {

        'string': StreamToString( source, index, i ),
        'match-length': i - index,
        stack,
        stream: source,
        index,

    }
}
const StringToStream = string => Uint32Array.from( [ ...string ].map( c => c.codePointAt( 0 ) ) );

const StreamToString = ( stream, start, end ) => stream.subarray ? String.fromCodePoint( ...( stream.subarray( start, end ) ) ) : null;

const LiteralStringSequence = ( string, name = '<anonymous{LiteralStringSequence}>' ) => Sequence( [ ...string ].map( c => Literal( c.codePointAt( 0 ), `${name}::${c}` ) ), name );

const LiteralStringUnion = ( string, name = '<anonymous{LiteralStringUnion}>' ) => Union( [ ...string ].map( c => Literal( c.codePointAt( 0 ), `${name}::${c}` ) ), name );

const LiteralCharacter = ( c, name = '<anonymous{LiteralCharacter}>' ) => Literal( c.codePointAt( 0 ), `${name}::${c}` );

const NegativeLiteralCharacter = ( c, name = '<anonymous{NegativeLiteralCharacter}>' ) => NegativeLiteral( c.codePointAt( 0 ), `${name}::${c}` );


const Terminate = ( state, index, stream, stack ) => {

    if ( stack )
        stack.push( {
            'string': StreamToString( stream, index, index+state.offset ),
            'rule-name': state.name,
            'source-entry-index': state.i,
            'match-length': state.offset,
            'children': state.children,
            stream,
            index,
        } );

    let offset = stack ? state.offset : 0;

    state.i = 0;
    state.offset = 0;
    state.children = [];

    return offset;

}

const Star = ( source, name = '<anonymous{Star}>', state = { i:0, offset:0, children:[], name } ) => (

    ( index, stream, stack ) => ( result => ( {

        [ true ]: () => Fail( 'Star', name, result, stream, index+state.offset ),
        [ result === 0 ]: () => Terminate( state, index, stream, stack ), //end, matched 0 or more
        [ Number.isInteger( result ) && result > 0 ]: () => ( state.offset += result, true ), //matched, try to match again
        [ result === true ]: () => true, //source is processing

    }[ true ] ) )( source( index+state.offset, stream, state.children ) )()

)

const StarNot = ( source, name = '<anonymous{Star}>', state = { i:0, offset:0, children:[], name } ) => (

    ( index, stream, stack ) => ( result => ( {

        [ true ]: () => Fail( 'Star', name, result, stream, index+state.offset ),
        [ result === 0 ]: () => ( state.offset += 1, true ), //did not match, not end of input, consume 1 more character
        [ ( ( index + state.offset ) === stream.length ) ]: () => Terminate( state, index, stream, stack ), //end of input, matched 0 or more
        [ Number.isInteger( result ) && result > 0 ]: () => Terminate( state, index, stream, stack ), //matched, ignore this index in consumption
        [ result === true ]: () => true, //source is processing

    }[ true ] ) )( source( index+state.offset, stream, state.children ) )()

)

const Union = ( source, name = '<anonymous{Union}>', state = { name, i:0, offset:0, children:[] } ) => (

    ( index, stream, stack ) => ( result => ( {

        [ true ]: () => Fail( 'Union', name, result, stream, index+state.offset ),
        [ result === Terminate ]: () => Terminate( state ), //end of set, no match
        [ result === 0 ]: () => ( state.i++, true ), //no match yet, try next
        [ Number.isInteger( result ) && result > 0 ]: () => ( state.offset += result, Terminate( state, index, stream, stack ) ), //found match in set
        [ result === true ]: () => true, //source is processing

    }[ true ] ) )( source[state.i] ? source[state.i]( index+state.offset, stream, state.children ) : Terminate )()

)

const Sequence = ( source, name = '<anonymous{Sequence}>', state = { name, i:0, offset:0, children:[] } ) => (

    ( index, stream, stack ) => ( result => ( {

        [ true ]: () => Fail( 'Sequence', name, result, stream, index+state.offset ),
        [ result === Terminate ]: () => Terminate( state, index, stream, stack ), //end of sequence, match
        [ result === 0 ]: () => ( Terminate( state ) ), //every source required to match
        [ Number.isInteger( result ) && result > 0 ]: () => ( state.offset += result, state.i += 1, true ), //matched entry, continue
        [ result === true ]: () => true, //source is processing

    }[ true ] ) )( source[state.i] ? source[state.i]( index+state.offset, stream, state.children ) : Terminate )()

)

const Literal = ( source, name = '<anonymous{Literal}>', state = { name, i:0, offset:0, children:[] } ) => (

    ( index, stream, stack ) => ( {

        [ true ]: () => Terminate( state ),
        [ ( index < stream.length ) && ( source === stream[ index ] ) ]: () => ( state.offset = 1, Terminate( state, index, stream, stack ) ),

    }[ true ] )()

)

const NegativeLiteral = ( source, name = '<anonymous{Literal}>', state = { name, i:0, offset:0, children:[] } ) => (

    ( index, stream, stack ) => ( {

        [ true ]: () => Terminate( state ),
        [ ( index < stream.length ) && ( source !== stream[ index ] ) ]: () => ( state.offset = 1, Terminate( state, index, stream, stack ) ),

    }[ true ] )()

)

const AnyLiteral = ( name = '<anonymous{Literal}>', state = { name, i:0, offset:0, children:[] } ) => (

    ( index, stream, stack ) => ( index < stream.length ) ? ( state.offset = 1, Terminate( state, index, stream, stack ) ) : Terminate( state )

)

export { 
    parse, StringToStream, StreamToString,
    AnyLiteral, NegativeLiteral, Literal, Sequence, Union, Star, StarNot,
    NegativeLiteralCharacter, LiteralCharacter, LiteralStringUnion, LiteralStringSequence,
};