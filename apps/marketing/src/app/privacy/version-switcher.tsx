"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface LegalVersion {
  id: string;
  versionNumber: number;
  versionLabel: string;
  effectiveDate: string;
}

interface LegalVersionData {
  id: string;
  pageType: string;
  language: string;
  versionNumber: number;
  versionLabel: string;
  effectiveDate: string;
  status: string;
  body: string;
  summaryOfChanges?: string;
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-stone-800">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium mt-4 mb-2 text-stone-700">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-stone-600">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="space-y-1 my-3">$&</ul>')
    .replace(/\n\n/g, '</p><p class="text-stone-600 leading-relaxed my-3">')
    .replace(/^(?!<[h|u|l])(.+)$/gm, (line) => line.trim() ? line : '');
}

interface Props {
  versions: LegalVersion[];
  currentVersionId: string;
  initialBody: string;
  initialEffectiveDate: string;
  initialVersionNumber: number;
  initialVersionLabel: string;
}

export function LegalVersionSwitcher({
  versions,
  currentVersionId,
  initialBody,
  initialEffectiveDate,
  initialVersionNumber,
  initialVersionLabel,
}: Props) {
  const [selectedId, setSelectedId] = useState(currentVersionId);
  const [body, setBody] = useState(initialBody);
  const [effectiveDate, setEffectiveDate] = useState(initialEffectiveDate);
  const [versionNumber, setVersionNumber] = useState(initialVersionNumber);
  const [versionLabel, setVersionLabel] = useState(initialVersionLabel);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  async function handleVersionChange(newId: string) {
    if (newId === selectedId) return;
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`${API}/api/cms/legal/privacy/${newId}`);
      if (!res.ok) throw new Error("not ok");
      const data = await res.json() as LegalVersionData;
      setSelectedId(newId);
      setBody(data.body);
      setEffectiveDate(data.effectiveDate);
      setVersionNumber(data.versionNumber);
      setVersionLabel(data.versionLabel);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Version meta + switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 pb-6 border-b border-stone-100">
        <div className="space-y-0.5">
          <p className="text-sm text-stone-500">
            Senast uppdaterad:{" "}
            <span className="text-stone-700 font-medium">{effectiveDate}</span>
          </p>
          <p className="text-sm text-stone-500">
            Version{" "}
            <span className="text-stone-700 font-medium">
              {versionNumber}{versionLabel ? ` — ${versionLabel}` : ""}
            </span>
          </p>
        </div>

        {versions.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="privacy-version-select" className="text-xs text-stone-500 whitespace-nowrap">
              Visa version:
            </label>
            <select
              id="privacy-version-select"
              value={selectedId}
              onChange={(e) => handleVersionChange(e.target.value)}
              disabled={loading}
              className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.versionNumber}{v.versionLabel ? ` — ${v.versionLabel}` : ""} ({v.effectiveDate})
                </option>
              ))}
            </select>
            {loading && (
              <span className="text-xs text-stone-400 animate-pulse">Laddar…</span>
            )}
          </div>
        )}
      </div>

      {fetchError && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Det gick inte att hämta den valda versionen. Försök igen.
        </div>
      )}

      {/* Policy body */}
      <div
        className="prose prose-stone max-w-none text-stone-600 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(body) }}
      />
    </div>
  );
}
