/// <reference path="erg.core.ts" />
/// <reference path="erg.tokenizer.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var erg;
(function (erg) {
    var ast;
    (function (ast) {
        (function (SymbolType) {
            SymbolType[SymbolType["UNKNOWN"] = 0] = "UNKNOWN";
            SymbolType[SymbolType["VARIABLE"] = 1] = "VARIABLE";
            SymbolType[SymbolType["FUNCTION"] = 2] = "FUNCTION";
            SymbolType[SymbolType["STRUCT"] = 3] = "STRUCT";
            SymbolType[SymbolType["ENUM"] = 4] = "ENUM";
        })(ast.SymbolType || (ast.SymbolType = {}));
        var SymbolType = ast.SymbolType;
        var Symbol = (function () {
            function Symbol(identifier, type) {
                this.identifier = '';
                this.type = SymbolType.UNKNOWN;
                this.identifier = identifier;
                this.type = type;
            }
            return Symbol;
        })();
        ast.Symbol = Symbol;
        var AstNode = (function () {
            function AstNode() {
                this.parent = null;
                this.items = new Array();
            }
            AstNode.prototype.add_item = function (node) {
                if (node instanceof ast.AstNode) {
                    node.parent = this; // Set Parent for new Item
                }
                this.items.push(node); // Add item
            };
            return AstNode;
        })();
        ast.AstNode = AstNode;
        var Scope = (function (_super) {
            __extends(Scope, _super);
            function Scope() {
                _super.apply(this, arguments);
                this.symbols = new Array();
            }
            return Scope;
        })(AstNode);
        ast.Scope = Scope;
        var Program = (function (_super) {
            __extends(Program, _super);
            function Program() {
                _super.apply(this, arguments);
            }
            return Program;
        })(Scope);
        ast.Program = Program;
        var File = (function (_super) {
            __extends(File, _super);
            function File(filename) {
                _super.call(this);
                this.filename = '';
                this.is_done = false;
                this.success = false;
                this.filename = filename;
            }
            return File;
        })(Scope);
        ast.File = File;
        // Declarations
        var VariableDeclaration = (function (_super) {
            __extends(VariableDeclaration, _super);
            function VariableDeclaration() {
                _super.apply(this, arguments);
                this.identifier = '';
                this.type = '';
                this.is_type_checked = false;
            }
            return VariableDeclaration;
        })(AstNode);
        ast.VariableDeclaration = VariableDeclaration;
        var Identifier = (function (_super) {
            __extends(Identifier, _super);
            function Identifier() {
                _super.apply(this, arguments);
            }
            return Identifier;
        })(AstNode);
        ast.Identifier = Identifier;
    })(ast = erg.ast || (erg.ast = {}));
    var default_parser;
    (function (default_parser) {
        var Parser = function (compiler, tokenizer) {
            var current_scope = null;
            // Helpers
            //
            function peek() { return tokenizer.peek(); }
            function eat() {
                tokenizer.eat({
                    skip_whitespace: true,
                    skip_comments: true
                });
            }
            function create_symbol(context, symbol) {
                var scope = context;
                // TODO(jwwishart) find the SCOPE for the symbol
                while (scope != null && !(scope instanceof ast.Scope)) {
                    scope = scope.parent;
                }
                if (scope != null) {
                    scope.symbols.push(symbol);
                }
                throw new Error("Error Creating Symbol. Unable to fine a scope! ???");
            }
            function revert(token) {
                tokenizer.revert_to(token);
            }
            function accept(type, require) {
                if (require === void 0) { require = false; }
                if (peek().type === type) {
                    return true;
                }
                if (require) {
                    throw new Error("Parser Error: Expected token '" + erg.TokenType[type] + "' but got a '" + erg.TokenType[peek().type] + "'");
                }
                return false;
            }
            // Parse Functions
            //
            function parse_statements(context) {
                while (parse_statement(context)) {
                }
                return false;
            }
            function parse_statement(context) {
                var loc = peek();
                if (parse_declaration(context))
                    return true;
                revert(loc);
                return false;
            }
            function parse_declaration(context) {
                var loc = peek();
                if (accept(erg.TokenType.IDENTIFIER)) {
                    // Identifier
                    var identifier = peek().text;
                    eat();
                    // Operator
                    if (accept(erg.TokenType.OPERATOR)
                        && (peek().text === ":"
                            || peek().text === ":="
                            || peek().text === "::")) {
                        // --------------------------------------------------
                        // WARNING: POINT OF NO RETURN: WE MUST HAVE A DECL -
                        // --------------------------------------------------
                        var is_constant = peek().text === '::';
                        var infer_type = peek().text === ':=' || is_constant;
                        eat(); // operator
                        var is_enum = false;
                        var is_struct = false;
                        if (is_constant && accept(erg.TokenType.KEYWORD)) {
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
                        // Optional Type ':' operator
                        if (!infer_type) {
                            if (accept(erg.TokenType.IDENTIFIER)) {
                                decl.type = peek().text;
                                eat(); // type
                            }
                            else {
                                throw new Error("Parser Error: Unexpected token '" + erg.TokenType[peek().type] + "'");
                            }
                        }
                        if (!infer_type) {
                            // = 
                            if (accept(erg.TokenType.OPERATOR) && peek().text === '=') {
                                // TODO(jwwishart) parse_assignment(decl)
                                throw new Error("ASSIGNMENTS: NOT IMPLEMENTED");
                                return true;
                            }
                        }
                        // Literal
                        // TODO(jwwishart) parse_expression(decl);
                        // ;
                        if (accept(erg.TokenType.OPERATOR) && peek().text === ';') {
                            context.add_item(decl);
                            return true;
                        }
                        // TODO(jwwishart) make PARSER_ERROR() that outputs token info etc.....
                        throw new Error("Parser Error: Unexpected token '" + erg.TokenType[peek().type] + "'");
                    }
                }
                revert(loc);
                return false;
            }
            function construct_identifier() {
                var identifier = new ast.Identifier();
                identifier.identifier = peek().text;
                identifier.add_item(peek());
                return identifier;
            }
            return {
                parse_file: function (file) {
                    current_scope = file;
                    // Eat any initial whitespace.
                    if (peek().type === erg.TokenType.WHITESPACE || peek().type === erg.TokenType.COMMENTS) {
                        eat();
                    }
                    if (parse_statements(file))
                        return true;
                    file.success = false;
                    return false;
                }
            };
        };
        // Helpers
        //
        function create_symbol(scope, symbol) {
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
        var DefaultParserFactory = (function () {
            function DefaultParserFactory() {
            }
            DefaultParserFactory.prototype.create = function (context, tokenizer) {
                return Parser(context, tokenizer);
            };
            return DefaultParserFactory;
        })();
        default_parser.DefaultParserFactory = DefaultParserFactory;
    })(default_parser = erg.default_parser || (erg.default_parser = {}));
})(erg || (erg = {}));
