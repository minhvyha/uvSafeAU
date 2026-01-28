"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UVGauge } from "@/components/uv-gauge";
import { TimeToBurnTimer } from "@/components/time-to-burn-timer";
import { SkinTypeSelector, skinTypes } from "@/components/skin-type-selector";
import { LocationSelector } from "@/components/location-selector";
import {
  Sun,
  Info,
  RefreshCw,
  Clock,
  Sunrise,
  Sunset,
  AlertCircle,
  Shield,
  Glasses,
  CircleDot,
  Umbrella,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

// --- Types ---
interface SunPosition {
  azimuth: number;
  altitude: number;
}

interface UVForecastPoint {
  uv: number;
  uv_time: string;
  sun_position?: SunPosition;
}

interface UVApiResponse {
  success: boolean;
  result?: {
    uv: number;
    uv_max: number;
    uv_max_time: string;
    uv_time: string;
    ozone: number;
    safe_exposure_time: {
      st1: number | null;
      st2: number | null;
      st3: number | null;
      st4: number | null;
      st5: number | null;
      st6: number | null;
    };
    sun_info: {
      sun_times: {
        sunrise: string;
        sunset: string;
        solarNoon: string;
      };
    };
    // result.forecast may or may not exist depending on API
    forecast?: any[];
  };
  // sometimes the API returns forecast at the top-level
  forecast?: any[];
  error?: string;
}

export default function Dashboard() {
  const [selectedSkinType, setSelectedSkinType] = useState(3);
  const [uvIndex, setUvIndex] = useState(0);
  const [uvMax, setUvMax] = useState(0);
  const [uvMaxTime, setUvMaxTime] = useState("");
  const [safeExposureTimes, setSafeExposureTimes] = useState<
    Record<string, number | null>
  >({});
  const [sunInfo, setSunInfo] = useState<{
    sunrise: string;
    sunset: string;
    solarNoon: string;
  } | null>(null);
  const [forecast, setForecast] = useState<UVForecastPoint[]>([]);
  const [location, setLocation] = useState("Sydney, NSW");
  const [locationData, setLocationData] = useState({
    city: "Sydney",
    state: "NSW",
    country: "Australia",
    lat: -33.8688,
    lon: 151.2093,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // helper to normalize a forecast point into UVForecastPoint
  const normalizePoint = (p: any): UVForecastPoint | null => {
    if (!p) return null;

    // Accept multiple keys for timestamp commonly seen in different APIs
    let ts = p.uv_time ?? p.time ?? p.timestamp ?? p.time_utc ?? null;

    // if numeric unix seconds or milliseconds
    if (typeof ts === "number") {
      // heuristics: if > 1e12 assume ms, if between 1e9 and 1e12 assume s
      if (ts > 1e12) ts = new Date(ts).toISOString();
      else if (ts > 1e9) ts = new Date(ts * 1000).toISOString();
      else ts = null;
    }

    // if string, ensure it parses into a valid ISO string
    if (typeof ts === "string") {
      // try to parse directly
      let parsed = new Date(ts);
      if (isNaN(parsed.getTime())) {
        // try forcing UTC by appending Z if no timezone present
        parsed = new Date(ts + "Z");
        if (isNaN(parsed.getTime())) return null;
      }
      ts = parsed.toISOString();
    }

    // uv value fallback (support strings, numbers)
    const uvVal = p.uv ?? p.value ?? p.UV ?? null;
    if (uvVal == null) return null;

    const uvNum = Number(uvVal);
    if (isNaN(uvNum)) return null;

    // optional sun position
    const sunPosRaw = p.sun_position ?? p.sunPosition ?? null;
    let sun_position: SunPosition | undefined;
    if (sunPosRaw && typeof sunPosRaw === "object") {
      const az = Number(sunPosRaw.azimuth ?? sunPosRaw.az ?? sunPosRaw.a);
      const alt = Number(sunPosRaw.altitude ?? sunPosRaw.alt ?? sunPosRaw.h);
      if (!isNaN(az) && !isNaN(alt)) {
        sun_position = { azimuth: az, altitude: alt };
      }
    }

    if (!ts) return null;

    return {
      uv: uvNum,
      uv_time: ts,
      ...(sun_position ? { sun_position } : {}),
    };
  };

  const fetchUVData = async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/uv?lat=${lat}&lng=${lng}`);
      const data: UVApiResponse & any = await response.json();

      console.log("Raw UV API response", data);

      if (data.success && data.result) {
        if (typeof data.result.uv === "number") setUvIndex(data.result.uv);
        if (typeof data.result.uv_max === "number")
          setUvMax(data.result.uv_max);
        if (typeof data.result.uv_max_time === "string")
          setUvMaxTime(data.result.uv_max_time);

        setSafeExposureTimes({
          st1: data.result.safe_exposure_time?.st1 ?? null,
          st2: data.result.safe_exposure_time?.st2 ?? null,
          st3: data.result.safe_exposure_time?.st3 ?? null,
          st4: data.result.safe_exposure_time?.st4 ?? null,
          st5: data.result.safe_exposure_time?.st5 ?? null,
          st6: data.result.safe_exposure_time?.st6 ?? null,
        });
        setSunInfo(data.result.sun_info?.sun_times ?? null);

        // accept forecast from either top-level or inside result
        const rawForecast = Array.isArray(data.forecast)
          ? data.forecast
          : Array.isArray(data.result?.forecast)
            ? data.result.forecast
            : null;

        if (Array.isArray(rawForecast)) {
          // normalize, filter out invalids, sort by time
          const normalized = rawForecast
            .map(normalizePoint)
            .filter((x): x is UVForecastPoint => x !== null);
          normalized.sort(
            (a, b) =>
              new Date(a.uv_time).getTime() - new Date(b.uv_time).getTime(),
          );
          console.debug("Normalized forecast points", normalized);
          setForecast(normalized);
        } else {
          console.debug("No forecast array in API response");
          setForecast([]);
        }

        setLastUpdated(new Date());
      } else if (data.forecast && Array.isArray(data.forecast)) {
        // sometimes the response is not marked success but returns forecast
        const normalized = data.forecast
          .map(normalizePoint)
          .filter((x: any): x is UVForecastPoint => x !== null);
        normalized.sort(
          (a, b) =>
            new Date(a.uv_time).getTime() - new Date(b.uv_time).getTime(),
        );
        setForecast(normalized);
        setLastUpdated(new Date());
      } else {
        setError(data.error || "Failed to fetch UV data");
      }
    } catch (err) {
      setError("Failed to connect to UV service");
      console.error("UV fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get next 24 hours of forecast data (returns up to 24 points)
  // Replace your getForecast24h implementation with this:
  const getForecast24h = () => {
    if (!forecast.length) return [];
    // assume forecast is time-ordered; if not, sort it first
    const sorted = [...forecast].sort(
      (a, b) => new Date(a.uv_time).getTime() - new Date(b.uv_time).getTime(),
    );
    return sorted.slice(0, 24);
  };
  const forecast24h = getForecast24h();

  // Prepare data for recharts

  const chartData = forecast24h.map((p) => {
    const date = new Date(p.uv_time);
    return {
      timeLabel: date.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      uv: Number(p.uv),
    };
  });

  // determine category name based on UV value
  const getCategory = (uv: number) => {
    if (uv < 3) return "low";
    if (uv < 6) return "moderate";
    if (uv < 8) return "high";
    if (uv < 11) return "veryHigh";
    return "extreme";
  };

  // map category to stroke hex colour
  const getColorForCategory = (cat: string) => {
    switch (cat) {
      case "low":
        return "#16a34a"; // green
      case "moderate":
        return "#f59e0b"; // amber
      case "high":
        return "#f97316"; // orange
      case "veryHigh":
        return "#ef4444"; // red
      case "extreme":
        return "#7c3aed"; // purple
      default:
        return "var(--accent)";
    }
  };

  // split the chartData into contiguous segments that share the same category
  // replace your splitIntoSegments with this
const splitIntoSegments = (data: { timeLabel: string; uv: number }[]) => {
  if (!data || data.length === 0) return [];

  const segments: { timeLabel: string; uv: number }[][] = [];
  let start = 0;
  let currentCat = getCategory(data[0].uv);

  for (let i = 1; i < data.length; i++) {
    const cat = getCategory(data[i].uv);
    if (cat !== currentCat) {
      // make the segment include the boundary point so the path is continuous
      const seg = data.slice(start, i + 1);

      // if this segment is a single point, merge it into previous segment
      // (or if no previous exists, keep it and we'll try to merge later)
      if (seg.length === 1) {
        if (segments.length > 0) {
          segments[segments.length - 1].push(seg[0]);
        } else {
          // no previous segment — try to extend seg with next point if present
          if (i + 1 < data.length) {
            seg.push(data[i + 1]);
            // skip the next point because we've consumed it in this segment
            i++;
          }
          segments.push(seg);
        }
      } else {
        segments.push(seg);
      }

      // start next segment after the boundary (avoid duplicating the boundary point)
      start = i + 1;
      currentCat = cat;
    }
  }

  // push last segment (if any)
  if (start < data.length) {
    const lastSeg = data.slice(start);
    if (lastSeg.length === 1 && segments.length > 0) {
      segments[segments.length - 1].push(lastSeg[0]);
    } else {
      segments.push(lastSeg);
    }
  }

  return segments;
};

  const lineSegments = splitIntoSegments(chartData);
  // Fetch UV data on mount and when location changes
  useEffect(() => {
    fetchUVData(locationData.lat, locationData.lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationData.lat, locationData.lon]);

  // Refresh UV data every 5 minutes
  useEffect(() => {
    const interval = setInterval(
      () => {
        fetchUVData(locationData.lat, locationData.lon);
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationData.lat, locationData.lon]);

  const handleLocationChange = (
    newLocation: string,
    data: {
      city: string;
      state: string;
      country: string;
      lat: number;
      lon: number;
    },
  ) => {
    setLocation(newLocation);
    setLocationData(data);
  };

  // Calculate time to burn based on skin type and UV index
  const calculateTimeToBurn = () => {
    const skinTypeData = skinTypes.find((s) => s.type === selectedSkinType);
    if (!skinTypeData || uvIndex === 0) return 60; // default 60 minutes

    // Formula: Minutes to Burn = Skin Type Constant / UV Index
    const minutes = Math.floor(skinTypeData.constant / uvIndex);
    return Math.max(5, minutes); // Minimum 5 minutes
  };

  const timeToBurn = calculateTimeToBurn();

  // Get API-provided safe exposure time based on skin type
  const getApiSafeExposureTime = () => {
    const key = `st${selectedSkinType}`;
    return safeExposureTimes[key] ?? null;
  };

  const apiSafeExposureTime = getApiSafeExposureTime();

  // Format time for display
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--:--";
    }
  };

  // Get protection recommendations based on UV index
  const getProtectionRecommendations = () => {
    if (uvIndex < 3) {
      return {
        level: "Low",
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-950",
        borderColor: "border-emerald-200 dark:border-emerald-800",
        recommendations: [
          { icon: "sunglasses", text: "Sunglasses optional", required: false },
          {
            icon: "sunscreen",
            text: "SPF 15+ if sensitive skin",
            required: false,
          },
          { icon: "hat", text: "Hat optional", required: false },
          { icon: "shade", text: "No shade needed", required: false },
        ],
      };
    } else if (uvIndex < 6) {
      return {
        level: "Moderate",
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-950",
        borderColor: "border-amber-200 dark:border-amber-800",
        recommendations: [
          { icon: "sunglasses", text: "Wear sunglasses", required: true },
          {
            icon: "sunscreen",
            text: "Apply SPF 30+ sunscreen",
            required: true,
          },
          { icon: "hat", text: "Wear a hat", required: true },
          { icon: "shade", text: "Seek shade during midday", required: false },
        ],
      };
    } else if (uvIndex < 8) {
      return {
        level: "High",
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-950",
        borderColor: "border-orange-200 dark:border-orange-800",
        recommendations: [
          {
            icon: "sunglasses",
            text: "UV-blocking sunglasses essential",
            required: true,
          },
          {
            icon: "sunscreen",
            text: "Apply SPF 50+ every 2 hours",
            required: true,
          },
          { icon: "hat", text: "Wide-brim hat required", required: true },
          { icon: "shade", text: "Stay in shade 10am-4pm", required: true },
        ],
      };
    } else if (uvIndex < 11) {
      return {
        level: "Very High",
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950",
        borderColor: "border-red-200 dark:border-red-800",
        recommendations: [
          {
            icon: "sunglasses",
            text: "Maximum UV protection eyewear",
            required: true,
          },
          {
            icon: "sunscreen",
            text: "SPF 50+ reapply every 90 mins",
            required: true,
          },
          { icon: "hat", text: "Wide-brim hat + neck cover", required: true },
          { icon: "shade", text: "Avoid sun 10am-4pm", required: true },
        ],
      };
    } else {
      return {
        level: "Extreme",
        color: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-950",
        borderColor: "border-purple-200 dark:border-purple-800",
        recommendations: [
          {
            icon: "sunglasses",
            text: "Maximum UV protection eyewear",
            required: true,
          },
          { icon: "sunscreen", text: "SPF 50+ every hour", required: true },
          { icon: "hat", text: "Full coverage headwear", required: true },
          { icon: "shade", text: "Stay indoors if possible", required: true },
        ],
      };
    }
  };

  const protection = getProtectionRecommendations();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-accent p-2 rounded-xl">
                <Sun className="w-8 h-8 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  UV-Safe AU
                </h1>
                <p className="text-sm text-primary-foreground/80 mt-0.5">
                  Your Personal Sun Safety Companion
                </p>
              </div>
            </div>
            <LocationSelector
              currentLocation={location}
              onLocationChange={handleLocationChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="text-xs text-destructive/80">
                Using fallback calculations
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchUVData(locationData.lat, locationData.lon)}
              className="bg-transparent"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </div>
        )}

        {/* UV Index Gauge Section */}
        <section className="mb-8">
          <Card className="bg-card shadow-xl border-2 border-border p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  Current UV Index
                </h2>
                {lastUpdated && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated{" "}
                    {lastUpdated.toLocaleTimeString("en-AU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full bg-transparent"
                  onClick={() =>
                    fetchUVData(locationData.lat, locationData.lon)
                  }
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full bg-transparent"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        Real-time UV data from OpenUV API. Higher values
                        indicate greater risk of skin damage.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="flex justify-center">
              {isLoading ? (
                <div className="w-64 h-64 flex items-center justify-center">
                  <RefreshCw className="w-12 h-12 text-accent animate-spin" />
                </div>
              ) : (
                <UVGauge value={uvIndex} />
              )}
            </div>

            {/* UV Max and Sun Times */}
            {!isLoading && sunInfo && (
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-accent/10 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Sun className="w-4 h-4" />
                    <span>Max UV Today</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {uvMax.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    at {formatTime(uvMaxTime)}
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Sunrise className="w-4 h-4" />
                    <span>Sunrise</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatTime(sunInfo.sunrise)}
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Sun className="w-4 h-4" />
                    <span>Solar Noon</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatTime(sunInfo.solarNoon)}
                  </div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Sunset className="w-4 h-4" />
                    <span>Sunset</span>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {formatTime(sunInfo.sunset)}
                  </div>
                </div>
              </div>
            )}

            {/* UV Index Legend */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-emerald-600">0-2</div>
                <div className="text-xs font-medium text-muted-foreground mt-1">
                  Low
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-500">3-5</div>
                <div className="text-xs font-medium text-muted-foreground mt-1">
                  Moderate
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">6-7</div>
                <div className="text-xs font-medium text-muted-foreground mt-1">
                  High
                </div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">8-10</div>
                <div className="text-xs font-medium text-muted-foreground mt-1">
                  Very High
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Time to Burn Section */}
        <section className="mb-8">
          <TimeToBurnTimer
            minutes={apiSafeExposureTime || timeToBurn}
            skinType={selectedSkinType}
            isApiData={apiSafeExposureTime !== null}
          />
        </section>

        {/* Skin Type Selector */}
        <section className="mb-8">
          <Card className="bg-card shadow-xl border-2 border-border p-6">
            <SkinTypeSelector
              selectedType={selectedSkinType}
              onTypeChange={setSelectedSkinType}
            />
            <div className="mt-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground/90">
                  <strong>Fitzpatrick Skin Type:</strong> This classification
                  helps determine your sun sensitivity. Select your skin type
                  for accurate burn time calculations based on your natural skin
                  tone and sun reaction.
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Recommended Protection Section */}
        <section className="mb-8">
          <Card
            className={`shadow-xl border-2 p-6 ${protection.bgColor} ${protection.borderColor}`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-card p-3 rounded-lg shadow-sm">
                  <Shield className="w-6 h-6 text-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Recommended Protection
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Based on current UV level
                  </p>
                </div>
              </div>
              <Badge
                className={`text-sm px-3 py-1 ${protection.color} bg-card border`}
              >
                {protection.level} Risk
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {protection.recommendations.map((rec, index) => {
                const IconComponent =
                  rec.icon === "sunglasses"
                    ? Glasses
                    : rec.icon === "sunscreen"
                      ? CircleDot
                      : rec.icon === "hat"
                        ? Sun
                        : Umbrella;

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-4 rounded-lg bg-card shadow-sm ${
                      rec.required
                        ? "border-2 border-accent"
                        : "border border-border"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full ${rec.required ? "bg-accent/20" : "bg-muted"}`}
                    >
                      <IconComponent
                        className={`w-5 h-5 ${rec.required ? "text-accent" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${rec.required ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {rec.text}
                      </p>
                      {rec.required && (
                        <span className="text-xs text-accent font-semibold">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>

        {/* UV Forecast Trend Section - replaced with recharts area chart styled to match shadcn */}
        <section className="mb-8">
          <Card className="bg-card shadow-xl border-2 border-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-accent/10 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  UV Forecast Trend
                </h3>
                <p className="text-sm text-muted-foreground">Next 24 hours</p>
              </div>
            </div>

            {chartData.length > 0 ? (
              <>
                <div className="h-48 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                    >
                      <defs>
                        <linearGradient
                          id="uvGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--accent)"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--accent)"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis dataKey="timeLabel" tick={{ fontSize: 12 }} />
                      <YAxis
                        domain={[
                          0,
                          Math.max(...chartData.map((d) => d.uv), 11),
                        ]}
                        tick={{ fontSize: 12 }}
                      />
                      <ReTooltip
                        formatter={(value: any) =>
                          `${Number(value).toFixed(1)} UV`
                        }
                      />

                      {/* Reference lines */}
                      <ReferenceLine
                        y={3}
                        stroke="#65a30d"
                        strokeDasharray="3 3"
                      />
                      <ReferenceLine
                        y={6}
                        stroke="#d97706"
                        strokeDasharray="3 3"
                      />
                      <ReferenceLine
                        y={8}
                        stroke="#dc2626"
                        strokeDasharray="3 3"
                      />

                      {/* base area fill (single Area for smooth gradient) */}
                      <Area
                        type="monotone"
                        dataKey="uv"
                        stroke="none" // don't draw a competing stroke
                        fill="url(#uvGradient)"
                        fillOpacity={1}
                        isAnimationActive={false}
                        connectNulls={true}
                      />

                      {/* overlay colored strokes by segment */}
                      {lineSegments.map((seg, idx) =>
                        seg.length >= 2 ? (
                          <Line
                            key={idx}
                            data={seg}
                            type="monotone"
                            dataKey="uv"
                            stroke={getColorForCategory(getCategory(seg[0].uv))}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                            connectNulls={true}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null,
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* UV Level Reference */}
                <div className="flex flex-wrap justify-center gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">
                      Low (0-2)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs text-muted-foreground">
                      Moderate (3-5)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-xs text-muted-foreground">
                      High (6-7)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground">
                      Very High (8-10)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="text-xs text-muted-foreground">
                      Extreme (11+)
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                {isLoading ? (
                  <>
                    <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-sm">Loading forecast data...</p>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">Forecast data unavailable</p>
                    <p className="text-xs mt-1">
                      Try refreshing or changing location
                    </p>
                  </>
                )}
              </div>
            )}
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-primary-foreground/80">
            Stay sun-safe with UV-Safe AU. Always wear sunscreen and protective
            clothing.
          </p>
          <p className="text-xs text-primary-foreground/60 mt-2">
            UV data powered by OpenUV API • Location: {location}
            {lastUpdated &&
              ` • Last updated: ${lastUpdated.toLocaleTimeString("en-AU")}`}
          </p>
        </div>
      </footer>
    </div>
  );
}
