const isFunction = (node) =>
    node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression';

function isFunctionStatement(node) {
    const declaration = node.type === 'ExportNamedDeclaration' ? node.declaration : node;
    if (declaration?.type === 'FunctionDeclaration' || declaration?.type === 'ClassDeclaration') {
        return true;
    }
    if (declaration?.type === 'VariableDeclaration') {
        return declaration.declarations.some((item) => isFunction(item.init));
    }
    return (
        declaration?.type === 'ExpressionStatement' &&
        declaration.expression.type === 'CallExpression' &&
        declaration.expression.arguments.some(
            (argument) => isFunction(argument) && argument.body.type === 'BlockStatement',
        )
    );
}

export default {
    meta: {
        type: 'layout',
        docs: { description: 'Separate function bindings, callbacks and object methods.' },
        fixable: 'whitespace',
        schema: [],
        messages: {
            missing: 'Add a blank line between functions.',
            compact: 'Remove blank lines between statements inside a function.',
        },
    },

    create(context) {
        const source = context.sourceCode;

        function separate(items, isFunctionMember) {
            for (let index = 1; index < items.length; index++) {
                const previous = items[index - 1];
                const next = items[index];
                if (!isFunctionMember(previous) && !isFunctionMember(next)) {
                    continue;
                }
                const leadingComment = source
                    .getCommentsBefore(next)
                    .find((comment) => comment.loc.start.line > previous.loc.end.line);
                const target = leadingComment ?? next;
                const boundary = source.getTokenBefore(target, { includeComments: true });
                const gap = source.text.slice(boundary.range[1], target.range[0]);
                if (/\r?\n[\t ]*\r?\n/.test(gap)) {
                    continue;
                }
                context.report({
                    node: next,
                    messageId: 'missing',
                    fix: (fixer) =>
                        fixer.insertTextBefore(target, gap.includes('\n') ? '\n' : '\n\n'),
                });
            }
        }

        function compactBody(items) {
            for (let index = 1; index < items.length; index++) {
                const previous = items[index - 1];
                const next = items[index];
                if (isFunctionStatement(previous) || isFunctionStatement(next)) {
                    continue;
                }
                const gap = source.text.slice(previous.range[1], next.range[0]);
                if (!/^[\t \r\n]*$/.test(gap) || !/\n[\t ]*\r?\n/.test(gap)) {
                    continue;
                }
                context.report({
                    node: next,
                    messageId: 'compact',
                    fix: (fixer) =>
                        fixer.replaceTextRange(
                            [previous.range[1], next.range[0]],
                            gap.replace(/\r?\n[\t ]*(?=\r?\n)/g, ''),
                        ),
                });
            }
        }

        return {
            Program: (node) => separate(node.body, isFunctionStatement),

            BlockStatement(node) {
                compactBody(node.body);
                separate(node.body, isFunctionStatement);
            },

            ObjectExpression: (node) =>
                separate(
                    node.properties,
                    (property) =>
                        isFunction(property.value) && property.value.body.type === 'BlockStatement',
                ),
        };
    },
};
