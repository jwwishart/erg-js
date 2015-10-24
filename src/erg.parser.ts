/// <reference path="erg.core.ts" />
/// <reference path="erg.tokenizer.ts" />

module erg {

    export module ast {

        export enum SymbolType {
            UNKNOWN,

            VARIABLE,
            FUNCTION,
            STRUCT,
            ENUM
        }

        export class Symbol {
            constructor(identifier: string, type: SymbolType) {
                this.identifier = identifier;
                this.type = type;
            }

            identifier: string = '';
            type: SymbolType = SymbolType.UNKNOWN;
        }


        export class AstNode {
            parent: AstNode = null;

            items: Array<AstNode> = new Array<AstNode>();

            add_item (node: AstNode) {
                node.parent = this;    // Set Parent for new Item
                this.items.push(node); // Add item
            }
        }

        export class Scope extends AstNode {
            symbols: Array<Symbol> = new Array<Symbol>();
        }

        export class Program extends Scope {
        }

        export class File extends Scope {
            constructor(filename: string) {
                super();

                this.filename = filename;
            }

            filename: string = '';
            is_done: boolean = false;
            success: boolean = false;
        }


        // Declarations
        export class VariableDeclaration extends AstNode {
            // TODO(jwwishart) type?
            // TODO(jwwishart) is_type_determined?
            // TODO(jwwishart) is_uninitialized??
            // TODO(jwwishart) is_explicityly_uninitialized??
        }

        export class Identifier extends AstNode {
            identifier: string;
        }

    }



    export module parser {


        export interface IParser {
            parse_file(file: ast.File): boolean;
        }


        export class Parser implements IParser {
            compiler: ICompiler;
            tokenizer: ITokenizer;

            constructor(context: ICompiler, tokenizer: ITokenizer) {
                this.compiler = context;
                this.tokenizer = tokenizer;
            }

            parse_file(file: ast.File): boolean {
                if (this.parse_statements(file)) return true;

                file.success = false;

                return false;
            }

            parse_statements(context: ast.AstNode): boolean {
                while (this.parse_statement(context)) {

                }

                return false;
            }

            parse_statement(context: ast.AstNode): boolean {

                return false;
            }
        }


        // Helpers
        //

        function create_symbol(scope : ast.Scope, symbol: ast.Symbol) {
            scope.symbols.push(symbol);
        }


        // Parse Functions
        //

        function parse_statements(scope: ast.Scope) {
        }

        // function parse_node(node: ast.AstNode) {
        //     function is_a(type) {
        //         return node instanceof type;
        //     }

        //     if (is_a(ast.File)) { }

        //     if (is_a(ast.VariableDeclaration)) { }
        //     // if (is_a(ast.StructDeclaration)) { }
        //     // if (is_a(ast.EnumDeclaration)) { }
        //     // if (is_a(ast.FunctionDeclaration)) { }

        //     // if (is_a(ast.FunctionCall)) { }
        //     // if (is_a(ast.ArgumentList)) { }
        //     if (is_a(ast.Scope)) { } // TODO(jwwishart) OR Function body?
        // }

        export interface IParserFactory {
            create(context: ICompiler, tokenizer: ITokenizer): IParser;
        }

            export class DefaultParserFactory implements IParserFactory {
                create(context: ICompiler, tokenizer: ITokenizer): IParser {
                    return new Parser(context, tokenizer);
                }
            }
    }

}