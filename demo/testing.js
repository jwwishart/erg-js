// Generated: 2015-9-16 22:10

"use strict";

function print(message) { console.log(message); }

// File Start: input_filename
    print('--- Simple Tests -----------------------------');
    

    function test() {
        

        function test_internal() {
            print('Hello World from test()>test_internal()');
        }

        test_internal();
    }

    test();
    let d = 125;
    

    function output(name,age,weight) {
        

// RAW ASM OUTPUT START (javascript) -------------------------
         
        console.log("Name: " + name + ", Age: " + age + ", Weight: " + weight);
    
        
// RAW ASM OUTPUT END (javascript) --------------------------


    }

    output('jwwishart', 35, 80.51);
// File End: input_filename


