import path from 'path'
import webpack, { LibraryTarget } from 'webpack'
import { capitalize } from 'underscore.string'
import miniCssExtractPlugin from 'mini-css-extract-plugin'
import optimizeCssPlugin from 'optimize-css-assets-webpack-plugin'

// import * as miniCssExtractPlugin from "extract-text-webpack-plugin";

const ROOT = path.resolve(__dirname, 'src')
const DESTINATION = path.resolve(__dirname, 'dist')
const libraryName: string = 'pagetour'

const PATHS = {
  ROOT,
  DESTINATION,
  MAIN_TS: './pagetour.ts',
  MAIN_SASS: './styles/pagetour-styles.scss'
}

const isDev = (env: any) => env && env.development

const resolve: webpack.Resolve = {
  alias: {
    '@src': PATHS.ROOT,
    Handlebars: 'handlebars/dist/handlebars.runtime.min.js'
  },
  extensions: ['.ts', '.js'],
  modules: [ROOT, 'node_modules', '../../node_modules']
}

const optimization = (env: any): any => {
  return {
    moduleIds: 'named',
    chunkIds: 'named',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'initial'
        }
      }
    },
    runtimeChunk: {
      name: 'manifest'
    }
  }
}

const tsBuildModules: webpack.Module = {
  rules: [
    /****************
     * PRE-LOADERS
     *****************/
    {
      enforce: 'pre',
      test: /\.js$/,
      use: 'source-map-loader'
    },

    /****************
     * LOADERS
     *****************/

    {
      test: /\.html$/,
      use: ['handlebars-loader', 'html-minify-loader']
    },
    {
      test: /\.ts$/,
      exclude: [/node_modules/],
      use: [
        {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.json'
          }
        }
      ]
    }
  ]
}

const devtool: webpack.Options.Devtool = 'cheap-module-source-map'

const baseConfig = (env: any): webpack.Configuration => {
  return {
    // optimization: optimization(env),
    context: PATHS.ROOT,
    mode: isDev(env) ? 'development' : 'production',
    entry: {
      pagetour: PATHS.MAIN_TS
    },
    resolve,
    module: tsBuildModules,
    devtool
  }
}

const output = (env: any, type: webpack.LibraryTarget): webpack.Output => {
  const typeName = type === 'var' ? 'iife' : type
  return {
    filename: `[name].${typeName}.js`,
    chunkFilename: `[name].${typeName}.js`,
    path: PATHS.DESTINATION + `/${type}`,
    sourceMapFilename: '[file].map',
    libraryTarget: type,
    library: capitalize(libraryName)
  }
}

const umdConfig = (env: any): webpack.Configuration => {
  return {
    ...baseConfig(env),
    output: output(env, 'umd')
  }
}

const iifeConfig = (env: any): webpack.Configuration => {
  return {
    ...baseConfig(env),
    output: output(env, 'var')
  }
}

/**
 *
 * CSS BUNDLING
 *
 *
 */

const cssOptimization = (env: any): webpack.Options.Optimization => {
  return {
    minimizer: [new optimizeCssPlugin()]
  }
}

const resolveCss: webpack.Resolve = {
  extensions: ['.js', '.scss', '.css'],
  modules: [ROOT, 'node_modules']
}

const extractSass: any = (env: any): any => {
  return new miniCssExtractPlugin({
    filename: `${libraryName}.css`
  })
}

const sassBuildModules = (env: any): webpack.Module => {
  return {
    rules: [
      {
        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }
        ]
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          miniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader',
          'resolve-url-loader',
          'sass-loader'
        ]
      }
    ]
  }
}

const sassConfig = (env: any): webpack.Configuration => {
  return {
    context: PATHS.ROOT,
    optimization: cssOptimization(env),
    mode: isDev(env) ? 'development' : 'production',
    entry: {
      main: PATHS.MAIN_SASS
    },
    resolve: resolveCss,
    module: sassBuildModules(env),
    output: {
      path: `${PATHS.DESTINATION}/css`,
      filename: '[name].min.js'
    },
    plugins: [extractSass(env)]
  }
}

/**
 *
 * FINAL CONFIG
 *
 *
 */

const config = (env: any) => {
  return [umdConfig(env), iifeConfig(env), sassConfig(env)]
}

export default config
