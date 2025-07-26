import type React from "react"
import "./globals.css"
import ClientLayout from "./ClientLayout"
import { Inter, Poppins } from 'next/font/google'

// Add font configurations
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
      <head suppressHydrationWarning>
        <title>belink.now Web3 Quest Platform</title>
        <meta name="description" content="Web3 Quest Platform for Community Engagement" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning className="font-sans">
        <ClientLayout>{children}</ClientLayout>
        {/* StagewiseToolbar will be loaded client-side only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                // Only load in development mode
                const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isDevelopment) {
                  import('@stagewise/toolbar-next').then(({ StagewiseToolbar }) => {
                    import('@stagewise-plugins/react').then((ReactPlugin) => {
                      const { createRoot } = require('react-dom/client');
                      const container = document.createElement('div');
                      document.body.appendChild(container);
                      const root = createRoot(container);
                      root.render(React.createElement(StagewiseToolbar, {
                        config: {
                          plugins: [ReactPlugin.default]
                        }
                      }));
                    });
                  }).catch(error => {
                    console.log('Stagewise toolbar not available:', error);
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  )
}

export const metadata = {
  title: 'BeLink Web3 Quest Platform',
  description: 'Web3 Quest Platform for Community Engagement',
  generator: 'v0.dev'
};
