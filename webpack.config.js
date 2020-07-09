const path = require("path");

module.exports = {
	mode: 'production',
	entry: {
		"app": "./js/app.js",
		"license": "./js/license.js"
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /\.(js)$/,
				exclude: /node_modules/,
				use: ['babel-loader']
			}
		]
	},
	resolve: {
		extensions: ['*', '.js']
	},
};