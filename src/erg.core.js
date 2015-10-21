/// <reference path="erg.scanner.ts" />
/// <reference path="erg.tokenizer.ts" />
var erg;
(function (erg) {
    var Compiler = (function () {
        function Compiler(scanner_factory, ITokenizerFactory, IParserFactory, IGeneratorFactory) {
            this.VERSION = [0, 0, 4];
            this.ScannerFactory = scanner_factory;
        }
        Compiler.prototype.compile = function (options) {
            return null;
        };
        ;
        return Compiler;
    })();
    erg.Compiler = Compiler;
    function createCompiler() {
        var compiler = new Compiler(new erg.DefaultScannerFactory(), new erg.DefaultTokenizerFactory(), null, null);
        return compiler;
    }
    erg.createCompiler = createCompiler;
    var TargetType;
    (function (TargetType) {
        TargetType[TargetType["ES5"] = 0] = "ES5";
        TargetType[TargetType["ES6"] = 1] = "ES6";
    })(TargetType || (TargetType = {}));
})(erg || (erg = {}));
