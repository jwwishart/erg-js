// Generated: 2015-9-16 22:9

"use strict";

function print(message) { console.log(message); }

// File Start: input_filename
    print('--- Simple Tests -----------------------------');
    

    function error(message) {
        print('ERROR: ' + message);
    }

    

    function info(message) {
        print('INFO: ' + message);
    }

    

    function log(message) {
        print('LOG: ' + message);
    }

    

    function anotherError(m1,m2,m3) {
        print('another error: ' + m1 + ', ' + m2 + ', ' + m3);
    }

    error('AARRGGGHH');
    info('Did you know!');
    log('This is cool');
    anotherError('one', 'two', 'three');
    print('--- Return Types -----------------------------');
    

    function test() {
        

        function test_internal() {
            print('Hello World from test()>test_internal()');
        }

        test_internal();
    }

    test();
    print('--- Multiple Arguments -----------------------------');
    

    function where_in(the,world) {
        print(world + ' ' + the);
    }

    where_in(false, 'Is code the world? ');
    let name = 'Justin Wishart';
    let age = 35;
    

    function print_message(name,age) {
        print('Hello, my name is \'' + name + '\' and I\'m ' + age + ' years of age');
    }

    

    function print_message2(n,a) {
        print('Hello, my name is \'' + n + '\' and I\'m ' + a + ' years of age');
    }

    

    function print_message_closed() {
        print('Hello, my name is \'' + name + '\' and I\'m ' + age + ' years of age');
    }

    print_message(name, age);
    print_message2(name, age);
    print_message_closed();
    print('--- Argument Type Checking -----------------------------');
    error('error(string)');
    error(1);
    error(10.10);
    error(false);
    error(true);
    

    function only_takes_string(message) {
        print(message);
    }

    only_takes_string('cool');
    

    function some_numbers(an_int,a_float) {
        print('an_int: ' + an_int + ', a_float: ' + a_float);
    }

    some_numbers(1, 1.01);
    some_numbers(100, 124.1241);
    print('--- Function call expression ordering -----------------------------');
    

    function literal_then_message(message) {
        print('TEST: ' + message);
    }

    literal_then_message('test');
    

    function message_then_literal(message) {
        print(message + ' < was the message');
    }

    message_then_literal('test');
    print('--- Invalid Declarations -----------------------------');
// File End: input_filename


