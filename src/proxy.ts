import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { USER_ROLES, type UserRole } from "@/constants/roles";
import type { Database } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  APPLICANT: "/applicant",
  EVALUATOR: "/evaluator/reviews",
  DOCUMENT_REVIEWER: "/document-reviewer/documents",
  HR: "/hr/dashboard",
  ADMIN: "/admin/invitations",
};

const PROTECTED_AREAS: { prefix: string; role: UserRole }[] = [
  { prefix: "/applicant", role: "APPLICANT" },
  { prefix: "/evaluator", role: "EVALUATOR" },
  { prefix: "/document-reviewer", role: "DOCUMENT_REVIEWER" },
  { prefix: "/hr", role: "HR" },
  { prefix: "/admin", role: "ADMIN" },
];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

function copyCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie);
  });
  return destination;
}

export async function proxy(request: NextRequest) {
  const { url, key } = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
  if (!url || !key) {
    throw new Error("Supabase public environment variables are required in Proxy.");
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const isSignedIn = Boolean(claims?.sub);
  const roleClaim = claims?.app_metadata?.role;
  const role = isUserRole(roleClaim) ? roleClaim : "APPLICANT";
  const pathname = request.nextUrl.pathname;
  const protectedArea = PROTECTED_AREAS.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (protectedArea && !isSignedIn) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  if (protectedArea && role !== protectedArea.role) {
    const destination = new URL(ROLE_HOME[role], request.url);
    return copyCookies(response, NextResponse.redirect(destination));
  }

  const isPdsRoute =
    pathname === "/applicant/pds" || pathname.startsWith("/applicant/pds/");
  if (protectedArea?.role === "APPLICANT" && !isPdsRoute && claims?.sub) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("has_submitted_pds")
      .eq("id", claims.sub)
      .maybeSingle();
    if (!profile?.has_submitted_pds) {
      const destination = new URL("/applicant/pds", request.url);
      return copyCookies(response, NextResponse.redirect(destination));
    }
  }

  if (isSignedIn && (pathname === "/login" || pathname === "/register")) {
    const destination = new URL(ROLE_HOME[role], request.url);
    return copyCookies(response, NextResponse.redirect(destination));
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/applicant/:path*",
    "/evaluator/:path*",
    "/document-reviewer/:path*",
    "/hr/:path*",
    "/admin/:path*",
  ],
};
