import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import Providers from '@/providers/react-query'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster 
            position="top-center"
            expand={true}
            closeButton
          />
        </Providers>
      </body>
    </html>
  )
}


