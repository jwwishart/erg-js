/// <reference path="erg.scanner.ts" />
/// <reference path="erg.tokenizer.ts" />

module erg {

    export interface ICompiler {
        ScannerFactory : IScannerFactory;

        compile(options: ICompilerOptions): ICompileResult,

        current_code: string;
        current_filename: string;

        files: Array<string>;
        target: TargetType

        VERSION: Array<number>
    }

        export class Compiler implements ICompiler {
            ScannerFactory : IScannerFactory;

            constructor(scanner_factory: IScannerFactory
                      , ITokenizerFactory
                      , IParserFactory
                      , IGeneratorFactory) 
            {
                this.ScannerFactory = scanner_factory;
            }

            compile(options: ICompilerOptions) : ICompileResult {
                return null;
            };

            current_code: string;
            current_filename: string;

            files: Array<string>;
            target:  TargetType

            VERSION: Array<number> = [0,0,4];
        }


    export function createCompiler() : ICompiler {
        var compiler = new Compiler(new DefaultScannerFactory()
                                  , new DefaultTokenizerFactory()
                                  , null
                                  , null);

        return compiler;
    }


    export interface ICompilerOptions {
        files: Array<string>;
        target: TargetType
    }

        enum TargetType {
            ES5,
            ES6
        }

    export interface ICompileResult {
    }

}
