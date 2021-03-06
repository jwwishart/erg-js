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

            items: Array<Token|ast.AstNode> = new Array<Token|ast.AstNode>();

            add_item(node: Token|ast.AstNode) {
                if (node instanceof ast.AstNode) {
                    node.parent = this;    // Set Parent for new Item
                }

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
            identifier: string = '';
            type: string = '';

            is_type_checked: boolean = false;

            // TODO(jwwishart) type?
            // TODO(jwwishart) is_type_determined?
            // TODO(jwwishart) is_uninitialized??
            // TODO(jwwishart) is_explicityly_uninitialized??
        }

        export class Identifier extends AstNode {
            identifier: string;
            assignment: Expression
        }

        export class Expression extends AstNode {
            terms: Array<Term>
        }

        export class Term extends AstNode {
            factors: Array<Factor>
        }

        export class Factor extends AstNode {
            // This could be anything :oS
        }

    }



    export module parser {


        export interface IParser {
            parse_file(file: ast.File): boolean;
        }

        export interface IParserFactory {
            create(context: ICompiler, tokenizer: ITokenizer): IParser;
        }


        
    }

    export module default_parser {

        let Parser = function(compiler: ICompiler, tokenizer: ITokenizer) {
            var current_scope: ast.Scope = null;


            // Helpers
            //

            function peek() {  return tokenizer.peek(); }

            function eat() { 
                tokenizer.eat({
                    skip_whitespace: true,
                    skip_comments: true
                }); 
            }
            
            function create_symbol(context: ast.AstNode, symbol: ast.Symbol) {
                var scope = context;

                // TODO(jwwishart) find the SCOPE for the symbol
                while (scope != null && !(scope instanceof ast.Scope)) {
                    scope = scope.parent;
                }

                if (scope != null) {
                    (<ast.Scope>scope).symbols.push(symbol);
                }

                throw new Error("Error Creating Symbol. Unable to fine a scope! ???");
            }

            function revert(token: Token) {
                tokenizer.revert_to(token);
            }

            function accept(type: TokenType, require: boolean = false): boolean {
                if (peek().type === type) {
                    return true;
                }

                if (require) {
                    throw new Error("Parser Error: Expected token '" + TokenType[type] + "' but got a '" + TokenType[peek().type] + "'");
                }

                return false;
            }


            // Parse Functions
            //

            function parse_statements(context: ast.AstNode): boolean {
                while (parse_statement(context)) { 
                }

                return false; // TODO(jwwishart) think this is true? Maybe not??? may depend on parse_statements results???
            }

            function parse_statement(context: ast.AstNode): boolean {
                let loc = peek();

                if (parse_declaration(context)) return true;
                if (parse_block(context)) return true;

                // TODO(jwwishart) log parser error...

                revert(loc);
                return false;
            }

            function parse_block(context: ast.AstNode): boolean {
                let loc = peek();

                if (accept(TokenType.OPERATOR) && peek().text == '{') {
                    eat(); //
                    var scope = new ast.Scope();
                    context.add_item(scope);

                    parse_statements(scope);

                    if (accept(TokenType.OPERATOR) && peek().text !== '}') {
                        throw new Error("Expecting closing } for parse_block()");
                    }
                    return true;
                }

                revert(loc);
                return false;
            }

            function parse_declaration(context: ast.AstNode): boolean {
                let loc = peek();

                if (accept(TokenType.IDENTIFIER)) {

                    // Identifier
                    var identifier = peek().text;
                    eat();

                    // Operator
                    if (accept(TokenType.OPERATOR) 
                     && (peek().text === ":" 
                         || peek().text === ":="
                         || peek().text === "::")) 
                    { 

                        // --------------------------------------------------
                        // WARNING: POINT OF NO RETURN: WE MUST HAVE A DECL -
                        // --------------------------------------------------

                        var is_constant = peek().text === '::';
                        var infer_type = peek().text === ':=' || is_constant;

                        eat(); // operator

                        var is_enum = false;
                        var is_struct = false;

                        if (is_constant && accept(TokenType.KEYWORD)) {
                            // struct
                            if (peek().text === 'struct') {
                                // TODO(jwwishart) parse_struct_declaration();
                                throw new Error("STRUCT: NOT IMPLEMENTED");
                                return true;
                            }

                            // enum 
                            if (peek().text === 'enum') {
                                // TODO(jwwishart) parse_enum_declaration();
                                throw new Error("ENUM: NOT IMPLEMENTED");
                                return true;
                            }
                        }

                        // TODO(jwwishart) parse_variable_declaration();
                        var decl = new ast.VariableDeclaration();
                        decl.identifier = identifier;

                        context.add_item(decl);

                        // Optional Type ':' operator
                        if (!infer_type) {
                            if (accept(TokenType.IDENTIFIER)) {
                                decl.type = peek().text;

                                eat(); // type
                            } else {
                                throw new Error("Parser Error: Unexpected token '" + TokenType[peek().type] + "'");
                            }
                        }

                        if (!infer_type) {
                            // = 
                            if (accept(TokenType.OPERATOR) && peek().text === '=') {
                                // TODO(jwwishart) parse_assignment(decl)
                                throw new Error("ASSIGNMENTS: NOT IMPLEMENTED");
                                return true;
                            }
                        }

                        parse_expression(decl);

                        // ;
                        if (accept(TokenType.OPERATOR) && peek().text === ';') {
                            eat(); // ;                            
                            return true;
                        }

                        // TODO(jwwishart) make PARSER_ERROR() that outputs token info etc.....
                        throw new Error("Parser Error: Unexpected token '" + TokenType[peek().type] + "'");
                    }
                }

                revert(loc);
                return false;
            }

            function parse_expression(context: ast.AstNode): boolean {
                var loc = peek();

                function is_add_op() {
                    var type = peek().type;

                    if (type === TokenType.OPERATOR
                        && (peek().text == '+' || peek().text == '-'))
                    {
                        return true;
                    }

                    return false;
                }

                var expression = new ast.Expression();

                if (parse_term(expression)) {
                    while (is_add_op()) {
                        eat(); // add-op

                        if (!parse_term(expression)) {
                            revert(loc);
                            break;
                        }

                        loc = peek();
                    }

                    context.add_item(expression);

                    return true;
                }

                revert(loc);
                return false;
            }

            function parse_term(context: ast.Expression): boolean {
                var loc = peek();

                function is_mult_op() {
                    var type = peek().type;

                    if (type === TokenType.OPERATOR
                        && (peek().text == '*' || peek().text == '/'))
                    {
                        return true;
                    }

                    return false;
                }

                var term = new ast.Term();

                if (parse_factor(term)) {
                    while (is_mult_op()) {
                        eat(); // multi-op

                        if (!parse_factor(term)) {
                            revert(loc);
                            break;
                        }

                        loc = peek();
                    }

                    context.add_item(term);

                    return true;
                }

                revert(loc);
                return false;
            }

            function parse_factor(context: ast.Term): boolean {
                var loc = peek();

                function create_factor(context: ast.Term, token: Token) {
                    context.add_item(token);
                    eat(); // token
                    return true;
                }

                if (accept(TokenType.OPERATOR)) {
                    if (peek().text === '---') {
                        return create_factor(context, peek());
                    }
                }

                if (accept(TokenType.LITERAL)) {
                    if (peek().literal_type !== LiteralType.VOID) {
                        return create_factor(context, peek());
                    }
                }

                // TODO(jwwishart)
                // - function call
                // - identifier (i.e. referencing variable)
                // - member_access_expression
                // - assignment expression
                // - unary expression
                // - parenthesis

                revert(loc);
                return false;
            }

            function construct_identifier(): ast.Identifier {
                var identifier = new ast.Identifier();
                identifier.identifier = peek().text;
                identifier.add_item(peek());
                return identifier;
            }


            return {
                parse_file: function(file: ast.File): boolean {
                    current_scope = file;

                    // Eat any initial whitespace.
                    if (peek().type === TokenType.WHITESPACE || peek().type === TokenType.COMMENTS) {
                        eat();
                    }

                    if (parse_statements(file)) return true;

                    file.success = false;

                    return false;
                }
            };
        };


        // Helpers
        //

        function create_symbol(scope : ast.Scope, symbol: ast.Symbol) {
            scope.symbols.push(symbol);
        }


        // Parse Functions
        //


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


            export class DefaultParserFactory implements parser.IParserFactory {
                create(context: ICompiler, tokenizer: ITokenizer): parser.IParser {
                    return Parser(context, tokenizer);
                }
            }
    }

}