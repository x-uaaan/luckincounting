import Link from "next/link";

function todayYYMMDD(): string {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export default function HomePage() {
  const today = todayYYMMDD();

  return (
    <div className="content">
      <header className="home-header">
        <h1>Luckin Counting</h1>
        <p>Daily inventory counting</p>
      </header>

      <Link href={`/count/${today}/back`} className="home-link primary">
        Start counting — {today}
      </Link>

      <Link href="/admin" className="home-link secondary">
        Admin
      </Link>
    </div>
  );
}
