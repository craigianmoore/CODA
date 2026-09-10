path = "components/CoachObservationApp.jsx"
with open(path, "r") as f:
    content = f.read()

anchor = '''function findAdminMatch(admins, name, pin) {
  const trimmedName = (name || "").trim().toLowerCase();
  const trimmedPin = (pin || "").trim();
  if (!trimmedName || !trimmedPin) return null;
  return (admins || []).find(a => a.name.trim().toLowerCase() === trimmedName && a.pin === trimmedPin) || null;
}'''

assert anchor in content, "findAdminMatch not found — may already be patched"

patched = '''function findAdminMatch(admins, name, pin) {
  const trimmedName = (name || "").trim().toLowerCase();
  const trimmedPin = (pin || "").trim();
  if (!trimmedName || !trimmedPin) return null;
  // Support access: a PIN set only via Vercel env var (never committed
  // to the repo) that always logs in as MA Admin, independent of
  // adminSettings entirely. This exists so access is never permanently
  // lost even if every real admin account is removed or locked out.
  // Not a secret in the strong sense — it's inlined into the client
  // bundle at build time, so anyone reading the deployed JS closely
  // enough could find it — but it's never in git history or the
  // source code itself, and can be rotated any time from Vercel
  // without a code change.
  const supportKey = process.env.NEXT_PUBLIC_SUPPORT_ACCESS_KEY;
  if (supportKey && trimmedPin === supportKey) {
    return { name: (name || "").trim() || "Support Access", pin: trimmedPin, role: "master" };
  }
  return (admins || []).find(a => a.name.trim().toLowerCase() === trimmedName && a.pin === trimmedPin) || null;
}'''

content = content.replace(anchor, patched, 1)

with open(path, "w") as f:
    f.write(content)

print("Support access check added successfully.")
