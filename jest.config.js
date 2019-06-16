module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    __TS_CONFIG__: 'tsconfig.json',
  },
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.(ts|tsx)$': './node_modules/ts-jest/preprocessor.js',
  },
  testMatch: ['**/__test__/**/*.test.(ts|js)'],
};
