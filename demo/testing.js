;(function(global){
  try {
  console.log("start of " + "testing.erg");
  function print_uppercase(str) {

// RAW ASM OUTPUT START (javascript -------------------------

console.log(str.toUpperCase());

// RAW ASM OUTPUT END (javascript) --------------------------

  }
  function dump_code_file(filename) {
    try {
    console.log("\n\nSTART OF " + "testing.erg" + " contents");

// RAW ASM OUTPUT START (javascript -------------------------

// So the code works in the browser
        if (global.document) {
            var codeTextArea = document.getElementById("code");
            console.log(codeTextArea.value);
            return;
        }

        // NODE! Read THIS file and output it to the console
        var fs = require('fs');
        var path = require('path');

        function get_file_contents(path) {
            return fs.readFileSync(path, { encoding: 'utf-8' });
        }

        var contents = get_file_contents(filename);

        console.log(contents);

// RAW ASM OUTPUT END (javascript) --------------------------

    } finally {
        console.log("\n\nEND OF " + "testing.erg" + " contents");
    }
  }
  print_uppercase("Compiling File: " + "testing.erg");
  var prefix1 = "Prefix 1: ";
  var prefix2 = "Prefix 2: ";
  var prefix3 = "";
  prefix3 = "Prefix 3: ";
  print_uppercase(prefix1 + "testing.erg");
  print_uppercase(prefix2 + "testing.erg");
  print_uppercase(prefix3 + "testing.erg");
  print_uppercase("testing.erg" + " is being compiled...");
  dump_code_file("testing.erg");
  } finally {
    console.log("end of " + "testing.erg");
  }
}(this));