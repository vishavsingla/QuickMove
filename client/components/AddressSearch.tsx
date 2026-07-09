"use client";

import { useEffect, useRef, useState } from "react";
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
}: {
  label: string;
  placeholder?: string;
  value: PlaceResult | null;
  onSelect: (place: PlaceResult) => void;
}) {
  const [query, setQuery] = useState(value?.displayName ?? "");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setQuery(value.displayName);
  }, [value]);

  useEffect(() => {
    if (query.trim().length < 3 || value?.displayName === query) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchPlaces(query);
        setResults(res.results);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="space-y-1.5" ref={boxRef}>
      <Label>{label}</Label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder={placeholder}
          className="pl-9"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
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
                onClick={() => {
                  onSelect(r);
                  setQuery(r.displayName);
                  setOpen(false);
                }}
              >
                {r.displayName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
