var __global = this;
var erg;

(function() {
    'use strict';

    erg = __global.erg || {};
    __global.erg = erg;


    // NodeJS-ification
    //

    if (typeof module === 'object' && typeof module.exports === 'object') {
        __global = GLOBAL;

        // Common JS
        module.exports = erg;
    }


    // @Helpers ---------------------------------------------------------------
    //
    var has_value = function(it) {
        // NOTE(jwwishart) if undefined is redefined a 
        return it !== null && it !== void 0;
    };

    var is_array = Array.isArray || function(it) {
        return toString.call(it) === ARRAY_TYPE_STRING;
    };

    // KUDOS: is.js
    var is_object = function(it) {
        var type = typeof it;
        return type === 'function' || type === 'object' && !!it; // TODO(jwwishart) is.js... why last condition?
    };

    function each(it, callback) {
        var result,
            i,
            key;

        if (!has_value(it)) {
            return;
        }
        
        // TODO(jwwishart) test callback is a function!
        if (!callback || typeof callback !== 'function') {
            throw new Error('callback is not valid');
        }

        if (is_array(it)) {
            for (i = 0; i < it.length; i++) {
                // TODO(jwwishart) normalize undefined and nulls?
                result = callback.call(it, it[i], i);

                if (!has_value(result) || result === true) {
                    continue;
                }

                break;
            }

            return;
        }

        if (is_object(it)) {
            for (key in it) {
                if (Object.prototype.hasOwnProperty.call(it, key)) {
                    // TODO(jwwishart) normalize undefined and nulls?
                    result = callback.call(it, it[key], key);

                    if (!has_value(result) || result === true) {
                        continue;
                    }

                    break;
                }
            }
        }
    }


    // @Exports ---------------------------------------------------------------
    //  

    /// Compiles a file or files
    ///
    /// Parameters:
    ///     files   : a map of filename > code
    ///     options : a map of options for the complier 
    ///
    /// Returns:
    ///     The compiled output (JavaScript in this case)
    erg.compile = function (files, options) {
        var result = '';

        // TODO(jwwishart) in debug dump this ast.
        var program = new Program();

        each(files, function(code, filename) {
            result +=
                erg.target(
                    erg.parse(
                        filename,
                        program,
                        erg.tokenize(
                            erg.scan(filename, code))));
        });

        return result;
    };


    // @Scanner ---------------------------------------------------------------
    //

    erg.scan = function(filename, code) {
        var i = 0;
        var firstCol = 1;

        var lineNo = 1;
        var colNo = firstCol;

        return {
            peek: function() {
                if (i < code.length) {
                    return code[i];
                }

                return null;
            },
            eat: function() {
                // NOTE: Do the line and char stuff when you eat, not 
                // before!
                if (code[i] === '\n') {
                    lineNo++;
                    colNo = firstCol - 1; // we will increment by one below so we need to remove that here!
                }

                i++;
                colNo++;
            },

            get_position_info: function() {
                return {
                    lineNo: lineNo,
                    colNo: colNo,
                    filename: filename
                };
            }
        };
    };


    // @Tokenizer -------------------------------------------------------------
    //

    erg.tokenize = function(scanner) {
        var CharToToken = {
            ' '  : TOKEN_TYPE_WHITESPACE,
            '\t' : TOKEN_TYPE_WHITESPACE,
            '\n' : TOKEN_TYPE_WHITESPACE,
            '\r' : TOKEN_TYPE_WHITESPACE,

            '('  : TOKEN_TYPE_PAREN_OPEN,
            ')'  : TOKEN_TYPE_PAREN_CLOSE,

            '{'  : TOKEN_TYPE_BRACE_OPEN,
            '}'  : TOKEN_TYPE_BRACE_CLOSE,

            ';'  : TOKEN_TYPE_SEMICOLON,
            ','  : TOKEN_TYPE_COMMA,
            
            '+'  : TOKEN_TYPE_PLUS,
            '.'  : TOKEN_TYPE_DOT
            // '='  : TOKEN_TYPE_ASSIGNMENT must handle custom because of := and == etc.
        };

        var token = null;
        var c;
        var multilineCommentDepth = 0;


        // Char Traversal
        //

        function peek() {
            return scanner.peek();
        }

        function eat() {
            scanner.eat();
        }

        function set_location(token) {
            var pos = scanner.get_position_info();
            token.lineNo = pos.lineNo;
            token.colNo = pos.colNo;
            token.filename = pos.filename;
        }

        function create_token(type, text) {
            var pos = scanner.get_position_info();

            return {
                type: type,
                typeName: get_global_constant_name('TOKEN_TYPES', type),
                text: text,

                // Position
                filename: pos.filename
                lineNo: pos.lineNo,
                colNo: pos.colNo,
            };
        }


        // Parse Special Token Scenarios
        //

        function get_identifier() {
            var result = '';

            while ((c = peek()) !== null) {
                // Whitespace
                if (/[a-zA-Z0-9_]/gi.test(c) === false) {
                    // eat(); dont eat something that is not suitable
                    break;
                }

                result += c;
                eat();
            }

            return result;
        }

        function get_string_literal() {
            eat(); // Eat the initial "
            var result = '';

            // TODO(jwwishart) handle herestrings
            // TODO(jwwishart) what aout single quotes? ' maybe NOT!
            // TODO(jwwishart) character literals?
            // TODO(jwwishart) Escape characters. Implement

            while ((c = peek()) !== null) {
                // Whitespace
                if (c === '"'){
                    eat(); // Eat the final "
                    break;
                }

                result += c;
                eat();
            }

            return result;
        }

        function get_asm_block() {
            var result = '';
            var depth = 0;
            var foundStart = false;

            while ((c = peek()) !== null) {
                if (depth === 0 && foundStart) break;

                if (c === "{") {
                    if (foundStart === true) {
                        result += c;
                    }

                    foundStart = true;
                    depth++;
                    eat(); // Skip adding the opening {
                    continue; 
                }

                if (c === "}" && foundStart) {
                    depth--;

                    if (depth !== 0) {
                        result += c;
                    }

                    eat(); // Skip adding the closing }
                    continue; 
                }

                result += c;
                eat();
            }

            return result;
        }

        var SINGLE_VALUE_DIRECTIVE = false;
        var MULTIPLE_VALUE_DIRECTIVE = true;

        var directive_meta = {
            'filename': SINGLE_VALUE_DIRECTIVE
        };

        function get_directive() {
            var directive = '';
            var args = '';
            var result = '';

            /*
                There are several types of directives
                - single-value directives which just do their thing
                    ex: #filename
                - multiple value directives which go to the end of the line
                    ex: #build_target javascript es6

                We have to KNOW this at THIS point!
            */

            // parse the first bit of the token.
            while ((c = peek()) !== null) {
                var ascii = c.charCodeAt(0);
                if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || ascii < 65 || ascii > 122) {
                    break;
                }

                result += c;
                eat();
            }

            directive = result;
            result = '';

            var type = directive_meta[directive];
            if (type === SINGLE_VALUE_DIRECTIVE) {
                return directive;
            }

            while ((c = peek()) !== null) {
                if (c === '\n' || c === '\r') {
                    result += c;
                    args = result;
                    result = '';
                    break;
                }

                result += c;
                eat();
            }

            return directive + ' ' + args;
        }


        function get_number_literal() {
            var result = '';
            var is_float = false;

            // TODO(jwwishart) 3_456_789 should parse fine... easier
            // TODO(jwwishart) floats, decimal, hex, exponents etc.

            while((c = peek()) !== null) {
                // TODO(jwwishart) ignore spaces

                if (c === '.') {
                    // TODO(jwwishart) test this!
                    if (is_float === true) {
                        throw new Error("Error Trying to parse string literal: '" + result + ".' - found multiple periods while trying to parse number");
                    }

                    is_float = true;
                    result += c;
                    eat();
                    continue;
                }

                if (c >= '0' && c <= '9') {
                    result += c;
                    eat();
                    continue;
                }

                break;
            }

            return {
                result: result,
                is_float: is_float
            }
        }

        function try_map_char_to_token(c) {
            var tokKey = CharToToken[c];

            if (tokKey === undefined) {
                return null;
            }

            token = create_token(tokKey, c);
            set_location(token);
            eat();

            return token;
        }

        function eat_while_not(not) {
            while(move_next() && c !== not) {
            }
        }

        function move_next() {
            eat();
            c = peek();
            
            if (c === null) {
                return false;
            }

            return true;
        }

        // ASSUMPTION(jwwishart) /* are eaten and next c is first char of ...
        // the multiline comment contents
        function eat_multiline_comments() {
            do {
                if (c === '/' && move_next() && c === '*') {
                    multilineCommentDepth++;
                    continue;
                }

                if (c === '*' && move_next() && c === '/') {
                    multilineCommentDepth--;
                    continue;
                }

                // We have hit the end of the outermost multiline comment
                if (multilineCommentDepth === -1) {
                    multilineCommentDepth = 0; // Reset for next time!
                    break;
                }
            }  while(move_next());
        }

        return {
            peek: function() {
                var colNo = 1;

                if (token !== null) {
                    return token;
                }

                token = create_token(TOKEN_TYPE_UNKNOWN, '');

                while ((c = peek()) !== null) {
                    // Get Mappable Char to Tokens
                    var to_return = try_map_char_to_token(c);
                    if (to_return !== null) {
                        // TODO(jwwishart) for now just handle this manually
                       if (c === ' ' || c === '\t') {
                            continue;
                        }

                        return to_return;
                    }

                    // Single line Comments
                    if (c === '/') {
                        eat();

                        // TODO(jwwishart) double line comments 
                        // TODO(jwwishart) NESTED double line comments!!!

                        // Multi-line comments
                        if (peek() === '*') {
                            eat(); // eat and setup c correctly | eat_multiline_comments assumes /* is gone!
                            c = peek();
                            eat_multiline_comments();

                            continue;
                        }

                        // Single-line comments
                        if (peek() === '/') {
                            // Eat till newline
                            eat_while_not('\n');
                            
                            continue;
                        }
                    }

                    // String Literals
                    if (c === '"') {
                        token = create_token(TOKEN_TYPE_STRING_LITERAL, '"');
                        token.text = get_string_literal();

                        return token;
                    }

                    // Number Literals
                    // TODO(jwwishart) infer the type and assign with the token (float32, float64?.. assign as minimum_type_required for example
                    // TODO(jwwishart) negative numbers :oS
                    if (c >= '0' && c <= '9') {
                        token = create_token(TOKEN_TYPE_NUMBER_LITERAL, '');
                        

                        var number_result = get_number_literal();
                        token.text = number_result.result;
                        token.is_float = number_result.is_float;

                        return token;
                    }

                    if (c === ':') {
                        colNo = scanner.get_position_info().colNo;

                        eat();

                        if (peek() === ':') {
                            token = create_token(TOKEN_TYPE_DOUBLE_COLON, c);

                            eat();
                        } else if (peek() === '=') {
                            token = create_token(TOKEN_TYPE_COLON_EQUALS, c);

                            eat();
                        } else {
                            // TODO(jwwishart) Get the type identifier
                            // TODO(jwwishart) Verify the type is in scope! (in the parser!)
                            token = create_token(TOKEN_TYPE_SINGLE_COLON, c);
                        }

                        token.colNo = colNo;

                        return token;
                    }

                    if (c === '=') {
                        token = create_token(TOKEN_TYPE_ASSIGNMENT, '=');
                        eat();
                        return token;
                    }

                    if (c === '-') {
                        eat();
                        if (peek() === '-') {
                            // TODO(jwwishart) decrement operator
                            eat();

                            if (peek() === '-') {
                                token = create_token(TOKEN_TYPE_UNINITIALIZE_OPERATOR, '---');
                                eat();
                                return token;
                            }
                        }
                        // TODO(jwwishart) minus
                    }

                    if (c === '#') {
                        eat();

                        var directive = get_directive();
                        token = create_token(TOKEN_TYPE_DIRECTIVE, directive);
                        return token;
                    }

                    if (/[a-zA-Z]/gi.test(c)) {
                        // Identifier...
                        //

                        token = create_token(TOKEN_TYPE_IDENTIFIER, '');
                        token.text = get_identifier();
                        
                        // ... but it maybe a ...

                        // KEYWORD
                        //

                        if (token.text === "asm") {
                            token = create_token(TOKEN_TYPE_ASM_BLOCK, '')

                            // Parse asm block!
                            var asm = get_asm_block();
                            token.text = asm;
                        }

                        if (token.text === "defer") {
                            token = create_token(TOKEN_TYPE_KEYWORD_DEFER, 'defer');
                        }

                        if (token.text === "return") {
                            token = create_token(TOKEN_TYPE_KEYWORD_RETURN, 'return');
                        }

                        return token;
                    }

                    var errorCharInfo = scanner.get_position_info();

                    throw new Error("ERROR: Unexpected character '" + c + "' (ASCII: ' + c.charCodeAt(0) + ') (ln: " + errorCharInfo.lineNo + ", col: " + errorCharInfo.colNo +")");
                }

                return null;
            },

            eat: function() {
                token = null;
            }
        };
    };


    // @Parser ----------------------------------------------------------------
    //

    /// Parses tokens and constructs an ast on the program
    /// ast node that is passed in.
    ///
    /// Parameters:
    ///     files   : a map of filename > code
    ///     options : a map of options for the complier 
    ///
    /// Returns:
    ///     The compiled output (JavaScript in this case)
    erg.parse = function(filename, program, tokenizer) {
        
        // Helper Functions
        //

        function peek() {
            return tokenizer.peek();
        }

        function eat() {
            tokenizer.eat();
        }


        // File Node Construction
        //

        var file = new File(filename, program);
        program.files.push(file);


        // Construct Context helper object
        // 


// UPTO HERE
// UPTO HERE
// UPTO HERE
// UPTO HERE
// UPTO HERE
        var context = {
            filename: filename,
            program: program,
            tokenizer: tokenizer
        };

        // Parse File
        //

        var scope = file.scope;
        while (peek() !== null) {
            parse_scope(scope, tokenizer);
        }
    }


    // @Ast Nodes -------------------------------------------------------------
    //

    function AstNode() {
    }


    function Program() {
        'use strict';

        if (this === undefined) {
            throw new Error("Program not called as a constructor");
        }

        this.files = [];
        this.compileOptions = {};
    }
    Program.prototype = new AstNode();


    function File(name, program) {
        this.name = name;
        this.program = program;

        this.scope = new Scope(this);
    }
    File.prototype = new AstNode();


    function Scope(parent) {
        this.parent = parent;

        this.statements = [];
        this.deferred = [];
    }
    Scope.prototype = new AstNode();



}(this));