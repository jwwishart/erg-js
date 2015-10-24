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
    var parser;
    (function (parser) {
        var Parser = (function () {
            function Parser(context, tokenizer) {
                this.compiler = context;
                this.tokenizer = tokenizer;
            }
            Parser.prototype.parse_file = function (file) {
                if (this.parse_statements(file))
                    return true;
                file.success = false;
                return false;
            };
            Parser.prototype.parse_statements = function (context) {
                while (this.parse_statement(context)) {
                }
                return false;
            };
            Parser.prototype.parse_statement = function (context) {
                return false;
            };
            return Parser;
        })();
        parser.Parser = Parser;
        // Helpers
        //
        function create_symbol(scope, symbol) {
            scope.symbols.push(symbol);
        }
        // Parse Functions
        //
        function parse_statements(scope) {
        }
        var DefaultParserFactory = (function () {
            function DefaultParserFactory() {
            }
            DefaultParserFactory.prototype.create = function (context, tokenizer) {
                return new Parser(context, tokenizer);
            };
            return DefaultParserFactory;
        })();
        parser.DefaultParserFactory = DefaultParserFactory;
    })(parser = erg.parser || (erg.parser = {}));
})(erg || (erg = {}));
