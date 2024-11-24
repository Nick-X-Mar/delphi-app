import Link from "next/link";

export default function Navigation() {
  return (
    <div className="flex items-center justify-center gap-6">
      <nav>
        <ul className="flex gap-10 text-lg items-center justify-start">
          <li>
            <Link href="/hotels" className="hover:underline">
              Hotels
            </Link>
          </li>
          <li>
            <Link href="/people" className="hover:underline">
              People
            </Link>
          </li>
          <li>
            <Link href="/allocation" className="hover:underline">
              Allocation
            </Link>
          </li>
          {/* Vertical separator */}
          <li className="h-10 border-l border-gray-500" aria-hidden="true"></li>
          <li>
            <Link href="/accommodation" className="hover:underline">
              Accommodation
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
