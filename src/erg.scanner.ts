/// <reference path="erg.core.ts" />

module erg {

    export interface IScanner {
        peek(ahead: number): string;
        eat(): void;

        get_lexeme(): ScannerItemInfo;

        revert_position(pos: ScannerItemInfo): void;

        on_eat(callback: (ScannerItemInfo) => void) : void;
    }


    export class ScannerItemInfo {
        filename: string;
        line: number;
        col: number;
        text: string;

        index: number;
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

        peek(ahead: number = 0): string {
            if (ahead < 0) throw new Error("Scanner.peek()'s ahead argument cannot be a negative number");

            if (ahead > 0) {
                if ((this.i + ahead) < this.code.length) {
                    return this.code[this.i + ahead];
                }
            } else {
                if (this.i < this.code.length) {
                    return this.code[this.i];
                }
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
            result.index = this.i;

            return result;
        }

        revert_position(pos: ScannerItemInfo): void {
            this.i = pos.index;
            this.line = pos.line;
            this.col = pos.col;
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