/*
    Copyright (c) 2015 Justin Wishart

    License: See LICENSE.txt at the root of this repository
*/

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

    erg.VERSION = [0,0,4];


    // @Helpers ---------------------------------------------------------------
    //

    var has_value = function(it) {
        // NOTE(jwwishart) if undefined is redefined a 
        return it !== null && it !== void 0;
    };

    var is_array = Array.isArray || function(it) {
        return toString.call(it) === ARRAY_TYPE_STRING;
    };

    var is_string = function(value) {
        return Object.prototype.toString.call(value) === '[object String]';
    };

    // KUDOS: is.js
    var is_object = function(it) {
        var type = typeof it;
        return type === 'function' || type === 'object' && !!it; // TODO(jwwishart) is.js... why last condition?
    };

    // KUDOS: is.js
    var is_function = function(it) {
        return toString.call(it) === '[object Function]' || typeof it === 'function';
    };

    function each(it, callback) {
        var result,
            i,
            key;

        if (!has_value(it)) {
            return;
        }
        
        if (!has_value(callback) || !is_function(callback)) {
            throw new Error('callback either was not given or it was not passed a function');
        }

        if (is_array(it)) {
            for (i = 0; i < it.length; i++) {
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
                    result = callback.call(it, it[key], key);

                    if (!has_value(result) || result === true) {
                        continue;
                    }

                    break;
                }
            }
        }
    }

    function array_copy_and_reverse(arr) {
        var result = [];

        for (var i = arr.length - 1; i >=0; i--) {
            result.push(arr[i]);
        }

        return result;
    }

    function generate_global_constants(setName, arr) {
        if (!erg._global_constants) {
            erg._global_constants = [];
        }

        erg._global_constants[setName] = erg._global_constants[setName] || {};

        var i = 0;

        for (var k in arr) {
            erg._global_constants[setName][arr[k]] = __global[arr[k]] = i++;
            erg._global_constants[setName][k] = arr[k];
        }
    }

    function get_global_constant_name (setName, number) {
        return erg._global_constants[setName][number];
    }


    // @Exports ---------------------------------------------------------------
    //  

    var CompilerContext = function(program, files, options) {
        this.program = program;
        this.files = files;
        
        options = options || {};

        this.options = {
            target: options.target || 'es5',

            // Suppresses writing errors
            suppress_errors: options.suppress_errors || false
        };

        this.logger = options && options.logger;

        this.current_filename = '';
        this.current_code = '';

        this.unresolved_types = [];
    };

    erg.CompilerContext = CompilerContext;

    erg.CompilerContext.prototype.info = function(group, message) {
        if (this.logger && this.logger.info) {
            this.logger.info(group, message);
        }
    };

    erg.CompilerContext.prototype.error = function(group, message) {
        if (this.logger && this.logger.error) {
            this.logger.error(group, message);
        }
    };


    function PARSE_ERROR(location_info, message) {
        throw new Error("*** INCOMPLETE ERROR HANDLER ***\n" + message);
    }

    function TOKEN_ERROR(token, message) {
        // TODO(jwwishart) this should always get this info?
        if (token == null) {
            token = {};
            token.filename = 'unknown';
            token.line = -1;
            token.col = -1
        }

        // Assume by default that location_info is a lexeme!
        var file = token.filename;
        var line = token.line_no;
        var col  = token.col_no;

        var col_indicator_line = '';

        for (var i = 1; i < col; i++) {
            col_indicator_line += ' ';
        }
        col_indicator_line += '^'

        var message = "ERROR: (" + file + " ln: " + line + ", col: " + col + ")\n" +
            message + "\n" +
            _current_compiler_context.current_code.split('\n')[line - 1] + "\n" +
            col_indicator_line;

        if (_current_compiler_context == null || _current_compiler_context.options == null ||
            !_current_compiler_context.options.suppress_errors) 
        {
            console.error(message);
        }

        _current_compiler_context.error("Compiler", message);

        throw new Error("*** Compilation cancelled! ***");
    }


    var _current_compiler_context = null;

    /// Compiles a file or files
    ///
    /// Parameters:
    ///     files   : a map of filename > code
    ///     options : a map of options for the complier 
    ///
    /// Returns:
    /// The compiled output (JavaScript in this case)
    erg.compile = function (files, options) {
        var result = '';

        // TODO(jwwishart) in debug dump this ast.
        // TODO(jwwishart) to dump the ast iterate and remove parents from each scope type...
        //  so that we don't get circular json issues :oS OR Parse the thing manually.
        var program = new Program();
        var context = new erg.CompilerContext(program, files, options);

        _current_compiler_context = context;

        context.DEBUG && console.log(context);

        each(files, function(code, filename) {
            // Set current file information to context
            context.current_filename = filename;
            context.current_code     = code;

            // Process the file!
            var scanner = erg.scan(context);
            var tokenizer = erg.tokenize(context, scanner);
            
            erg.parse(context, tokenizer);
            //erg.type_inference(context);

            result += erg.target(context) + "\n\n\n";
        });

        return result;
    };


    // @Scanner ---------------------------------------------------------------
    //

    erg.scan = function(context) {
        var filename = context.current_filename;
        var code = context.current_code;

        var i = 0;
        var first_col = 1;

        var line_no = 1;
        var col_no = first_col;

        return {
            peek: function() {
                if (i < code.length) {
                    return code[i];
                }

                return null;
            },

            eat: function() {
                context.DEBUG && context.log("SCANNER", code[i] + " - " + JSON.stringify(this.peek()));

                // NOTE: Do the line and char stuff when you eat, not before!
                if (code[i] === '\n') {
                    line_no++;
                    col_no = first_col - 1; // we will increment by one below so we need to remove that here!
                }

                i++;
                col_no++;
            },

            assign_location: function(token) {
                token.filename = filename;
                token.line_no = line_no;
                token.col_no = col_no;
                token.text = this.peek();
            }
        };
    };


    // @Tokenizer -------------------------------------------------------------
    //

    generate_global_constants('TOKEN_TYPES', [

        // Special
        //

        'TOKEN_TYPE_DIRECTIVE',
        'TOKEN_TYPE_EOF',       // Handled at end of peek in tokenizer
        'TOKEN_TYPE_ASM_BLOCK', // handled in identifier/keyword part of tokenizer


        // Trivia
        // 

        'TOKEN_TYPE_TRIVIA_NEWLINE',    // \n, \r, \r\n
        'TOKEN_TYPE_TRIVIA_WHITESPACE', // /t, ' ' or big string of 'em
        'TOKEN_TYPE_TRIVIA_COMMENT_LINE',
        'TOKEN_TYPE_TRIVIA_COMMENT_MULTIPLE',


        // Literals
        //

        'TOKEN_TYPE_LITERAL_STRING',    // ""
        'TOKEN_TYPE_LITERAL_NUMBER',    // 123, 5123515



        // Operators
        //
        
        'TOKEN_TYPE_OPERATOR_SEMICOLON',        // ;
        'TOKEN_TYPE_OPERATOR_PERIOD',           // . (member, floats etc)
        'TOKEN_TYPE_OPERATOR_COMMA',            // , 
        'TOKEN_TYPE_OPERATOR_PAREN_OPEN',       // (
        'TOKEN_TYPE_OPERATOR_PAREN_CLOSE',      // )
        'TOKEN_TYPE_OPERATOR_BRACE_OPEN',       // {
        'TOKEN_TYPE_OPERATOR_BRACE_CLOSE',      // }
        'TOKEN_TYPE_OPERATOR_UNINITIALIZED',    // ---

        'TOKEN_TYPE_OPERATOR_COLON',          // :
        'TOKEN_TYPE_OPERATOR_DECLARE_ASSIGN',   // :=

        // Math
        'TOKEN_TYPE_OPERATOR_PLUS',             // + (includes string concat)
        'TOKEN_TYPE_OPERATOR_PLUS_EQUALS',      // +=
        'TOKEN_TYPE_OPERATOR_MINUS',            // -
        'TOKEN_TYPE_OPERATOR_MINUS_EQUALS',     // -=
        'TOKEN_TYPE_OPERATOR_MULTIPLY',         // *
        'TOKEN_TYPE_OPERATOR_MULTIPLY_EQUALS',  // *=
        'TOKEN_TYPE_OPERATOR_DIVIDE',           // /
        'TOKEN_TYPE_OPERATOR_DIVIDE_EQUALS',    // /=
        'TOKEN_TYPE_OPERATOR_REMAINDER',        // %
        'TOKEN_TYPE_OPERATOR_REMAINDER_EQUALS', // %=

        // Unary Operators
        'TOKEN_TYPE_OPERATOR_NEGATE',       // !
        'TOKEN_TYPE_OPERATOR_INCREMENT',    // ++
        'TOKEN_TYPE_OPERATOR_DECREMENT',    // --

        // Assignment and Comparison
        'TOKEN_TYPE_OPERATOR_ASSIGNMENT',               // =
        'TOKEN_TYPE_OPERATOR_EQUALS',                   // ==
        'TOKEN_TYPE_OPERATOR_NOT_EQUALS',               // !=
        'TOKEN_TYPE_OPERATOR_LESS_THAN',                // <
        'TOKEN_TYPE_OPERATOR_LESS_THAN_EQUAL_TO',       // <=
        'TOKEN_TYPE_OPERATOR_GREATER_THAN',             // >
        'TOKEN_TYPE_OPERATOR_GREATER_THAN_EQUAL_TO',    // >=

        // Binary
        'TOKEN_TYPE_OPERATOR_AND',          // &&
        'TOKEN_TYPE_OPERATOR_OR',           // ||
        
        // Bitwise
        'TOKEN_TYPE_OPERATOR_AND_BITWISE',  // &
        'TOKEN_TYPE_OPERATOR_OR_BITWISE',   // |


        // Identifiers
        // 

        'TOKEN_TYPE_IDENTIFIER',


        // Keywords
        // 

        'TOKEN_TYPE_KEYWORD_NULL',
        'TOKEN_TYPE_KEYWORD_VOID',
        'TOKEN_TYPE_KEYWORD_STRUCT',
        'TOKEN_TYPE_KEYWORD_ENUM',
        'TOKEN_TYPE_KEYWORD_NEW',
        'TOKEN_TYPE_KEYWORD_TRUE',
        'TOKEN_TYPE_KEYWORD_FALSE'
    ]);


    var Token = function(type) {
        this.type = type;
        this.type_name = get_global_constant_name('TOKEN_TYPES', type);
    };

    erg.Token = Token;

    erg.tokenize = function(context, scanner) {
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

        function create_token(type) {
            var result = new Token(type);

            scanner.assign_location(result);

            return result;
        }

        function handle_single_character_token(type) {
            var result = create_token(type);
            eat();
            c = peek();
            return result;
        }


        // Parse Special Token Scenarios
        //

        function get_identifier() {
            var result = '';

            while ((c = peek()) !== null) {
                // Whitespace
                // TODO(jwwishart) unicode characters?
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

        // TODO(jwwishart) move this into a plugin system that is called...
        //  at different stages (token, and parsing, and handle picks right place 
        //  to take action.
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


        // WARNING(jwwishart) we are just parsing numbers, we don't care about
        //  floats... that will be a number, a period and another number (3 tokens)
        function get_number_literal() {
            var result = '';
            var is_float = false;

            // TODO(jwwishart) 3_456_789 should parse fine... easier
            // TODO(jwwishart) floats, decimal, hex, exponents etc.

            while ((c = peek()) !== null) {
                if (c >= '0' && c <= '9') {
                    result += c;
                    eat();
                    continue;
                }

                break;
            }

            return result;
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
        function get_multiline_comments() {
            var results = '/*';

            do {
                results += peek();

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

            return results + '*/';
        }

        function is_newline() {
            return c === '\r' || c === '\n';
        }

        function is_whitespace() {
            return c === '\t' || c === ' ';
        }

        function get_singleline_comment() {
            var result = '//';

            // TODO(jwwishart) handle \r\n scenario
            // TODO(jwwishart) handle unicode characters for newlines?
            while (move_next() && !is_newline()) {
                result += c;
            }

            return result;
        }

        return {
            peek: function() {
                var colNo = 1;

                if (token !== null) {
                    return token;
                }

                while ((c = peek()) !== null) {

                    // Special
                    // 

                    if (c === '#') {
                        eat();

                        var directive = get_directive();
                        token = create_token(TOKEN_TYPE_DIRECTIVE, directive);
                        return token;
                    }


                    // Trivia
                    //
                    {
                        // TOKEN_TYPE_TRIVIA_NEWLINE
                        if (is_newline()) {
                            token = create_token(TOKEN_TYPE_TRIVIA_NEWLINE, c);

                            if (c === '\r') {
                                eat(); // \r

                                c = peek();
                                if (c === '\n') {
                                    token.text += c;
                                    eat() // \n (2nd part of \r\n combination
                                }
                            } else {
                                eat(); // \r, \n
                            }

                            return token;
                        }

                        if (is_whitespace()) {
                            token = create_token(TOKEN_TYPE_TRIVIA_WHITESPACE, c);
                            eat();

                            while ((c= peek() !== null) && is_whitespace()) {
                                token.text += c;
                                eat();
                                c = peek();
                            }

                            return token;
                        }

                        // Comments
                        if (c === '/') {
                            token = create_token(TOKEN_TYPE_TRIVIA_COMMENT_LINE, '');

                            eat();

                            // TOKEN_TYPE_TRIVIA_COMMENT_MULTIPLE
                            if (peek() === '*') {
                                eat(); // eat and setup c correctly | eat_multiline_comments assumes /* is gone!
                                c = peek();

                                token.type = TOKEN_TYPE_TRIVIA_COMMENT_MULTIPLE;
                                token.text = get_multiline_comments();

                                return token;
                            }

                            // TOKEN_TYPE_TRIVIA_COMMENT_LINE
                            if (peek() === '/') {
                                // NOTE(jwwishart) type is correct already!
                                token.text = get_singleline_comment();
                                
                                return token;
                            }
                        }
                    }


                    // Literals
                    //
                    {
                        // NOTE: bool uses true/false keywords and are handled there!

                        // TOKEN_TYPE_LITERAL_STRING
                        if (c === '"') {
                            token = create_token(TOKEN_TYPE_LITERAL_STRING, '"');
                            token.text = get_string_literal();

                            return token;
                        }

                        // TOKEN_TYPE_LITERAL_NUMBER
                        //   WARNING(jwwishart) numbers don't include sign (+, -) nor does...
                        //    it include decimal places... the ',' and decimal portions are
                        //    both separate tokens!

                        if (c >= '0' && c <= '9') {
                            token = create_token(TOKEN_TYPE_LITERAL_NUMBER, '');
                            token.text = get_number_literal();

                            return token;
                        }
                    }


                    // Operators
                    //
                    {
                        // Single Character Tokens
                        if (c === ';') return handle_single_character_token(TOKEN_TYPE_OPERATOR_SEMICOLON);
                        if (c === '.') return handle_single_character_token(TOKEN_TYPE_OPERATOR_PERIOD);
                        if (c === ',') return handle_single_character_token(TOKEN_TYPE_OPERATOR_COMMA);
                        if (c === '(') return handle_single_character_token(TOKEN_TYPE_OPERATOR_PAREN_OPEN);
                        if (c === ')') return handle_single_character_token(TOKEN_TYPE_OPERATOR_PAREN_CLOSE);
                        if (c === '{') return handle_single_character_token(TOKEN_TYPE_OPERATOR_BRACE_OPEN);
                        if (c === '}') return handle_single_character_token(TOKEN_TYPE_OPERATOR_BRACE_CLOSE);
                        
                        // :
                        // :=
                        if (c === ':') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_COLON);

                            if (c === '=') { // :=
                                token.type = TOKEN_TYPE_OPERATOR_DECLARE_ASSIGN;
                                token.text = ':=';
                                eat();
                                return token;
                            }

                            return token;
                        }

                        // +
                        // ++
                        // +=
                        if (c === '+') { // +
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_PLUS);

                            if (c === '+') { // ++
                                token.type = TOKEN_TYPE_OPERATOR_INCREMENT;
                                token.text += '+';
                                eat();
                                return token;
                            }
                            
                            if (c === '=') { // +=
                                token.type = TOKEN_TYPE_OPERATOR_PLUS_EQUALS;
                                token.text += '=';
                                eat();
                                return token;
                            }

                            return token;
                        }

                        // -
                        // --
                        // -=
                        if (c === '-') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_MINUS);

                            if (c === '-') { // --
                                token.type = TOKEN_TYPE_OPERATOR_INCREMENT;
                                token.text = '--';
                                eat();

                                if (c === '-') { // ---
                                    eat();
                                    token.type = TOKEN_TYPE_OPERATOR_UNINITIALIZED;
                                    token.text = '---'
                                    eat();
                                }

                                return token;   
                            }

                            if (c === '=') { // -=
                                token.type = TOKEN_TYPE_OPERATOR_MINUS_EQUALS;
                                token.text = '-=';
                                eat();
                                return token;
                            }

                            return token;
                        }

                        // *
                        // *=
                        if (c === '*') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_MULTIPLY);

                            if (c === '=') { // *=
                                eat();
                                token.type = TOKEN_TYPE_OPERATOR_MULTIPLY_EQUALS;
                                token.text = '*=';
                            }

                            return token;
                        }

                        // /
                        // /=
                        if (c === '/') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_DIVIDE);

                            if (c === '=') { // /=
                                eat();
                                token.type = TOKEN_TYPE_OPERATOR_DIVIDE_EQUALS;
                                token.text = '/=';
                            }

                            return token;
                        } 

                        // %
                        // %=
                        if (c === '%') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_REMAINDER);
                            
                            if (c === '=') { // %=
                                eat();
                                token.type = TOKEN_TYPE_OPERATOR_REMAINDER_EQUALS;
                                token.text = '%=';
                            }

                            return token;
                        } 

                        // =
                        // ==
                        if (c === '=')  {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_ASSIGNMENT);
                            
                            if (c === '=') { // ==
                                eat();
                                token.type = TOKEN_TYPE_OPERATOR_EQUALS;
                                token.text = '==';
                            }

                            return token;
                        }

                        // !
                        // !=
                        if (c === '!') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_NEGATE);
                            
                            if (c === '=') { // !=
                                eat();
                                token.type = TOKEN_TYPE_OPERATOR_NOT_EQUALS;
                                token.text = '!=';
                            }

                            return token;
                        }

                        // <
                        // <=
                        if (c === '<') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_LESS_THAN);
                            
                            if (c === '=') { // <=
                                eat();
                                token.type = TOKEN_TYPE_OPERATOR_LESS_THAN_EQUAL_TO;
                                token.text = '<=';
                            }

                            return token;
                        }

                        // >
                        // >=
                        if (c === '>') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_GREATER_THAN);
                            
                            if (c === '=') { // >=
                                eat();
                                token.type = TOKEN_TYPE_OPERATOR_GREATER_THAN_EQUAL_TO;
                                token.text = '>=';
                            }

                            return token;
                        }

                        // &
                        // &&
                        if (c === '&') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_AND_BITWISE);
                            
                            if (c === '&') {
                                eat();
                                token.type = TOKEN_TYPE_OPERATOR_AND;
                                token.text += '&';
                            }

                            return token;
                        }

                        // |
                        // ||
                        if (c === '|') {
                            token = handle_single_character_token(TOKEN_TYPE_OPERATOR_OR_BITWISE);
                            
                            if (c === '|') {
                                eat();
                                token.type = TOKEN_TYPE_OPERATOR_OR;
                                token.text += '|';
                            }

                            return token;
                        }


                    }


                    // Identifiers and keywords
                    //

                    if (/[a-zA-Z_]/gi.test(c)) {
                        // Identifier...
                        //

                        token = create_token(TOKEN_TYPE_IDENTIFIER, '');
                        var col = token.col_no; // Needs to be at start of identifier!
                        token.text = get_identifier();


                        // Keywords
                        //


                        if (token.text === "null")   create_token(TOKEN_TYPE_KEYWORD_NULL,      'null');
                        if (token.text === "void")   create_token(TOKEN_TYPE_KEYWORD_VOID,      'void');

                        if (token.text === "struct") create_token(TOKEN_TYPE_KEYWORD_STRUCT,    'struct');
                        if (token.text === "enum")   create_token(TOKEN_TYPE_KEYWORD_ENUM,      'enum');
                        if (token.text === "new")    create_token(TOKEN_TYPE_KEYWORD_NEW,       'new');

                        if (token.text === "true")   create_token(TOKEN_TYPE_KEYWORD_TRUE,      'true');
                        if (token.text === "false")  create_token(TOKEN_TYPE_KEYWORD_FALSE,     'false');

                        if (token.text === "asm") {
                            token = create_token(TOKEN_TYPE_ASM_BLOCK, '')

                            // Parse asm block!
                            var asm = get_asm_block();
                            token.text = asm;
                            token.lexeme.col_no = col;
                        }

                        return token;
                    }


                    // UNKNOWN TOKEN!
                    //

                    var error_char_info = scanner.get_lexeme();

                    TOKEN_ERROR({ filename: context.current_filename, line_no: error_char_info.line_no, col_no: error_char_info.col_no },
                          "Syntax error, unexpected token " + error_char_info.text);
                }


                // EOF
                //

                token = create_token(TOKEN_TYPE_EOF, '');
                return token;
            },

            eat: function() {
                context.DEBUG && context.log("TOKENIZERE", JSON.stringify(token));
                token = null;
            }
        };
    };


    // @Parser ----------------------------------------------------------------
    //

    (function() {
        var context = null;
        var tokenizer = null;

        var gathered_trivia = [];

        // TODO(jwwishart) finish this off!)
        var past_tokens = [];


        /// Parses tokens and constructs an ast on the program
        /// ast node that is passed in.
        ///
        /// Parameters:
        ///     files   : a map of filename > code
        ///     options : a map of options for the complier 
        erg.parse = function(context_arg, tokenizer_arg) {
            past_tokens = []; // Queue for non-whitespace tokens only. Handled in eat();

            context = context_arg;
            tokenizer = tokenizer_arg;


            // File Node Construction
            //

            var file = new File(context.program, context.current_filename);
            context.program.files.push(file);


            // Parse File
            //

            var scope = file;

            // TODO(jwwishart) need to handle this and make sure that everything...
            //  actually returns correct true/false values.
            return parse_file(scope);
        };


        // @Parser-Helpders ---------------------------------------------------
        //

        function peek() {
            return tokenizer.peek();
        }

        function eat_only() {
            tokenizer.eat();
        }

        function eat(item) {
            if (item != null) apply_pre_trivia(item);

            tokenizer.eat();

            if (item != null) parse_trivia();
            if (item != null) apply_post_trivia(item);
        }

        function accept(token_type) {
            if (peek().type === TOKEN_TYPE_EOF) {
                return false;
            }

            if (is_array(token_type)) {
                var found = false;

                each(token_type, function(val) {
                    if (peek().type === val) {
                        found = true;
                        return false;
                    }
                });

                if (found === true) return true;
            } else {
                if (peek().type === token_type) {
                    return true; // The requested token
                }
            }

            return false; // Not the requested token
        }

        function expect(token_type) {
            if (peek().type === TOKEN_TYPE_EOF) {
                // TODO(jwwishart) if the line is blank move back to previous non-blank line and ...
                //  find the last non-whitespace character... that ought to be the location!
                // TODO(jwwishart) perf?
                var location_info = {
                    filename: _current_compiler_context.current_filename,
                    line_no:  _current_compiler_context.current_code.split("\n").length,
                    col_no:   _current_compiler_context.current_code.split("\n")[_current_compiler_context.current_code.split("\n").length-1].length + 1,
                };

                ERROR(location_info, "Unexpected end of file. Was expecting token of type: " + get_global_constant_name('TOKEN_TYPES', token_type));
            }

            if (is_array(token_type)) {
                var found_match = false;

                each(token_type, function(val) {
                    if (peek().type === val) {
                        found = true;
                        return false;
                    }
                });

                if (found === true) return true;


                var token_labels = [];
                each(token_type, function(item) {
                    token_labels.push(get_global_constant_name('TOKEN_TYPES', item));
                });

                ERROR(peek(), "Unexpected token: Expecting one of " + token_labels.join(",") + " but got a " + get_global_constant_name('TOKEN_TYPES', peek().type));
            } else {
                if (peek().type !== token_type) {
                    ERROR(peek(), "Unexpected token: Expecting " + get_global_constant_name('TOKEN_TYPES', token_type) + " but got a " + get_global_constant_name('TOKEN_TYPES', peek().type));
                }
            }

            return true;
        }

        function apply_pre_trivia(item) {
            item.pre_trivia = gathered_trivia;
            gathered_trivia = [];
        }

        function apply_post_trivia(item) {
            item.post_trivia = gathered_trivia;
            gathered_trivia = [];
        }


        // @Parse Functions ---------------------------------------------------
        //

        function parse_file(scope) {
            return parse_statement_block(scope);
        }

        function parse_statement_block(scope) {
            while (parse_statement(scope)) {
                var field_decl = scope.items[scope.items.length - 1];

                if (peek().type !== TOKEN_TYPE_OPERATOR_BRACE_CLOSE &&
                    peek().type !== TOKEN_TYPE_EOF) 
                {
                    expect(TOKEN_TYPE_OPERATOR_SEMICOLON);
                } else {
                    break;
                }
            }

            return true;
        }

        function parse_statement(scope) {
            if (parse_identifier(scope)) return true;

            if (parse_if_statement(scope)) return true;
            if (parse_asm_statement(scope)) return true;

            if (parse_empty_statement(scope)) return true;

            return false;
        }

        function parse_trivia() {
            while (accept(TOKEN_TYPE_TRIVIA_NEWLINE)
                || accept(TOKEN_TYPE_TRIVIA_WHITESPACE)
                || accept(TOKEN_TYPE_TRIVIA_COMMENT_LINE)
                || accept(TOKEN_TYPE_TRIVIA_COMMENT_MULTIPLE)
                || accept(TOKEN_TYPE_EOF)) 
            {
                gathered_trivia.push(peek());
                eat_only(); // Don't do a normal eat as it calls parse_trivia :o)

                if (peek().type === TOKEN_TYPE_EOF) {
                    break;
                }
            }


            if (peek().type === TOKEN_TYPE_EOF) {
                return true; // we are done processing statements
            }

            // TODO(jwwishart) parse_comments(scope);
            // TODO(jwwishart) parse_multiline_comments;
            return false; // we have more to parse... let other statements be processed
        }

        function parse_identifier(scope) {
            if (parse_trivia()) return true; // TODO(jwwishart) ensure we do this prior to anything valuable at all times

            if (accept(TOKEN_TYPE_IDENTIFIER)) {
                var identifier = new Identifier(null);
                identifier.text = peek().text;
                eat(identifier);
            }

            if (parse_declaration(scope, identifier)) return true;

            if (parse_function_call(scope)) return true;

            return false;
        }

        function parse_declaration(scope, identifier) {
            // TODO(jwwishart) parse_struct(scope, identifier);        // ident :: struct {
            // TODO(jwwishart) parse_enum(scope, identifier);          // ident :: enum {
            // TODO(jwwishart) parse_function(scope, identifier);      // ident :: (
            if (parse_variable(scope, identifier)) return true;        // ident :: expression

            return false;
        }

            function parse_struct(scope, identifier) {
                if (accept("::")) {
                    eat(scope);
                    if (accept("struct")) {
                        eat(scope)

                        var struct_decl = new StructDeclaration(scope /* parent */); 
                        struct_decl.name = identifier;

                        parse_struct_block(struct_decl)
                    }
                }
            }

                function parse_struct_block(struct_decl) {
                    expect("{");
                    parse_struct_fields(struct_decl)
                    expect("}");
                }

                function parse_struct_fields(struct_decl) {
                    while (parse_str
                        uct_field(struct_decl)) {
                        var field_decl = struct_decl.items[struct_decl.items.length - 1];

                        if (peek().type !== "}") {
                            expect(";");
                        } else {
                            break;
                        }
                    }
                }

                    function parse_struct_field(struct_decl) {
                        expect("identifier");
                        var identifier = peek().text;
                        var field_decl = new StructFieldDeclaration(struct_decl);
                        field_decl.items.push(field_decl);
                        // TODO(jwwishart) identifier
                        if (accept("=")) {

                        }
                    }

            function parse_variable(scope, identifier) {
                var variable_decl = new VariableDeclaration(scope);
                variable_decl.items.push(identifier);

                if (accept(TOKEN_TYPE_OPERATOR_DECLARE_ASSIGN)) {
                    variable_decl.items.push(peek());
                    eat();

                    return parse_expression(scope);
                }

                scope.items.push(variable_decl);

                if (accept("::")) {
                    return parse_constant_expression(scope);
                }

                if (accept(":")) {
                    parse_type(scope);
                    if (accept("=")) {
                        parse_expression(scope);
                    }
                }

                throw new Error("FIX ME!");
            }

        function parse_expression_statement(scope) {
            var statement = new ExpressionStatement(scope);
            parse_expression(statement);
        }

        function parse_expression(scope) {
            var expression = new Expression(scope);

            while (parse_term(scope)) {
                if (add_op == true) {
                    continue;
                } else {
                    break;
                }
            }

            return expression;
        }

        function parse_term(scope) {
            var term = new Term(scope);

            while (parse_factor(scope)) {
                if (multiplop == true) {
                    continue;
                } else {
                    break;
                }
            }

            return term;
        }

        function parse_factor(scope) {
            if ("(") {
                var factor = new Factor();
                parse_expression(factor);
                return factor; // This 
            }

            if (LITERAL!) {
                var factor = new Factor();
                factor.items.push(LITERAL);
                return factor;
            }

            // TODO(jwwishart) function_call
            // TODO(jwwishart) identifier
            // TODO(jwwishart) member_access_expression
            // TODO(jwwishart) assignment_expression
            // TODO(jwwishart) unary_expression
            // TODO(jwwishart) binary-expressoin
        }

    }());


    // @Ast Nodes -------------------------------------------------------------
    //


    function AstNode(parent) {
        this.parent = parent;

        this.type = __void; // Node has no type

        this.pre_trivia = [];
        this.items = [];
        this.post_trivia = [];
    }

    function Identifier(parent) {
        AstNode.call(this, parent);

    }


    function VariableDeclaration(parent, identifier) {
        AstNode.call(this, parent);

        this.type = __any;
    }


    function Scope(parent) {
        AstNode.call(this, parent); // Classical Inheritance. Make this item an AstNode
        
        this.items = [];
        this.deferreds = [];

        this.types = [];        // enum, structs (built in types if on program)
        this.identifiers = [];  // function and variable
    }

    function Program() {
        AstNode.call(this, null);

        if (this === undefined) {
            throw new Error("Program not called as a constructor");
        }

        this.files = [];

        this.types = [
            __void,

            __null,
            
            __string,
            __int,
            __float,
            __bool,

            __any
        ];

        // Builting Functions
        //

        // TODO(jwwishart) move this into default includes? (core module/package?)
        // print is inserts as raw assembly at the start of the program
        // output. We just need a declaration so that we can type check
        // etc on calls
        var print = new FunctionDeclaration('print');
        print.parameters.push(new ParameterInfo('message', 'any'));

        var assert = new FunctionDeclaration('assert');
        assert.parameters.push(new ParameterInfo('condition', 'bool'));
        assert.parameters.push(new ParameterInfo('fail_message', 'string'));

        this.identifiers = [
            print,
            assert
        ];
    }


    function File(program, name) {
        Scope.call(this, program);

        this.filename = name;
        this.program = program;

        this.types = [];
    }


    function AsmBlock(parent, raw_code) {
        AstNode.call(this, parent);

        this.raw_code = raw_code;
    }
    


    function FieldDefinition(identifier, data_type, init) {
        AstNode.call(this, null);

        this.identifier = identifier;
        this.data_type = data_type || 'any';
        this.init = init || [];

        // TODO(jwwishart) provide hidden members that may be accessibel
        // from methods of the struct.
        // this.is_exported = identifier[0] !== '_';
    }

    function EnumFieldDefinition(identifier, data_type, init) {
        AstNode.call(this, null);

        this.identifier = identifier;
        this.data_type = data_type || 'any';
        this.init = init || [];

        // TODO(jwwishart) provide hidden members that may be accessibel
        // from methods of the struct.
        // this.is_exported = identifier[0] !== '_';
    }


    function AssignmentStatement(parent, identifier, init) {
        AstNode.call(this, parent);

        this.identifier = identifier;
        this.init = init || [];
    }

    function StructDeclaration(identifier, parent_scope) {
        Scope.call(this, parent_scope);

        this.identifier = identifier;

        // statements on scope ARE the field declarations
    }

    function EnumDeclaration(identifier, parent_scope) {
        Scope.call(this, parent_scope);

        this.identifier = identifier;

        // statements on scope ARE the field declarations
    }

    function FunctionDeclaration(identifier, parent_scope) {
        Scope.call(this, parent_scope);

        this.identifier = identifier;

        // statements on scope are the internal function statements
        this.parameters = [];
        
        this.return_type = 'void'; // TODO(jwwishart) void! and assign the 'type' if you could call it that.
    }

    function ParameterInfo(identifier, data_type) {
        AstNode.call(this, null);

        this.identifier = identifier;
        this.data_type = data_type;

        // TODO(jwwishart) default constant value... litearl like a variable declaration
    }

    function FunctionCall(parent, identifier) {
        AstNode.call(this, parent);

        this.identifier = identifier;
        this.args = new ArgumentList(this);
    }

    function ArgumentList(parent) {
        AstNode.call(this, parent);
    }
    ArgumentList.prototype = Object.create(Array.prototype);


    // @Type System -----------------------------------------------------------

    function TypeDefinition(
        identifier,
        is_resolved, // Whether we can actually fill out the type information or NOT?
        default_value, // null for non-primitive types by default?
        flags)
    {
        this.identifier = identifier;
        this.is_resolved = is_resolved,
        this.default_value = default_value || null;
        
        this.is_primitive = (flags && flags.is_primitive) || false;

        // keyword_synonym only for is_primitive true scenarios!
        this.keyword_synonym = (flags != null && flags.keyword_synonym) ? flags.keyword_synonym : null;

        this.is_null = (flags && flags.is_null) || false;
        this.is_void = (flags && flags.is_void) || false;

        this.is_function = (flags && flags.is_function) || false;
        this.is_struct   = (flags && flags.is_struct) || false;
        this.is_enum     = (flags && flags.is_enum) || false;
        this.is_array    = (flags && flags.is_array) || false;
    }


    // Pre-Defined, builting Type Definitions
    //

    var __void = new TypeDefinition("Void", true, null, {
        is_primitive: true, // ???
        is_void: true,
        keyword_synonym: 'void'
    });

    var __null = new TypeDefinition("Null", true, null, {
        is_primitive: true, // ???
        is_null: true,
        keyword_synonym: 'null'
    });

    var __string = new TypeDefinition("String", true, '""', {
        is_primitive: true,
        keyword_synonym: 'string'
    });

    var __int = new TypeDefinition("Integer", true, '0', {
        is_primitive: true,
        keyword_synonym: 'int'
    });

    var __float = new TypeDefinition("Float", true, '0.0', {
        is_primitive: true,
        keyword_synonym: 'float'
    });

    var __bool = new TypeDefinition("Boolean", true, 'false', {
        is_primitive: true,
        keyword_synonym: 'bool'
    });

    var __any = new TypeDefinition("Any", true, 'null' /* primitive types have string value??? */, {
        is_primitive: true,
        keyword_synonym: 'any'
    });




    // Comparison Operator Expressions
    //

    generate_global_constants("OPERATOR_TYPES", [
        'OPERATOR_UNKNOWN', // TODO(jwwishart) should throw error!

        'OPERATOR_EQUALS'
    ]);


    function Expression(parent) {
        AstNode.call(this, parent);
    }

    function Literal(parent, type, value) {
        Expression.call(this, parent);

        this.type = type || __void;
        this.value = value;
    }

    function Identifier(parent, identifier) {
        Expression.call(this, parent);

        this.parent = parent;
        this.identifier = identifier;
    }

    function ExpressionBlock(parent) {
        Expression.call(this, parent);

        this.expression = null;
    }

    // WARNING: Use derived types
    function _UnaryExpression(parent) {
        Expression.call(this, parent);

        this.operator = OPERATOR_UNKNOWN;
        this.operand = null;
    }

    // WARNING: Use derived types
    function _BinaryExpression(parent) {
        Expression.call(this, parent);

        this.lhs = null;
        this.operator = OPERATOR_UNKNOWN;
        this.rhs = null;
    }

    function EqualsExpression(parent) {
        _BinaryExpression.call(this, parent);

        // Equality Expression should Evaluate to true
        this.type = __bool;

        this.operator = OPERATOR_EQUALS;

        // TODO(jwwishart)
        // TODO(jwwishart) lhs and rhs need assigning to.
        // TODO(jwwishart) Types must be the same of coerce to the same type!
    }

    function TypeInstantiation(type_name) {
        this.type_name = type_name;
    }


    // TODO(jwwishart) do I want this stuff?
    // @Dump Ast --------------------------------------------------------------
    //

    (function() {
        var context = null;

        erg.dump_ast = function(context_arg) {
            context = context_arg;
        }
    }());


    // @Target ----------------------------------------------------------------
    //

    (function() {
        var context = null;

        erg.target = function(context_arg) {
            context = context_arg;

            context.DEBUG && context.log("TARGET", context.program);
            context.DEBUG && context.log("TARGET", context.program.files[0]);

            return process_ast(context.program).join('\n');
        };


        // Helpers
        //


        function get_date() {
            var date = new Date();

            return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" +  date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
        }


        function process_onto_results(items, result, level) {
            each(items, function(item, i) {
                each(process_ast(item, level), function(res) {
                    result.push(res);
                });
            });
        }

        function determine_prefix(level) {
            var result = '';

            for (var i = 0; i < level; i++) {
                result += '    ';
            }

            return result;
        }

        // Process Functions
        //

        // WARNING: assume here that all type information is allll goood! we should have
        // handled that during parsing or type inference or something else!
        function process_ast(node, level) {
            level = level == null ? "0" : level;
            var is_es6 = context.options.target === 'node' || context.options.target === 'es6';
            var the_var =  is_es6 ? 'let ' : 'var ';
            var result = [];
            var prefix = determine_prefix(level);

            function push(text) {
                result.push(prefix + text);
            }

            function deferred_start(node, increase) {
                var deferreds_found = node.deferreds && node.deferreds.length > 0;

                if (deferreds_found) {
                    if (increase) {
                        level++;

                        prefix = determine_prefix(level);
                    }

                    push("try {");

                    return true;
                }

                return false;
            }

            function deferred_end(node, decrease) {
                var deferreds_found = node.deferreds && node.deferreds.length > 0;
                
                if (deferreds_found) {
                    
                    push("} catch (e) { ");
                    push("} finally { ");

                    process_onto_results(array_copy_and_reverse(node.deferreds), result, level + 1);

                    push("}");

                    if (decrease) {
                        level--;
                        prefix = determine_prefix(level);
                    }

                    return true;
                }

                return false;
            }



            function fix_strings(node, value) {
                if (node && node.type && (node.type.identifier === 'String' || (node.type.identifier === 'Any' && node.init && node.init[0] && node.init[0].type && node.init[0].type.identifier === 'String'))) {
                    value = "\'" + value.replace(/'/gi, "\\\'") + "\'";
                }

                return value;
            }

            // Program
            //

            if (node instanceof Program) {
                push('// Generated: ' + get_date());

                push('\n"use strict";\n'); // Required for 'let' in node v4+ code output


                // TODO(jwwishart) remove out into default includes.... 
                push("function print(message) { console.log(message); }\n");
                push("function assert(condition, fail_message) {\n" +
                     "    // NOTE: coersion on purpose.. if you pass null or undefined\n" +
                     "    // the condition should fail.\n" +
                     "    if (condition == false) {\n" +
                     "        throw new Error(\"ASSERTION FAILED: \" + fail_message);\n" +
                     "    }\n" +
                     "}\n");

                // Process Files
                process_onto_results(node.files, result, level);

                return result;
            }

            // File
            //

            if (node instanceof File) {
                (function() {
                    push('// File Start: ' + node.filename);

                    var increase_level = deferred_start(node);

                    // In this case we DON't want to increate the try/catch, but the contents
                    // below must if we had deferred statements
                    process_onto_results(node.statements, result, level + increase_level ? 1 : 0);

                    deferred_end(node);

                    push('// File End: ' + node.filename);
                }());
                return result;
            }


            // TODO(jwwishart) block statements need to be processed...
            //     BEFORE we do standard Scope objects!

            if (node instanceof Literal) {
                return fix_strings(node, node.value);
            }

            if (node instanceof Identifier) {
                return node.identifier;
            }


            // Scope
            //

            if (node instanceof Scope) {
                if (is_es6) {
                    push("\n");
                    push("{");
                } else {
                    push("\n");
                    push(";(function() {");
                }

                deferred_start(node, true);

                process_onto_results(node.statements, result, level + 1);

                deferred_end(node, true);

                if (is_es6) {
                    push("}");
                    push("\n");
                } else {
                    push("}());");
                    push("\n");
                }

                return result;
            }

            // StructDeclaration
            if (node instanceof StructDeclaration) {
                (function(){
                    result.push("\n" + the_var + node.identifier + ' = function() {');

                    process_onto_results(node.statements, result, level + 1);

                    result.push('};\n');
                }());
            }

            // EnumDeclaration
            if (node instanceof EnumDeclaration) {
                (function(){
                    push(the_var + node.identifier + ' = {};');
                    push('(function(e) {');

                    prefix = determine_prefix(level + 1);

                    for (var i = 0; i < node.statements.length; i++) {
                        push("e[e['" + node.statements[i].identifier + "'] = " + node.statements[i].init[0].value.toString() + "] = '" + node.statements[i].identifier + "';");
                    }

                    prefix = determine_prefix(level - 1);

                    process_onto_results(node.statements, result, level + 1);

                    push('}(' + node.identifier + '));\n');
                }());
            }

            if (node instanceof FunctionDeclaration) {
                (function() {
                    var params = [];

                    for (var i =0 ; i < node.parameters.length; i++) {
                        params.push(node.parameters[i].identifier);
                    }

                    push("\n");
                    push("function " + node.identifier + "(" + params.join(',') + ") {");

                    deferred_start(node, true);

                    process_onto_results(node.statements, result, level + 1);

                    deferred_end(node, true);

                    push("}\n");
                }());
            }

            if (node instanceof FunctionCall) {
                (function() {
                    var build = node.identifier + "(";

                    for (var i = 0; i < node.args.length; i++) {

                        for (var j = 0; j < node.args[i].length; j++) {
                            //if (node.args[i][j] instanceof BinaryOperator) {
                            //    build += " " + node.args[i][j].text + " ";
                            //    continue;
                            //}

                            build += process_ast(node.args[i][j], null);
                        }
                        

                        if (i + 1 < node.args.length) {
                            build += ', ';
                        }
                    }

                    push(build += ");");
                }());
            }

            // WARNING(jwwishart) this is for structs!!!!!!!!!
            if (node instanceof FieldDefinition) {
                (function() {
                    var value = 'null';

                    if (node.init.length === 1 && node.init[0] instanceof Literal) {
                        if (node.init[0].value === null) {
                            if (node.init[0].data_type) {
                                value = node.init[0].data_type.default_value;
                            }
                        } else {
                            value = node.init[0].value;
                        }

                        if (value == null) {
                            value = 'null';
                        }

                        if (node.init[0].data_type) {
                            if (node.init[0].data_type.name === 'string') {
                                value = "\'" + value.replace(/'/gi, "\\\'") + "\'";
                            }
                        }
                        push('this.' + node.identifier + ' = ' + value + '; ');
                    } else {
                        push('this.' + node.identifier + ' = null; ');
                    }
                }());
            }


            // VariableDeclaration
            if (node instanceof VariableDeclaration || node instanceof AssignmentStatement) {
                (function() {
                    var is_decl = node instanceof VariableDeclaration;
                    var is_const = is_decl && node.variable_type === 'const';

                    var decl_start = is_es6 ? (is_const ? 'const ' : 'let ') : (is_const ? 'var ' : 'var ');
                    var start = is_decl ? decl_start : ''; // decl or just assignment;

                    var note = is_decl && is_const ? ' // const' : '';

                    var value = 'null';
                    
                    if (is_decl && node.init.length === 0) {
                        // Uninitialized Variable Declarations
                        if (node.type.is_primitive) {
                            value = node.type.default_value;
                        }

                        push(start + node.identifier + ' = ' + value + ';');
                    } else if (node.init.length === 1 && node.init[0] instanceof Literal) {
                        // Initialized Variables OR Assignment Expression (1 only currently);
                        // TODO(jwwishart) support expressions!!!
                        if (node.init[0].value === null) {
                            value = node.init[0].type.default_value;
                        } else {
                            value = node.init[0].value;
                        }

                        if (value == null) {
                            value = 'null';
                        }

                        // Format Strings Primitives Properly
                        value = fix_strings(node, value);

                        push(start + node.identifier + ' = ' + value + ';' + note);
                    } else if (node.init.length === 1 && node.init[0] instanceof TypeInstantiation) {
                        push(start + node.identifier + ' = new ' + node.init[0].type_name + ';');
                    } else {
                        // TODO(jwwishart) assignment to a const not allowed!)
                        // TODO(jwwishart) Can above issue be resolved in the parser? Not here!!!
                        if (node.variable_type === 'const') {
                            throw new Error("Constant declaration must be initialized:" + JSON.stringify(node));
                        }

                        push(the_var + node.identifier + ' = null;');
                    }
                }());
            }

            // Asm Block
            if (node instanceof AsmBlock)  {
                push("\n\n// RAW ASM OUTPUT START (javascript) -------------------------");
                push(node.raw_code);
                push("\n// RAW ASM OUTPUT END (javascript) --------------------------\n\n");
            }

            return result;
        }

    }());

}(this));