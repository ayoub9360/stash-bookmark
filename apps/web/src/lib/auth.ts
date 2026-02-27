const SESSION_KEY = "stash-logged-in";

/**
 * Lightweight client-side flag to avoid flashing the login page.
 * The actual auth is verified server-side via the httpOnly cookie.
 * This flag stores no secrets — just a boolean "logged in" indicator.
 */
export function getLoggedIn(): boolean {
  return localStorage.getItem(SESSION_KEY) === "true";
}

export function setLoggedIn(): void {
  localStorage.setItem(SESSION_KEY, "true");
}

export function clearLoggedIn(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return getLoggedIn();
}
