/*
    Backlog:
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
        
        this.options = {
            target: options.target || 'es5'
        };


        this.logger = options && options.logger;

        this.current_filename = '';
        this.current_code = '';
    };

    erg.CompilerContext = CompilerContext;

    erg.CompilerContext.prototype.log = function(group, message) {
        if (this.logger) {
            this.logger.log(group, message);
        }
    };

    erg.CompilerContext.prototype.error = function(group, error) {
        if (this.logger) {
            this.logger.error(group, error);
        }
    };

    erg.CompilerContext.prototype.warning = function(group, warning) {
        if (this.logger) {
            this.logger.error(group, warning);
        }
    };


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

        console.log(context);

        each(files, function(code, filename) {
            // Set current file information to context
            context.current_filename = filename;
            context.current_code     = code;

            // Process the file!
            var scanner = erg.scan(context);
            var tokenizer = erg.tokenize(context, scanner);
            
            erg.parse(context, tokenizer);

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
                context.log("SCANNER", code[i] + " - " + JSON.stringify(this.peek()));

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

        // Symbols
        'TOKEN_TYPE_PLUS',
        'TOKEN_TYPE_DOT',

        'TOKEN_TYPE_ASSIGNMENT',
        'TOKEN_TYPE_UNINITIALIZE_OPERATOR',
        'TOKEN_TYPE_ASM_BLOCK',
        'TOKEN_TYPE_DIRECTIVE',
        'TOKEN_TYPE_KEYWORD_DEFER',
        'TOKEN_TYPE_STRUCT_KEYWORD',
        'TOKEN_TYPE_ENUM_KEYWORD'
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


        // Char Traversal
        //

        function peek() {
            return scanner.peek();
        }

        function eat() {            
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
                        

                        var number_result = get_number_literal();
                        token.text = number_result.result;
                        token.is_float = number_result.is_float;

                        if (token.is_float) {
                            token.type = TOKEN_TYPE_FLOAT_LITERAL;
                            token.type_name = get_global_constant_name('TOKEN_TYPES', token.type);
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
                        }

                        if (token.text === "defer") {
                            token = create_token(TOKEN_TYPE_KEYWORD_DEFER, 'defer');
                        }

                        if (token.text === "return") {
                            token = create_token(TOKEN_TYPE_RETURN_KEYWORD, 'return');
                        }

                        if (token.text === "null") {
                            token = create_token(TOKEN_TYPE_NULL, 'null');
                        }

                        if (token.text === "struct") {
                            token = create_token(TOKEN_TYPE_STRUCT_KEYWORD, 'struct');
                        }

                        if (token.text === "enum") {
                            token = create_token(TOKEN_TYPE_ENUM_KEYWORD, 'enum');
                        }

                        if (token.text === "new") {
                            token = create_token(TOKEN_TYPE_NEW_KEYWORD, 'new');
                        }

                        return token;
                    }

                    var error_char_info = scanner.get_lexeme();

                    throw new Error("ERROR: Unexpected character '" + c + "' (ASCII: ' + c.charCodeAt(0) + ') (ln: " + error_char_info.line_no + ", col: " + error_char_info.col_no +")");
                }

                return null;
            },

            eat: function() {
                context.log("TOKENIZERE", JSON.stringify(token));
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


        function peek() {
            return tokenizer.peek();
        }

        // If we eat() we just move to the next valid token... the parse shouldn't have
        // to worry about whitespace...
        function eat() {
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
            }
        }

        function accept(token_type) {
            if (peek() === null) {
                return false; // Not the requested token
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
                throw new Error("Unexpected end of file. Was expecting: " + JSON.stringify(token_type));
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

                // TODO(jwwishart) make this error a little clearer by showing the ACTUAL string constant names for all required tokens
                throw new Error('Unexpected Token ' + peek().type + ' (' + get_global_constant_name('TOKEN_TYPES', peek().type) + ') was expecting one of ' + JSON.stringify(token_type) + ' Token Info: ' + JSON.stringify(peek()));
            } else {
                if (peek().type !== token_type) {
                    throw new Error('Unexpected Token ' + peek().type + ' (' + get_global_constant_name('TOKEN_TYPES', peek().type) + ') was expecting ' + token_type + ' (' + get_global_constant_name('TOKEN_TYPES', token_type) + ') Token Info: ' + JSON.stringify(peek()));
                }
            }

            return true;
        }

        function add_statement(current_scope, statement) {
            current_scope.statements.push(statement);

            // TODO(jwwishart) should checking for duplicates be done here automatically???

            if (statement instanceof VariableDeclaration ||
                statement instanceof StructDeclaration ||
                statement instanceof FunctionDeclaration)
            {
                current_scope.identifiers.push(statement);

                context.program.symbol_info.push(new SymbolInformation(
                    statement.identifier,
                    statement,
                    current_scope));
            }

            if (statement instanceof FieldDefinition)
            {
                current_scope.identifiers.push(statement);

                context.program.symbol_info.push(new SymbolInformation(
                    statement.identifier,
                    statement,
                    current_scope));
            }
        }

        function get_primitive_data_type_by_name(name) {
            var result = null;

            each(context.program.types, function(type) {
                if (type.name === name) {
                    result = type;
                    return false;
                }
            });

            return result;
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

            each(cont.scope.identifiers, function(item) {
                if (item.identifier === identifier) 
                {
                    cont.found = true;
                    cont.decl = item;

                    return false; // cancel loop!
                }
            });

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
            
            throw new Error("NOT IMPLEMENTED: infer_type no expression of type " + typeof(expression) + " not yet available");
        }

        function is_null_literal(expressions) {
            return expressions.length === 1 && expressions[0] instanceof Literal && expressions[0].value === "null" && expressions[0].type == null; // or undefined
        }

        function get_while_condition(token_to_cancel_on) {
            if (token_to_cancel_on !== undefined && token_to_cancel_on !== null) {
                return peek() !== null && peek().type !== token_to_cancel_on;
            }

            return peek() !== null;
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
            context = context_arg;
            tokenizer = tokenizer_arg;


            // Helper Functions
            //


            // File Node Construction
            //

            var file = new File(context.current_filename, context.program);
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
                                    throw new Error("Identifier '" + identifier + "' not found in scope: " + JSON.stringify(identifier + " " + JSON.stringify(peek())));
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
                                throw new Error("Constant '" + identifier + "' cannot be changed; " + JSON.stringify(info.decl));
                            }

                            // Cannot find identifier to assign the value to...
                            if (info.found === false) {
                                throw new Error("Cannot assign value to undeclared identifier '" + identifier + "' " + JSON.stringify(peek()));
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
                            } else if (is_null_literal(expressions) && expected_data_type != 'any') {
                                // TODO(jwwishart) should strings be nullable?
                                throw new Error("Cannot assign null to non nullable type of '" + expected_data_type + "' - null can only be assigned to variables of type 'any' or custom variable types. " + JSON.stringify(peek()));
                            } else if (inferred_type.name === expected_data_type) {
                                // Is Don, is Good!
                            } else {
                                throw new Error("Expression of type '" + inferred_type.name + "' cannot be assigned to variable of expected type '" + expected_data_type + "' " + JSON.stringify(peek()));
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

            throw new Error("unexpected token: " + JSON.stringify(peek()));
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
                throw new Error("Identifier '" + identifier + "' cannot be re-declared; " + JSON.stringify(identifier + " " + JSON.stringify(peek())));
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
        function parse_variable_declaration(current_scope, identifier, is_const, expected_final_token) {
            var variable_decl = new VariableDeclaration(identifier);
            var data_type_name = 'any';
            var is_data_type_explicit = false;
            var is_assignment = false;
            var is_explicitly_uninitialized = false;
            var is_type_instantiation = false;

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

                // data_type?
                if (expect(TOKEN_TYPE_IDENTIFIER)) {
                    data_type_name = peek().text;

                    eat(); // identifier

                    // TODO(jwwishart) does the type exist. Add to scope and program, mark as unknown type

                    if (accept(TOKEN_TYPE_ASSIGNMENT)) {
                        is_assignment = true;
                        eat(); // =
                    }
                }
            }

            if (accept(TOKEN_TYPE_UNINITIALIZE_OPERATOR)) {
                is_explicitly_uninitialized = true;

                eat(); // ---
            }

            if (accept(TOKEN_TYPE_NEW_KEYWORD)) {
                eat(); // 'new'

                if (expect(TOKEN_TYPE_IDENTIFIER)) {
                    (function() {
                        var info = get_identifier_declaration_information(current_scope, peek().text);
                        
                        if (info === null || info.decl === null) {
                            throw new Error("Identifier '" + identifier + "' not found in scope: " + JSON.stringify(identifier + " " + JSON.stringify(peek())));
                        }

                        var init = new TypeInstantiation(peek().text);

                        variable_decl.init = [init];

                        eat();

                        expect_and_eat(TOKEN_TYPE_SEMICOLON);

                        is_type_instantiation = true;
                    }());
                }
            }

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
                    var expressions = parse_expression(current_scope, expected_final_token);

                    if (expressions.length === 0) {
                        throw new Error("Variable declaration '" + identifier + "' missing initialization value" + JSON.stringify(peek()));
                    }

                    // TODO(jwwishart) what is can't infer the type?
                    // TODO(jwwishart) what if expression is NULL!!!

                    var inferred_type = infer_type(expressions);

                    if (is_data_type_explicit) {
                        if (inferred_type.name === data_type_name) {
                            // Is Don, is Good!
                        } else {
                            throw new Error("Expression of type '" + inferred_type.name + "' cannot be assigned to variable of expected type '" + data_type_name + "'");
                        }
                    }

                    variable_decl.init = expressions;
                }());
            } else {
                if (is_data_type_explicit == false &&
                    is_assignment &&
                    is_explicitly_uninitialized === true) 
                {
                    throw new Error("You cannot explicitly uninitilize an untyped variable declaration... you must provide a type! " +  JSON.stringify(peek()));
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
                var literal_assignment_done = false;
                switch(data_type_name) {
                    case 'string':
                    case 'int':
                    case 'float':
                    case 'bool':
                        // Notice we sent NULL through for the value... we will use the data_type default value in this case!
                        variable_decl.init.push(new Literal(null, get_primitive_data_type_by_name(data_type_name)));
                        literal_assignment_done = true;
                        break;
                }

                if (literal_assignment_done === false && is_explicitly_uninitialized === false) {
                    var info = get_identifier_declaration_information(current_scope, data_type_name);

                    if (info !== null && info.decl !== null && info.decl instanceof StructDeclaration) {
                        var init = new TypeInstantiation(data_type_name);
                        variable_decl.init = [init];
                    }
                }
            }

            // TODO(jwwishart) 'const' might need to be assigned to variable_type

            variable_decl.data_type = data_type_name;
            add_statement(current_scope, variable_decl);
        }

        function parse_field_assignment_expression(current_scope, data_type_name, expected_final_token) {
            var expressions = parse_expression(current_scope, expected_final_token);

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
                var identifier = peek().text;

                eat(); // identifier

                expect_and_eat(TOKEN_TYPE_SINGLE_COLON);

                expect(TOKEN_TYPE_IDENTIFIER);

                var data_type = peek().text;
                eat();

                var param = new ParameterInfo(identifier, data_type);

                each(results, function(res) {
                    if (res.identifier === identifier) {
                        throw new Error("You cannot declare function with the same parameter name twice: Parameter name is: " + identifier + " | " + JSON.stringify(peek()));
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

                if (accept(TOKEN_TYPE_COMMA)) {
                    eat(); // ,
                }
                
                results.push(param);
            }

            expect_and_eat(TOKEN_TYPE_PAREN_CLOSE);

            return results;
        }

        // TODO(jwwishart) this should be in statement OR expression position as calls can return values
        function parse_function_call(current_scope, identifier) {
            var call = new FunctionCall(identifier);

            /*
                - verify that the function exists (identifier exists representation is a function declaration or found imported)
                - parse argument expressions (comma separated)

             */

            expect_and_eat(TOKEN_TYPE_PAREN_OPEN);

            call.args = parse_function_call_arguments(current_scope, identifier);

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

                results.push(parse_expression(current_scope, TOKEN_TYPE_COMMA));
            } while (accept(TOKEN_TYPE_COMMA));

            return results;
        }

        function parse_expression(current_scope, expected_final_token) {
            var parts = [];
            var token = peek();

            var expected_final_token = expected_final_token || TOKEN_TYPE_SEMICOLON;

            // TODO(jwwishart) when is an expression ended? semicolon, no operator followed by...
            //  an identifier? how to detect missing semicolons essentially.

            // Literals
            //

            // TODO(jwwishart) this code should be able to be some by some helper function!
            if (accept(TOKEN_TYPE_IDENTIFIER)) {
                // TODO(jwwishart) check that the identifier exists, is the right type etc!!!
                parts.push(new Identifier(token.text));
            } else if (accept(TOKEN_TYPE_STRING_LITERAL)) {
                parts.push(new Literal(token.text, get_primitive_data_type_by_name('string')));
            } else if (accept(TOKEN_TYPE_BOOLEAN_LITERAL)) {
                parts.push(new Literal(token.text, get_primitive_data_type_by_name('bool')));
            } else if (accept(TOKEN_TYPE_INTEGER_LITERAL)) {
                parts.push(new Literal(token.text, get_primitive_data_type_by_name('int')));
            } else if (accept(TOKEN_TYPE_FLOAT_LITERAL)) {
                parts.push(new Literal(token.text, get_primitive_data_type_by_name('float')));
            } else if (accept(TOKEN_TYPE_NULL)) {
                // No type!
                parts.push(new Literal('null'));
            }

            eat();

            // TODO(jwwishart) expect??? or loop or expect , or ; depending on context 'expected_final_token'!!!!
            if (!accept(expected_final_token)) {
                // TODO(jwwishart) continue the loop
            }

            // Expression parts
            // function calls
            // etc??

            return parts;
        }

    }());



    // @Ast Nodes -------------------------------------------------------------
    //

    function AstNode() {
        this.tokens = [];
    }

    function Scope(parent) {
        AstNode.call(this); // Classical Inheritance. Make this item an AstNode

        this.parent = parent; // only need to go UP the scope, not down...
        
        this.statements = [];
        this.deferred = [];

        this.types = [];        // enum, structs (built in types if on program)
        this.identifiers = [];  // function and variable
    }



    // Symbol information attached to program for ALL types
    // which contains the identifier for the symbol, the declaration
    // which might be a function decl,
    // identifier = the variable/function/type name
    // decl       = the declaration object (variable decl, function decl,
    //              type decl.
    // scope      = the scope containing the decl.
    function SymbolInformation(identifier, decl, scope) {
        AstNode.call(this);

        this.identifier  = identifier;
        this.declaration = decl;
        this.scope       = scope;

        // true ONLY WHEN all type information is resolved
        // when all symbol information objects in
        // the Program.symbol_info array are is_resolved == true
        // then we are done type inference!
        this.is_resolved = false;
    }

    function Program() {
        AstNode.call(this, null);

        if (this === undefined) {
            throw new Error("Program not called as a constructor");
        }

        this.files = [];
        this.types = [
            // NOTE(jwwishart) the default value is RAW
            // TODO(jwwishart) these should be: identifiers in program scope and should have full...
            //  type declarations behind them: eg: Any, String, Integer, Float, Boolean etc...
            //  and should be added to the program when here as standard types... How to do that?
            new DataType('any',     'null',  true),
            new DataType('string',  '',      true),
            new DataType('int',     '0',     true),
            new DataType('float',   '0.0',   true),
            new DataType('bool',    'false', true)
        ];

        // Contains all symbols in the program
        this.symbol_info = [];
    }


    function File(name, program) {
        Scope.call(this, program);

        this.filename = name;
        this.program = program;

        this.types = [];
    }


    function AsmBlock(raw_code) {
        AstNode.call(this, null);

        this.raw_code = raw_code;
    }
    
    ///
    /// Arguments
    ///     identifier      : the name of the variable
    ///     variable_type   : variable type (var, const)
    ///     data_type       : the data type as TypeDefinition
    function VariableDeclaration(identifier, variable_type, data_type, init) {
        AstNode.call(this, null);

        this.identifier = identifier;
        this.variable_type = variable_type || 'var'; // var or const
        this.data_type = data_type || 'any';
        this.init = init || [];
        this.is_exported = identifier[0] !== '_';
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
        Scope.call(this, parent_scope)

        this.identifier = identifier;

        // statements on scope ARE the field declarations
    }

    function EnumDeclaration(identifier, parent_scope) {
        Scope.call(this, parent_scope)

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


    // @Data Types ------------------------------------------------------------
    //

    // TODO(jwwishart) should this be called PrimitiveType?
    function DataType(name, default_value, is_builtin) {
        if (default_value === undefined) {
            default_value = 'null';
        }

        if (is_string(default_value) === false) {
            throw new Error("DataType constructor must take a STRING representation for the default_value argument");
        }

        this.name = name;
        this.default_value = default_value;
        this.is_builtin = is_builtin;
    }

    function Literal(value, data_type) {
        this.value = value;
        this.data_type = data_type;
    }

    function Identifier(identifier) {
        this.identifier = identifier;
    }

    function TypeInstantiation(type_name) {
        this.type_name = type_name;
    }



    // @Target ----------------------------------------------------------------
    //

    (function() {
        var context = null;

        erg.target = function(context_arg) {
            context = context_arg;

            context.log("TARGET", context.program);
            context.log("TARGET", context.program.files[0]);

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

            // Program
            //

            if (node instanceof Program) {
                push('// Generated: ' + get_date());

                push('\n"use strict";\n'); // Required for 'let' in node v4+ code output

                // Process Files
                process_onto_results(node.files, result, level);

                return result;
            }

            // File
            //

            if (node instanceof File) {
                push('// File Start: ' + node.filename);

                process_onto_results(node.statements, result, level);

                push('// File End: ' + node.filename);
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
                    push("\n{");
                } else {
                    push("\n;(function() {");
                }

                process_onto_results(node.statements, result, level + 1);

                if (is_es6) {
                    push("}\n");
                } else {
                    push("}());\n");
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

                    push("\n" + "function " + node.identifier + "(" + params.join(',') + ") {");

                    process_onto_results(node.statements, result, level + 1);

                    push("}\n");
                }());
            }

            if (node instanceof FunctionCall) {
                (function() {
                    var build = node.identifier + "(";

                    for (var i = 0; i < node.args.length; i++) {
                        // TODO(jwwishart) we only support single token expressions currently ...
                        //  for each argument
                        build += process_ast(node.args[i][0], null);

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
                    var the_const = is_es6 ? 'const ' : '';

                    var value = 'null';
                    var is_decl = node instanceof VariableDeclaration;

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

                        var note = '';
                        var is_const = node.variable_type === 'const';
                        if (is_const) {
                            note = ' // const';
                        }

                        if (is_const && is_es6) {
                            push((is_decl ? the_const : '') + node.identifier + ' = ' + value + ';' + note);
                        } else {
                            push((is_decl ? the_var : '') + node.identifier + ' = ' + value + ';' + note);
                        }
                        // TODO(jwwishart) handle further expressions
                    } else if (node.init.length === 1 && node.init[0] instanceof TypeInstantiation) {
                        push((is_decl ? the_var : '') + node.identifier + ' = new ' + node.init[0].type_name + ';');
                    } else {
                        // TODO(jwwishart) assignment to a const not allowed!)
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