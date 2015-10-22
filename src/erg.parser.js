/// <reference path="erg.core.ts" />
/// <reference path="erg.tokenizer.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var erg;
(function (erg) {
    var AstNode = (function () {
        function AstNode() {
            this.items = new Array();
        }
        AstNode.prototype.add_item = function (node) {
            this.items.push(node);
        };
        return AstNode;
    })();
    erg.AstNode = AstNode;
    var Scope = (function (_super) {
        __extends(Scope, _super);
        function Scope() {
            _super.apply(this, arguments);
        }
        return Scope;
    })(AstNode);
    erg.Scope = Scope;
    var Program = (function (_super) {
        __extends(Program, _super);
        function Program() {
            _super.apply(this, arguments);
        }
        return Program;
    })(Scope);
    erg.Program = Program;
    var File = (function (_super) {
        __extends(File, _super);
        function File(filename) {
            _super.call(this);
            this.filename = '';
            this.is_done = false;
            this.filename = filename;
        }
        return File;
    })(Scope);
    erg.File = File;
})(erg || (erg = {}));
