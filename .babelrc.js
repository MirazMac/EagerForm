const { NODE_ENV } = process.env;

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        corejs: 3,
        targets: ">= 0.5%, last 2 major versions, not dead, Chrome >= 60, Firefox >= 60, Firefox ESR, iOS >= 12, Safari >= 12, not Explorer <= 11, not OperaMini all",
        useBuiltIns: 'usage',
        modules: NODE_ENV === 'test' ? 'auto' : false,
        shippedProposals: true,
      }
    ]
  ],
  plugins: [
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-proposal-class-properties',
    "@babel/plugin-transform-runtime"
  ]
};
