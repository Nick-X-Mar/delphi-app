import "./globals.css"; // Tailwind styles
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata = {
  title: "Delphi Economic Forum",
  description: "This app is responsible for Accommodation!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
