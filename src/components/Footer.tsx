import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { BRAND_NAME, SHOP_BOOKING_PATH, SHOP_PATH } from "@/lib/brand";

const SHOP_LINKS = [
  { href: "#layanan", label: "Layanan" },
  { href: "#capster", label: "Capster" },
  { href: "#cara-booking", label: "Cara booking" },
  { href: "#jam", label: "Jam buka" },
];

const ACCOUNT_LINKS = [
  { href: "/login", label: "Masuk" },
  { href: SHOP_BOOKING_PATH, label: "Booking online" },
  { href: SHOP_PATH, label: "Halaman toko" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <BrandMark href="/" size="sm" />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Barbershop dengan booking online dan antrean teratur. Datang tanpa menunggu lama di tempat.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Jelajahi</h2>
          <ul className="mt-3 space-y-2">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Akun</h2>
          <ul className="mt-3 space-y-2">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border px-4 py-4 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-7xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND_NAME}. Barbershop booking online.
        </p>
      </div>
    </footer>
  );
}
