import "./globals.css";

export const metadata = {
  title: "Dependency Update Triage",
  description: "Risk-ranked review batches for automated dependency updates (CLOUD-242).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
