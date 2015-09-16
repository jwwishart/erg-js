// Generated: 2015-9-16 20:26

"use strict";

function print(message) { console.log(message); }

// File Start: input_filename
try {
    print('\nThe start of defer.erg\n');
    

    function something() {
        print('something() start ---------');
        print('one');
        print('two');
        print('three');
        print('something() end   ---------');
    }

    

    function something_with_mixed_calls() {
        try {
            print('something_with_mixed_calls() start ---------');
            print('two');
            print('something_with_mixed_calls() end ---------');
        } catch (e) { 
        } finally { 
            print('three');
            print('one');
        }
    }

    

    function something_with_defer() {
        try {
            print('something_with_defer() start ---------');
            print('something_with_defer() end   ---------');
        } catch (e) { 
        } finally { 
            print('three');
            print('two');
            print('one');
        }
    }

    something();
    print('\n');
    something_with_mixed_calls();
    print('\n');
    something_with_defer();
    print('\n');
} catch (e) { 
} finally { 
    print('The end of defer.erg');
}
// File End: input_filename


