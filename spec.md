```
entry:
    | rule => (index,stream,stack) => {*code*} => true | 0 | N
    | star[entry] => repeat:match(entry), advance: 0|N
    | set[entry*] => step-in(parallel), advance: 0|N
    | sequence[entry*] => step-in, advance: 0|N 
    | symbol => equality( === ), advance: 0|1

f([n]*?) : a function that:
    - compares Stream[@offset->] against its source {entry}
        : stepping recursively into any sub-entries as defined above
    - matches 
        -> and appends {Token} to Stack
        -> and returns +{Int} to advance from @offset 
    - or fails 
        -> leaving Stack unchanged
        -> and returning 0
    - F = ( entry, i=0, offset=0, child-stack=[] ) => 
            ( index, Stream, Stack ) => 
                entry is star: (i is always 0)
                    *entry is rule :
                        *entry:rule( index+offset, Stream, child-stack ) === 0 : offset ? ( Stack.push( {Token:index,offset,[i===0,]Stream,child-stack} ), offset{advance} ) : 0{advance}
                        result{ *entry:rule( index+offset, Stream, child-stack ) } > 0 : ( offset+=result{}, true{continue} ) ;call same rule again, next offset (try to match again)
                        *entry:rule( index+offset, Stream, child-stack ) === true : ( offset=offset, true{continue} ) ;call same rule again, same offset (is incrementing internal i)
                    *entry is star : 
                        UNREACHABLE (hoisted)
                    *entry is set :
                        *entry:set( index+offset, Stream, child-stack ) === 0 : offset ? ( Stack.push( {Token:index,offset,[i===0,]Stream,child-stack} ), offset{advance} ) : 0{advance}
                        result{ *entry:set( index+offset, Stream, child-stack ) } > 0 : ( offset+=result{}, true{continue} ) ;call same set again, next offset (try to match again)
                        *entry:set( index+offset, Stream, child-stack ) === true : ( offset=offset, true{continue} ) ;call same set again, same offset (is incrementing internal i)
                    *entry is sequence :
                        *entry:sequence( index+offset, Stream, child-stack ) === 0 : offset ? ( Stack.push( {Token:index,offset,[i===0,]Stream,child-stack} ), offset{advance} ) : 0{advance}
                        result{ *entry:sequence( index+offset, Stream, child-stack ) } > 0 : ( offset+=result{}, true{continue} ) ;call same sequence again, next offset (try to match again)
                        *entry:sequence( index+offset, Stream, child-stack ) === true : ( offset=offset, true{continue} ) ;call same sequence again, same offset (is incrementing internal i)
                    *entry is symbol :
                        *entry:symbol( index+offset, Stream, child-stack ) === 0 : offset ? ( Stack.push( {Token:index,offset,[i===0,]Stream,child-stack} ), offset{advance} ) : 0{advance}
                        result{ *entry:symbol( index+offset, Stream, child-stack )===1 } > 0 : ( offset+=result{}, true{continue} ) ;call same symbol again, next offset (try to match again)
                        *entry:symnol( index+offset, Stream, child-stack ) === true : UNREACHABLE
                    ! *entry :
                        UNREACHABLE

                entry is set: (offset is always 0)
                    entry[i] is rule :
                        entry[i]:rule( index+offset, Stream, child-stack ) === 0 : ( i++, true{continue} ) ;no match, try next entry 
                        result{ entry[i]:rule( index+offset, Stream, child-stack ) } > 0 : ( Stack.push( {Token:index,offset=result,i,Stream,child-stack} ), i=0, result{advance} )
                        entry[i]:rule( index+offset, Stream, child-stack ) === true : ( i=i, true{continue} ) ;call same rule again, same offset (is incrementing internal i)
                    entry[i] is star :
                        entry[i]:star( index+offset, Stream, child-stack ) === 0 : ( i++, true{continue} ) ;no match, try next entry 
                        result{ entry[i]:star( index+offset, Stream, child-stack ) } > 0 : ( Stack.push( {Token:index,offset=result,i,Stream,child-stack} ), i=0, result{advance} )
                        entry[i]:star( index+offset, Stream, child-stack ) === true : ( i=i, true{continue} ) ;call same star again, same offset (is incrementing internal i)
                    entry[i] is set ;flatmap; :
                        entry[i]:set( index+offset, Stream, child-stack ) === 0 : ( i++, true{continue} ) ;no match, try next entry 
                        result{ entry[i]:set( index+offset, Stream, child-stack ) } > 0 : ( Stack.push( {Token:index,offset=result,i,Stream,child-stack} ), i=0, result{advance} )
                        entry[i]:set( index+offset, Stream, child-stack ) === true : ( i=i, true{continue} ) ;call same set again, same offset (is incrementing internal i)
                    entry[i] is sequence : 
                        entry[i]:sequence( index+offset, Stream, child-stack ) === 0 : ( i++, true{continue} ) ;no match, try next entry 
                        result{ entry[i]:sequence( index+offset, Stream, child-stack ) } > 0 : ( Stack.push( {Token:index,offset=result,i,Stream,child-stack} ), i=0, result{advance} )
                        entry[i]:sequence( index+offset, Stream, child-stack ) === true : ( i=i, true{continue} ) ;call same sequence again, same offset (is incrementing internal i)
                    entry[i] is symbol :
                        entry[i]:symbol( index+offset, Stream, child-stack ) === 0 : ( i++, true{continue} ) ;no match, try next entry 
                        result{ entry[i]:symbol( index+offset, Stream, child-stack )===1 } > 0 : ( Stack.push( {Token:index,offset=result,i,Stream,child-stack} ), i=0, result{advance} )
                        entry[i]:symbol( index+offset, Stream, child-stack ) === true : UNREACHABLE
                    ! entry[i] :
                        (no match): ( i=0, 0{advance} )

                entry is sequence: (offset and i increment independently)
                    entry[i] is rule:
                        entry[i]:rule( index+offset, Stream, child-stack ) === 0 : ( offset=0, i=0, 0{advance} ) ;no match, but entry[i] required
                        result{ entry[i]:rule( index+offset, Stream, child-stack ) } > 0 : ( offset+=result{}, i++, true{continue} ) ;compare next at advanced offset 
                        entry[i]:rule( index+offset, Stream, child-stack ) === true : ( offset=offset, i=i, true{continue} ) ;call same rule again, same offset (is incrementing internal i)
                    entry[i] is star:
                        entry[i]:star( index+offset, Stream, child-stack ) === 0 : ( offset=0, i=0, 0{advance} ) ;no match, but entry[i] required
                        result{ entry[i]:star( index+offset, Stream, child-stack ) } > 0 : ( offset+=result{}, i++, true{continue} ) ;compare next at advanced offset 
                        entry[i]:star( index+offset, Stream, child-stack ) === true : ( offset=offset, i=i, true{continue} ) ;call same star again, same offset (is incrementing internal i)
                    entry[i] is set :
                        entry[i]:set( index+offset, Stream, child-stack ) === 0 : ( offset=0, i=0, 0{advance} ) ;no match, but entry[i] required
                        result{ entry[i]:set( index+offset, Stream, child-stack ) } > 0 : ( offset+=result{}, i++, true{continue} ) ;compare next at advanced offset 
                        entry[i]:set( index+offset, Stream, child-stack ) === true : ( offset=offset, i=i, true{continue} ) ;call same set again, same offset (is incrementing internal i)
                    entry[i] is sequence :
                        entry[i]:sequence( index+offset, Stream, child-stack ) === 0 : ( offset=0, i=0, 0{advance} ) ;no match, but entry[i] required 
                        result{ entry[i]:sequence( index+offset, Stream, child-stack ) } > 0 : ( offset+=result{}, i++ true{continue} ) ;compare next at advanced offset 
                        entry[i]:sequence( index+offset, Stream, child-stack ) === true : ( offset=offset, i=i, true{continue} ) ;call same sequence again, same offset (is incrementing internal i)
                    entry[i] is symbol :
                        entry[i]:symbol( index+offset, Stream, child-stack ) === 0 : ( offset=0, i=0, 0{advance} ) ;no match, but entry[i] required 
                        result{ entry[i]:sequence( index+offset, Stream, child-stack )===1 } > 0 : ( offset+=result{}, i++ true{continue} ) ;compare next at advanced offset 
                        entry[i]:symbol( index+offset, Stream, child-stack ) === true : UNREACHABLE
                    ! entry[i] :
                        (matched full): ( Stack.push( {Token:index,[i===length,]offset,Stream,child-stack} ), offset{advance} )

                entry is symbol: (offset and i are always 0)
                    symbol !== Stream[ index ] : ( 0{advance} )
                    symbol === Stream[ index ] : ( Stack.push( {Token:index,[i===0,][offset===0],Stream,[child-stack===[]]} ), 1{advance} )

```
