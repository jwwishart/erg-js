'use strict';

var __global = this;
var erg;

(function() {
    erg = __global.erg || {};
    __global.erg = erg;

    if (typeof module === 'object' && typeof module.exports === 'object') {
        __global = GLOBAL;

        // Common JS
        module.exports = erg;
    }
}(this));





// @Helpers --------------------------------------------------------------------
//

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

erg.createScanner = function create_scanner(code) {
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
                colNo: colNo
            };
        }
    };
}


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
    'TOKEN_TYPE_PLUS'
]);

erg.createTokenizer = function(scanner) {
    var CharToToken = {
        ' '  : TOKEN_TYPE_WHITESPACE,
        '\t' : TOKEN_TYPE_WHITESPACE,
        '\n' : TOKEN_TYPE_WHITESPACE,

        '('  : TOKEN_TYPE_PAREN_OPEN,
        ')'  : TOKEN_TYPE_PAREN_CLOSE,

        '{'  : TOKEN_TYPE_BRACE_OPEN,
        '}'  : TOKEN_TYPE_BRACE_CLOSE,

        ';'  : TOKEN_TYPE_SEMICOLON,
        ','  : TOKEN_TYPE_COMMA,
        
        '+'  : TOKEN_TYPE_PLUS
    }

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
    }

    function create_token(type, text) {
        var pos = scanner.get_position_info();

        return {
            type: type,
            typeName: get_global_constant_name('TOKEN_TYPES', type),
            text: text,
            lineNo: pos.lineNo,
            colNo: pos.colNo
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


    function get_number_literal() {
        var result = '';

        // TODO(jwwishart) floats, decimal, hex, exponents etc.

        while((c = peek()) !== null) {
            if (c >= '0' && c <= '9') {
                result += c;
                eat();
                continue;
            }

            break;
        }

        return result;
    }

    function try_map_char_to_token(c) {
        var tokKey = CharToToken[c];

        if (tokKey === undefined) return null;

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
        if (c === null) return false;
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
                multilineCommentDepth--
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
                    if (c === ' ' || c === '\t' || c === '\n') {
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
                    token = create_token(TOKEN_TYPE_STRING_LITERAL, '');
                    token.text = get_string_literal();

                    return token;
                }

                // Number Literals
                // TODO(jwwishart) ints only, support floats etc.
                if (c >= '0' && c <= '9') {
                    token = create_token(TOKEN_TYPE_NUMBER_LITERAL, '');
                    token.text = get_number_literal();

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

                if (/[a-zA-Z]/gi.test(c)) {
                    token = create_token(TOKEN_TYPE_IDENTIFIER, '');
                    token.text = get_identifier();
                    return token;
                }

                var errorCharInfo = scanner.get_position_info();

                console.error("ERROR: Unexpected character '" + c + "' (ln: " + errorCharInfo.lineNo + ", col: " + errorCharInfo.colNo +")");
                return null; // we have missed something?
            }

            return null;
        },

        eat: function() {
            token = null;
        }
    };
}


// @Parser --------------------------------------------------------------------
//


// TODO(jwwishart) accept and expect ought just take the type and read from the
// token stream

// TODO(jwwishart) Why do we need to pass the parser around? do something more like
// the lexer where the current token and the parser are in the scope.

function expect(token, tokenType) {
    if (token.type !== tokenType) {
        throw new Error('token.type was not ' + tokenType + ' for ' + JSON.stringify(token));
    }

    return true;
}

