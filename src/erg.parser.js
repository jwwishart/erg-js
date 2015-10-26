/// <reference path="erg.core.ts" />
/// <reference path="erg.tokenizer.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
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
                node.parent = this; // Set Parent for new Item
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
            function peek() { tokenizer.peek(); }
            function eat() { tokenizer.eat(); }
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
                tokenizer.revert(token);
            }
            function parse_statements(context) {
                while (parse_statement(context)) {
                }
                return false;
            }
            function parse_statement(context) {
                var loc = peek();
                if (parse_declaration(context))
                    return true;
                return false;
            }
            return {
                parse_file: function (file) {
                    current_scope = file;
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
