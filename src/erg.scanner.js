/// <reference path="erg.core.ts" />
var erg;
(function (erg) {
    var ScannerItemInfo = (function () {
        function ScannerItemInfo() {
        }
        return ScannerItemInfo;
    })();
    erg.ScannerItemInfo = ScannerItemInfo;
    var Scanner = (function () {
        function Scanner(filename, code) {
            this.i = 0;
            this.firstCol = 1;
            this.line = 1;
            this.col = this.firstCol;
            this.on_eat_callback = null;
            this.code = code;
            this.filename = filename;
        }
        Scanner.prototype.peek = function (ahead) {
            if (ahead === void 0) { ahead = 0; }
            if (ahead < 0)
                throw new Error("Scanner.peek()'s ahead argument cannot be a negative number");
            if (ahead > 0) {
                if ((this.i + ahead) < this.code.length) {
                    return this.code[this.i + ahead];
                }
            }
            else {
                if (this.i < this.code.length) {
                    return this.code[this.i];
                }
            }
            return null;
        };
        Scanner.prototype.eat = function () {
            if (this.on_eat_callback != null) {
                this.on_eat_callback(this.get_lexeme());
            }
            if (this.code[this.i] === '\n') {
                this.line++;
                this.col = this.firstCol - 1; // we will increment by one below so we need to remove that here!
            }
            this.i++;
            this.col++;
        };
        Scanner.prototype.get_lexeme = function () {
            var result = new ScannerItemInfo();
            result.filename = this.filename;
            result.line = this.line;
            result.col = this.col;
            result.text = this.code[this.i];
            result.index = this.i;
            return result;
        };
        Scanner.prototype.revert_position = function (pos) {
            this.i = pos.index;
            this.line = pos.line;
            this.col = pos.col;
        };
        Scanner.prototype.on_eat = function (callback) {
            this.on_eat_callback = callback;
        };
        return Scanner;
    })();
    var DefaultScannerFactory = (function () {
        function DefaultScannerFactory() {
        }
        DefaultScannerFactory.prototype.create = function (filename, code) {
            return new Scanner(filename, code);
        };
        return DefaultScannerFactory;
    })();
    erg.DefaultScannerFactory = DefaultScannerFactory;
})(erg || (erg = {}));
