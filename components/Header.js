'use client';

import { useState, useEffect } from 'react';
import Navigation from "./Navigation";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/public/logo.svg";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { data: session } = useSession();
  const [eventTag, setEventTag] = useState(null);

  useEffect(() => {
    const fetchWorkingEventTag = async () => {
      const workingEventId = localStorage.getItem('workingEventId');
      if (workingEventId) {
        try {
          const response = await fetch(`/api/events/${workingEventId}`);
          const data = await response.json();
          if (!data.error && data.tag) {
            setEventTag(data.tag);
          } else {
            setEventTag(null);
          }
        } catch (error) {
          console.error('Error fetching working event:', error);
          setEventTag(null);
        }
      } else {
        setEventTag(null);
      }
    };

    // Fetch on mount
    fetchWorkingEventTag();

    // Listen for working event changes
    const handleWorkingEventChange = () => {
      fetchWorkingEventTag();
    };

    window.addEventListener('workingEventChanged', handleWorkingEventChange);
    return () => {
      window.removeEventListener('workingEventChanged', handleWorkingEventChange);
    };
  }, []);

  return (
    <header className="bg-slate-200 text-slate-950 py-1">
      <div className="container mx-auto flex items-center justify-between">
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

        {/* User Section */}
        <div className="pr-4 flex items-center gap-4">
          {session?.user && (
            <>
              {eventTag && (
                <span className="text-sm font-semibold text-gray-700">
                  [{eventTag}]
                </span>
              )}
              <span className="text-sm">
                {session.user.name || session.user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
              >
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
