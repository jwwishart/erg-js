'use string';

var fs = require('fs');
var path = require('path');
var erg = require('../src/erg.js');
var dir = __dirname;

console.log('ergjs | (C) 2015 Justin Wishart - Version 0.0.3\n');


function getFileContents(path) {
    return fs.readFileSync(path, { encoding: 'utf-8' });
}

function writeJavaScript(path, contents) {
    fs.writeFileSync(path, contents, { encoding: 'utf-8'});
}


var toCompile = [];

if (process.argv.length > 2) {
    // TODO(jwwishart) push the rest on.
    toCompile.push({
        path: process.argv[2],
        contents: getFileContents(process.argv[2])
    });

    console.log(JSON.stringify(toCompile));
}

if (toCompile.length > 0) {
    var filename = path.basename(toCompile[0].path, '.erg');

    var input_filename = '.erg';

    var output = erg.compile({
        input_filename: toCompile[0].contents
    },{
        target: 'node' // TODO(jwwishart): this is v4+ what about node-legacy ?
    });
    
    var newFilename =  filename + '.js';
    
    writeJavaScript(newFilename, output);
}

console.log("\nCompilation Completed ----------------------------\n\n");