import './globals.css';
import Shell from '../components/Shell';
export const metadata = { title: 'Huvan Management' };
export default function RootLayout({ children }) {
  return (<html lang="en"><body><Shell>{children}</Shell></body></html>);
}
