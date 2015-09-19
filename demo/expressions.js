// Generated: 2015-9-19 15:46

"use strict";

function print(message) { console.log(message); }

// File Start: input_filename
    

    function assert(b,error_message) {
        

// RAW ASM OUTPUT START (javascript) -------------------------
         
        if (b === false) {
            throw new Error("ASSERT: " + error_message);
        }
    
        
// RAW ASM OUTPUT END (javascript) --------------------------


    }

    let an_integer = 0;
    let a_boolean = false;
    print('an_integer = ' + an_integer);
    print('a_boolean  = ' + a_boolean);
    an_integer = 1000;
// File End: input_filename


