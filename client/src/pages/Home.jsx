import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  MapPin,
  Users,
  IndianRupee,
  ImageOff,
  SearchX,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 12; // API maximum is 50
const EMPTY_FILTERS = { city: '', minCapacity: '', maxPrice: '' };
const QUICK_CITIES = ['Kochi', 'Thrissur', 'Kozhikode', 'Munnar'];

const Home = () => {
  const [draft, setDraft] = useState(EMPTY_FILTERS); // what the user is typing
  const [applied, setApplied] = useState(EMPTY_FILTERS); // what the list shows
  const [page, setPage] = useState(1);

  const [venues, setVenues] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const params = { page, limit: PAGE_SIZE };
    if (applied.city.trim()) params.city = applied.city.trim();
    if (applied.minCapacity) params.minCapacity = applied.minCapacity;
    if (applied.maxPrice) params.maxPrice = applied.maxPrice;

    setLoading(true);
    setError(false);

    api
      .get('/venues', { params })
      .then((res) => {
        if (cancelled) return;
        const body = res.data;
        // Handles both { data: { venues } } and { venues } response shapes.
        const list = body.data?.venues ?? body.venues ?? [];
        const pg = body.data?.pagination ?? body.pagination;
        setVenues(list);
        setTotalPages(pg?.totalPages ?? 1);
        setTotal(pg?.total ?? list.length);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, applied]);

  const handleSearch = (e) => {
    e.preventDefault();
    setApplied({ ...draft });
    setPage(1);
  };

  const handleClear = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
  };

  const handleQuickCity = (city) => {
    const next = { ...draft, city };
    setDraft(next);
    setApplied(next);
    setPage(1);
  };

  const goToPage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasFilters = Object.values(applied).some((v) => String(v).trim() !== '');

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 px-6 py-16 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
            Find the perfect venue for your event
          </h1>
          <p className="mb-8 text-lg text-indigo-100">
            Weddings, birthdays and corporate events. Book trusted halls in minutes.
          </p>

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-2 rounded-2xl bg-white p-2 text-foreground shadow-2xl ring-1 ring-black/5 md:flex-row"
          >
            <label className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 focus-within:bg-muted/60">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="City, e.g. Kochi"
                value={draft.city}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </label>
            <label className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 focus-within:bg-muted/60">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Min guests"
                type="number"
                min="0"
                value={draft.minCapacity}
                onChange={(e) => setDraft({ ...draft, minCapacity: e.target.value })}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </label>
            <label className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 focus-within:bg-muted/60">
              <IndianRupee className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                placeholder="Max budget per day"
                type="number"
                min="0"
                value={draft.maxPrice}
                onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </label>
            <Button type="submit" className="h-11 px-6">
              <Search className="mr-2 h-4 w-4" /> Search
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-indigo-200">Popular:</span>
            {QUICK_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handleQuickCity(city)}
                className="rounded-full bg-white/10 px-3 py-1 font-medium text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {loading
                ? 'Finding venues…'
                : total > 0
                  ? `${total.toLocaleString()} ${total === 1 ? 'venue' : 'venues'} available`
                  : 'No venues found'}
            </h2>
            {hasFilters && (
              <p className="mt-1 text-sm text-muted-foreground">
                Filtered results.{' '}
                <button onClick={handleClear} className="font-medium text-primary hover:underline">
                  Clear filters
                </button>
              </p>
            )}
          </div>
          {!loading && totalPages > 1 && (
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-xl bg-card ring-1 ring-black/5">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <div className="space-y-3 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
            <SearchX className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">We couldn't load venues.</p>
            <p className="mb-4 text-sm text-muted-foreground">Check that the API is running, then try again.</p>
            <Button variant="outline" onClick={() => setApplied({ ...applied })}>
              Try again
            </Button>
          </div>
        ) : venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
            <SearchX className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No venues match your search.</p>
            <p className="mb-4 text-sm text-muted-foreground">Try a different city or a higher budget.</p>
            {hasFilters && (
              <Button variant="outline" onClick={handleClear}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {venues.map((venue) => {
                const photo = venue.photos?.[0];
                return (
                  <Link
                    key={venue.id}
                    to={`/venues/${venue.id}`}
                    className="group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Card className="h-full gap-0 overflow-hidden border-0 py-0 shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <ImageOff className="h-8 w-8 opacity-40" />
                        </div>
                        {photo && (
                          <img
                            src={photo}
                            alt={venue.name}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                            className="relative h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        )}
                        <Badge className="absolute right-3 top-3 bg-white/95 text-foreground shadow-sm hover:bg-white">
                          ₹{Number(venue.pricePerDay).toLocaleString('en-IN')}
                          <span className="ml-1 font-normal text-muted-foreground">/ day</span>
                        </Badge>
                      </div>
                      <CardContent className="space-y-2 p-4">
                        <h3 className="truncate text-lg font-semibold">{venue.name}</h3>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {venue.city}
                            {venue.state ? `, ${venue.state}` : ''}
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          Up to {venue.capacity} guests
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Home;