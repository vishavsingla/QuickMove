"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { PlaceResult } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddressSearch({
  label,
  placeholder,
  value,
  onSelect,
  onFocusField,
}: {
  label: string;
  placeholder?: string;
  value: PlaceResult | null;
  onSelect: (place: PlaceResult) => void;
  onFocusField?: () => void;
}) {
  const [query, setQuery] = useState(value?.displayName ?? "");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.displayName);
  }, [value]);

  const runSearch = useCallback(async (text: string) => {
    const q = text.trim();
    if (q.length < 3) {
      setResults([]);
      setSearched(false);
      setError(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.searchPlaces(q);
      setResults(res.results);
      setSearched(true);
      setOpen(true);
      return res.results;
    } catch {
      setResults([]);
      setSearched(true);
      setError("Address search failed. Try again or pick on the map.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query.trim().length < 3 || value?.displayName === query) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }
    const t = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, value, runSearch]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (place: PlaceResult) => {
    onSelect(place);
    setQuery(place.displayName);
    setOpen(false);
    setSearched(false);
    setError(null);
  };

  const handleBlur = async () => {
    const q = query.trim();
    if (q.length < 3 || value?.displayName === q) return;
    const found = results.length ? results : await runSearch(q);
    if (found?.length) pick(found[0]);
    else if (!error) setError("No matching address — select a suggestion or click the map.");
  };

  return (
    <div className="space-y-1.5" ref={boxRef}>
      <Label>{label}</Label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder={placeholder}
          className="pl-9"
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          onFocus={() => {
            onFocusField?.();
            if (results.length) setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(handleBlur, 150);
          }}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover shadow-lg">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(r)}
              >
                {r.displayName}
              </button>
            ))}
          </div>
        )}
        {open && searched && !loading && results.length === 0 && !error && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
            No places found — try a city name or click the map.
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
