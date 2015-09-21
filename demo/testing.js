// Generated: 2015-9-21 22:39

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
    let message = Hello World;
    print(message);
// File End: input_filename


