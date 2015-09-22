// Generated: 2015-9-22 21:21

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
    const my_name = 'Justin Wishart'; // const
    print(my_name);
// File End: input_filename


