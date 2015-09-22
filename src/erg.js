/*
    Copyright (c) 2015 Justin Wishart

    License: See LICENSE.txt at the root of this repository
*/


/*

FOCUS: type system
  - how to specify the type of an identifier
    - function (argument list types and return type)
    - variables/constants
    - structure and enums
    - arrays
    - pointers (in js? :o)

UP NEXT: expression parsing and related type checking etc.
  - should be able to parse binary, unary and comparison expressions
  - should handle parens

UP NEXT: namespace related functionality
  - member access expressions 
        my_person_instance.name;
        <struct_instance>.<field_name>
        
        Color.Red;
        <enum_type>.<field_name>
  - member function (extension methods, there are no methods on structs as such.
        my_person.get_full_name();
        <struct_instance>.<extension_method_call>; 

  - resolution for this for modules (must be imported and
    used with prefix (TODO LATER BUT EXAMPLE FOR CLARITY OF USE CASES)
        using http;
        http.request("http://www.example.com");
        <module>.<function>(...);






Improvements -----------------------------
- Cache previous few tokens (non-whitespace) so that 
  we can point to the start token not the current one
- Warning, Error, Info compiler logging functions
  and put into context arrays for display at end of
  compilations
- Constants ought to be all uppercase... Warn in compiler?


Bugs -------------------------------------

Features ---------------------------------

- Logging
- Make sure you can't assign to an enum! :o)

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

    erg.VERSION = [0,0,3];


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

    // NOTE: This method ought to be able to be called at any point thus it is...
    //  here.
    // We could call this during parse to handle any type determineation that
    //  we can at that point 
    // THIS function ought to cache unhandled symbols for processing AFTER the
    //  generation of the AST to fix up the last bits and pieces we could not
    //  figure out types we could not figure out at the time.
    function type_check(context, scope, node) {

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


    function ERROR(location_info, message) {
        // TODO(jwwishart) this should always get this info?
        if (location_info == null) {
            location_info = {};
            location_info.filename = 'unknown';
            location_info.line = -1;
            location_info.col = -1
        }

        // Assume by default that location_info is a lexeme!
        var file = location_info.filename;
        var line = location_info.line_no;
        var col  = location_info.col_no;

        // location_info could be a token though... so override all them undefineds...
        if (location_info instanceof Token) {
            file = location_info.lexeme.filename;
            line = location_info.lexeme.line_no;
            col = location_info.lexeme.col_no;
        }

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

        throw new Error("Compilation cancelled!");
    }

    // TODO(jwwishart) need these or not???
    ERROR.LEXER = "SYNTAX";
    ERROR.TOKENIZER = "TOKENIZER";
    ERROR.PARSER = "PARSER";

    var _current_compiler_context = null;

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
            erg.type_inference(context);

            result += erg.target(context) + "\n\n\n";
        });

        return result;
    };


    // @Scanner ---------------------------------------------------------------
    //

    var Lexeme = function(filename, line_no, col_no, char) {
        this.filename = filename;
        this.line_no = line_no;
        this.col_no = col_no;
        this.text = char;
    };

    erg.Lexeme = Lexeme;


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

            get_lexeme: function() {
                return new Lexeme(filename, line_no, col_no, this.peek());
            }
        };
    };


    // @Tokenizer -------------------------------------------------------------
    //

    generate_global_constants('TOKEN_TYPES', [
        'TOKEN_TYPE_WHITESPACE',
        
        'TOKEN_TYPE_COMMENT_SINGLE_LINE',
        'TOKEN_TYPE_COMMENT_MULTIPLE_LINE',

        // TODO(jwwishart) cleanup the ordering?
        'TOKEN_TYPE_NULL',
        
        'TOKEN_TYPE_IDENTIFIER',

        // Literals
        'TOKEN_TYPE_STRING_LITERAL',
        'TOKEN_TYPE_INTEGER_LITERAL',
        'TOKEN_TYPE_FLOAT_LITERAL',
        'TOKEN_TYPE_BOOLEAN_LITERAL',

        // Punctuation
        'TOKEN_TYPE_PAREN_OPEN',
        'TOKEN_TYPE_PAREN_CLOSE',
        'TOKEN_TYPE_BRACE_OPEN',
        'TOKEN_TYPE_BRACE_CLOSE',

        'TOKEN_TYPE_SEMICOLON',

        'TOKEN_TYPE_SINGLE_COLON',
        'TOKEN_TYPE_DOUBLE_COLON',
        'TOKEN_TYPE_COLON_EQUALS',

        'TOKEN_TYPE_COMMA',

        // Keywords
        'TOKEN_TYPE_RETURN_KEYWORD',
        'TOKEN_TYPE_NEW_KEYWORD',
        'TOKEN_TYPE_KEYWORD_DEFER',
        'TOKEN_TYPE_STRUCT_KEYWORD',
        'TOKEN_TYPE_ENUM_KEYWORD',

        // Symbols
        'TOKEN_TYPE_PLUS',
        'TOKEN_TYPE_DOT',

        'TOKEN_TYPE_ASSIGNMENT',
        'TOKEN_TYPE_UNINITIALIZE_OPERATOR',
        'TOKEN_TYPE_ASM_BLOCK',
        'TOKEN_TYPE_DIRECTIVE',


        'TOKEN_TYPE_EOF',
    ]);

    var Token = function(type, lexeme) {
        this.type = type;
        this.type_name = get_global_constant_name('TOKEN_TYPES', type);
        this.lexeme = lexeme;
        this.text = lexeme.text;
    };

    erg.Token = Token;

    erg.tokenize = function(context, scanner) {
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
        var past_tokens = []; // Queue for non-whitespace tokens only. Handled in eat();


        // Char Traversal
        //

        function peek() {
            return scanner.peek();
        }

        function eat() {
            if (past_tokens.length > 10) {
                past_tokens.shift(); // remove oldest item from start of array!
            }

            scanner.eat();
        }

        // TODO(jwwishart) can we get rid of this?
        function set_location(token) {
            var lexeme = scanner.get_lexeme();

            token.lexeme = lexeme;
        }

        function create_token(type) {
            var lexeme = scanner.get_lexeme();

            return new Token(type, lexeme);
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

            while ((c = peek()) !== null) {
                // TODO(jwwishart) ignore spaces

                if (c === '.') {
                    // TODO(jwwishart) test this!
                    if (is_float === true) {
                        throw new Error("Multiple periods while trying to parse number: '" + result + ".'");
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

        function get_singleline_comment() {
            var result = '//';

            while (move_next() && c !== '\r' && c !== '\n') {
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
                    // Get Mappable Char to Tokens
                    var to_return = try_map_char_to_token(c);
                    if (to_return !== null) {
                        // TODO(jwwishart) for now just handle this manually
                        // NOTE: these characters were ignored because they break things...
                        // we are not going to try and fix them :oS so they don't break... :oS
                        // the parser should handle them... and include them in the AST... ?
                        //if (c === ' ' || c === '\t') {
                        //    continue;
                        //}

                        return to_return;
                    }

                    // Single line Comments
                    if (c === '/') {
                        token = create_token(TOKEN_TYPE_COMMENT_SINGLE_LINE, '');

                        eat();

                        // Multi-line comments
                        if (peek() === '*') {
                            eat(); // eat and setup c correctly | eat_multiline_comments assumes /* is gone!
                            c = peek();

                            token.type = TOKEN_TYPE_COMMENT_MULTIPLE_LINE;
                            token.text = get_multiline_comments();

                            return token;
                        }

                        // Single-line comments
                        if (peek() === '/') {
                            // NOTE(jwwishart) type is correct already!
                            token.text = get_singleline_comment();
                            
                            return token;
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
                        token = create_token(TOKEN_TYPE_INTEGER_LITERAL, '');
                        
                        try {
                            var number_result = get_number_literal();
                            token.text = number_result.result;
                            token.is_float = number_result.is_float;

                            if (token.is_float) {
                                token.type = TOKEN_TYPE_FLOAT_LITERAL;
                                token.type_name = get_global_constant_name('TOKEN_TYPES', token.type);
                            }
                        } catch (e) {
                            ERROR(scanner.get_lexeme(), e.toString())
                        }

                        return token;
                    }

                    if (c === ':') {
                        colNo = scanner.get_lexeme().colNo;

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
                                token.lexeme.col_no -= 2; // move to start col no
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

                    if (/[a-zA-Z_]/gi.test(c)) {
                        // Identifier...
                        //

                        token = create_token(TOKEN_TYPE_IDENTIFIER, '');
                        var col = token.lexeme.col_no; // Needs to be at start of identifier!
                        token.text = get_identifier();

                        // ... but it maybe a ...

                        // KEYWORD
                        //

                        if (token.text === "true" || token.text === "false") {
                            (function() {
                                token.type = TOKEN_TYPE_BOOLEAN_LITERAL;
                                token.type_name = get_global_constant_name('TOKEN_TYPES', token.type);
                            }())
                        }

                        if (token.text === "asm") {
                            token = create_token(TOKEN_TYPE_ASM_BLOCK, '')

                            // Parse asm block!
                            var asm = get_asm_block();
                            token.text = asm;
                            token.lexeme.col_no = col;
                        }

                        if (token.text === "defer") {
                            token = create_token(TOKEN_TYPE_KEYWORD_DEFER, 'defer');
                            token.lexeme.col_no = col;
                        }

                        if (token.text === "return") {
                            token = create_token(TOKEN_TYPE_RETURN_KEYWORD, 'return');
                            token.lexeme.col_no = col;
                        }

                        if (token.text === "null") {
                            token = create_token(TOKEN_TYPE_NULL, 'null');
                            token.lexeme.col_no = col;
                        }

                        if (token.text === "struct") {
                            token = create_token(TOKEN_TYPE_STRUCT_KEYWORD, 'struct');
                            token.lexeme.col_no = col;
                        }

                        if (token.text === "enum") {
                            token = create_token(TOKEN_TYPE_ENUM_KEYWORD, 'enum');
                            token.lexeme.col_no = col;
                        }

                        if (token.text === "new") {
                            token = create_token(TOKEN_TYPE_NEW_KEYWORD, 'new');
                            token.lexeme.col_no = col;
                        }

                        return token;
                    }

                    var error_char_info = scanner.get_lexeme();

                    ERROR({ filename: context.current_filename, line_no: error_char_info.line_no, col_no: error_char_info.col_no },
                          "Syntax error, unexpected token " + error_char_info.text);
                }

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
        // So we don't have to keep parsing these things around!!!

        var context = null;
        var tokenizer = null;

        var past_tokens = []; // Queue for non-whitespace tokens only. Handled in eat();

        function peek(back) {
            if (has_value(back)) {
                if (past_tokens.length >= back) {
                    return past_tokens[past_tokens.length - back];
                } else {
                    return null; // :o(
                }
            }

            return tokenizer.peek();
        }

        // If we eat() we just move to the next valid token... the parse shouldn't have
        // to worry about whitespace...
        function eat() {
            if (peek().type !== TOKEN_TYPE_WHITESPACE && peek().type !== TOKEN_TYPE_EOF) {
                past_tokens.push(peek());
            }

            tokenizer.eat();

            eat_non_important_tokens();
        }

        function eat_non_important_tokens() {
            while (
                peek() !== null && (
                    peek().type == TOKEN_TYPE_WHITESPACE ||
                    peek().type == TOKEN_TYPE_COMMENT_SINGLE_LINE ||
                    peek().type == TOKEN_TYPE_COMMENT_MULTIPLE_LINE
                )
            ){
                eat();
            }
        }

        function expect_and_eat(token_type) {
            if (expect(token_type)) {
                eat();
            }
        }

        function accept_and_eat(token_type) {
            if (accept(token_type)) {
                eat();
                return true;
            }

            return false;
        }

        function accept(token_type) {
            if (peek() === null) {
                return false; // Not the requested token
            }

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

        function expect(token_type, ignore_whitespace) {
            ignore_whitespace = ignore_whitespace || true;

            if (peek() === null) {
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

            if (ignore_whitespace) {
                while(peek().type == TOKEN_TYPE_WHITESPACE) {
                    eat();
                }
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

        function add_statement(current_scope, statement) {
            current_scope.statements.push(statement);
        }

        // TODO(jwwishart) should consider whether this NEEDS to look outside of 
        //  the FILE scope (i.e. should it see the program scope) and also
        //  whether it should see things IMPORTED (using statement) into the
        //  scope or a scope up to the file scope?
        // TODO(jwwishart) considering the above. MAybe it is better ot rename this
        //  to something like can_see_identifier?
        function get_identifier_declaration_information(current_scope, identifier) {
            var cont = {
                scope: current_scope,
                level: -1, // current scope is 0, 1 is next scope up etc...

                decl: null,
                found: false,

                in_current_scope: false
            };

            find_identifier_use(cont, identifier);
    
            if (cont.level === 0) {
                cont.in_current_scope = true;
            }

            return cont;
        }

        // TODO(jwwishart) See notes on get_identifier_declaration_information() as to
        //  whether this function should SEE the Program scope (of is that global?) and
        //  whether it should be something like can_see_identifier
        function find_identifier_use(cont, identifier) {
            // Bail if we have no scope to process...
            // Coercion on purpose... check for undefined just in case!
            if (cont.scope == null) return;

            cont.level++;

            // TODO(jwwishart) test that you cant declare a variable that is the same... 
            //  name as a parameter name of the function decl
            if (cont.scope instanceof FunctionDeclaration) {
                each(cont.scope.parameters, function(item) {
                    if (item.identifier === identifier)  {
                        cont.found = true;
                        cont.decl = item;

                        return false; // cancel loop!
                    }
                });
            }

            if (cont.found === false) {
                each(cont.scope.identifiers, function(item) {
                    if (item.identifier === identifier) 
                    {
                        cont.found = true;
                        cont.decl = item;

                        return false; // cancel loop!
                    }
                });
            }

            if (!cont.found) {
                cont.scope = cont.scope.parent;

                find_identifier_use(cont, identifier);
            }
        }

        function infer_type(expressions) {
            if (expressions.length == 1) {
                // TODO(jwwishart) this if block should not be here, just iterate...
                //  the expression parts and determine the types...
                if (expressions[0] instanceof Literal) {
                    return expressions[0].data_type;
                }
            }
            
            ERROR("NOT IMPLEMENTED: infer_type no expression of type " + typeof(expression) + " not yet available");
        }

        function is_null_literal(expressions) {
            return expressions.length === 1 && expressions[0] instanceof Literal && expressions[0].value === "null" && expressions[0].type == null; // or undefined
        }

        function get_while_condition(token_to_cancel_on) {
            if (token_to_cancel_on !== undefined && token_to_cancel_on !== null) {
                return peek() !== null && peek().type !== token_to_cancel_on;
            }

            return peek().type !== TOKEN_TYPE_EOF;
        }


        // Type and Identifier Helper Functions
        //

        function register_identifier(current_scope, node) {
            // TOdO(jwwishart) throw on duplidate definition)
            // TODO(jwwishart) is this done elsewhere already?

            current_scope.identifiers.push(node);
        }

        function check_identifier(current_scope, identifier) {

        }

        function get_identifier_info(current_scope, identifier) {

        }

        function find_type(current_scope, identifier) {
            var result = null;

            each(current_scope.types, function(type) {
                if (type.identifier === identifier || (type.is_primitive && type.keyword_synonym === identifier)) {
                    result = type;
                    return false;
                }
            });

            if (result == null && current_scope.parent != null) {
                result = find_type(current_scope.parent, identifier);
            }

            return result;
        }


        /// Parses tokens and constructs an ast on the program
        /// ast node that is passed in.
        ///
        /// Parameters:
        ///     files   : a map of filename > code
        ///     options : a map of options for the complier 
        ///
        /// Returns:
        ///     The compiled output (JavaScript in this case)
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

            // Move to first important thing!
            eat_non_important_tokens();

            while (get_while_condition()) {
                parse_file(scope);
            }
        };

        function parse_file(current_scope) {
            while (get_while_condition()) {
                parse_statement(current_scope);
            }
        }

        function parse_block(current_scope) {
            expect_and_eat(TOKEN_TYPE_BRACE_OPEN);

            while (get_while_condition(TOKEN_TYPE_BRACE_CLOSE)) {
                parse_statement(current_scope);
            }

            expect_and_eat(TOKEN_TYPE_BRACE_CLOSE);
        }

        function parse_statement(current_scope) {
            if (accept(TOKEN_TYPE_KEYWORD_DEFER)) {
                eat(); // defer
            
                // Function Execution is only thing supported!
                if (expect(TOKEN_TYPE_IDENTIFIER)) {
                    (function() {
                        var token = peek();
                        var identifier = token.text;

                        eat(); // identifier

                        if (expect(TOKEN_TYPE_PAREN_OPEN)) {
                            var fake_scope = {
                                statements: []
                            };

                            // This handles the parents and arguments etc...
                            parse_function_call(fake_scope, identifier);

                            current_scope.deferreds.push(fake_scope.statements[0]);
                        }
                    }());

                    return;
                }
            }

            if (accept(TOKEN_TYPE_BRACE_OPEN)) {
                var new_block = new Scope(current_scope);
                add_statement(current_scope, new_block);

                parse_block(new_block);
            }


            if (accept(TOKEN_TYPE_ASM_BLOCK)) {
                add_statement(current_scope, new AsmBlock(peek().text));

                eat();

                // WARNING: asm block doesn't require final semicolon...
                return;
            }

            if (accept(TOKEN_TYPE_IDENTIFIER)) {
                var token = peek();
                var identifier = token.text;

                eat(); // identifier


                // Declarations
                //

                if (accept([TOKEN_TYPE_SINGLE_COLON,
                            TOKEN_TYPE_COLON_EQUALS,
                            TOKEN_TYPE_DOUBLE_COLON]))
                {
                    parse_declaration(current_scope, identifier);
                }


                // Function Execution
                //

                if (accept(TOKEN_TYPE_PAREN_OPEN)) {
                    parse_function_call(current_scope, identifier);
                }


                // Assignment
                //

                if (accept(TOKEN_TYPE_ASSIGNMENT)) {
                    eat(); // =

                    // TODO(jwwishart) could be assigned a function expression or literals or ...
                    //  expression statements (1 + 12 - result_of_func(15 + 55, "hello"))
                    //  which means we need to handle binary expressions, unary expressions
                    //  and function call results etc...

                    (function() {
                        var is_type_instantiation = false;
                        var init = null;
                        var info = null;

                        if (accept(TOKEN_TYPE_NEW_KEYWORD)) {
                            // WARNING(jwwishart) this would normally be a heap allocation style situation
                            // as we can just go varname : Person and we will have a stack allocated 
                            // instance of a structure... (in JS this doesn't really matter!)
                            eat(); // 'new'

                            if (expect(TOKEN_TYPE_IDENTIFIER)) {
                                info = get_identifier_declaration_information(current_scope, peek().text);
                                
                                if (info === null || info.decl === null) {
                                    ERROR(peek(), "Identifier '" + peek().text + "' not found.");
                                }

                                init = new TypeInstantiation(peek().text);

                                eat();

                                expect_and_eat(TOKEN_TYPE_SEMICOLON); // TODO... we do that later??? Why here?

                                is_type_instantiation = true;
                            }
                        } else {
                            info = get_identifier_declaration_information(current_scope, identifier);

                            // Constants cannot be re-assigned another value...
                            if (info && info.decl instanceof VariableDeclaration &&
                                info.decl.variable_type === 'const') 
                            {
                                ERROR(peek(), "Constant '" + identifier + "' cannot be changed");
                            }

                            // Cannot find identifier to assign the value to...
                            if (info.found === false) {
                                ERROR(token, "Cannot assign value to undeclared identifier '" + identifier + "'");
                            }
                        }


                        // Start Statement Constructions and Parse Expressions
                        var statement = new AssignmentStatement(identifier);

                        if (is_type_instantiation) {
                            statement.init = [init]
                        } else {
                            var expressions = parse_expression(current_scope);

                            // Type Checking
                            var inferred_type = infer_type(expressions);
                            var expected_data_type = info.decl.data_type;

                            // TODO(jwwishart) what is can't infer the type?
                            // TODO(jwwishart) what if expression is NULL!!!


                            // TODO(jwwishart) should be 'any' or any custom data type
                            // that is defined as a struct (not sure about enums???)
                            if (expected_data_type === 'any') {
                                // Is Don, is Good!
                            } else if (is_null_literal(expressions) && expected_data_type !== 'any') {
                                // TODO(jwwishart) should strings be nullable?
                                ERROR(start_token, "Null can only be assigned to variables of type 'any' or custom type references");
                            } else if (inferred_type.name === expected_data_type) {
                                // Is Don, is Good!
                            } else {
                                ERROR(peek(), "Expression of type '" + inferred_type.name + "' cannot be assigned to variable of type '" + expected_data_type + "'.");
                            }
                            
                            // Done! Add statement!
                            statement.init = expressions;
                        }

                        add_statement(current_scope, statement);
                        
                        // TODO(jwwishart) null assignment????
                        // TODO(jwwishart) ensure we have something to assign otherwise this is pointless... i.e. a semicolon after the = is just WRONG!
                        // TODO(jwwishart) check the expression type is a known type
                        // TODO(jwwishart) check the expression type is the same as the or compatible with
                        //  the variable type
                    }());
                }

                accept_and_eat(TOKEN_TYPE_SEMICOLON);

                return;
            }

            if (peek().type === TOKEN_TYPE_EOF) return;

            ERROR(peek(), "Unexpected Token");
        }

        /// Parse Declarations
        ///
        /// top level parse declaration function. This is where you start parsing a declaration
        /// @decl_meta object containing identifier for the declaration
        ///    Fields available are: 
        ///     - identifier
        ///     - is_struct
        ///     - is_variable
        ///     - is_function
        function parse_declaration(current_scope, identifier) {
            var info = get_identifier_declaration_information(current_scope, identifier);

            if (info != null && info.in_current_scope === true && info.decl  != null) {
                ERROR(peek(1), "Identifier '" + identifier + "' cannot be re-declared");
            }

            var is_const = false;

            // Check for: Struct, Func and Enum
            if (accept(TOKEN_TYPE_DOUBLE_COLON)) {
                eat(); // ::

                if (accept(TOKEN_TYPE_STRUCT_KEYWORD)) {
                    eat(); // struct
                    parse_struct_declaration(current_scope, identifier);
                    return;
                } else if (accept(TOKEN_TYPE_ENUM_KEYWORD)) {
                    eat(); // enum
                    parse_enum_declaration(current_scope, identifier);
                    return;
                } else if (accept(TOKEN_TYPE_PAREN_OPEN)) {
                    parse_function_declaration(current_scope, identifier);
                    return;
                } else {
                    is_const = true;
                }
            }

            parse_variable_declaration(current_scope, identifier, is_const);
        }

        // TODO(jwwishart) this seems to compliated... can it be partially reused for parameters and field definitions?
        function parse_variable_declaration(current_scope, identifier, is_const) {
            var variable_decl = new VariableDeclaration(current_scope, identifier);

            register_identifier(current_scope, variable_decl);

            var data_type_name = 'any';

            var is_data_type_explicit = false;
            var is_assignment = false;
            var is_explicitly_uninitialized = false;
            var is_type_instantiation = false;

            var explicit_init_token = null;

            // We tested for TOKEN_TYPE_DOUBLE_COLON in the parse_declaration function
            if (is_const) {
                // NOTE(jwwishart) constants should be primitive
                // and should be able to be type inferred without issue!
                // TODO(jwwishart) what about assignment from another const?
                // TODO(jwwishart) is this correct... should a type be able to be specified?
                variable_decl.variable_type = 'const';

                is_assignment = true;
            } else if (accept(TOKEN_TYPE_COLON_EQUALS)) {
                is_assignment = true;

                eat(); // :=
            } else if (accept(TOKEN_TYPE_SINGLE_COLON)) {
                eat(); // :

                is_data_type_explicit = true;

                // We ought to have a type here...
                if (expect(TOKEN_TYPE_IDENTIFIER)) {
                    data_type_name = peek().text;

                    eat(); // identifier

                    // Try Determine Type
                    var type = find_type(current_scope, data_type_name);
                    if (type != null) {
                        variable_decl.type = type;
                    }

                    if (accept(TOKEN_TYPE_ASSIGNMENT)) {
                        is_assignment = true;
                        eat(); // =
                    }
                }
            }

            if (accept(TOKEN_TYPE_UNINITIALIZE_OPERATOR)) {
                is_explicitly_uninitialized = true;

                explicit_init_token = peek();

                eat(); // ---
            }

            // TODO(jwwishart) re-instate this)
            // if (accept(TOKEN_TYPE_NEW_KEYWORD)) {
            //     eat(); // 'new'
            //     
            //     if (expect(TOKEN_TYPE_IDENTIFIER)) {
            //         (function() {
            //             var info = get_identifier_declaration_information(current_scope, peek().text);
            //             
            //             if (info === null || info.decl === null) {
            //                 ERROR(peek(), "Identifier '" + peek().text + "' not found");
            //             }
            //             
            //             var init = new TypeInstantiation(peek().text);
            //             
            //             variable_decl.init = [init];
            //             
            //             eat();
            //             
            //             expect_and_eat(TOKEN_TYPE_SEMICOLON);
            //             
            //             is_type_instantiation = true;
            //         }());
            //     }
            // }

            if (is_type_instantiation && is_explicitly_uninitialized === false) {
                // ignore, we are done here!
            } else if (is_assignment && is_explicitly_uninitialized === false /* fall back to default values */) {
                // TODO(jwwishart) handle assigned expressions...
                // - literals
                // - expressions
                //   - calculations (only at function scope?)
                //   - function results( covererd in previous point?)
                //   - ?

                (function() {
                    var start_token = peek();
                    var expressions = parse_expression(current_scope);

                    // TODO(jwwishart) multiple places like this below!!!!
                    // TODO(jwwishart) move back to previous line with non-whitespace and find col for ...
                    //   last character and increment by 1 (or get previous non-whitespace token!
                    if (expressions.length === 0) {
                        ERROR(start_token, "Variable declaration for '" + identifier + "' missing initialization value");
                    }

                    // TODO(jwwishart) what is can't infer the type?
                    // TODO(jwwishart) what if expression is NULL!!!

                    // TODO(jwwishart) we are assuming we hare a literal
                    //  need to handle custom types here!!!!


                    // WARNING(jwwishar)  CONSTS NEED THIS
                    // TODO(jwwishart) better way? Constanst n
                    variable_decl.type = expressions[0].type;
                    
                    //var inferred_type = infer_type(expressions);

                    // Try and type check...
                    if (is_data_type_explicit &&
                        variable_decl.type.is_resolved &&
                        variable_decl.type.identifier !== 'Any') 
                    {
                        if (variable_decl.type.identifier !== expressions[0].type.identifier) {
                            ERROR(start_token, "Expression of type '" + inferred_type.name + "' cannot be assigned to variable of type '" + data_type_name + "'.");
                        }
                    }

                    variable_decl.init = expressions;
                }());
            } else {
                if (is_data_type_explicit == false &&
                    is_assignment &&
                    is_explicitly_uninitialized === true) 
                {
                    ERROR(explicit_init_token, "You cannot explicitly uninitilize an untyped variable declaration... you must provide a type! ");
                }

                // If there is no assignment we essentially add an assignment
                // for the default expected value for primitive types or null
                // for anything else (at the moment!)
                // TODO(jwwishart) should the above be correct? Custom types
                // should maybe have a DEFAULT value that can be configurable?
                // in the type definition? or should they just be a default
                // instance with fields that have default values?

                // TODO(jwwishart) we should grab these from the program scope?
                // TODO(jwwishart) Handle all primitive types?
                // TODO(jwwishart) make this a function to handle JUST primitive types!
                //      -- is_primitive_type
                //      -- get_primitive_data_type_definition 


                // Get TypeDefinition
                var type = find_type(current_scope, data_type_name);
                if (type != null) {
                    variable_decl.type = type;
                }

                // TODO(jwwishart) what about custom type instantiation?
                /*if (literal_assignment_done === false && is_explicitly_uninitialized === false) {
                    var info = get_identifier_declaration_information(current_scope, data_type_name);

                    if (info !== null && info.decl !== null && info.decl instanceof StructDeclaration) {
                        var init = new TypeInstantiation(data_type_name);
                        variable_decl.init = [init];
                    }
                }*/
            }

            // TODO(jwwishart) 'const' might need to be assigned to variable_type

            //variable_decl.type = create_type_definition(data_type_name);

            add_statement(current_scope, variable_decl);
        }

        function parse_field_assignment_expression(current_scope, data_type_name, expected_final_token) {
            var expressions = parse_expression(current_scope, [expected_final_token]);

            if (expressions.length === 0) {
                throw new Error("Field declaration missing initialization value" + JSON.stringify(peek()));
            }

            // TODO(jwwishart) what if we can't infer the type?
            // TODO(jwwishart) what if expression is NULL!!!

            var inferred_type = infer_type(expressions);

            if (true) { // if (is_data_type_explicit) { // WARNING(jwwishart) true for variables NOT for fields remeber if varibles refactored to use this!
                if (inferred_type.name === data_type_name) {
                    // Is Don, is Good!
                } else {
                    throw new Error("Expression of type '" + inferred_type.name + "' cannot be assigned to variable of expected type '" + data_type_name + "'");
                }
            }

            return expressions;
        }

        function parse_struct_declaration(current_scope, identifier) {
            var decl = new StructDeclaration(identifier, current_scope);

            expect_and_eat(TOKEN_TYPE_BRACE_OPEN);

            parse_struct_field_definitions(decl);

            expect_and_eat(TOKEN_TYPE_BRACE_CLOSE);

            add_statement(current_scope, decl);
        }

        function parse_struct_field_definitions(current_scope) {
            while (get_while_condition(TOKEN_TYPE_BRACE_CLOSE)) {
                var identifier = null;
                var data_type_name = 'any';
                var is_assignment = false;
                var is_explicitly_uninitialized = false;
                var decl;

                if (expect(TOKEN_TYPE_IDENTIFIER)) {
                    identifier = peek().text;
                    eat();

                    decl = new FieldDefinition(identifier);

                    var info = get_identifier_declaration_information(current_scope, identifier);

                    if (info != null && info.in_current_scope === true && info.decl  != null) {
                        throw new Error("Identifier '" + identifier + "' cannot be re-declared; " + JSON.stringify(identifier + " " + JSON.stringify(peek())));
                    }

                    // Parse the declaration
                    expect_and_eat(TOKEN_TYPE_SINGLE_COLON); // :

                    expect(TOKEN_TYPE_IDENTIFIER);

                    data_type_name = peek().text;

                    eat(); // type identifier

                    if (accept(TOKEN_TYPE_ASSIGNMENT)) {
                        is_assignment = true;
                        eat(); // =
                    }

                    if (accept(TOKEN_TYPE_UNINITIALIZE_OPERATOR)) {
                        is_explicitly_uninitialized = true;

                        eat();
                    }

                    decl.data_type = data_type_name;

                    if (is_assignment && is_explicitly_uninitialized == false) {
                        decl.init = parse_field_assignment_expression(current_scope, data_type_name, TOKEN_TYPE_COMMA);
                    } else if (is_explicitly_uninitialized == true) {
                        // TODO(jwwishart) VariableDecls don't seem to do anything with above variable???
                        // what do we do here?
                    } else {
                        // TODO(jwwishart) same as variable declaration code!!!
                        // TODO(jwwishart): wrap in function that handles all primitive types and also...
                        //  knows how to construct a default of a custom type...
                        switch(data_type_name) {
                            case 'string':
                            case 'int':
                            case 'float':
                            case 'bool':
                                // Notice we sent NULL through for the value... we will use the data_type default value in this case!
                                decl.init.push(new Literal(null, get_primitive_data_type_by_name(data_type_name)));
                                break;

                        }
                    }

                    add_statement(current_scope, decl);
                }

                if (accept(TOKEN_TYPE_COMMA)) {
                    eat(); // ,

                    if (accept([TOKEN_TYPE_IDENTIFIER, TOKEN_TYPE_BRACE_CLOSE]) === false) {
                        throw new Error("Expected identifier but got a " + JSON.stringify(peek()));
                    }
                }
            }
        }

        function parse_enum_declaration(current_scope, identifier) {
            var decl = new EnumDeclaration(identifier, current_scope);
            var i = 0;

            expect_and_eat(TOKEN_TYPE_BRACE_OPEN);

            // TODO: Parse enum identifiers PROPERLY (i.e. they can have default values...
            //  assigned which ought to update 'i' above to the assigned value... also can only...
            //  be integers... nothing else!
            while (get_while_condition(TOKEN_TYPE_BRACE_CLOSE)) {
                if (expect(TOKEN_TYPE_IDENTIFIER)) {
                    // TODO(jwwiishart) remember you cant instantiate an enum... only
                    // create a variable that takes that type (it is an int in the end!
                    var field_decl = new EnumFieldDefinition(peek().text);
                    field_decl.init = [new Literal(i++, get_primitive_data_type_by_name('int'))];
                    decl.statements.push(field_decl);
                    decl.identifiers.push(field_decl);
                    eat();
                }

                accept_and_eat(TOKEN_TYPE_COMMA);
            }

            expect_and_eat(TOKEN_TYPE_BRACE_CLOSE);

            add_statement(current_scope, decl);
        }

        function parse_function_declaration(current_scope, identifier) {
            // NOTE: re-declaration scenario caught at identifier parsing level.. No need here!
            var decl = new FunctionDeclaration(identifier, current_scope);

            decl.parameters = parse_parameter_list(current_scope);

            if (accept(TOKEN_TYPE_IDENTIFIER)) {
                var return_type = peek().text;
                eat(); // return type

                decl.return_type = return_type;

                // TODO(jwwishart) duplicate code alert ???
                switch(return_type) {
                    case 'string':
                    case 'int':
                    case 'float':
                    case 'bool':
                        // Is Don, Is Good!
                        break;
                    default:
                        throw new Error("Return data type " + return_type + " not yet supported for parameter names... need to re-work the data type system to include primitive and custom types");
                        break;
                }
            }

            // TODO(jwwishart) non-void result? then 'return' MUST be provided
            parse_block(decl);

            add_statement(current_scope, decl);
        }

        function parse_parameter_list(current_scope) {
            expect_and_eat(TOKEN_TYPE_PAREN_OPEN);

            var results = [];

            while (get_while_condition(TOKEN_TYPE_PAREN_CLOSE)) {
                expect(TOKEN_TYPE_IDENTIFIER);
                var identifier_token = peek();
                var identifier = identifier_token.text;

                eat(); // identifier

                if (accept_and_eat(TOKEN_TYPE_SINGLE_COLON)) {
                    expect(TOKEN_TYPE_IDENTIFIER);

                    var data_type = peek().text;
                    eat();

                    var param = new ParameterInfo(identifier, data_type);

                    each(results, function(res) {
                        if (res.identifier === identifier) {
                            ERROR(identifier_token, "You cannot declare function with the same parameter name twice: Parameter name is: " + identifier);
                        }
                    });
                    
                    switch(data_type) {
                        case 'string':
                        case 'int':
                        case 'float':
                        case 'bool':
                            // Is Don, Is Good!
                            break;
                        default:
                            throw new Exception("Data Type " + data_type + " not yet supported for parameter names... need to re-work the data type system to include primitive and custom types");
                            break;
                    }

                    results.push(param);
                } else {
                    var param = new ParameterInfo(identifier, 'any');
                    results.push(param);
                }

                if (accept(TOKEN_TYPE_COMMA)) {
                    eat(); // ,
                }
                
            }

            expect_and_eat(TOKEN_TYPE_PAREN_CLOSE);

            return results;
        }

        // TODO(jwwishart) this should be in statement OR expression position as calls can return values
        function parse_function_call(current_scope, identifier) {
            var info = get_identifier_declaration_information(current_scope, identifier);

            if (info.found == false || info.decl == null || !(info.decl instanceof FunctionDeclaration)) {
                if (info.found && !(info.decl instanceof FunctionDeclaration)) {
                    ERROR(peek(), "Identifier '" + identifier + "' is not a function");
                } else {
// TODO(jwwishart) remove this to work on just getting the AST stucture and
//  then work on type inference and dependency management stuff.
// ERROR(peek(), "Function '" + identifier + "' cannot be found");
                }
            }

            var call = new FunctionCall(identifier);
            /*
                - verify that the function exists (identifier exists representation is a function declaration or found imported)
                - parse argument expressions (comma separated)

             */

            expect_and_eat(TOKEN_TYPE_PAREN_OPEN);

            var start_argument_list = peek();

            call.args = parse_function_call_arguments(current_scope, identifier);
// TODO(jwwishart) temporarily for type inference and ast generation
//
//            if (call.args.length !== info.decl.parameters.length) {
//                ERROR(peek(), "Function '" + identifier + "' expects " + info.decl.parameters.length + " arguments but recieved " + call.args.length);
//            }
//
//            for (var i = 0; i < info.decl.parameters.length; i++) {
//                // TODO(jwwishart) note that we ONLY look at the type of the first prt of... 
//                //  the argument expression list... This MIGHT be adequate? or is it?
//                // TODO(jwwishart) if the first call.args[i][[0] item is just an identifier there is NO TYPE...
//                //  associated and we can't therefore testing (there is no data_type on it.. so we get cannot get
//                //  name of undefined.
//                if (info.decl.parameters[i].data_type !== 'any' &&
//                    info.decl.parameters[i].data_type !== call.args[i][0].data_type.name) 
//                {
//                    ERROR(start_argument_list, "Function '" + identifier + "' argument " + (i + 1)  + " expects type of " + info.decl.parameters[i].data_type + " but was given type of " + call.args[i][0].data_type.name);
//                }
//            }

            expect_and_eat(TOKEN_TYPE_PAREN_CLOSE);
            expect_and_eat(TOKEN_TYPE_SEMICOLON);

            add_statement(current_scope, call);
        }

        function parse_function_call_arguments(current_scope, identifier) {
            // TODO(jwwishart) this shoudl all be in parse_expressions...
            // literal
            // variable identifier
            // function identifier :oS
            // expression
            // complex expressions (function call results, structure references or namespaced member structure info.);
            var results = [];

            do {
                if (accept(TOKEN_TYPE_PAREN_CLOSE)) {
                    break;
                }

                results.push(parse_expression(current_scope, [TOKEN_TYPE_COMMA, TOKEN_TYPE_PAREN_CLOSE]));
            } while (accept_and_eat(TOKEN_TYPE_COMMA));

            return results;
        }

        function parse_expression(current_scope, expected_final_tokens) {
            var parts = [];
            var expected_final_tokens = expected_final_tokens || [TOKEN_TYPE_SEMICOLON];

            // TODO(jwwishart) when is an expression ended? semicolon, no operator followed by...
            //  an identifier? how to detect missing semicolons essentially.

            // Literals
            //

            do {
                // TODO(jwwishart) this code should be able to be some by some helper function!
                if (accept(TOKEN_TYPE_IDENTIFIER)) {
// Warning: commented out temporarily MAYBE?
// var info = get_identifier_declaration_information(current_scope, peek().text);
// 
// if (info === null || info.decl === null) {
//     ERROR(peek(), "Identifier '" + peek().text + "' not found in scope");
// }

                    // TODO(jwwishart) check that the identifier exists, is the right type etc!!!
                    parts.push(new Identifier(null, peek().text));
                } else if (accept(TOKEN_TYPE_STRING_LITERAL)) {
                    parts.push(new Literal(null, __string, peek().text));
                } else if (accept(TOKEN_TYPE_BOOLEAN_LITERAL)) {
                    parts.push(new Literal(null, __bool, peek().text));
                } else if (accept(TOKEN_TYPE_INTEGER_LITERAL)) {
                    parts.push(new Literal(null, __int, peek().text));
                } else if (accept(TOKEN_TYPE_FLOAT_LITERAL)) {
                    parts.push(new Literal(null, __float, peek().text));
                } else if (accept(TOKEN_TYPE_NULL)) {
                    // No type!
                    parts.push(new Literal('null'));
                } else if (accept(TOKEN_TYPE_PLUS)) {
                    parts.push(new BinaryOperator(peek().text, TOKEN_TYPE_PLUS));
                }

                eat();

                // TODO(jwwishart) expect??? or loop or expect , or ; depending on context 'expected_final_token'!!!!
            } while (!accept(expected_final_tokens) && peek().type !== TOKEN_TYPE_EOF);

            // Expression parts
            // function calls
            // etc??

            return parts;
        }

    }());


    // TODO(jwwishart) implement
    // @Type Inference -------------------------------------------------------
    //

    (function() {

        var context = null;

        erg.type_inference = function(context_arg) {
            context = context_arg;

            type_check();
        };

        function type_check() {
            for (var i = 0; i < context.unresolved_types.length; i++) {
                type_check_item(context.unresolved_types);
            }
        }

        function type_check_item(item) {
            if (item instanceof VariableDeclaration) {
                
            }
        }

    }())


    // @Ast Nodes -------------------------------------------------------------
    //

    function AstNode(parent, tokens) {
        this.parent = parent || null;
        this.tokens = tokens || [];

        // Type: all nodes must have a type... I could be "void"...
        //  of 'function' etc. It should be a SymbolInformation
        this.type = __void; // Node has no type

        // TODO(jwwishart) do we need this?)
        //this.tokens = [];
    }

    function Scope(parent) {
        AstNode.call(this, parent); // Classical Inheritance. Make this item an AstNode
        
        this.statements = [];
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
    
    ///
    /// Arguments
    ///     identifier      : the name of the variable
    ///     variable_type   : variable type (var, const)
    ///     data_type       : the data type as TypeDefinition
    function VariableDeclaration(parent, identifier) {
        AstNode.call(this, parent);

        this.type = __any;

        // Variable Declaration Specific Information
        //

        this.identifier = identifier;
        this.variable_type = 'var'; // var or const
        this.is_exported = identifier[0] !== '_';
        
        this.init = [];
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


    function AssignmentStatement(identifier, variable_decl, init) {
        AstNode.call(this, null);

        this.identifier = identifier;
        this.variable_decl = variable_decl;
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

    function FunctionCall(identifier) {
        AstNode.call(this, null);

        this.identifier = identifier;
        this.args = [];
    }


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


    function Literal(parent, type, value) {
        AstNode.call(this, parent);

        this.type = type || __void;
        this.value = value;
    }

    function Identifier(parent, identifier) {
        AstNode.call(this, parent);

        this.parent = parent;
        this.identifier = identifier;
    }

    function BinaryOperator(text, token_type) {
        this.text = text;
        this.token_type = token_type;
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
                var literal_result = null;

                // NOTE: inline, NOT prefixed!
                (function() {
                    var value = node.value;

                    if (node.data_type) {
                        if (node.data_type.name === 'string') {
                            value = "\'" + value.replace(/'/gi, "\\\'") + "\'";
                        }
                    }

                    literal_result = value;
                }());

                return literal_result;
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
                            if (node.args[i][j] instanceof BinaryOperator) {
                                build += " " + node.args[i][j].text + " ";
                                continue;
                            }

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
                        if (node.type.identifier === 'String') {
                            value = "\'" + value.replace(/'/gi, "\\\'") + "\'";
                        }

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