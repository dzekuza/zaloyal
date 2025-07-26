import type React from "react"
import "./globals.css"
import ClientLayout from "./ClientLayout"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <title>belink.now Web3 Quest Platform</title>
        <meta name="description" content="Web3 Quest Platform for Community Engagement" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
        {/* StagewiseToolbar will be loaded client-side only */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
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
                });
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
