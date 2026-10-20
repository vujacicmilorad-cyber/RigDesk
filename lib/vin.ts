export type VinDecodeResult = {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  engine: string | null;
  bodyClass: string | null;
  error?: string;
};

type NhtsaResult = {
  Variable: string;
  Value: string | null;
};

type NhtsaResponse = {
  Results?: NhtsaResult[];
};

function pick(results: NhtsaResult[], name: string): string | null {
  const row = results.find((r) => r.Variable === name);
  const v = row?.Value?.trim();
  return v && v !== "Not Applicable" ? v : null;
}

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const cleaned = vin.trim().toUpperCase();
  if (cleaned.length !== 17) {
    return {
      vin: cleaned,
      year: null,
      make: null,
      model: null,
      engine: null,
      bodyClass: null,
      error: "VIN must be 17 characters",
    };
  }

  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(cleaned)}?format=json`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    return {
      vin: cleaned,
      year: null,
      make: null,
      model: null,
      engine: null,
      bodyClass: null,
      error: "NHTSA lookup failed",
    };
  }

  const data = (await res.json()) as NhtsaResponse;
  const results = data.Results ?? [];
  const yearRaw = pick(results, "Model Year");
  const make = pick(results, "Make");
  const model = pick(results, "Model");
  const engine =
    pick(results, "Engine Model") ??
    pick(results, "DisplacementL") ??
    pick(results, "Engine Configuration");
  const bodyClass = pick(results, "Body Class");
  const errorText = pick(results, "Error Text");

  return {
    vin: cleaned,
    year: yearRaw ? Number(yearRaw) : null,
    make,
    model,
    engine,
    bodyClass,
    error:
      errorText && !errorText.startsWith("0 -")
        ? errorText
        : make || model
          ? undefined
          : "No vehicle data returned for this VIN",
  };
}

export function guessTruckType(
  bodyClass: string | null,
): "sleeper" | "day_cab" | "box_truck" | "trailer" {
  const b = (bodyClass ?? "").toLowerCase();
  if (b.includes("trailer")) return "trailer";
  if (b.includes("van") || b.includes("box")) return "box_truck";
  if (b.includes("sleeper") || b.includes("tractor")) return "sleeper";
  return "day_cab";
}
