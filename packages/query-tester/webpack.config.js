const fs = require('fs');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { mergeWithRules } = require('webpack-merge');
const baseConfig = require('@splunk/webpack-configs/base.config').default;

// Set up an entry config by iterating over the files in the pages directory.
const entries = fs
    .readdirSync(path.join(__dirname, 'src/main/webapp/pages'))
    .filter((pageFile) => !/^\./.test(pageFile))
    .reduce((accum, page) => {
        accum[page] = path.join(__dirname, 'src/main/webapp/pages', page);
        return accum;
    }, {});

module.exports = mergeWithRules({
    module: {
        rules: {
            test: 'match',
            use: 'replace',
        },
    },
})(baseConfig, {
    entry: entries,
    output: {
        path: path.join(__dirname, 'stage/appserver/static/pages/'),
        filename: '[name].js',
    },
    resolve: {
        alias: {
            core: path.resolve(__dirname, '../query-tester-app/src/core'),
        },
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(__dirname, 'src/main/resources/splunk'),
                    to: path.join(__dirname, 'stage'),
                },
            ],
        }),
        new MiniCssExtractPlugin({
            filename: 'index-main.css',
        }),
        {
            // Copy the extracted CSS up to appserver/static/ so Splunk can find it
            apply(compiler) {
                compiler.hooks.afterEmit.tap('CopyCssPlugin', () => {
                    const src = path.join(__dirname, 'stage/appserver/static/pages/index-main.css');
                    const dest = path.join(__dirname, 'stage/appserver/static/index-main.css');
                    try { require('fs').copyFileSync(src, dest); } catch (e) { /* ignore */ }
                });
            },
        },
    ],
    devtool: false,
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    require('tailwindcss')(
                                        path.resolve(__dirname, 'tailwind.config.cjs')
                                    ),
                                    require('autoprefixer'),
                                ],
                            },
                        },
                    },
                ],
            },
        ],
    },
});
