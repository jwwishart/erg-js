/// <reference path="erg.init.ts" />
/// <reference path="erg.scanner.ts" />
/// <reference path="erg.tokenizer.ts" />
/// <reference path="erg.parser.ts" />
var erg;
(function (erg) {
    var Compiler = (function () {
        function Compiler(scanner_factory, tokenizer_factory, IParserFactory, IGeneratorFactory) {
            // Options
            //
            this.options = new CompilerOptions();
            this.context = new ExecutionContext();
            this.results = new CompilerResults();
            this.VERSION = [0, 0, 4];
            this.ScannerFactory = scanner_factory;
            this.TokenizerFactory = tokenizer_factory;
        }
        Compiler.prototype.compile = function (files) {
            var _this = this;
            var program = new erg.Program();
            files.forEach(function (file) {
                _this.context.current = file;
                var scanner = _this.ScannerFactory.create(file.filename, file.code);
                // Set up logging
                // if (this.options.debug_compiler && this.options.scanner_logger != null) {
                //     scanner.on_eat(this.options.scanner_logger);
                // }
                // while (scanner.peek() !== null) {
                //     scanner.eat();
                // }
                var tokenizer = _this.TokenizerFactory.create(_this, scanner);
                if (_this.options.debug_compiler && _this.options.tokenizer_logger != null) {
                    tokenizer.on_eat(_this.options.tokenizer_logger);
                }
                while (tokenizer.peek().type !== erg.TokenType.EOF) {
                    tokenizer.eat();
                }
            });
            return this.results;
        };
        ;
        Compiler.prototype.compileFile = function (context, path) {
            // TODO(jwwishart) 
            throw new Error("Not Implemented");
        };
        return Compiler;
    })();
    erg.Compiler = Compiler;
    var CompilerOptions = (function () {
        function CompilerOptions() {
            this.base_working_directory = '';
            this.target = TargetType.ES5;
            this.debug_compiler = false;
            this.scanner_logger = null;
            this.tokenizer_logger = null;
        }
        return CompilerOptions;
    })();
    erg.CompilerOptions = CompilerOptions;
    var ExecutionContext = (function () {
        function ExecutionContext() {
            this.current = null;
        }
        return ExecutionContext;
    })();
    erg.ExecutionContext = ExecutionContext;
    var CompilerResults = (function () {
        function CompilerResults() {
            this.output_text = '';
            this.success = true;
            this.warnings = new Array();
            this.errors = new Array();
        }
        return CompilerResults;
    })();
    erg.CompilerResults = CompilerResults;
    function createDefaultCompiler() {
        var compiler = new Compiler(new erg.DefaultScannerFactory(), new erg.DefaultTokenizerFactory(), null, null);
        return compiler;
    }
    erg.createDefaultCompiler = createDefaultCompiler;
    function createDebugCompiler() {
        var compiler = new Compiler(new erg.DefaultScannerFactory(), new erg.DefaultTokenizerFactory(), null, null);
        compiler.options.scanner_logger = function (lexeme) {
            var text = lexeme.text;
            if (text === '\n')
                text = '\\n';
            if (text === '\r')
                text = '\\r';
            if (text === '\t')
                text = '\\t';
            console.log("Lexeme: '" + text + "' - File: " + lexeme.filename
                + " (ln: " + lexeme.line + ", col: " + lexeme.col + ")");
        };
        compiler.options.tokenizer_logger = function (token) {
            var text = token.text;
            if (text === '\n')
                text = '\\n';
            if (text === '\r')
                text = '\\r';
            if (text === '\t')
                text = '\\t';
            console.log("Token: " + token.type_name + "(" + token.type + ") - File: " + token.filename
                + " (ln: " + token.line + ", col: " + token.col + ") '" + text + "' "
                + (token.type == erg.TokenType.LITERAL ? "Literal Type: " + erg.LiteralType[token.literal_type] : ''));
        };
        compiler.options.debug_compiler = true;
        return compiler;
    }
    erg.createDebugCompiler = createDebugCompiler;
    var FileItem = (function () {
        function FileItem(path, code) {
            this.path = '';
            this.filename = '';
            this.code = '';
            this.is_compiled = false;
            this.path = path;
            this.filename = path; // TODO(jwwishart) need to support extracting via paths (maybe)
            this.code = code;
        }
        return FileItem;
    })();
    erg.FileItem = FileItem;
    var TargetType;
    (function (TargetType) {
        TargetType[TargetType["ES5"] = 0] = "ES5";
        TargetType[TargetType["ES6"] = 1] = "ES6";
    })(TargetType || (TargetType = {}));
})(erg || (erg = {}));
