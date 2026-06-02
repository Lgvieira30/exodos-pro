import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Painel Analytics — Ads + CRM',
  description: 'Dashboard de inteligência de tráfego pago com cruzamento de dados de Ads e CRM',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
