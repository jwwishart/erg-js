/// <reference path="erg.init.ts" />
/// <reference path="erg.core.ts" />
/// <reference path="erg.scanner.ts" />
var erg;
(function (erg) {
    var Token = (function () {
        function Token(type) {
            this.type = TokenType.UNDEFINED;
            this.filename = '';
            this.line = -1;
            this.col = -1;
            this.text = '';
            this.index = -1;
            this.location = null;
            this.literal_type = LiteralType.VOID;
            this.type = type;
            this.type_name = TokenType[type];
        }
        Token.prototype.assign_location = function (info) {
            this.filename = info.filename;
            this.line = info.line;
            this.col = info.col;
            this.text = info.text;
            this.index = info.index;
            this.location = info;
        };
        return Token;
    })();
    erg.Token = Token;
    (function (TokenType) {
        TokenType[TokenType["UNDEFINED"] = 0] = "UNDEFINED";
        TokenType[TokenType["EOF"] = 1] = "EOF";
        TokenType[TokenType["WHITESPACE"] = 2] = "WHITESPACE";
        TokenType[TokenType["COMMENTS"] = 3] = "COMMENTS";
        TokenType[TokenType["IDENTIFIER"] = 4] = "IDENTIFIER";
        TokenType[TokenType["LITERAL"] = 5] = "LITERAL";
        TokenType[TokenType["KEYWORD"] = 6] = "KEYWORD";
        TokenType[TokenType["OPERATOR"] = 7] = "OPERATOR";
    })(erg.TokenType || (erg.TokenType = {}));
    var TokenType = erg.TokenType;
    (function (LiteralType) {
        LiteralType[LiteralType["STRING"] = 0] = "STRING";
        LiteralType[LiteralType["BOOL"] = 1] = "BOOL";
        LiteralType[LiteralType["INT"] = 2] = "INT";
        LiteralType[LiteralType["FLOAT"] = 3] = "FLOAT";
        LiteralType[LiteralType["NULL"] = 4] = "NULL";
        LiteralType[LiteralType["VOID"] = 5] = "VOID";
    })(erg.LiteralType || (erg.LiteralType = {}));
    var LiteralType = erg.LiteralType;
    var CreateTokenizer = function (compiler, scanner) {
        var _index = -1;
        var on_eat_callback = null;
        var token = null;
        function peek(ahead) {
            if (ahead === void 0) { ahead = 0; }
            return scanner.peek(ahead);
        }
        function eat() { scanner.eat(); }
        function is_newline(c) { return c === '\r' || c === '\n'; }
        function set_token(type, start_pos) {
            if (start_pos === void 0) { start_pos = null; }
            var lex = start_pos || scanner.get_lexeme();
            token = new Token(type);
            token.assign_location(lex);
            return token; // For EOF situation
        }
        function handle_whitespace() {
            var c = peek();
            if (erg.whitespace.indexOf(c) != -1) {
                set_token(TokenType.WHITESPACE);
                eat();
                return true;
            }
            return false;
        }
        function move_next() {
            eat();
            var c = peek();
            if (c === null) {
                return false;
            }
            return true;
        }
        function handle_comments() {
            var c = peek();
            var result = '';
            var start_pos = scanner.get_lexeme();
            var multilineCommentDepth = 0;
            if (c == '/') {
                c = peek(1);
                if (c == '/') {
                    // Single Line Comment
                    eat(); // /
                    eat(); // /
                    result = '//';
                    while ((c = peek()) != null && !is_newline(c)) {
                        result += c;
                        eat();
                    }
                    set_token(TokenType.COMMENTS, start_pos);
                    token.text = result;
                    return true;
                }
                if (c == '*') {
                    // Multiple Line Comment
                    eat(); // /
                    eat(); // *
                    result = '/*';
                    do {
                        c = peek();
                        result += c;
                        if (c === '/' && peek(1) == '*') {
                            result += '*';
                            eat();
                            multilineCommentDepth++;
                            continue;
                        }
                        if (c === '*' && peek(1) == '/') {
                            result += '/';
                            eat();
                            multilineCommentDepth--;
                            continue;
                        }
                        // We have hit the end of the outermost multiline comment
                        if (multilineCommentDepth === -1) {
                            multilineCommentDepth = 0; // Reset for next time!
                            break;
                        }
                    } while (move_next());
                    set_token(TokenType.COMMENTS, start_pos);
                    token.text = result;
                    return true;
                }
            }
            return false;
        }
        function handle_operators() {
            var expected_operator = peek();
            var successful_operator = null;
            var start_pos = scanner.get_lexeme();
            if (expected_operator == null)
                return false;
            // TODO(jwwishart) parse operators propertly as we skip arrays... and 
            //  we need to scan further characters also
            while (erg.operators[expected_operator]) {
                successful_operator = expected_operator;
                eat();
                expected_operator += peek();
                if (expected_operator == null)
                    return false;
            }
            if (successful_operator != null) {
                set_token(TokenType.OPERATOR, start_pos);
                token.text = successful_operator; // Lexeme text by default. write identifier!
                return true;
            }
            return false;
        }
        function get_asm_block() {
            var result = '';
            var depth = 0;
            var foundStart = false;
            var c;
            while ((c = peek()) !== null) {
                if (depth === 0 && foundStart)
                    break;
                if (c === "{") {
                    result += c;
                    if (foundStart === true) {
                    }
                    foundStart = true;
                    depth++;
                    eat(); // Skip adding the opening {
                    continue;
                }
                if (c === "}" && foundStart) {
                    depth--;
                    result += c;
                    if (depth !== 0) {
                    }
                    eat(); // Skip adding the closing }
                    continue;
                }
                result += c;
                eat();
            }
            return result;
        }
        function handle_identifiers_and_keywords() {
            function handle_special_keywords() {
                if (token.text === 'asm') {
                    token.text += get_asm_block();
                }
            }
            var c;
            var result = '';
            var start_pos = scanner.get_lexeme();
            while ((c = peek()) !== null) {
                if (/[a-zA-Z_]/gi.test(c) === false)
                    break;
                result += c;
                eat();
            }
            if (result.length > 0) {
                if (erg.keywords[result]) {
                    set_token(TokenType.KEYWORD, start_pos);
                    token.text = result; // Lexeme text by default. write identifier!
                    handle_special_keywords();
                }
                else {
                    set_token(TokenType.IDENTIFIER, start_pos);
                    token.text = result; // Lexeme text by default. write identifier!
                }
                return true;
            }
            return false;
        }
        function handle_literals() {
            var c = peek();
            var result = '';
            var start_pos = scanner.get_lexeme();
            if (c == null)
                return false;
            // string
            // TODO(jwwishart) escape characters?
            if (c == '"') {
                result = '"';
                eat(); // "
                while ((c = peek()) !== null) {
                    if (c === '"') {
                        eat();
                        break;
                    }
                    result += c;
                    eat();
                }
                set_token(TokenType.LITERAL, start_pos);
                token.text = result; // Lexeme text by default. write identifier!
                token.literal_type = LiteralType.STRING;
                return true;
            }
            // integers
            // TODO(jwwishart) float.
            if (c >= '0' && c <= '9') {
                while (c >= '0' && c <= '9') {
                    result += c;
                    eat();
                    c = peek();
                    if (c == null)
                        break;
                }
                set_token(TokenType.LITERAL, start_pos);
                token.text = result; // Lexeme text by default. write identifier!
                token.literal_type = LiteralType.INT;
                return true;
            }
            // TODO(jwwishart) bool
            // TODO(jwwishart) null
            // Any ???
        }
        function TOKEN_ERROR(info, message) {
            // TODO(jwwishart) this should always get this info?
            if (info == null) {
                info = new erg.ScannerItemInfo();
                info.filename = 'unknown';
                info.line = -1;
                info.col = -1;
                info.text = '';
            }
            message = message.replace(/(?:\t)/g, '\\t');
            message = message.replace(/(?:\r)/g, '\\r');
            message = message.replace(/(?:\n)/g, '\\n');
            // Assume by default that location_info is a lexeme!
            var file = info.filename;
            var line = info.line;
            var col = info.col;
            var col_indicator_line = '';
            for (var i = 1; i < col; i++) {
                col_indicator_line += ' ';
            }
            col_indicator_line += '^';
            var message = "ERROR: (" + file + " ln: " + line + ", col: " + col + ")\n" +
                message + "\n" +
                compiler.context.current.code.split('\n')[line - 1] + "\n" +
                col_indicator_line;
            console.error(message);
            throw new Error("*** Compilation cancelled! ***");
        }
        return {
            peek: function (args) {
                // Return previously peeked token.
                //
                if (args === void 0) { args = null; }
                if (token !== null) {
                    return token;
                }
                if (peek() == null)
                    return set_token(TokenType.EOF);
                // Tokenize
                //
                if (handle_whitespace())
                    return token;
                if (handle_comments())
                    return token;
                if (handle_operators())
                    return token;
                if (handle_identifiers_and_keywords())
                    return token;
                if (handle_literals())
                    return token;
                if (peek() == null)
                    return set_token(TokenType.EOF);
                // Error
                //
                var lexeme = scanner.get_lexeme();
                TOKEN_ERROR(lexeme, "Syntax error, unexpected token '" + lexeme.text + "'");
            },
            eat: function (args) {
                while (true) {
                    if (on_eat_callback != null) {
                        on_eat_callback(token);
                    }
                    token = null;
                    this.peek(); // Move to next token for test below!
                    // Skip
                    if (args) {
                        if (args.skip_whitespace && token.type == TokenType.WHITESPACE)
                            continue;
                        if (args.skip_comments && token.type == TokenType.COMMENTS)
                            continue;
                    }
                    return;
                }
            },
            on_eat: function (callback) {
                on_eat_callback = callback;
            },
            revert_to: function (token) {
                scanner.revert_position(token);
            }
        };
    };
    var DefaultTokenizerFactory = (function () {
        function DefaultTokenizerFactory() {
        }
        DefaultTokenizerFactory.prototype.create = function (context, scanner) {
            return CreateTokenizer(context, scanner);
        };
        return DefaultTokenizerFactory;
    })();
    erg.DefaultTokenizerFactory = DefaultTokenizerFactory;
})(erg || (erg = {}));
