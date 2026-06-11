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
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Luckin Counting</h1>
        <p className="text-sm text-gray-500">Daily inventory counting</p>
      </header>

      <Link
        href={`/count/${today}/back`}
        className="rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white"
      >
        Start counting — {today}
      </Link>

      <Link
        href="/admin"
        className="rounded-lg border border-gray-300 px-4 py-3 text-center font-medium text-gray-700"
      >
        Admin
      </Link>
    </main>
  );
}
