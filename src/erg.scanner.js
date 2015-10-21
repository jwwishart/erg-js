/// <reference path="erg.core.ts" />
var erg;
(function (erg) {
    var ScannerLocationInfo = (function () {
        function ScannerLocationInfo() {
        }
        return ScannerLocationInfo;
    })();
    erg.ScannerLocationInfo = ScannerLocationInfo;
    var Scanner = (function () {
        function Scanner(context) {
            this.i = 0;
            this.firstCol = 1;
            this.line = 1;
            this.col = this.firstCol;
            this.code = context.current_code;
            this.filename = context.current_filename;
        }
        Scanner.prototype.peek = function () {
            if (this.i < this.code.length) {
                return this.code[this.i];
            }
            return null;
        };
        Scanner.prototype.eat = function () {
            if (this.code[this.i] === '\n') {
                this.line++;
                this.col = this.firstCol - 1; // we will increment by one below so we need to remove that here!
            }
            this.i++;
            this.col++;
        };
        Scanner.prototype.getLocation = function () {
            var result = new ScannerLocationInfo();
            result.filename = this.filename;
            result.line = this.line;
            result.col = this.col;
            result.text = this.code[this.i];
            return result;
        };
        return Scanner;
    })();
    var DefaultScannerFactory = (function () {
        function DefaultScannerFactory() {
        }
        DefaultScannerFactory.prototype.create = function (context) {
            return new Scanner(context);
        };
        return DefaultScannerFactory;
    })();
    erg.DefaultScannerFactory = DefaultScannerFactory;
})(erg || (erg = {}));
