export const metadata = {
  title: 'Dominyx HQ — Control Center',
  description: 'One control center for the Dominyx Discord bot family: Music, Level, Greet, Ticket, Ping & Guard.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}