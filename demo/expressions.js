// Generated: 2015-9-19 17:50

"use strict";

function print(message) { console.log(message); }

function assert(condition, fail_message) {
    // NOTE: coersion on purpose.. if you pass null or undefined
    // the condition should fail.
    if (condition == false) {
        throw new Error("ASSERTION FAILED: " + fail_message);
    }
}

// File Start: input_filename
    let an_integer = 0;
    let a_boolean = false;
    print('an_integer = ' + an_integer);
    print('a_boolean  = ' + a_boolean);
    assert(true, 'This should not be seen in the output');
    print('\n');
// File End: input_filename


