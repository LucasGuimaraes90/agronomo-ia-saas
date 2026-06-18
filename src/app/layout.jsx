import './globals.css';

export const metadata = {
  title: 'Agrônomo IA',
  description: 'Plataforma inteligente para agrônomos — laudos, visitas, agenda e IA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
