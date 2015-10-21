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

        filename: string;
        line: number;
        col: number;
        text: string;

        assign_location(info: ScannerLocationInfo) {
            this.filename = info.filename;
            this.line = info.line;
            this.col = info.col;
            this.text = info.text;
        }
    }

    enum TokenType {
        UNDEFINED,
        EOF,

        IDENTIFIER, // variable names...
        LITERAL,    // string, number, null etc...
        KEYWORD,    // struct, true, false
        OPERATOR    // :, :=
    }

    let Operators = [
        ':',
        ':=',
    ];

    let Keywords = [
        'true', 'false' // TODO(jwwishart) ? keywords? or literals?
    ];


    export interface ITokenizer {
        peek(): Token;
        eat(): void;

        get_index() : number;
        set_index(index: number): void;
    }


    let CreateTokenizer = function(context: ICompiler, scanner: IScanner): ITokenizer {
        let _index: number = -1;

        return {
            peek(): Token {
                return null;
            },

            eat(): void {
            },

            get_index(): number {
                return _index;
            },

            set_index(index: number) { 
                _index = index;
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