/// <reference path="erg.init.ts" />
/// <reference path="erg.core.ts" />
/// <reference path="erg.scanner.ts" />

module erg {

    export class Token {
        constructor(type: TokenType) {
            this.type = type;
            this.type_name = TokenType[type]
        }

        type: TokenType = TokenType.UNDEFINED;
        type_name: string;

        filename: string = '';
        line: number = -1;
        col: number = -1;
        text: string = '';
        index: number = -1;

        location: ScannerItemInfo = null;

        literal_type: LiteralType = LiteralType.VOID;

        assign_location(info: ScannerItemInfo) {
            this.filename = info.filename;
            this.line = info.line;
            this.col = info.col;
            this.text = info.text;
            this.index = info.index;

            this.location = info;
        }
    }


    export enum TokenType {
        UNDEFINED,
        EOF,
        WHITESPACE,
        COMMENTS,    // :, :=

        IDENTIFIER, // variable names...
        LITERAL,    // string, number, null etc...
        KEYWORD,    // struct, true, false
        OPERATOR,    // :, :=
    }

    export enum LiteralType {
        STRING,
        BOOL,
        INT,
        FLOAT,
        NULL,
        VOID,
    }


    interface ITokenizerPeekArgs {
        skip_whitespace?: boolean,
        skip_comments?: boolean,
    }

    export interface ITokenizer {
        peek(): Token;

        eat(args: ITokenizerPeekArgs): void;

        revert_to(token: Token): void;

        on_eat(callback: (Token) => void): void
    }


    let CreateTokenizer = function(compiler: ICompiler, scanner: IScanner): ITokenizer {
        let _index: number = -1;
        let on_eat_callback = null;
        
        let token = null;

        function peek(ahead: number = 0) { return scanner.peek(ahead); }
        function eat() { scanner.eat();}

        function is_newline(c: string) { return c === '\r' || c === '\n'; }

        function set_token(type: TokenType, start_pos: ScannerItemInfo = null) {
            var lex = start_pos || scanner.get_lexeme();

            token = new Token(type);
            token.assign_location(lex);

            return token; // For EOF situation
        }

        function handle_whitespace(): boolean {
            var c = peek();

            if (whitespace.indexOf(c) != -1) {
                set_token(TokenType.WHITESPACE);
                eat();

                return true;
            }

            return false;
        }

        function move_next() {
            eat();

            let c = peek();
            
            if (c === null) {
                return false;
            }

            return true;
        }

        function handle_comments() {
            let c = peek();
            let result = '';
            let start_pos = scanner.get_lexeme();
            let multilineCommentDepth = 0;

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
                        c = peek()
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

            if (expected_operator == null) return false;

            // TODO(jwwishart) parse operators propertly as we skip arrays... and 
            //  we need to scan further characters also

            while (operators[expected_operator]) {
                successful_operator = expected_operator;

                eat();

                expected_operator += peek();

                if (expected_operator == null) return false;
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
                if (depth === 0 && foundStart) break;

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
                if (/[a-zA-Z_]/gi.test(c) === false) break;

                result += c;
                eat();
            }

            if (result.length > 0) {
                if (keywords[result]) {
                    set_token(TokenType.KEYWORD, start_pos);
                    token.text = result; // Lexeme text by default. write identifier!

                    handle_special_keywords();
                } else {
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

            if (c == null) return false;

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

                    if (c == null) break;
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

        function TOKEN_ERROR(info: ScannerItemInfo, message: string) {
            // TODO(jwwishart) this should always get this info?
            if (info == null) {
                info = new ScannerItemInfo();

                info.filename = 'unknown';
                info.line = -1;
                info.col = -1
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
            col_indicator_line += '^'

            var message = "ERROR: (" + file + " ln: " + line + ", col: " + col + ")\n" +
                message + "\n" +
                compiler.context.current.code.split('\n')[line - 1] + "\n" +
                col_indicator_line;

            console.error(message);

            throw new Error("*** Compilation cancelled! ***");
        }

        return {
            peek(args: ITokenizerPeekArgs = null): Token {
                // Return previously peeked token.
                //

                if (token !== null) {
                    return token;
                }

                if (peek() == null) return set_token(TokenType.EOF)


                // Tokenize
                //

                if (handle_whitespace()) return token;
                if (handle_comments()) return token;
                if (handle_operators()) return token;
                if (handle_identifiers_and_keywords()) return token;
                if (handle_literals()) return token;

                if (peek() == null) return set_token(TokenType.EOF)


                // Error
                //

                var lexeme = scanner.get_lexeme();

                TOKEN_ERROR(lexeme, "Syntax error, unexpected token '" + lexeme.text + "'");
            },

            eat(args: ITokenizerPeekArgs): void {
                while (true) {
                    if (on_eat_callback != null) {
                        on_eat_callback(token);
                    }

                    token = null;

                    this.peek(); // Move to next token for test below!

                    // Skip
                    if (args) {
                        if (args.skip_whitespace && token.type == TokenType.WHITESPACE) continue;
                        if (args.skip_comments   && token.type == TokenType.COMMENTS)   continue;
                    }

                    return;
                }
            },

            on_eat(callback: (Token) => void) {
                on_eat_callback = callback;
            },

            revert_to(token: Token) {
                scanner.revert_position(token);
            }
        };
    }


    export interface ITokenizerFactory {
        create(context: ICompiler, scanner: IScanner): ITokenizer;
    }

        export class DefaultTokenizerFactory implements ITokenizerFactory {
            create(context: ICompiler, scanner: IScanner): ITokenizer {
                return CreateTokenizer(context, scanner);
            }
        }

}