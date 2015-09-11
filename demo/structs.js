// Generated: 2015-9-11 20:35
// File Start: input_filename
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


