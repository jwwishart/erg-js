/// <reference path="erg.scanner.ts" />
/// <reference path="erg.tokenizer.ts" />
/// <reference path="erg.parser.ts" />

module erg {

    export interface ICompiler {
        ScannerFactory : IScannerFactory;

        compile(files: Array<FileItem>): CompileResult,

        options: CompilerOptions;
        context: ExecutionContext;
        results: CompileResult;

        VERSION: Array<number>
    }


    export class Compiler implements ICompiler {
        ScannerFactory : IScannerFactory;
        TokenizerFactory : ITokenizerFactory;

        constructor(scanner_factory: IScannerFactory
                  , tokenizer_factory: ITokenizerFactory
                  , IParserFactory
                  , IGeneratorFactory) 
        {
            this.ScannerFactory = scanner_factory;
            this.TokenizerFactory = tokenizer_factory;
        }

        compile(files: Array<FileItem>) : CompileResult {
            var program = new Program();

            files.forEach((file) => {
                this.context.current = file;

                var scanner = this.ScannerFactory.create(file.filename, file.code);

                // Set up logging
                if (this.options.debug_compiler && this.options.scanner_logger != null) {
                    scanner.on_eat(this.options.scanner_logger);
                }

                while (scanner.peek() !== null) {
                    scanner.eat();
                }

                // var tokenizer = this.TokenizerFactory.create(this, scanner);

                // if (this.options.debug_compiler && this.options.tokenizer_logger != null) {
                //     scanner.on_eat(this.options.tokenizer_logger);
                // }                
            });

            return this.results;
        };

        compileFile(context: ICompiler, path: string) {
            // TODO(jwwishart) 
            throw new Error("Not Implemented");
        }


        // Options
        //

        options: CompilerOptions = new CompilerOptions();
        context: ExecutionContext = new ExecutionContext();
        results: CompileResult = new CompilerResults();


        VERSION: Array<number> = [0 ,0 ,4];
    }


    export class CompilerOptions { 
        base_working_directory: string = '';

        target: TargetType = TargetType.ES5;

        debug_compiler: boolean = false;

        scanner_logger: (lexeme: ScannerItemInfo) => void = null;
        tokenizer_logger: (token: Token) => void = null;
    }


    export class ExecutionContext {
        current: FileItem = null;
    }


    export class CompilerResults {
        output_text: string = '';
        
        success: boolean = true;

        warnings: Array<string> = new Array<string>();
        errors: Array<string> = new Array<string>();
    }

    export function createDefaultCompiler() : ICompiler {
        var compiler = new Compiler(new DefaultScannerFactory()
                                  , new DefaultTokenizerFactory()
                                  , null
                                  , null);
        return compiler;
    }

    export function createDebugCompiler() : ICompiler {
        var compiler = new Compiler(new DefaultScannerFactory()
                                  , new DefaultTokenizerFactory()
                                  , null
                                  , null);

        compiler.options.scanner_logger = function(lexeme: ScannerItemInfo) {
            var text = lexeme.text;

            if (text === '\n') text = '\\n';
            if (text === '\r') text = '\\r';
            if (text === '\t') text = '\\t';

            console.log("Lexeme: '" + text + "' - File: " + lexeme.filename
                + " (ln: " + lexeme.line + ", col: " + lexeme.col + ")");
        }

        compiler.options.debug_compiler = true;

        return compiler;
    }

    export class FileItem {
        constructor(path, code) {
            this.path = path;
            this.filename = path; // TODO(jwwishart) need to support extracting via paths (maybe)
            this.code = code;
        }

        path: string = '';
        filename: string = '';
        code: string = '';

        is_compiled: boolean = false;
    }

    enum TargetType {
        ES5,
        ES6
    }


    export interface CompileResult {
        output_text: string;

        success: boolean;

        warnings: Array<string>;
        errors: Array<string>;
    }

}
