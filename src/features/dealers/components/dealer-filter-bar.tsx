"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

type RegionOption = { id: string; slug: string; name: string };
type CityOption = { slug: string; name: string; regionId: string };

type DealerFilterBarProps = {
  regions: RegionOption[];
  cities: CityOption[];
  values: { q?: string; region?: string; city?: string };
};

export function DealerFilterBar({ regions, cities, values }: DealerFilterBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(values.q ?? "");
  const [region, setRegion] = useState(values.region ?? "");
  const [city, setCity] = useState(values.city ?? "");
  const regionId = regions.find((option) => option.slug === region)?.id;
  const regionCities = regionId ? cities.filter((option) => option.regionId === regionId) : [];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (region) params.set("region", region);
    if (region && city) params.set("city", city);
    startTransition(() => router.push(params.size > 0 ? `/dilari?${params}` : "/dilari"));
  }

  return (
    <form
      action="/dilari"
      method="get"
      role="search"
      aria-label="Търсене на дилъри"
      onSubmit={onSubmit}
      className="grid gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_200px_200px_auto]"
    >
      <div className="sm:col-span-2 lg:col-span-1">
        <label htmlFor="dealer-q" className="sr-only">
          Име на дилър
        </label>
        <Input id="dealer-q" name="q" type="search" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Име на дилър" maxLength={80} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="dealer-region" className="sr-only">
          Област
        </label>
        <Select
          id="dealer-region"
          name="region"
          value={region}
          onChange={(event) => {
            setRegion(event.target.value);
            setCity("");
          }}
        >
          <option value="">Всички области</option>
          {regions.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="dealer-city" className="sr-only">
          Град
        </label>
        <Select id="dealer-city" name="city" value={city} onChange={(event) => setCity(event.target.value)} disabled={!regionId}>
          <option value="">{regionId ? "Всички градове" : "Първо избери област"}</option>
          {regionCities.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" pending={pending} icon={<Search className="size-4" aria-hidden="true" />} className="sm:col-span-2 lg:col-span-1">
        Търси
      </Button>
    </form>
  );
}
