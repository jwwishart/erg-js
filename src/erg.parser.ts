/// <reference path="erg.core.ts" />
/// <reference path="erg.tokenizer.ts" />

module erg {

    export class AstNode {
        items: Array<AstNode> = new Array<AstNode>();

        add_item (node: AstNode) {
            this.items.push(node);
        }
    }

    export class Scope extends AstNode {
    }

    export class Program extends Scope {
    }

    export class File extends Scope {
        constructor(filename: string) {
            super();

            this.filename = filename;
        }

        filename: string = '';
        is_done: boolean = false;
    }

}