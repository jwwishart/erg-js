/*
    Notes:

    - I've realized that it is in a way important to send a context
      throughout the whole pipeline.
    - The tokens should probably be attached to the ast nodes also
    - The ast-nodes construction should probably be:
        - Determine path
        - call construciton function to do everything else
          and then assigne it where needed back in caller as 
          the caller likely knows more about the context... I think
          this is a good way anyway...

    - JavaScript construction depth needs the context object for
      depth so that other routines can know how deep things should
      be rendered
        - really need all whitespace tokens to correctly translate
          with spaces between statements the user provided, but that
          addds complexity.
    - 


    TODO:
    - Performance generally... I've doing things easily, not 
      in the fastest manner.
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


    // @Helpers --------------------------------------------------------------------
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

    function Const() {
        'use strict';
        return new Const();
    }


    // @Ast Nodes ------------------------------------------------------------------
    //

    // Base Node Type
    //

    function AstNode() {
        this.is_statement = false;
        this.tokens = [];
    }

    function AstScope() {
        this.parent = null;
        this.deferreds = [];
    }

    __global["AstNode"] = AstNode;
    __global["AstScope"] = AstScope;



    (function() {
        var create = function define_node_constructor(name, base, is_statement, params) {
            if (name.length === 0) {
                return;
            }

            var constr = function() {
                this.is_statement = is_statement;

                var me = this;
                each(params, function(val, key) {
                    me[key] = val;
                });
            };

            if (has_value(base)) {
                constr.prototype = new base();
            } else {
                constr.prototype = new AstNode();
            }

            __global[name] = constr;
        };

        create('Program',   AstScope, true, ['body']);
        create('File',      AstScope, true, ['content']);

        // TODO(jwwishart) should this be an expression? :oS
        create('VariableDeclaration',   null, true, ['kind', '','']);
        create('VariableDeclarator',    null, true, ['kind', '','']);
        create('VariableDeclarator',    null, true, ['kind', '','']);

        create('', null, true, ['','','']);
        create('', null, true, ['','','']);
        create('', null, true, ['','','']);
        create('', null, true, ['','','']);
        create('', null, true, ['','','']);
        create('', null, true, ['','','']);
        create('', null, true, ['','','']);
        create('', null, true, ['','','']);


        

    }());





    // @Helpers --------------------------------------------------------------------
    //

    // TODO(jwwishart) try and make some functional like helpers to ease the process

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


    // @Scanner ----------------------------------------------------------------
    // 

    erg.createScanner = function create_scanner(filename, code) {
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

    erg.createTokenizer = function(scanner) {
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
                lineNo: pos.lineNo,
                colNo: pos.colNo,
                filename: pos.filename
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


    // @Parser --------------------------------------------------------------------
    //


    // TODO(jwwishart) accept and expect ought just take the type and read from the
    // token stream

    // TODO(jwwishart) Why do we need to pass the parser around? do something more like
    // the lexer where the current token and the parser are in the scope.

    function expect(token, tokenType) {
        if (token == null) {
            throw new Error('Unexpected end of file; was expecting ' + tokenType + ' (' + get_global_constant_name('TOKEN_TYPES', tokenType) + ') ');
        }

        if (token.type !== tokenType) {
            throw new Error('Unexpected Token ' + token.type + ' (' + get_global_constant_name('TOKEN_TYPES', tokenType) + ') was expecting ' + tokenType + ' (' + get_global_constant_name('TOKEN_TYPES', tokenType) + ') Token Info: ' + JSON.stringify(token));
        }

        return true;
    }

    function accept(token, tokenType) {
        if (token === null) {
            return false;
        }

        if (token.type === tokenType) {
            return true;
        }

        return false;
    }

    function find_function_in_scope(scope, functionName) {
        // TODO(jwwishart) how to deal with builtin functions? declare them
        // on the scope somehow?

        if (functionName == 'print') {
            return {
                identifier: 'print',
                isBuiltIn: true,
                parameters: [{
                    name: 'message',
                    data_type: 'any'
                }]
            };
        }

        while (scope !== null) {
            // Search Statements?
            // TODO(jwwishart) Should have symbol table?
            if (scope.statements && scope.statements.length > 0) {
                for (var i = 0; i < scope.statements.length; i++) {
                    if (scope.statements[i].type === AST_NODE_TYPE_FUNCTION_DECLARATION &&
                        scope.statements[i].identifier === functionName)
                    {
                        return scope.statements[i];
                    }
                }
            }

            scope = scope.parent;
        }

        return null;
    }

    function find_variable_in_scope(scope, varName) {
        while (scope !== null) { // SHOULD NEVER BE UNDEFINED... IF IT IS scope is not a scope but likely a variable name or somethng else by accident!
            // Search Statements?
            // TODO(jwwishart) Should have symbol table?
            if (scope.statements && scope.statements.length > 0) {
                for (var i = 0; i < scope.statements.length; i++) {
                    if (scope.statements[i].type === AST_NODE_TYPE_VARIABLE_DECLARATION &&
                        scope.statements[i].identifier === varName)
                    {
                        return scope.statements[i];
                    }
                }
            }

            scope = scope.parent;
        }

        return null;
    }


    // Token Parser
    //

    function create_token_parser(tokens) {
        var i = 0;

        return {
            peek: function() {
                var val = tokens[i];

                if (val === null || val === undefined) {
                    return null;
                }

                return val;
            },
            eat: function() {
                i++;
            }
        };
    }

    // AST Creation Functions
    //

    // Top level parse function
    function create_ast(tokens) {
        return parse_top_scope(tokens);
    }

    // Parse the program scope!
    function parse_top_scope(tokens) {
        var parser = create_token_parser(tokens);

        var programScope = ast_create_scope(null /* no parent! */);
        programScope.type = AST_NODE_TYPE_PROGRAM;
        var currentScope = programScope;

        programScope.parameters.push(ast_create_parameter({
            name:           'global',
            data_type:       'any',
            isInitialized:  true
        }));

        parse_scope(currentScope, parser);

        return programScope;
    }


    function parse_scope(currentScope, parser) {
        while (parser.peek() !== null) {
            // Scope
            //

            // TODO(jwwishart) accept() and expect() ought JUST require the token constant!!! ...
            // nothing else should be required.. You should not have to peek()

            if (accept(parser.peek(), TOKEN_TYPE_BRACE_OPEN)) {
                parser.eat();
                parse_scope(ast_create_scope(currentScope), parser);
                continue;
            }

            if (accept(parser.peek(), TOKEN_TYPE_BRACE_CLOSE)) {
                parser.eat();
                return;
            }

            parse_statement(currentScope, parser);
        }
    }

    function parse_function_scope(body, parser) {
        while (parser.peek() !== null && parser.peek().type !== TOKEN_TYPE_BRACE_CLOSE) {
            // Eat open brace
            if (accept(parser.peek(), TOKEN_TYPE_BRACE_OPEN)) {
                parser.eat();
                continue;
            }

            parse_statement(body, parser);
        }
    }

    // WARNING(method signature is the same even though currentScope is not used!
    function parse_function_parameters(currentScope, parser, funcDef) {
        while(parser.peek() !== null && parser.peek().type !== TOKEN_TYPE_PAREN_CLOSE) {
            if (accept(parser.peek(), TOKEN_TYPE_COMMA)) {
                parser.eat();
                continue;
            }

            if (accept(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {
                var identifier = parser.peek().text;
                var type = null;
                parser.eat(); // eat identifier

                if (accept(parser.peek(), TOKEN_TYPE_SINGLE_COLON)) {
                    parser.eat(); // eat :

                    if (expect(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {
                        // TODO(jwwishart) non-built int types
                        if (parser.peek().text === 'string') {
                            type = 'string';
                        } else if (parser.peek().text === 'int') {
                            type = 'int';
                        } else if (parser.peek().text === 'float') {
                            type = 'float';
                        } else if (parser.peek().text === 'bool') {
                            type = 'bool';
                        }

                        // TODO(jwwishart) other built in types

                        parser.eat(); // eat type
                    }
                }

                funcDef.parameters.push(ast_create_parameter({
                    name: identifier,
                    data_type: type || 'any'
                }));

                continue;
            }

            throw new Error("Unexpected Function Parameter: " + parser.peek());
        }

        parser.eat(); // eat )
    }

    function parse_function_arguments(currentScope, parser, funcCall, funcDecl) {
        // TODO(jwwishart) this might be a bit naive.
        function count_args(expressionParts) {
            if (expressionParts == null) {
                return 1; // likely just literal etc
            }

            var count = expressionParts.length > 0 ? 1 : 0;

            for (var i = 0; i < expressionParts.length; i++) {
                // We just separate on ',' all parts are expressions so should not
                // be considered separate arguments!
                if (expressionParts[i].type === AST_NODE_TYPE_OPERATOR &&
                    expressionParts[i].operator === ',') {
                    count++;
                }
            }

            return count;
        }

        var expectedArgCount = funcDecl.parameters.length;

        while (parser.peek() !== null && parser.peek().type !== TOKEN_TYPE_SEMICOLON) {
            // TODO(jwwishart) might need parse_statement() here ???
            parse_expression(currentScope, parser, funcCall);
            parser.eat();
        }

        // TODO(jwwishart) @BUG found args counts ALL parts of the expression which
        // could include the ',' separating arguments :o(
        // Count expressions that are not ','
        var foundArgCount = count_args(funcCall.arguments.parts);

        if (expectedArgCount !== foundArgCount) {
            throw new Error("Function call to " + funcDecl.identifier + " expects " + expectedArgCount + " arguments but was provided " + foundArgCount);
        }

        // NOTE(jwwishart) we do this in caller: parse_function_execution
        // for (var i = 0; i < funcDecl.parameters.length; i++) {
        //     if (funcDecl.parameters[i].data_type !== 'any') {
        //         // Literal Expressions (single one)
        //         if (funcCall.rhs && funcCall.rhs.parts) {
        //             if (funcCall.rhs.parts[i].data_type !== funcDecl.parameters[i].data_type) {
        //                 throw new Error("Function call " + funcDecl.identifier + " expects argument " + (i + 1) + " to be of type " + funcDecl.parameters[i].data_type + " but was provided a literal of type " + funcCall.rhs.parts[i].data_type);
        //             }
        //         }

        //         // Evaluatable expressoins (need to do type inference first!!!)
        //     }
        // }
    }

    function parse_function_declaration(currentScope, parser, identifier) {
        var funcDecl = ast_create_function_declaration({
            identifier: identifier,
            body: ast_create_scope(currentScope, AST_NODE_TYPE_FUNCTION_SCOPE) // Handled differently
        });

        currentScope.statements.push(funcDecl);
        parse_function_parameters(funcDecl.body, parser, funcDecl);
        parse_function_scope(funcDecl.body, parser);

        // TODO(jwwishart) validate
        //validate_parameter_use(funcDecl);
    }

    function parse_function_execution(currentScope, parser, identifier) {
        function get_argument_n(parts, arg_no) {
            var at = 0;
            var results = [];

            // RHS parts is 
            if (!parts) {
                return [];
            }

            for (var i = 0; i < parts.length; i++) {
                // Skip commas!
                if (parts[i].type === AST_NODE_TYPE_OPERATOR && parts[i].operator === ',') {
                    continue;
                }

                // Push all parts for a given argument
                if (at === arg_no) {
                    results.push(parts[i]);
                }
                
                at++;
            }

            return results;
        }

        // Takes ALL argument values and operators and determines the most
        // likely type :oS
        function determine_type(args) {
            var type = null;

            function try_set_type(t) {
                if (type === null) {
                    type = t;
                } else if (type !== t && type !== 'any') {
                    // TODO(jwwishart) I need to figure out casting then this will go
                    throw new Error("Missmatched types: TODO(jwwishart) I need to figure out casting then this will go");
                }
            }

            for (var i =0 ; i < args.length; i++) {
                var item = args[i];

                if (item.type === AST_NODE_TYPE_OPERATOR) {
                    continue;
                }

                if (item.type === AST_NODE_TYPE_IDENTIFIER) {
                    var func = find_function_in_scope(currentScope, item.identifier)
                    if (func != null) {
                        // TODO(jwwishart) need to test against the return type of the funcction! :os
                    }

                    var variable = find_variable_in_scope(currentScope, item.identifier);
                    if (variable != null) {
                        try_set_type(variable.data_type);
                    }
                }

                if (item.type === AST_NODE_TYPE_LITERAL) {
                    try_set_type(item.data_type);
                }
            }


            if (type === null) {
                throw new Error("The type determination code is not that great yet :o( - in determine_type()");
            }

            return type;
        }

        var funcCall = ast_create_function_call({
            identifier: identifier,
            found: false
        });

        var funcDecl = find_function_in_scope(currentScope, identifier);

        if (funcDecl !== null && funcDecl.isBuiltIn === true) {
            // Builtin Function! We need to know information about it... so 
            // we need some way to store the definition of the function?
            funcCall.found = true;
            funcCall.builtin = true;
        } else if (funcDecl) {
            funcCall.found = true;
        } else {
            throw new Error('Unknown function ' + identifier);
        }

        // Args
        //

        if(parser.peek().type !== TOKEN_TYPE_PAREN_CLOSE) {
            parse_function_arguments(currentScope, parser, funcCall, funcDecl);

            // Validate Argument Types against parameter types
            for (var i in funcDecl.parameters) {
                var param_type = funcDecl.parameters[i].data_type;
                // TODO(jwwishart) what if data_type of FIRST part is any
                // TODO(jwwishart) what if data_type of parts is different: first is string, next a number etc.
                var arg = get_argument_n(funcCall.arguments.parts, parseInt(i, 10));
                var argument_type = null;

                // Argument not provided        
                if (arg.length === 0 && funcCall.arguments.parts) {
                    throw new Error("Call to function: '" + funcCall.identifier + "' was not provided argument " + (parseInt(i, 10) + 1) + " (Parameter Name: " + funcDecl.parameters[i].name + ") - Expected: '" + param_type + "' but an argument was not provided: " + JSON.stringify(parser.peek()));
                } else if (arg.length > 0) {
                    argument_type = determine_type(arg);
                }

                if (param_type === 'any') {
                } else {
                    if (param_type !== argument_type) {
                        throw new Error("Call to function: '" + funcCall.identifier + "' provides incorrect type for argument " + (parseInt(i, 10) + 1) + " (Parameter Name: " + funcDecl.parameters[i].name + ") - Expected: '" + param_type + "' but got a '" + argument_type + "'" + JSON.stringify(parser.peek()));
                    }
                }
            }
        }


        if (currentScope.is_parsing_defer) {
            currentScope.deferreds.push(funcCall)
        } else {
            currentScope.statements.push(funcCall);
        }
    }

    function determine_datatype_from_expression(parts) {
        var expected_type = 'any';

        for (var i = 0; i < parts.length; i++) {
            // First one found that is not any
            if (expected_type === 'any' && expected_type !== parts[i].data_type) {
                expected_type = parts[i].data_type;
                continue;
            } else if (expected_type === parts[i].data_type) {
                continue;
            }

            throw new Error("Expression parts are different data types :o(" + JSON.stringify(parts));
        }

        return expected_type;
    }


    function parse_statement(currentScope, parser) {

        // asm Block
        //

        if (accept(parser.peek(), TOKEN_TYPE_ASM_BLOCK)) {
            var statement = ast_create_statement({
                type: AST_NODE_TYPE_ASM,
                rhs: {
                    parts: []
                }
            });


            statement.rhs.parts.push(ast_create_literal("asm", parser.peek().text));

            if (currentScope.is_parsing_defer) {
                currentScope.deferreds.push(statement);
            } else {
                currentScope.statements.push(statement);
            }
        }

        // filename directive
        //

        if (accept(parser.peek(), TOKEN_TYPE_DIRECTIVE)) {
            if (parser.peek().text === 'filename') {
                throw new Error("Cannot use #filename directive at statement level as it renders out a string" + JSON.stringify(parser.peek()));
            }
        }

        // defer
        //

        if (accept(parser.peek(), TOKEN_TYPE_KEYWORD_DEFER)) {
            parser.eat();

            currentScope.is_parsing_defer = true;

            // TODO(jwwishart) it doesn't make sense to declare... 
            // variables... and various other things but really
            // you probably should be able to do that... regardless,
            // and they need to be implemented... only function calls
            // and assignment are supported... currently
            parse_statement(currentScope, parser);

            currentScope.is_parsing_defer = false;
        }


        // return
        // 

        if (accept(parser.peek(), TOKEN_TYPE_KEYWORD_RETURN)) {
            parser.eat();

            var statement = ast_create_statement({
                type: AST_NODE_TYPE_RETURN_STATEMENT,
                lhs: null,
                rhs: ast_create_expression()
            });

            parse_expression(currentScope, parser, statement);
            currentScope.statements.push(statement);

        }


        // Declarations
        //
        if (accept(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {
            (function() {
                var identifierToken = parser.peek();
                var identifier = identifierToken.text;
                var data_type_identifier;

                // TODO(jwwishart) should check for identifier duplicate here first!!!
                // TODO(jwwishart) is existing_variable_decl actually the declaration?
                var existing_variable_decl = find_variable_in_scope(currentScope, identifier);

                parser.eat(); // eat identifier!



                // Variable Declarations
                //

                if (accept(parser.peek(), TOKEN_TYPE_SINGLE_COLON)) {
                    parser.eat(); // eat :

                    if (expect(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {
                        data_type_identifier  = parser.peek().text;
                        parser.eat(); // eat data-type identifier
                    }

                    if (find_variable_in_scope(currentScope, identifier) != null) {
                        throw new Error("Duplicate Variable Declaration: " + JSON.stringify(identifierToken));
                    }

                    parse_variable_declaration(currentScope, parser, identifier, data_type_identifier);
                }

                if (accept(parser.peek(), TOKEN_TYPE_COLON_EQUALS)) {
                    parser.eat(); // eat :=

                    if (find_variable_in_scope(currentScope, identifier) != null) {
                        throw new Error("Duplicate Variable Declaration: " + JSON.stringify(identifierToken));
                    }

                    parse_variable_declaration(currentScope, parser, identifier, null, true /* assignment expected*/);
                }


                // Assignment
                // 

                if (accept(parser.peek(), TOKEN_TYPE_ASSIGNMENT)) {
                    parser.eat(); // eat =

                    if (existing_variable_decl === null) {
                        throw new Error("Assignment to variable '" + identifier + "'that doesn't exist: " + JSON.stringify(identifierToken));
                    }

                    var statement = {
                        type: AST_NODE_TYPE_VARIABLE_ASSIGNMENT,

                        lhs: existing_variable_decl, // TODO(jwwishart) is this a good idea? Or should I clone? might loose in-the-moment
                        rhs: ast_create_expression()
                    };

                    statement = ast_create_statement(statement);

                    var initted = parse_expression(currentScope, parser, statement);

                    if (initted === false) {
                        throw new Error("Variable Assignment not assigned a valid valid: " + JSON.stringify(identifierToken));
                    }

                    // Type Missmatch?
                    // TODO(jwwishart) move lhs and rhs checking
                    // TODO(jwwishart) accept assignment of anything to if lhs type is 'any'
                    if (statement.lhs.data_type !== 'any' && statement.lhs.data_type !== determine_datatype_from_expression(statement.rhs.parts)) {
                        throw new Error("Assignment of value of type '" + statement.rhs.data_type + "' to variable of type '" + statement.lhs.data_type + "' is not allowed. " + JSON.stringify(statement) + " ::: " + JSON.stringify(identifierToken));
                    }

                    statement.lhs.is_initialized = true; // If it wasn't it is NOW!

                    if (currentScope.is_parsing_defer) {
                        currentScope.deferreds.push(statement);
                    } else {
                        currentScope.statements.push(statement);
                    }
                }

                // Function Call
                //

                if (accept(parser.peek(), TOKEN_TYPE_PAREN_OPEN)) {
                    parser.eat(); // eat (
                    parse_function_execution(currentScope, parser, identifier);
                }

                // Function Declaration
                //

                if (accept(parser.peek(), TOKEN_TYPE_DOUBLE_COLON)) {
                    parser.eat(); // eat ::

                    if (accept(parser.peek(), TOKEN_TYPE_PAREN_OPEN)) {
                        parser.eat();
                        parse_function_declaration(currentScope, parser, identifier);
                    }
                }
            }());
        }

        // TODO(jwwishart) we essentially shouldn't get here
        // we are not supporting SOMETHING!
        parser.eat();
    }

    function parse_expression(currentScope, parser, statement) {
        var initialized = false;
        var endToken = TOKEN_TYPE_SEMICOLON;
        var accept_commas = false;

        if (statement.type === AST_NODE_TYPE_FUNCTION_CALL ||
            statement.type === AST_NODE_TYPE_FUNCTION_DECLARATION)
        {
            endToken = TOKEN_TYPE_PAREN_CLOSE;
            accept_commas = true;
        }

        // TODO(jwwishart) ast_create_expression should always be assigned to rhs IF it is an expression only... never literals???????
        function add_expression_part(statement, part) {
            if (statement.type === AST_NODE_TYPE_FUNCTION_CALL) {
                statement.arguments.parts.push(part);
            } else if (statement.type === AST_NODE_TYPE_VARIABLE_DECLARATION) {
                // TODO(jwwishart) this only takes into account the FIRST item we
                // push or the last one pushed if multiple pushed... we need to check
                // they are all the same or are cast to the same type and then that
                // they match the type of the declaration if it is explicitly typed!
                statement.data_type = part.data_type;
                statement.rhs.parts.push(part);
            } else if (statement.type === AST_NODE_TYPE_VARIABLE_ASSIGNMENT ||
                       statement.type === AST_NODE_TYPE_RETURN_STATEMENT)
            {
                statement.rhs.parts.push(part);
            } else {
                throw new Error("Can't add  part to unknown statement type: " + JSON.stringify(statement) + " ::: " + JSON.stringify(parser.peek()))
            }
        }

        while (parser.peek() !== null && parser.peek().type !== endToken) {
            // NULL
            // 
            if (accept(parser.peek(), TOKEN_TYPE_NULL)) {
                add_expression_part(statement, ast_create_literal('null', 'null'));

                initialized = true;
                parser.eat();
                continue;
            }

            if (accept(parser.peek(), TOKEN_TYPE_DIRECTIVE)) {
                if (parser.peek().text === 'filename') {
                    add_expression_part(statement, ast_create_literal('string', parser.peek().filename));
                }

                //initialized = true;
                parser.eat();
                continue;
            }

            // Boolean Literal
            if (accept(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {
                if (parser.peek().text === "true" || parser.peek().text === "false"){
                    add_expression_part(statement, ast_create_literal('bool', parser.peek().text));

                    initialized = true;
                    parser.eat();
                    continue;
                }
            }

            // Identifier
            if (accept(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {
                var identifier = parser.peek().text;

                add_expression_part(statement, ast_create_identifier(identifier));

                // Check that the identifier is initialized
                // We just need to check at the current point whether
                // it is initialized... (I hope!)
                var var_ident = find_variable_in_scope(currentScope,  identifier);
                var func_ident = find_function_in_scope(currentScope, identifier);

                if (var_ident && 
                    var_ident.lhs && 
                    var_ident.lhs.is_explicitly_uninitialized === true && 
                    var_ident.lhs.is_initialized === false)
                {
                    console.info("Use of uninitialied variable " + parser.peek().text + " before initialization. " + JSON.stringify(statement));
                }


                if (func_ident && 
                    func_ident.lhs)
                {
                    console.info("Use of uninitialied variable " + parser.peek().text + " before initialization. " + JSON.stringify(statement));
                }

                parser.eat(); // identifier

                // Function Identifier
                // TODO(jwwishart) argument might be a function...

                initialized = true;

                // Function Call that returns something
                //

                if (func_ident && accept(parser.peek(), TOKEN_TYPE_PAREN_OPEN)) {
                    parser.eat(); // eat (

                    // TODO(jwwishart) make sure we validate that the function
                    // returns something and has a valid return type for what we 
                    // are assigning to...
                    parse_function_execution(currentScope, parser, identifier);

                    // @HACK the statement was added to the scope.. remove and
                    // assign to RHS of statement above
                    // This WONT suit multiple rhs expression parts! :
                    statement.rhs.parts[0] = currentScope.statements.splice(currentScope.statements.length - 1, 1)[0];
                }

                continue;
            }

            // Operators
            //

            if (accept(parser.peek(), TOKEN_TYPE_PLUS)) {
                add_expression_part(statement, ast_create_operator(parser.peek().text));

                initialized = true;
                parser.eat();
                continue;
            }

            // Literals
            //
            if (accept(parser.peek(), TOKEN_TYPE_STRING_LITERAL)) {
                add_expression_part(statement, ast_create_literal('string', parser.peek().text));

                initialized = true;
                parser.eat();
                continue;
            }

            if (accept(parser.peek(), TOKEN_TYPE_NUMBER_LITERAL)) {
                if (parser.peek().is_float) {
                    add_expression_part(statement, ast_create_literal('float', parser.peek().text));
                } else {
                    add_expression_part(statement, ast_create_literal('int', parser.peek().text));
                }

                initialized = true;
                parser.eat();
                continue;
            }

            if (accept_commas) {
                // TODO(jwwishart) this is ONLY for function calls? how to enforce in correct scope?
                if (accept(parser.peek(), TOKEN_TYPE_COMMA)) {
                    add_expression_part(statement, ast_create_operator(parser.peek().text));

                    initialized = true;
                    parser.eat();
                    continue;
                }
            }



            // TODO(jwwishart) we should not get here... we have something
            // we don't support... should probably throw?
            parser.eat();
        }

        return initialized; // NO EXPRESSION FOUND!
    }

    function parse_variable_declaration(currentScope, parser, identifier, data_type_identifier, assignment_expected) {
        var decl = {
            identifier: identifier,
            data_type: data_type_identifier || 'any',
            is_type_determined: !!data_type_identifier, // whether infered or explicity
        };

        decl = ast_create_variable_declaration(decl);

        // Parse End or Assignment
        //

        // assignment_expected means we had a := which REQUIRES us to
        // assign a value... we ought NOT see the semicolon!
        if (!assignment_expected && accept(parser.peek(), TOKEN_TYPE_SEMICOLON)) {
            parser.eat(); // eat ;
        } else {
            // Likewise if := was prior we ought not see this!!!
            if (!assignment_expected && accept(parser.peek(), TOKEN_TYPE_ASSIGNMENT)) {
                // Assignment
                parser.eat(); // eat =

                if (accept(parser.peek(), TOKEN_TYPE_UNINITIALIZE_OPERATOR)) {
                    decl.is_explicitly_uninitialized = true;
                    parser.eat();
                } else {
                    decl.is_initialized = parse_expression(currentScope, parser, decl);

                    if (!decl.is_initialized) {
                       throw new Error("Expected literal or expression for assignment: " + JSON.stringify(parser.peek()));
                    }
                }
            } else {
                // Literal Expected???
                decl.is_initialized = parse_expression(currentScope, parser, decl);

                // TODO(jwwishart) what about identifier? ...
                // parse_expression should handle that?

                if (!decl.is_initialized) {
                   throw new Error("Expected literal or expression for assignment: " + JSON.stringify(parser.peek()));
                }
            }

            if (expect(parser.peek(), TOKEN_TYPE_SEMICOLON)) {
                parser.eat(); // eat ;
            }
        }

        if (decl.is_type_determined && 
            !decl.is_initialized &&
            !decl.is_explicitly_uninitialized)
        {
            // Built-int Types
            //

            if (decl.data_type === 'string') {
                decl.rhs.parts.push(ast_create_literal('string', ''));
            } else if (decl.data_type === 'int') {
                decl.rhs.parts.push(ast_create_literal('int', '0'));
            } else if (decl.data_type === 'float') {
                decl.rhs.parts.push(ast_create_literal('float', '0.0'));
            } else if (decl.data_type === 'bool') {
                decl.rhs.parts.push(ast_create_literal('bool', 'false'));
            } else if (decl.data_type === 'any') {
                decl.rhs.parts.push(ast_create_literal('any', 'null')); // TODO(jwwishart) any is null by default... not initialized... make sure it is not initialized!!!
            } else {
                decl.rhs.parts.push(ast_create_literal("null", "null"));
            }

            decl.is_type_available = true;

            if (decl.data_type !== 'any') {
                // TODO(jwwishart) is this what we mean.. a variable of type 'any' is not initialized? even though it is to null (see above!)
                decl.is_initialized = true;
            }

            // Custom Types
            // TODO(jwwishart) go find identifier, determine type :oS
        }

        // TODO(jwwishart) is null for identifier correct?
        // TODO(jwwishart) if uninitialized and null given we don't know the type 
        // ... so fail!
        // TODO(jwwishart) should validate that the expression makes sense here! :o(

        currentScope.statements.push(decl);
    }


    // @AST Generation ------------------------------------------------------------
    //

    generate_global_constants('AST_NODE_TYPES', [
        'AST_NODE_TYPE_UNKNOWN',

        'AST_NODE_TYPE_PARAMETER',
        'AST_NODE_TYPE_LITERAL',
        'AST_NODE_TYPE_OPERATOR',
        'AST_NODE_TYPE_IDENTIFIER',

        'AST_NODE_TYPE_EXPRESSION',

        'AST_NODE_TYPE_FUNCTION_DECLARATION',
        'AST_NODE_TYPE_FUNCTION_CALL',

        'AST_NODE_TYPE_PROGRAM',
        'AST_NODE_TYPE_SCOPE',
        'AST_NODE_TYPE_FUNCTION_SCOPE',
        'AST_NODE_TYPE_STATEMENT',
        'AST_NODE_TYPE_VARIABLE_DECLARATION',
        'AST_NODE_TYPE_VARIABLE_ASSIGNMENT',
        'AST_NODE_TYPE_ASM',
        'AST_NODE_TYPE_RETURN_STATEMENT'
    ]);


    function extend() {
        var objects = Array.prototype.slice.call(arguments);

        // TODO(jwwishart) test that objects exist)
        var first = objects[0];
        for (var i = 1; i < objects.length; i++) {
            var thisObj = objects[i];

            for (var k in thisObj) {
                first[k] = thisObj[k];
            }
        }

        return first;
    }


    // AST Generation Functions
    //

    var ast_node_id = 0;

    function ast_create_node(type, addFields) {
        var result = addFields || {};
        result.type = type || AST_NODE_TYPE_UNKNOWN;
        result.typeName = get_global_constant_name('AST_NODE_TYPES', type);
        result.guid = ast_node_id++;    
        return result;
    }



    function ast_create_scope(parentScope, type) {
        if (parentScope === undefined) {
            throw new Error("ast_create_scope was not given a parentScope");
        }

        return ast_create_node(type || AST_NODE_TYPE_SCOPE, {
            parameters: [],
            statements: [],
            deferreds: [],

            parent: parentScope,
            scopeDepth: ast_count_scope_depth(parentScope) + 1,

            is_parsing_defer: false
        });
    }

    function ast_create_statement(definition) {
        var defaults = {
            lhs: null,
            rhs: null
        };

        var def = extend({}, defaults, definition);

        return ast_create_node(def.type, def);
    }

    // Same as a Statement!
    function ast_create_variable_declaration(definition) {
        var defaults = {
            type:               AST_NODE_TYPE_VARIABLE_DECLARATION,

            identifier:         null,
            data_type:          null, // TODO(jwwishart) Cant' assume any... we WANT to have a type!!!

            // Flags
            is_initialized:     false,  // May have initialized it for the user (Default value)
            is_explicitly_uninitialized: false, // = "something"
            is_type_determined: false,

            // TODO(jwwishart) for primitive types just set this to yes!
            is_type_available:  false,
            rhs: ast_create_expression()
        };

        var def = extend({}, defaults, definition);

        return ast_create_node(def.type, def);
    }

    function ast_create_variable_expression() {} // identifier etc? Why is it an expression though?
    function ast_create_boolean_expression() {}
    function ast_create_or_expression() {} // lhs OR rhs
    function ast_create_and_expression() {} // lhs AND rhs
    function ast_create_not_expression() {} // expression (you then ! it... boolean required?

    function ast_create_expression(definition) {
        var defaults = {
            parts: []
        };

        var def = extend({}, defaults, definition);

        return ast_create_node(AST_NODE_TYPE_EXPRESSION, def);
    }

    function ast_create_parameter(definition) {
        var defaults = {
            name: null,
            data_type: 'any', // TODO(jwwishart) do we want this as any by default???
            isInitialized: false
        };

        var def = extend({}, defaults, definition);

        return ast_create_node(AST_NODE_TYPE_PARAMETER, def);
    }

    function ast_create_literal(data_type, value) {
        var definition = {
            data_type: data_type || 'any',
            isInitialized: value !== undefined,
            value: value
        };

        return ast_create_node(AST_NODE_TYPE_LITERAL, definition);
    }

    function ast_create_operator(operator) {
        return ast_create_node(AST_NODE_TYPE_OPERATOR, {
            operator: operator
        });
    }

    function ast_create_function_declaration(definition) {
        var defaults = {
            identifier: '',
            parameters: [], // name, type
            body: null, // a scope!
            isBuiltIn: false
        };

        var def = extend({}, defaults, definition);

        return ast_create_node(AST_NODE_TYPE_FUNCTION_DECLARATION, def);
    }

    function ast_create_function_call(definition) {
        var defaults = {
            identifier: '',
            builtin: false,
            found: false,

            arguments: ast_create_expression(), // list of expressions!
            body: [] // statements
        };

        var def = extend({}, defaults, definition);

        return ast_create_node(AST_NODE_TYPE_FUNCTION_CALL, def);
    }

    function ast_create_identifier(identifier) {
        return ast_create_node(AST_NODE_TYPE_IDENTIFIER, {
            identifier: identifier
        });
    }

    // Helpers
    //

    function ast_count_scope_depth(scope) {
        var count = 0;
        var currentScope = scope;

        while (currentScope && currentScope.parent !== null) {
            currentScope = currentScope.parent;
            count++;
        }

        return count;
    }



    // @JavaScript Target -----------------------------------------------------
    //


    function generate_js(ast) {
        var result = process_ast_node(ast, ast /* Program */);

        return result.join('\n');
    }

    function process_ast_node(ast, scope) {
        var result = [];

        // TODO(jwwishart) format it nicer for the poor user!

        var prefix = '  ';
        var tmpScope = scope;
        while(tmpScope.parent !== null) {
            prefix += '  ';
            tmpScope = tmpScope.parent;
        }

        function get_date() {
            var date = new Date();

            return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" +  date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
        }

        if (ast.type === AST_NODE_TYPE_SCOPE || ast.type === AST_NODE_TYPE_PROGRAM) {
            if (ast.type === AST_NODE_TYPE_PROGRAM) {
                result.push('// Generated: ' + get_date());
                result.push(';(function(global){');
            } else {
                result.push(prefix + '(function(){');
            }

            if (ast.deferreds && ast.deferreds.length > 0) {
                result.push(prefix + "try {");
            }

            for (var si in ast.statements) {
                result.push(process_ast_node(ast.statements[si], scope).join('\n'));
            }

            if (ast.deferreds && ast.deferreds.length > 0) {
                result.push(prefix + "} finally {");

                for (var dsi = ast.deferreds.length - 1; dsi >= 0; dsi--) {
                    result.push(prefix + process_ast_node(ast.deferreds[dsi], scope).join('\n'));
                }        

                result.push(prefix + "}");
            }

            if (ast.type === AST_NODE_TYPE_PROGRAM) {
                result.push('}(this));'); // TODO(jwwishart) node etc?
            } else {
                result.push(prefix + '}();'); // TODO(jwwishart) node etc?
            }
        }

        if (ast.type === AST_NODE_TYPE_FUNCTION_SCOPE) {
            if (ast.deferreds && ast.deferreds.length > 0) {
                result.push(prefix + "try {");
            }

            for (var si in ast.statements) {
                result = result.concat(process_ast_node(ast.statements[si], scope));
            }

            if (ast.deferreds && ast.deferreds.length > 0) {
                result.push(prefix + "} finally {");

                for(var dsi = ast.deferreds.length - 1; dsi >= 0; dsi--) {
                    result.push(prefix + process_ast_node(ast.deferreds[dsi], scope).join('\n'));
                }

                result.push(prefix + "}");
            }
        }

        if (ast.type === AST_NODE_TYPE_ASM) {
            result.push("\n// RAW ASM OUTPUT START (javascript -------------------------\n");
            result.push(ast.rhs.parts[0].value.trim());
            result.push("\n// RAW ASM OUTPUT END (javascript) --------------------------\n");
        }

        if (ast.type === AST_NODE_TYPE_VARIABLE_DECLARATION)
        {
            if (ast.is_explicitly_uninitialized || ast.is_initialized === false) {
                // NOTE: we don't let anything be 'undefined'!!!
                result.push(prefix + 'var ' + ast.identifier + ' = null;');
            } else {
                // TODO(jwwishart) process_ast_node(ast.rhs, scope)!!! :oS
                result.push(prefix + 'var ' + ast.identifier + ' = ' + process_ast_node(ast.rhs, scope) + ';');
            }
        }

        if (ast.type === AST_NODE_TYPE_VARIABLE_ASSIGNMENT) {
            result.push(prefix + ast.lhs.identifier + ' = ' + process_ast_node(ast.rhs, scope) + ';');
        }

        if (ast.type === AST_NODE_TYPE_RETURN_STATEMENT) {
            result.push(prefix + 'return ' + process_ast_node(ast.rhs, scope) + ';');
        }

        if (ast.type === AST_NODE_TYPE_EXPRESSION) {
            return (function() {
                // TODO(jwwishart) how would we verify that it is a VALID expression?
                // ... probably just the same as this method but purely in an expect/accept manner?
                var parts = [];

                for (var part in ast.parts) {
                    parts.push(process_ast_node(ast.parts[part], scope));
                }

                return parts.join(' ');
            }());
        }

        if (ast.type === AST_NODE_TYPE_LITERAL) {
            if (ast.data_type === 'string') {
                return '"' + ast.value + '"';
            }

            if (ast.data_type === 'int') {
                return ast.value;
            }

            if (ast.data_type === 'float') {
                return ast.value;
            }

            if (ast.data_type === 'bool') {
                return ast.value;
            }

            if (ast.data_type === 'any') {
                return ast.value;
            }

            throw new Error('ast data_type unknown: ' + ast.data_type);
        }

        if (ast.type === AST_NODE_TYPE_OPERATOR) {
            // TODO(jwwishart) spaces around are so + has spaces ...
            // BUT this might not work for other operators :oS
            return ' ' + ast.operator + ' ';
        }

        if (ast.type === AST_NODE_TYPE_IDENTIFIER) {
            return ast.identifier;
        }
        
        if (ast.type === AST_NODE_TYPE_FUNCTION_DECLARATION) {
            var params = '';
            for (var p = 0; p < ast.parameters.length; p++) {
                params += ast.parameters[p].name + ', ';
            }

            params = params.substring(0, params.length - 2);
            result.push(prefix + 'function ' + ast.identifier + '(' + params + ') {');

            result.push(process_ast_node(ast.body, ast.body).join('\n'));

            result.push(prefix + '}');
        }

        if (ast.type === AST_NODE_TYPE_FUNCTION_CALL) {
            (function() {
                var funcName = ast.identifier;
                var parts = '';
                var expPartList = [];

                // Builting Functions
                //
                
                if (ast.builtin === true) {
                    if (ast.identifier === 'print') {
                        funcName ='console.log';
                    } else {
                        throw new Error("Unexpected Error: Hit unknown builting function" + ast.identifier);
                    }
                }

                parts += funcName + '(';

                // Argument Expressions?
                if (ast.arguments) {
                    // TODO(jwwishart) @BUG expression parts might have , for arguments passed to function :oS
                    for (var i= 0; i < ast.arguments.parts.length; i++) {
                        // TODO(jwwishart) if identifier and identifier is a variable name check that the variable is initialized and warn if not
                        parts += process_ast_node(ast.arguments.parts[i], scope);
                    }
                }

                parts += ');';

                result.push(prefix + parts);
            }());
        }

        return result;
    }



    // @Compiler ------------------------------------------------------------------
    //

    erg.compile = function compile(filename, code, debug) {
        if (debug) {
            console.log(code);
            console.log(code.length);
        }

        var results = '';
        var scanner = erg.createScanner(filename, code);
        var lexer = erg.createTokenizer(scanner, true);
        var t;
        var tokens = [];

        while ((t = lexer.peek()) !== null) {
            if (debug) {
                console.log("TOKEN: (ln: " + t.lineNo + ", col: " + t.colNo + ") - " + t.typeName + " - Text: " + t.text);
            }

            tokens.push(t);
            lexer.eat();
        }
        
        if (debug) {
            console.log(tokens);

            console.log(results);
            console.log(code.length);
        }

        var ast = create_ast(tokens);

        if (debug) {
            console.log(ast);
        }

        return generate_js(ast);
    };

}(this));