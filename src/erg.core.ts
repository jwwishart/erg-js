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

            compileFile(context: ICompiler, path: string) {
                // TODO(jwwishart) 
                throw new Error("Not Implemented");
            }

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
        base_working_directory: string;
        files: Array<File>;
        target: TargetType;
    }

        enum TargetType {
            ES5,
            ES6
        }

        export class File {
            path: string = '';
            is_compiled: boolean = false;
        }

    export interface ICompileResult {
    }

}
