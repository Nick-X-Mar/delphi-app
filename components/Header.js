import Navigation from "./Navigation";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/logo.svg";

export default function Header() {
  return (
    <header className="bg-slate-200 text-slate-950 py-1">
      <div className="container mx-auto flex items-center">
        {/* Logo Section */}
        <div className="pl-4">
          <Link href="/">
            <Image
              src={Logo}
              alt="logo"
              width="60"
              height="60"
              className="cursor-pointer"
            />
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="flex-grow">
          <Navigation />
        </div>
      </div>
    </header>
  );
}
