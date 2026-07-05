import './globals.css'
import { AuthProvider } from '../src/contexts/AuthContext'
import { CartProvider } from '../src/contexts/CartContext'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'

export const metadata = {
  title: 'AutomationStore — Demo e-commerce',
  description: 'A demo e-commerce store (like automationexercise.com) for e2e testing practice.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <Header />
            <main>{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
