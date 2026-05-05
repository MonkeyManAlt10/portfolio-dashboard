import { NextRequest } from "next/server";

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function validatePassword(provided: string): boolean {
  const expected = process.env.EDIT_PASSWORD;
  if (!expected) return false;
  if (provided.length < 4) return false;
  return timingSafeEqual(provided, expected);
}

export function requireAuth(
  request: NextRequest
): { authorized: true } | { authorized: false; response: Response } {
  const password = request.headers.get("x-edit-password") ?? "";
  if (!validatePassword(password)) {
    return {
      authorized: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { authorized: true };
}
