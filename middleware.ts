import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security middleware to prevent bypass attacks (CVE-2025-29927)
function securityMiddleware(request: NextRequest) {
  // Block requests with x-middleware-subrequest header to prevent auth bypass
  if (request.headers.get('x-middleware-subrequest')) {
    console.warn('Blocked request with x-middleware-subrequest header:', request.url);
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  return NextResponse.next();
}

export default withAuth(
  function middleware(request) {
    // Apply security checks first
    const securityResponse = securityMiddleware(request);
    if (securityResponse.status !== 200) {
      return securityResponse;
    }
    
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/sign-in",
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sign-in|sign-up|forgot-password|payment-success|public).*)"],
};
