;

function generate_js(ast) {
    var result = process_ast_node(ast, ast /* Program */);

    return result.join('\n');
}

function process_ast_node(ast, scope) {
    var result = [];

    // TODO(jwwishart) format it nicer for the poor user!

    var prefix = '  ';
    var tmpScope = scope;
    while(tmpScope.parent !== null) {
        prefix += '  ';
        tmpScope = tmpScope.parent;
    }

    if (ast.type === AST_NODE_TYPE_PROGRAM) {
        result.push(';(function(global){');

        for (var psi in ast.statements) {
            result = result.concat(process_ast_node(ast.statements[psi], scope));
        }

        result.push('}(window || {}));'); // TODO(jwwishart) node etc?
    }

    if (ast.type === AST_NODE_TYPE_SCOPE) {
        result.push(prefix + '(function(){');

        for (var si in ast.statements) {
            result.push(process_ast_node(ast.statements[si], scope).join('\n'));
        }

        result.push(prefix + '}();'); // TODO(jwwishart) node etc?
    }

    if (ast.type === AST_NODE_TYPE_FUNCTION_SCOPE) {
        for (var si in ast.statements) {
            result = result.concat(process_ast_node(ast.statements[si], scope));
        }
    }

    if (ast.type === AST_NODE_TYPE_VARIABLE_DECLARATION) {
        if (ast.isInitialized === false) {
            result.push(prefix + 'var ' + ast.identifier + ' = null;');
        } else {
            // TODO(jwwishart) process_ast_node(ast.expression, scope)!!! :oS
            result.push(prefix + 'var ' + ast.identifier + ' = ' + process_ast_node(ast.expression, scope) + ';');
        }
    }

    if (ast.type === AST_NODE_TYPE_EXPRESSION) {
        return (function() {
            // TODO(jwwishart) how would we verify that it is a VALID expression?
            // ... probably just the same as this method but purely in an expect/accept manner?
            var parts = [];

            for (var part in ast.parts) {
                parts.push(process_ast_node(ast.parts[part], scope));
            }

            return parts.join(' ');
        }());
    }

    if (ast.type === AST_NODE_TYPE_LITERAL) {
        if (ast.dataType === 'string') {
            return '"' + ast.value + '"';
        }

        if (ast.dataType === 'int') {
            return ast.value;
        }

        if (ast.dataType === 'bool') {
            return ast.value;
        }

        throw new Error('ast dataType unknown: ' + ast.dataType);
    }

    if (ast.type === AST_NODE_TYPE_OPERATOR) {
        return ast.operator;
    }

    if (ast.type === AST_NODE_TYPE_IDENTIFIER) {
        return ast.identifier;
    }
    
    if (ast.type === AST_NODE_TYPE_FUNCTION_DECLARATION) {
        var params = '';
        for (var p = 0; p < ast.parameters.length; p++) {
            params += ast.parameters[p].name + ', ';
        }

        params = params.substring(0, params.length - 2);
        result.push(prefix + 'function ' + ast.identifier + '(' + params + ') {');

        result.push(process_ast_node(ast.body, ast.body).join('\n'));

        result.push(prefix + '}');
    }

    if (ast.type === AST_NODE_TYPE_FUNCTION_CALL) {
        (function() {
            var funcName = ast.identifier;
            var parts = '';

            // Builting Functions
            //
            
            if (ast.builtin === true) {
                if (ast.identifier === 'print') {
                    funcName ='console.log';
                } else {
                    throw new Error("Unexpected Error: Hit unknown builting function" + ast.identifier);
                }
            }

            parts += funcName + '(';

            // Argument Expressions?
            if (ast.expression) {
                // TODO(jwwishart) @BUG expression parts might have , for arguments passed to function :oS
                for (var i= 0; i < ast.expression.parts.length; i++) {
                    parts += process_ast_node(ast.expression, scope);
                }
            }

            parts += ');';

            result.push(prefix + parts);
        }());
    }

    return result;
}