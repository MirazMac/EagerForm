import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import pkg from './package.json';

const LIBRARY_NAME = 'EagerForm'; // Change with your library's name
const EXTERNAL = []; // Indicate which modules should be treated as external
const GLOBALS = {}; // https://rollupjs.org/guide/en/#outputglobals

const banner = `/*!
 * ${pkg.name}
 * ${pkg.description}
 *
 * @version v${pkg.version}
 * @author ${pkg.author}
 * @homepage ${pkg.homepage}
 * @repository ${pkg.repository.url}
 * @license ${pkg.license}
 */`;

const makeConfig = (env = 'development') => {
  let bundleSuffix = '';

  if (env === 'production') {
    bundleSuffix = 'min.';
  }

  const config = {
    input: 'src/index.js',
    external: EXTERNAL,
    output: [
      {
        banner,
        name: LIBRARY_NAME,
        file: `dist/${LIBRARY_NAME}.umd.${bundleSuffix}js`, // UMD
        format: 'umd',
        exports: 'auto',
        globals: GLOBALS
      },
      /*{
        banner,
        file: `dist/${LIBRARY_NAME}.cjs.${bundleSuffix}js`, // CommonJS
        format: 'cjs',
        // We use `default` here as we are only exporting one thing using `export default`.
        // https://rollupjs.org/guide/en/#outputexports
        exports: 'default',
        globals: GLOBALS
      },*/
      {
        banner,
        file: `dist/${LIBRARY_NAME}.esm.${bundleSuffix}js`, // ESM
        format: 'es',
        exports: 'auto',
        globals: GLOBALS
      }
    ],
    plugins: [
      // Uncomment the following 2 lines if your library has external dependencies
       resolve(), // teach Rollup how to find external modules
      commonjs(), // so Rollup can convert external modules to an ES module
      babel({
        babelHelpers: 'runtime',
        exclude: ['node_modules/**']
      })
    ]
  };

  console.log(env);

  if (env === 'production') {
    config.plugins.push(terser({
      output: {
        comments: /^!/
      }
    }));
  } else {
    config.plugins.push(
      serve({
        open: true,
        contentBase: ['.', 'playground'],
        host: 'localhost',
        port: 9000,
      }));
    config.plugins.push(
      livereload({
        watch: ['dist', 'playground']
      }));
  }

  return config;
};

export default commandLineArgs => {
  let configs;

  // Production
  if (commandLineArgs.environment === 'BUILD:production') {
    configs = makeConfig('production');
  } else {
    configs = makeConfig();
  }

  return configs;
};
