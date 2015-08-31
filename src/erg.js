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
        // {
        //      target: 'es6' // allows const etc.
        // }
        this.options = {
            target: 'es5'
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
        var program = new Program();
        var context = new erg.CompilerContext(program, files, options);

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

                // NOTE: Do the line and char stuff when you eat, not 
                // before!
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
        'TOKEN_TYPE_UNKNOWN', // TODO(jwwishart) what? why would we need this... why not throw an exception
        'TOKEN_TYPE_NULL',
        
        'TOKEN_TYPE_WHITESPACE',
        'TOKEN_TYPE_COMMENT_SINGLE_LINE',

        'TOKEN_TYPE_IDENTIFIER',

        // Literals
        'TOKEN_TYPE_STRING_LITERAL',
        'TOKEN_TYPE_NUMBER_LITERAL',
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
        'TOKEN_TYPE_KEYWORD_RETURN',

        // Symbols
        'TOKEN_TYPE_PLUS',
        'TOKEN_TYPE_DOT',

        'TOKEN_TYPE_ASSIGNMENT',
        'TOKEN_TYPE_UNINITIALIZE_OPERATOR',
        'TOKEN_TYPE_ASM_BLOCK',
        'TOKEN_TYPE_DIRECTIVE',
        'TOKEN_TYPE_KEYWORD_DEFER'
    ]);

    var Token = function(type, lexeme) {
        this.type = type;
        this.typeName = get_global_constant_name('TOKEN_TYPES', type);
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

        function eat() {
            tokenizer.eat();
        }

        function iterate(func, till) {
            till = till || null;

            while (tokenizer.peek() !== till) {
                func();
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

        function expect(token_type) {
            if (peek() === null) {
                throw new Error("Unexpected end of file. Was expecting: " + JSON.stringify(token_type));
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

        function add_statement(context, current_scope, statement) {
            current_scope.statements.push(statement);

            // TODO(jwwishart) add variable and func identifiers...
            if (statement instanceof VariableDeclaration) {
                current_scope.identifiers.push(statement);

                context.program.symbol_info.push(new SymbolInformation(
                    statement.identifier,
                    statement,
                    current_scope));
            }

            // TODO(jwwishart) if type decl then add to types on the scope!
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

            iterate(function() {
                parse_scope(scope);
            });
        };

        function parse_scope(current_scope) {
            while (peek() != null) {
                // {
                if (accept(TOKEN_TYPE_BRACE_OPEN)) {
                    eat();
                    parse_scope(new Scope(current_scope));
                    continue;
                }

                // }
                if (accept(TOKEN_TYPE_BRACE_CLOSE)) {
                    eat();
                    return;
                }

                // Statements
                parse_statement(current_scope);
                context.log("PARSER", JSON.stringify(current_scope.statements[current_scope.statements.length - 1]));
            }
        }

        function parse_statement(current_scope) {
            if (accept(TOKEN_TYPE_IDENTIFIER)) {
                (function() {
                    var token = peek();
                    var identifier = token.text;

                    eat(); // identifier

                    // Variable Declaration (with or without type)
                    //

                    // TODO(jwwishart) put this into a function...
                    // TODO(jwwishart) put other situations into separate helper functions...

                    if (accept([TOKEN_TYPE_SINGLE_COLON, TOKEN_TYPE_COLON_EQUALS])) {
                        (function() {
                            var variable_decl = new VariableDeclaration(identifier);
                            var data_type_name = 'any';
                            var is_assignment = false;
                            var is_explicitly_uninitialized = false;

                            //variable_decl.tokens.push(token);
                            //variable_decl.tokens.push(peek());


                            // Type declared or inferred
                            //

                            if (accept(TOKEN_TYPE_COLON_EQUALS)) {
                                is_assignment = true;
                                eat(); // :=
                            } else if (accept(TOKEN_TYPE_SINGLE_COLON)) {
                                eat(); // :

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

                            if (accept(TOKEN_TYPE_UNINITIALIZE_OPERATOR)) {
                                is_explicitly_uninitialized = true;

                                eat();
                            }

                            // TODO(jwwishart) should explicitly uninitialized values just defaults in JavaScript target?
                            if (is_assignment && is_explicitly_uninitialized === false /* fall back to default values */) {
                                // TODO(jwwishart) handle assigned expressions...
                                // - literals
                                // - expressions
                                //   - calculations (only at function scope?)
                                //   - function results( covererd in previous point?)
                                //   - ?



                                (function() {
// TODO(jwwishart) UP TO HERE
// TODO(jwwishart) UP TO HERE
// TODO(jwwishart) UP TO HERE
// TODO(jwwishart) UP TO HERE
// TODO(jwwishart) UP TO HERE
                                    var expressions = parse_expression(current_scope);

                                }());

                            } else {
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
                                switch(data_type_name) {
                                    case 'string':
                                    case 'int':
                                    case 'float':
                                    case 'bool':
                                        // Notice we sent NULL through for the value... we will use the data_type default value in this case!
                                        variable_decl.init.push(new Literal(null, get_primitive_data_type_by_name(data_type_name)));
                                        break;

                                }
                            }

                            // TODO(jwwishart) 'const' might need to be assigned to variable_type
                            variable_decl.data_type = data_type_name;
                            add_statement(context, current_scope, variable_decl);
                        }());
                    }
                    
                }());
            }

            // TODO(jwwishart) error here... if we get here
            // we are not supporting some form of statement...
            eat();
        }

        function parse_expression(current_scope) {
            // Literals
            // Expression parts
            // function calls
            // etc??
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
            // NOTE(jwwishart) the default value is RAW as we 
            new DataType('any',     'null',   true),
            new DataType('string',  '\'\'',     true),
            new DataType('int',     '0',      true),
            new DataType('float',   '0.0',    true),
            new DataType('bool',   'false',    true)
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

    


    ///
    /// Arguments
    ///     identifier      : the name of the variable
    ///     variable_type   : variable type (var, const)
    ///     data_type       : the data type as TypeDefinition
    function VariableDeclaration(identifier, variable_type, data_type, init) {
        this.identifier = identifier;
        this.variable_type = variable_type || 'variable'; // variable or constant
        this.data_type = data_type || 'any';
        this.init = init || [];
        this.is_exported = identifier[0] !== '_';
    }
    VariableDeclaration.prototype = Object.create(AstNode.prototype);



    // @Data Types ------------------------------------------------------------
    //

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
        this.data_type = data_type || new DataType('any', 'null', true);
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


        function determine_prefix(current_scope) {
            var prefix = '  ';
            var tmpScope = current_scope;

            // 
            while(tmpScope !== undefined) {
                prefix += '  ';
                tmpScope = tmpScope.parent;
            }

            return prefix;
        }

        function get_date() {
            var date = new Date();

            return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" +  date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
        }


        function process_onto_results(items, result) {
            each(items, function(item, i) {
                each(process_ast(item), function(res) {
                    result.push(res);
                });
            });
        }

        // Process Functions
        //

        // WARNING: assume here that all type information is allll goood! we should have
        // handled that during parsing or type inference or something else!
        function process_ast(node) {
            var result = [];

            var prefix = determine_prefix(node);

            // Program
            //

            if (node instanceof Program) {
                result.push('// Generated: ' + get_date());

                // Process Files
                process_onto_results(node.files, result);

                return result;
            }

            // File
            //

            if (node instanceof File) {
                result.push('// File Start: ' + node.filename);

                process_onto_results(node.statements, result);

                result.push('// File End: ' + node.filename);
                return result;
            }


            // TODO(jwwishart) block statements need to be processed...
            //     BEFORE we do standard Scope objects!


            // Scope
            //

            if (node instanceof Scope) {
                result.push("\n;(function() {");

                // TODO(jwwishart) parse statements...

                result.push("}());\n");
                return result;
            }


            // VariableDeclaration
            if (node instanceof VariableDeclaration) {
                (function() {
                    var value = 'null';
                    if (node.init.length === 1 && node.init[0] instanceof Literal) {
                        if (node.init[0].value === null) {
                            value = node.init[0].data_type.default_value;
                        } else {
                            value = node.init[0].value;
                        }

                        if (value == null) {
                            value = 'null';
                        }

                        result.push(prefix + 'var ' + node.identifier + ' = ' + value + ';');
                    // TODO(jwwishart) handle further expressions
                    } else {
                        result.push(prefix + 'var ' + node.identifier + ' = null;');
                    }
                }());
            }

            return result;
        }




    }());


}(this));