/// <reference path="erg.core.ts" />
var erg;
(function (erg) {
    erg.whitespace = [
        '\r',
        '\n',
        '\t',
        ' ',
    ];
    erg.operators = {
        ';': true,
        '{': true,
        '}': true,
        '(': true,
        ')': true,
        ':': true,
        ':=': true,
        '::': true,
        '=': true,
        '--': true,
        '---': true,
        '#': true,
        '+': true,
        '-': true,
        '*': true,
        '/': true
    };
    erg.keywords = [
        'asm',
        'void',
        'struct',
        'enum',
    ];
    erg.literals = [
        'null',
        'true',
        'false'
    ];
})(erg || (erg = {}));
