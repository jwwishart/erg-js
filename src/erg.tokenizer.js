/// <reference path="erg.core.ts" />
/// <reference path="erg.scanner.ts" />
var erg;
(function (erg) {
    var Token = (function () {
        function Token(type) {
            this.type = TokenType.UNDEFINED;
            this.type = type;
            this.type_name = TokenType[type];
        }
        Token.prototype.assign_location = function (info) {
            this.filename = info.filename;
            this.line = info.line;
            this.col = info.col;
            this.text = info.text;
        };
        return Token;
    })();
    erg.Token = Token;
    var TokenType;
    (function (TokenType) {
        TokenType[TokenType["UNDEFINED"] = 0] = "UNDEFINED";
        TokenType[TokenType["EOF"] = 1] = "EOF";
        TokenType[TokenType["IDENTIFIER"] = 2] = "IDENTIFIER";
        TokenType[TokenType["LITERAL"] = 3] = "LITERAL";
        TokenType[TokenType["KEYWORD"] = 4] = "KEYWORD";
        TokenType[TokenType["OPERATOR"] = 5] = "OPERATOR"; // :, :=
    })(TokenType || (TokenType = {}));
    var Operators = [
        ':',
        ':=',
    ];
    var Keywords = [
        'true', 'false' // TODO(jwwishart) ? keywords? or literals?
    ];
    var CreateTokenizer = function (context, scanner) {
        var _index = -1;
        return {
            peek: function () {
                return null;
            },
            eat: function () {
            },
            get_index: function () {
                return _index;
            },
            set_index: function (index) {
                _index = index;
            }
        };
    };
    var DefaultTokenizerFactory = (function () {
        function DefaultTokenizerFactory() {
        }
        DefaultTokenizerFactory.prototype.create = function (context, scanner) {
            return CreateTokenizer(context, scanner);
        };
        return DefaultTokenizerFactory;
    })();
    erg.DefaultTokenizerFactory = DefaultTokenizerFactory;
})(erg || (erg = {}));
