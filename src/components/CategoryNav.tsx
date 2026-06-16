"use client";

export function categoryAnchorId(category: string): string {
  return "cat-" + category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function CategoryNav({ categories }: { categories: string[] }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="category-nav">
      {categories.map((c) => (
        <a
          key={c}
          href={`#${categoryAnchorId(c)}`}
          className="category-nav-btn"
          onClick={(e) => handleClick(e, categoryAnchorId(c))}
        >
          {c}
        </a>
      ))}
    </div>
  );
}
