/// <reference path="erg.core.ts" />

module erg {

    export interface IScanner {
        peek(): string;
        eat(): void;
        getLocation(): ScannerLocationInfo;
    }


    export class ScannerLocationInfo {
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

        constructor(context: ICompiler) {
            this.code = context.current_code;
            this.filename = context.current_filename;
        }

        peek(): string {
            if (this.i < this.code.length) {
                return this.code[this.i];
            }

            return null;
        }

        eat(): void {
            if (this.code[this.i] === '\n') {
                this.line++;
                this.col = this.firstCol - 1; // we will increment by one below so we need to remove that here!
            }

            this.i++;
            this.col++;
        }

        getLocation(): ScannerLocationInfo {
            var result = new ScannerLocationInfo();

            result.filename = this.filename;
            result.line = this.line;
            result.col = this.col;
            result.text = this.code[this.i];

            return result;
        }
    }

    export interface IScannerFactory {
        create(context: ICompiler): IScanner;
    }

        export class DefaultScannerFactory implements IScannerFactory {
            create(context: ICompiler): IScanner {
                return new Scanner(context);
            }
        }
}