import "@fontsource-variable/vazirmatn";
import "./style.css";
import { Shell } from "./ui";
export const metadata = {
  title: "استارویج | منوی غذا",
  description:
    "منوی استارویج؛ پیتزا، سوخاری، ساندویچ، برگر و پیش‌غذا در شهریار",
};
export default function Layout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
