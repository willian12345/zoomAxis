import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from 'tailwindcss';


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 其他配置项
css: {
  postcss: {
    plugins: [tailwindcss],
  },
},
})
