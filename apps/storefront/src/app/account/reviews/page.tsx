import { headers } from "next/headers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface Review {
  id: string;
  productName?: string;
  rating: number;
  title?: string;
  body?: string;
  status: string;
  createdAt: string;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400">
      {"★".repeat(Math.min(5, Math.max(0, rating)))}
      {"☆".repeat(Math.max(0, 5 - Math.min(5, Math.max(0, rating))))}
    </span>
  );
}

function statusColor(status: string): string {
  switch (status) {
    case "published":
    case "approved":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

async function fetchReviews(cookie?: string): Promise<Review[]> {
  const endpoints = ["/api/reviews/my", "/api/reviews"];
  for (const path of endpoints) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: cookie ? { cookie } : {},
        cache: "no-store",
      });
      if (!res.ok) continue;
      if (!(res.headers.get("content-type") ?? "").includes("application/json")) continue;
      const data = (await res.json()) as { items?: Review[] } | Review[];
      return Array.isArray(data) ? data : (data.items ?? []);
    } catch {
      continue;
    }
  }
  return [];
}

export default async function AccountReviewsPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const reviews = await fetchReviews(cookie);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">My Reviews</h1>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-gray-500">No reviews submitted yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            After purchasing products you can leave reviews.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {review.productName && (
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {review.productName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Stars rating={review.rating} />
                    {review.title && (
                      <span className="text-sm font-medium text-gray-700">{review.title}</span>
                    )}
                  </div>
                  {review.body && (
                    <p className="mt-2 text-sm text-gray-600">{review.body}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(review.status)}`}
                  >
                    {review.status}
                  </span>
                  <p className="mt-1 text-xs text-gray-400">
                    {review.createdAt
                      ? new Date(review.createdAt).toLocaleDateString("sv-SE")
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
