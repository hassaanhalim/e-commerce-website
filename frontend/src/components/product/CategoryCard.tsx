import { Link } from "react-router";
import type { Category } from "../../data/categories";

interface CategoryCardProps {
  category: Category;
}

function CategoryCard({ category }: CategoryCardProps) {
  return (
    <article className="group relative min-h-80 overflow-hidden rounded-2xl bg-gray-900">
      <img
        src={category.image}
        alt={category.name}
        className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
      />

      {/* Sophisticated gradient — dark at bottom, transparent at top */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      <Link
        to={category.link}
        className="absolute inset-0 flex flex-col justify-end p-7 text-white"
        aria-label={`Shop ${category.name} collection`}
      >
        <h3 className="text-2xl font-bold tracking-tight">{category.name}</h3>

        <p className="mt-1.5 max-w-xs text-sm leading-6 text-white/75">
          {category.description}
        </p>

        <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white transition group-hover:gap-3">
          Shop collection
          <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </Link>
    </article>
  );
}

export default CategoryCard;
