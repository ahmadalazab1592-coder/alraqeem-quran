import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // تحديث التطبيق تلقائياً عند رفع نسخة جديدة
      // ✅ الكود الجديد الذي يحل المشكلة
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000 // رفع الحد إلى 5 ميجابايت
      },
      manifest: {
        name: 'الرقيم ',
        short_name: 'الرقيم',
        start_url: '/',   
        description: 'تطبيق للبحث والإحصاء في القرآن الكريم',
        theme_color: '#0f172a', // لون الشريط العلوي في الهاتف
        background_color: '#ffffff',
        display: 'standalone', // يجعله يفتح كبرنامج مستقل بدون شريط متصفح
        lang: 'ar',
        dir: 'rtl',
        icons: [
          {
            src: '/icon-192x192.png', // ستحتاج لإضافة صورة بهذا الاسم والمقاس
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})