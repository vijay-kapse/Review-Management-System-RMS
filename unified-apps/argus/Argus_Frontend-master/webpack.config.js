module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8100',  // Change to Django's port
        changeOrigin: true,
        secure: false,
      }
    },
    historyApiFallback: true,
  }
};