import Link from "next/link";

export default function HomePage() {
  return (
    <div className="content">
      <header className="home-header">
        <h1>Luckin Counting</h1>
        <p>Daily inventory counting</p>
      </header>

      <Link href="/count/back" className="home-link primary">
        Start counting
      </Link>

      <Link href="/admin" className="home-link secondary">
        Admin
      </Link>
    </div>
  );
}
