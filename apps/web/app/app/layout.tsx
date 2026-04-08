export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav>User Nav</nav>
      {children}
    </div>
  );
}
