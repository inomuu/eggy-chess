import type { Metadata } from 'next'
import { Press_Start_2P } from 'next/font/google'
import './globals.css'

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
})

const SITE_URL = 'https://inomuu.github.io/eggy-chess'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Eggy Chess',
  description: 'Play the web version of Eggy Chess, based on Ragnarok Origin!',
  openGraph: {
    title: 'Eggy Chess',
    description: 'Enjoy a fun and strategic experience with Eggy Chess, the web adaptation of the beloved Ragnarok Origin minigame. Battle with cute egg warriors and test your tactical skills!',
    url: SITE_URL,
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/preview.png?v=2`,
        width: 1200,
        height: 630,
        alt: 'Eggy Chess Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eggy Chess',
    description: 'Play the web version of Eggy Chess, based on Ragnarok Origin!',
    images: [`${SITE_URL}/preview.png?v=2`],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={pixelFont.variable}>{children}</body>
    </html>
  )
}
