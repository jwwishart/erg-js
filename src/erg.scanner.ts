/// <reference path="erg.core.ts" />

module erg {

    export interface IScanner {
        peek(): string;
        eat(): void;
        get_lexeme(): ScannerItemInfo;

        on_eat(callback: (ScannerItemInfo) => void) : void
    }


    export class ScannerItemInfo {
        filename: string;
        line: number;
        col: number;
        text: string
    }


    class Scanner implements IScanner {
        private code: string;
        private filename: string;

        private i = 0;
        private firstCol = 1;
        private line = 1;
        private col = this.firstCol;

        constructor(filename: string, code: string) {
            this.code = code;
            this.filename = filename;
        }

        peek(): string {
            if (this.i < this.code.length) {
                return this.code[this.i];
            }

            return null;
        }

        eat(): void {
            if (this.on_eat_callback != null) {
                this.on_eat_callback(this.get_lexeme());
            }

            if (this.code[this.i] === '\n') {
                this.line++;
                this.col = this.firstCol - 1; // we will increment by one below so we need to remove that here!
            }

            this.i++;
            this.col++;
        }

        get_lexeme(): ScannerItemInfo {
            var result = new ScannerItemInfo();

            result.filename = this.filename;
            result.line = this.line;
            result.col = this.col;
            result.text = this.code[this.i];

            return result;
        }

        on_eat(callback: (ScannerItemInfo) => void) {
            this.on_eat_callback = callback;
        }

        private on_eat_callback: (ScannerItemInfo) => void = null;
    }

    export interface IScannerFactory {
        create(filename: string, code: string): IScanner;
    }

        export class DefaultScannerFactory implements IScannerFactory {
            create(filename: string, code: string): IScanner {
                return new Scanner(filename, code);
            }
        }
}