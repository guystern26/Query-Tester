/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            diagnostics: {
                // Only type-check test files, not the entire import tree
                ignoreDiagnostics: [2305, 7016],
            },
            tsconfig: {
                jsx: 'react',
                esModuleInterop: true,
                module: 'commonjs',
                moduleResolution: 'node',
                baseUrl: '.',
                paths: { 'core/*': ['src/core/*'] },
                types: ['jest', 'node'],
                skipLibCheck: true,
            },
        }],
    },
    moduleNameMapper: {
        '^core/(.*)$': '<rootDir>/src/core/$1',
        '\\.(css|less|scss)$': '<rootDir>/src/__mocks__/styleMock.js',
    },
    testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
};
