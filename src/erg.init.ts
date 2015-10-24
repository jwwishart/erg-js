/// <reference path="erg.core.ts" />

module erg {

    export let whitespace = [
        '\r',
        '\n',
        '\t',
        ' ',
    ];

    export let operators = {
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
        '/': true,
    };

    export let keywords = {
        'asm': true,

        'void': true,
        'struct': true,
        'enum': true,
    };

    export let literals = [
        'null',
        'true',
        'false'
    ];

}