function accept(token, tokenType) {
    if (token == null) {
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
                dataType: 'any'
            }]
        };
    }

    while (scope !== null) {
        // Search Statements?
        // TODO(jwwishart) Should have symbol table?
        if (scope.statements && scope.statements.length > 0) {
            for (var i = 0; i < scope.statements.length; i++) {
                if (scope.statements[i].type === AST_NODE_TYPE_FUNCTION_DECLARATION
                    && scope.statements[i].identifier === functionName) 
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
    while (scope !== null) {
        // Search Statements?
        // TODO(jwwishart) Should have symbol table?
        if (scope.statements && scope.statements.length > 0) {
            for (var i = 0; i < scope.statements.length; i++) {
                if (scope.statements[i].type === AST_NODE_TYPE_VARIABLE_DECLARATION
                    && scope.statements[i].text === varName)
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
            dataType:       'any',
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
                        } else if (parser.peek().text === 'bool') {
                            type = 'bool';
                        }
                        // TODO(jwwishart) other built in types

                        parser.eat(); // eat type
                    }
                }

                funcDef.parameters.push(ast_create_parameter({
                    name: identifier,
                    dataType: type || 'any'
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
            var count = 0;
            for (var i = 0; i < expressionParts.length; i++) {
                if (expressionParts[i].type === AST_NODE_TYPE_OPERATOR) {
                    continue;
                }

                count++;
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
        var foundArgCount = count_args(funcCall.rhs.parts);

        if (expectedArgCount !== foundArgCount) {
            throw new Error("Function call to " + funcDecl.identifier + " expects " + expectedArgCount + " arguments but was provided " + foundArgCount);
        }

        for (var i = 0; i < funcDecl.parameters.length; i++) {
            if (funcDecl.parameters[i].dataType !== 'any') {
                // Literal Expressions (single one)
                if (funcCall.rhs && funcCall.rhs.parts) {
                    if (funcCall.rhs.parts[i].dataType !== funcDecl.parameters[i].dataType) {
                        throw new Error("Function call " + funcDecl.identifier + " expects argument " + i + " to be of type " + funcDecl.parameters[i].dataType + " but was provided a literal of type " + funcCall.expression.parts[i].dataType);
                    }
                }

                // Evaluatable expressoins (need to do type inference first!!!)
            }
        }
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

        parse_function_arguments(currentScope, parser, funcCall, funcDecl);

        currentScope.statements.push(funcCall);
    }

    function parse_statement(currentScope, parser) {
        // Declarations
        //
        if (accept(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {
            (function() {
                var identifierToken = parser.peek();
                var identifier = identifierToken.text;

                parser.eat(); // eat identifier!

                // Variable Declarations
                //

                if (accept(parser.peek(), TOKEN_TYPE_COLON_EQUALS)) {
                    parser.eat(); // eat :=
                    parse_variable_declaration(currentScope, parser, identifier);
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
        var acceptComma = false;

        if (statement.type === AST_NODE_TYPE_FUNCTION_CALL ||
            statement.type === AST_NODE_TYPE_FUNCTION_DECLARATION)
        {
            endToken = TOKEN_TYPE_PAREN_CLOSE;
            acceptComma = true;
        }

        while (parser.peek() !== null && parser.peek().type !== endToken) {
            // NULL
            // 
            if (accept(parser.peek(), TOKEN_TYPE_NULL)) {
                statement.rhs = statement.rhs || ast_create_expression();
                statement.rhs.parts.push(ast_create_literal('null', 'null'));

                initialized = true;
                parser.eat();
                continue;
            }

            // Boolean Literal
            if (accept(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {
                if (parser.peek().text === "true" || parser.peek().text === "false"){
                    statement.rhs = statement.rhs || ast_create_expression();
                    statement.rhs.parts.push(ast_create_literal('bool', parser.peek().text));
                    // Special as bool value is identifier not parsed like strings and numbers
                    statement.dataType = 'bool';

                    initialized = true;
                    parser.eat();
                    continue;
                }
            }

            // Identifier
            if (accept(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {
                statement.rhs = statement.rhs || ast_create_expression();
                statement.rhs.parts.push(ast_create_identifier(parser.peek().text));

                initialized = true;
                parser.eat();
                continue;
            }

            // Operators
            //

            if (accept(parser.peek(), TOKEN_TYPE_PLUS)) {
                statement.rhs = statement.rhs || ast_create_expression();
                statement.rhs.parts.push(ast_create_operator(parser.peek().text));

                initialized = true;
                parser.eat();
                continue;
            }

            // Literals
            //
            if (accept(parser.peek(), TOKEN_TYPE_STRING_LITERAL)) {
                statement.rhs = statement.rhs || ast_create_expression();
                statement.rhs.parts.push(ast_create_literal('string', parser.peek().text));

                initialized = true;
                parser.eat();
                continue;
            }

            if (accept(parser.peek(), TOKEN_TYPE_NUMBER_LITERAL)) {
                statement.rhs = statement.rhs || ast_create_expression();
                statement.rhs.parts.push(ast_create_literal('int', parser.peek().text));

                initialized = true;
                parser.eat();
                continue;
            }

            if (accept(parser.peek(), TOKEN_TYPE_IDENTIFIER)) {

                continue;
            }

            if (acceptComma) {
                // TODO(jwwishart) this is ONLY for function calls? how to enforce in correct scope?
                if (accept(parser.peek(), TOKEN_TYPE_COMMA)) {
                    statement.rhs = statement.rhs || ast_create_expression();
                    statement.rhs.parts.push(ast_create_operator(parser.peek().text));

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

    function parse_variable_declaration(currentScope, parser, identifier) {
        var variableDefinition = {
            identifier: identifier,
            dataType: 'any',
            isInitialized: false
        };

        var statement = {
            type: AST_NODE_TYPE_VARIABLE_DECLARATION,

            lhs: variableDefinition,
            rhs: null
        };

        var def = ast_create_variable_declaration(variableDefinition);
        var statement_definition = ast_create_statement(statement);

        parse_expression(currentScope, parser, statement_definition);

        // TODO(jwwishart) is null for identifier correct?
        // TODO(jwwishart) if uninitialized and null given we don't know the type 
        // ... so fail!
        // TODO(jwwishart) should validate that the expression makes sense here! :o(

        currentScope.statements.push(statement_definition);
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
    'AST_NODE_TYPE_VARIABLE_DECLARATION'
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

function ast_create_node(type, addFields) {
    var result = addFields || {};
    result.type = type || AST_NODE_TYPE_UNKNOWN;
    result.typeName = get_global_constant_name('AST_NODE_TYPES', type);
    
    return result;
}



function ast_create_scope(parentScope, type) {
    if (parentScope === undefined) {
        throw new Error("ast_create_scope was not given a parentScope");
    }

    return ast_create_node(type || AST_NODE_TYPE_SCOPE, {
        parameters: [],
        statements: [],

        parent: parentScope,
        scopeDepth: ast_count_scope_depth(parentScope) + 1
    });
}

function ast_create_statement(definition) {
    var defaults = {
        lhs: null,
        rhs: null
    };

    var def = extend({}, defaults, definition);

    return ast_create_node(AST_NODE_TYPE_STATEMENT, def);
}

// Same as a Statement!
function ast_create_variable_declaration(definition) {
    var defaults = {
        identifier: null,

        type: AST_NODE_TYPE_VARIABLE_DECLARATION,

        dataType: null, // TODO(jwwishart) Cant' assume any... we WANT to have a type!!!
        isInitialized: false
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
        dataType: 'any', // TODO(jwwishart) do we want this as any by default???
        isInitialized: false
    };

    var def = extend({}, defaults, definition);

    return ast_create_node(AST_NODE_TYPE_PARAMETER, def);
}

function ast_create_literal(dataType, value) {
    var definition = {
        dataType: dataType || 'any',
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
        expression: null // list of expressions!
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




// @Compiler ------------------------------------------------------------------
//

    erg.compile = function compile(code, debug) {
        if (debug) {
            console.log(code);
            console.log(code.length);
        }

        var results = '';
        var scanner = erg.createScanner(code);
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