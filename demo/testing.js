// Generated: 2015-9-12 22:28
// File Start: input_filename

// RAW ASM OUTPUT START (javascript -------------------------

 
    console.log('this asm block has a semicolon after it!');


// RAW ASM OUTPUT END (javascript) --------------------------

    var type_string = '';
    var type_int = 0;
    var type_float = 0.0;
    var type_bool = false;
    var type_any = null;

;(function() {
    var type_string = 124;
}());

    var type_string_explicity_uninitialized = '';
    var type_int_explicity_uninitialized = 0;
    var type_float_explicity_uninitialized = 0.0;
    var type_bool_explicity_uninitialized = false;
    var type_any_explicity_uninitialized = null;
    var type_string_assigned = 'Hello World';
    var type_string_assigned2 = 'Don\'t Sweat the single Quotes';
    var type_int_assigned = 256;
    var type_float_assigned = 1.5670;
    var type_bool_assigned = true;
    var no_type_string_init = 'Hello World';
    var no_type_string_init2 = 'Don\'t Sweat the single Quotes';
    var no_type_int_init = 256;
    var no_type_float_init = 1.5670;
    var no_type_bool_init = true;
    var const1 = 15; // const
    var const2 = 'This is great!'; // const
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

        function print(message) {

// RAW ASM OUTPUT START (javascript -------------------------

 
        console.log("print: " + message);
    

// RAW ASM OUTPUT END (javascript) --------------------------

        }

        var Person = function() {
    this.name = ''; 
    this.age = 35; 
        };
        var Color = {};
(function(e) {
        e[e['Red'] = 0] = 'Red';
        e[e['Green'] = 1] = 'Green';
        e[e['Blue'] = 2] = 'Blue';
}(Color));
    var my_enum = null;

// RAW ASM OUTPUT START (javascript -------------------------

  
    console.log("Color.Red = " + Color.Red);
    console.log("Color[0] = " + Color[0]);


// RAW ASM OUTPUT END (javascript) --------------------------

    var me = null;
    var me1 = new Person;
    var you = new Person;

// RAW ASM OUTPUT START (javascript -------------------------

  
    console.log("ME BEFORE:");
    console.log(me);


// RAW ASM OUTPUT END (javascript) --------------------------

    me = new Person;

// RAW ASM OUTPUT START (javascript -------------------------

  
    console.log("ME AFTER:");
    console.log(me);


// RAW ASM OUTPUT END (javascript) --------------------------

// File End: input_filename


