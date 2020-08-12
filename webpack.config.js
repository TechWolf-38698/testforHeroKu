const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
    entry: {
        app: './src/index.js'
    },
    devtool: 'inline-source-map',
    devServer: {
        hot: true,
        compress: true,
        overlay: { warnings: false, errors: true },
        quiet: true,
        watchContentBase: true,
        liveReload: true,
        contentBase: path.resolve(__dirname, 'public'),
        publicPath: path.resolve(__dirname, 'public'),
    },
    plugins: [
        new CleanWebpackPlugin({
            cleanStaleWebpackAssets: false
        }),
        new HtmlWebpackPlugin({
            title: 'Development',
            filename: 'public/index.html',
           
        })
    ],
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    }
};