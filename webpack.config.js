module.exports = {
  entry: {
    "fluid": "./main.js"
  },
  output: {
    path: __dirname,
    filename: "bundle.js"
},
  module: {
    loaders: [
      {
        test: /\.glsl$/,
        loader: 'webpack-glsl'
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel',
        query: {
          presets: ['es2015']
        }
      }
    ]
  },
  devtool: 'source-map'
};