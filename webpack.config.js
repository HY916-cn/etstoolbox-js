const path = require('path');
const { webpack, DefinePlugin } = require('webpack');
module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: {
        index: './src/index.js',
        'index.iframe': './src/index.iframe.js'
    },
    output: {
        path: path.resolve(__dirname),
        filename: '[name].js'
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react']
                    }
                }
            }
        ]
    },
    plugins: [
        new DefinePlugin({
            __VERSION: '\"1.0.6\"'
        })
    ]
};
