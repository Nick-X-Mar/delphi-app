'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  CalendarIcon, 
  HomeIcon, 
  UserGroupIcon,
  ChartBarIcon,
  BuildingOffice2Icon,
  UsersIcon
} from '@heroicons/react/24/outline';

export default function Navigation() {
  const pathname = usePathname();

  const mainNavigation = [
    { name: 'Users', href: '/users', icon: UsersIcon },
    { name: 'Events', href: '/events', icon: CalendarIcon },
    { name: 'Hotels', href: '/hotels', icon: HomeIcon },
    { name: 'People', href: '/people', icon: UserGroupIcon },
    { name: 'Allocation', href: '/allocation', icon: ChartBarIcon },
  ];

  const secondaryNavigation = [
    { name: 'Accommodation', href: '/accommodation', icon: BuildingOffice2Icon },
  ];

  return (
    <div className="flex items-center justify-center gap-6">
      <nav>
        <ul className="flex gap-10 text-lg items-center justify-start">
          {mainNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 hover:text-blue-600 ${
                    isActive ? 'text-blue-600 font-semibold' : ''
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}

          {/* Vertical separator */}
          <li className="h-10 border-l border-gray-500" aria-hidden="true"></li>

          {secondaryNavigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-1 hover:text-blue-600 ${
                    isActive ? 'text-blue-600 font-semibold' : ''
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
