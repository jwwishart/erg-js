// Generated: 2015-9-23 22:19

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
    const const1 = 15; // const
    const const2 = 'This is great!'; // const
    print(const1);
    print(const2);
    let type_string = "";
    let type_int = 0;
    let type_float = 0.0;
    let type_bool = false;
    let type_any = null;
    let type_string_explicity_uninitialized = "";
    let type_int_explicity_uninitialized = 0;
    let type_float_explicity_uninitialized = 0.0;
    let type_bool_explicity_uninitialized = false;
    let type_any_explicity_uninitialized = null;
    let type_string_assigned = 'Hello World';
    let type_string_assigned2 = 'Don\'t Sweat the single Quotes';
    let type_int_assigned = 256;
    let type_float_assigned = null;
    let no_type_string_init = 'Hello World';
    let no_type_string_init2 = 'Don\'t Sweat the single Quotes';
    let no_type_int_init = 256;
    let no_type_float_init = null;
    type_string = 'Welcome';
    type_int = 1234;
    type_float = 1234.5678;
    type_bool = true;
    type_any = 'I\'ll just set as a string for the moment!';
    type_any = null;
    type_any = 'welcome home';
    type_any = 1;
    type_any = 1.234;
    type_any = true;
// File End: input_filename


