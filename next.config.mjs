/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react', 
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-toast',
      '@radix-ui/react-switch',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-slider',
      '@radix-ui/react-progress',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-separator',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-badge',
      '@radix-ui/react-button',
      '@radix-ui/react-card',
      '@radix-ui/react-input',
      '@radix-ui/react-textarea',
      '@radix-ui/react-tabs',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      'sonner',
      'recharts',
      'date-fns',
      'clsx',
      'class-variance-authority',
      'tailwind-merge',
      'cmdk',
      'embla-carousel-react',
      'react-day-picker',
      'react-hook-form',
      'react-resizable-panels',
      'vaul',
      'input-otp'
    ],
    // React 19 compatibility
    reactCompiler: false,
  },
  // Enable compression
  compress: true,
  // Optimize bundle size
  webpack: (config, { dev, isServer }) => {
    // Optimize for development - reduce polling frequency significantly
    if (dev) {
      config.watchOptions = {
        poll: 5000, // Increased from 2000ms to 5000ms
        aggregateTimeout: 1000, // Increased from 500ms to 1000ms
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/database-schema/**',
          '**/*.sql',
          '**/*.md',
          '**/*.txt',
          '**/*.json',
          '**/*.cpuprofile',
          '**/*.tsbuildinfo',
          '**/.next/**',
          '**/dist/**',
          '**/build/**',
          '**/coverage/**',
          '**/.env*',
          '**/package-lock.json',
          '**/yarn.lock',
          '**/pnpm-lock.yaml',
          '**/turbo.json',
          '**/jest.config.*',
          '**/tsconfig.*.json',
          '**/.eslintrc.*',
          '**/.prettierrc.*',
          '**/tailwind.config.*',
          '**/postcss.config.*',
          '**/next.config.*',
          '**/vercel.json',
          '**/netlify.toml',
          '**/README.md',
          '**/CHANGELOG.md',
          '**/LICENSE',
          '**/.gitignore',
          '**/.gitattributes',
          '**/.editorconfig',
          '**/.vscode/**',
          '**/.idea/**',
          '**/testsprite_tests/**',
          '**/__tests__/**',
          '**/*.test.*',
          '**/*.spec.*'
        ]
      }
    }
    
    // Simplified bundle splitting to prevent ChunkLoadError
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: -10,
          },
          ui: {
            test: /[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: -5,
          },
        },
      },
    }
    
    return config
  },
  // Add caching headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
  // Disable source maps in development for faster builds
  productionBrowserSourceMaps: false,
}

export default nextConfig
