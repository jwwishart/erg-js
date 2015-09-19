'use string';

var fs = require('fs');
var path = require('path');
var erg = require('../../src/erg.js');
var dir = __dirname;

console.log("-------------------------------------------------------------------------------");
console.log("                         Running Error Scenario Tests                          ");
console.log("-------------------------------------------------------------------------------\n");

function getFileContents(path) {
    return fs.readFileSync(path, { encoding: 'utf-8' });
}

function writeJavaScript(path, contents) {
    fs.writeFileSync(path, contents, { encoding: 'utf-8'});
}

var files = fs.readdirSync(dir)
              .filter(function(file) {
                    var isFile = fs.statSync(path.resolve(dir, file)).isFile();
                    var filename = path.basename(file);
                    var extension = path.extname(file);

                    // Chapters start with zero (at least 1!) and are markdown files!
                    return isFile === true && extension === '.erg';
               });


var successful_tests = 0;
var failing_tests = 0

function run_test(input_path) {
    var filename = path.basename(input_path, '.erg');
    var contents = getFileContents(input_path);
    var test_description = contents.split('\n')[0].substring(3);

    var to_compiler = [];

    to_compiler.push({
        path: filename,
        contents: contents
    });

    var failed = false;
    var failed_exception = '';
    try {
        var results = erg.compile({ 
            filename: contents 
        }, { 
            target: 'es5',
            suppress_errors: true,
            logger: {
                error: function(group, message) {
                    failed_exception = message;
                }
            }
        });
    } catch (e) {
        failed = true;
        //console.log(e.toString());
        if (e.toString() !== 'Error: Compilation cancelled!') {
            throw new Error("TEST '" + input_path + "' threw an error. Check whether it is a failing test: " + e.toString());
        }
    }

    if (failed === false) {
        console.log("----- FAIL: " + test_description);
        console.log("----- File: " + filename + ".erg\n");
        console.log("\n\n");
        failing_tests++;
    } else {
        console.log("----- SUCCESS: " + test_description);
        console.log("----- File: " + filename + ".erg\n");
        console.log(failed_exception);
        console.log("\n\n");
        successful_tests++;
    }
}

for (var i = 0; i < files.length; i++) {
    run_test(files[i]);
}

console.log("RESULTS -----------------------------------------------------------------------")
console.log("Successful: " + successful_tests + "\nFailing:    " + failing_tests);

// if (failing_tests.length > 0) {

//     for (var i = 0; i < failing_tests.length; i++) {
//         console.log(failing_tests[i]);
//     }
// }

// if (successful_tests.length > 0) {

//     for (var i = 0; i < successful_tests.length; i++) {
//         console.log(successful_tests[i]);
//     }
// }