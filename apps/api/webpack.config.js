const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = function (config, ctx) {
  const isNxCtx = ctx && ctx.options !== undefined;

  return {
    output: {
      path: join(__dirname, '../../dist/apps/api'),
      clean: true,
      ...(process.env.NODE_ENV !== 'production' && {
        devtoolModuleFilenameTemplate: '[absolute-resource-path]',
      }),
    },
    watch: isNxCtx ? ctx.options.watch : process.env.NODE_ENV !== 'production',
    plugins: [
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        tsConfig: './tsconfig.app.json',
        assets: ['./src/assets'],
        optimization: false,
        outputHashing: 'none',
        generatePackageJson: true,
        sourceMap: true,
      }),
    ],
  };
};
