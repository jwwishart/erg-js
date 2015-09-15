// Generated: 2015-9-15 21:14

"use strict";

// File Start: input_filename

function print(message) {
    const prefix = 'PRINT: '; // const
    

// RAW ASM OUTPUT START (javascript) -------------------------
     
        console.log(prefix + message);
    
    
// RAW ASM OUTPUT END (javascript) --------------------------


}



// RAW ASM OUTPUT START (javascript) -------------------------
 
    console.log('asm blocks should not have a semicolon after it!');


// RAW ASM OUTPUT END (javascript) --------------------------


let type_string = '';
let type_int = 0;
let type_float = 0.0;
let type_bool = false;
let type_any = null;
type_string = 'testing';

{
    let type_string = 124;
    print(type_string);
}

print(type_string);
let type_string_explicity_uninitialized = '';
let type_int_explicity_uninitialized = 0;
let type_float_explicity_uninitialized = 0.0;
let type_bool_explicity_uninitialized = false;
let type_any_explicity_uninitialized = null;
let type_string_assigned = 'Hello World';
let type_string_assigned2 = 'Don\'t Sweat the single Quotes';
let type_int_assigned = 256;
let type_float_assigned = 1.5670;
let type_bool_assigned = true;
let no_type_string_init = 'Hello World';
let no_type_string_init2 = 'Don\'t Sweat the single Quotes';
let no_type_int_init = 256;
let no_type_float_init = 1.5670;
let no_type_bool_init = true;
const const1 = 15; // const
const const2 = 'This is great!'; // const
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

function print_message() {
    print('Hello World');
}

print_message();

let Person = function() {
    this.name = ''; 
    this.age = 35; 
};

let Color = {};
(function(e) {
    e[e['Red'] = 0] = 'Red';
    e[e['Green'] = 1] = 'Green';
    e[e['Blue'] = 2] = 'Blue';
}(Color));

let my_enum = null;


// RAW ASM OUTPUT START (javascript) -------------------------
  
    console.log("Color.Red = " + Color.Red);
    console.log("Color[0] = " + Color[0]);


// RAW ASM OUTPUT END (javascript) --------------------------


let me = null;
let me1 = new Person;
let you = new Person;


// RAW ASM OUTPUT START (javascript) -------------------------
  
    console.log("ME BEFORE:");
    console.log(me);


// RAW ASM OUTPUT END (javascript) --------------------------


me = new Person;


// RAW ASM OUTPUT START (javascript) -------------------------
  
    console.log("ME AFTER:");
    console.log(me);


// RAW ASM OUTPUT END (javascript) --------------------------


// File End: input_filename


