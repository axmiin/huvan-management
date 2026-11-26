
import './globals.css';
import Shell from '../components/Shell';
export const metadata = {
  title: 'Huvan Pro',
  icons: { icon: '/Logo.png', apple: '/Logo.png' },
};
export const viewport = { width: 'device-width', initialScale: 1 };
export default function RootLayout({ children }) {
  return (<html lang="en"><body><Shell>{children}</Shell></body></html>);
}
