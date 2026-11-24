import type { Metadata } from 'next'
import { Press_Start_2P } from 'next/font/google'
import './globals.css'

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
})

export const metadata: Metadata = {
  title: 'Eggy Chess',
  description: 'Play the web version of Eggy Chess, based on Ragnarok Origin!',
  openGraph: {
    title: 'Eggy Chess',
    description: 'Enjoy a fun and strategic experience with Eggy Chess, the web adaptation of the beloved Ragnarok Origin minigame. Battle with cute egg warriors and test your tactical skills!',
    url: 'https://eggychess.vercel.app',
    type: 'website',
    images: [
      {
        url: 'https://eggychess.vercel.app/preview.png',
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
    images: ['https://eggychess.vercel.app/preview.png'],
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
