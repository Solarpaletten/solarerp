// app/(dashboard)/layout.tsx
// Dashboard Layout — Cookie-only
// No localStorage guard needed — middleware handles auth redirect.
// If user reaches this layout, they have a valid session cookie.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
