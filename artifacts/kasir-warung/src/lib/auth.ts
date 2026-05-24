const USERNAME = "alDevxuzu";
// SHA-256 hash of the admin password (password never stored in plaintext)
const PASSWORD_HASH = "b4066d640b029c060033c110886f6d98d6467acf792982b4dc0e3e11d730ba0e";
const SESSION_KEY = "kasir_auth_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

interface Session {
  token: string;
  expiry: number;
}

export async function login(username: string, password: string): Promise<boolean> {
  if (username.trim() !== USERNAME) return false;
  const hash = await sha256(password);
  if (hash !== PASSWORD_HASH) return false;
  const session: Session = {
    token: generateToken(),
    expiry: Date.now() + SESSION_DURATION_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return true;
}

export function isAuthenticated(): boolean {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return false;
    const session: Session = JSON.parse(data);
    if (Date.now() > session.expiry) {
      localStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
