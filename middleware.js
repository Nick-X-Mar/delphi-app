import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Public routes - accessible to all
    const publicRoutes = ['/auth/login'];
    if (publicRoutes.includes(path)) {
      if (token) {
        // If user is already logged in, redirect to home
        return NextResponse.redirect(new URL('/', req.url));
      }
      return NextResponse.next();
    }

    // Admin-only routes
    const adminRoutes = ['/admin'];
    if (adminRoutes.includes(path) && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Level-1 and admin routes
    const level1Routes = ['/users'];
    if (level1Routes.includes(path) && !['admin', 'level-1'].includes(token?.role)) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/auth/login',
    },
  }
);

// Specify which routes to protect
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/login (login page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth/login).*)',
  ]
}; 