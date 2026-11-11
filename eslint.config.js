import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**'] },
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        languageOptions: {
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/ban-ts-comment': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', caughtErrors: 'none' },
            ],
        },
    },
    {
        files: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '**/infrastructure/**',
                                '@/infrastructure/**',
                                '@database/**',
                                '@providers/**',
                                '@payments/**',
                                '@queues/**',
                                '**/presentation/**',
                                '@/presentation/**',
                                '@telegram/**',
                                '@admin/**',
                                '@handlers/**',
                                '@shop/**',
                                '@bootstrap/**',
                                'telegraf',
                                'telegraf/*',
                                'pg',
                                'openai',
                                'bullmq',
                            ],
                            message:
                                'Depend on domain contracts and inject infrastructure adapters.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/types/**/*.ts'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'ImportDeclaration[importKind!="type"]',
                    message: 'Contract files must use import type.',
                },
                {
                    selector:
                        'ExportNamedDeclaration > :matches(FunctionDeclaration, ClassDeclaration, VariableDeclaration)',
                    message: 'Keep executable code outside src/types.',
                },
            ],
        },
    },
);
