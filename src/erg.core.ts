/// <reference path="erg.init.ts" />
/// <reference path="erg.scanner.ts" />
/// <reference path="erg.tokenizer.ts" />
/// <reference path="erg.parser.ts" />


// TypeScript version 1.6.2 was used for this project


module erg {

    export interface ICompiler {
        ScannerFactory : IScannerFactory;

        compile(files: Array<FileItem>): CompilerResult,

        options: CompilerOptions;
        context: ExecutionContext;
        results: CompilerResult;

        VERSION: Array<number>
    }


    export class Compiler implements ICompiler {

        ScannerFactory : IScannerFactory;
        TokenizerFactory : ITokenizerFactory;
        ParserFactory : parser.IParserFactory;

        constructor(scanner_factory: IScannerFactory
                  , tokenizer_factory: ITokenizerFactory
                  , parser_factory: parser.IParserFactory
                  , IGeneratorFactory) 
        {
            this.ScannerFactory = scanner_factory;
            this.TokenizerFactory = tokenizer_factory;
            this.ParserFactory = parser_factory;
        }

        compile(files: Array<FileItem>) : CompilerResult {
            var program = new ast.Program();
            this.results.program = program;

            files.forEach((file) => {
                var fileScope = new ast.File(file.filename);
                program.add_item(fileScope);

                this.context.current = file;

                var scanner = this.ScannerFactory.create(file.filename, file.code);

                // Set up logging
                // if (this.options.debug_compiler && this.options.scanner_logger != null) {
                //     scanner.on_eat(this.options.scanner_logger);
                // }

                // while (scanner.peek() !== null) {
                //     scanner.eat();
                // }

                var tokenizer = this.TokenizerFactory.create(this, scanner);

                // if (this.options.debug_compiler && this.options.tokenizer_logger != null) {
                //     tokenizer.on_eat(this.options.tokenizer_logger);
                // }                

                // while (tokenizer.peek().type !== TokenType.EOF) {
                //     tokenizer.eat();
                // }

                var parser = this.ParserFactory.create(this, tokenizer);
                parser.parse_file(fileScope);

                // TODO(jwwishart) should we throw/log an error at this point?.. the file is not able to be parsed... so ???
                if (fileScope.success === false) this.results.success = false;

                fileScope.is_done = true; // TODO(jwwishart) is it ACTUALLY done? Errors? etc???
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
        results: CompilerResult = new CompilerResults();


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

        program: ast.Program = null;

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
                                  , new default_parser.DefaultParserFactory()
                                  , null);

        compiler.options.scanner_logger = function(lexeme: ScannerItemInfo) {
            var text = lexeme.text;

            if (text === '\n') text = '\\n';
            if (text === '\r') text = '\\r';
            if (text === '\t') text = '\\t';

            console.log("Lexeme: '" + text + "' - File: " + lexeme.filename
                + " (ln: " + lexeme.line + ", col: " + lexeme.col + ")");
        }

        compiler.options.tokenizer_logger = function(token: Token) {
            var text = token.text;

            if (text === '\n') text = '\\n';
            if (text === '\r') text = '\\r';
            if (text === '\t') text = '\\t';

            console.log("Token: " + token.type_name + "(" + token.type + ") - File: " + token.filename
                + " (ln: " + token.line + ", col: " + token.col + ") '" + text + "' " 
                + (token.type == TokenType.LITERAL ? "Literal Type: " + LiteralType[token.literal_type] : ''));
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


    export interface CompilerResult {
        output_text: string;

        program: ast.Program;

        success: boolean;

        warnings: Array<string>;
        errors: Array<string>;
    }



    // Helper Functions
    //


    // error and other generally available helper function etc...

}
