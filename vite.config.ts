import { defineConfig } from 'vite'

// Use a relative base so built assets work when served from any subpath or opened from file://
export default defineConfig({
  base: './'
})
