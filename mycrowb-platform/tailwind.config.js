export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primaryGreen: '#2E7D32',
        leafGreen: '#4CAF50',
        lightGreen: '#A5D6A7',
        earthBrown: '#6D4C41',
        background: '#F1F8E9'
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
};
