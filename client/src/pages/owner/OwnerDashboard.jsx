import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, MapPin, Users, IndianRupee, CalendarClock, ImageOff, SearchX, Clock,
} from 'lucide-react';

const STATUS = {
  ACTIVE: { label: 'Live', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  PENDING_REVIEW: { label: 'Pending review', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground hover:bg-muted' },
  SUSPENDED: { label: 'Suspended', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
};

const extractVenues = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.venues)) return body.data.venues;
  if (Array.isArray(body?.venues)) return body.venues;
  return [];
};

const money = (n) => (n == null || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);

const OwnerDashboard = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    api
      .get('/venues/mine')
      .then((res) => {
        if (!cancelled) setVenues(extractVenues(res.data));
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
  }, [reloadKey]);

  const pendingCount = venues.filter((v) => v.status === 'PENDING_REVIEW').length;
  const liveCount = venues.filter((v) => v.status === 'ACTIVE').length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My venues</h1>
          <p className="mt-1 text-muted-foreground">
            {loading
              ? 'Loading your listings…'
              : `${venues.length} ${venues.length === 1 ? 'listing' : 'listings'} · ${liveCount} live · ${pendingCount} pending review`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/owner/bookings">
              <CalendarClock className="mr-2 h-4 w-4" /> Booking requests
            </Link>
          </Button>
          <Button asChild>
            <Link to="/owner/venues/new">
              <Plus className="mr-2 h-4 w-4" /> Add venue
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl bg-card ring-1 ring-black/5">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <SearchX className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">We couldn't load your venues.</p>
          <p className="mb-4 text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </Button>
        </div>
      ) : venues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Plus className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">You haven't listed a venue yet.</p>
          <p className="mb-4 text-sm text-muted-foreground">Add your hall, lawn or banquet to start taking bookings.</p>
          <Button asChild>
            <Link to="/owner/venues/new">List your first venue</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((v) => {
            const status = STATUS[v.status] ?? { label: String(v.status ?? 'Unknown').toLowerCase(), className: 'bg-muted text-muted-foreground hover:bg-muted' };
            const photo = v.photos?.[0];
            return (
              <Card key={v.id} className="gap-0 overflow-hidden border-0 py-0 shadow-sm ring-1 ring-black/5 transition hover:shadow-lg">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <ImageOff className="h-8 w-8 opacity-40" />
                  </div>
                  {photo && (
                    <img
                      src={photo}
                      alt={v.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="relative h-full w-full object-cover"
                    />
                  )}
                  <Badge className={`absolute left-3 top-3 shadow-sm ${status.className}`}>{status.label}</Badge>
                </div>
                <CardContent className="space-y-2 p-4">
                  <h3 className="truncate text-lg font-semibold">{v.name}</h3>
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{v.city}{v.state ? `, ${v.state}` : ''}</span>
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {v.capacity} guests</span>
                    <span className="flex items-center gap-1.5"><IndianRupee className="h-3.5 w-3.5" /> {money(v.pricePerDay).replace('₹', '')}/day</span>
                  </div>
                  {v.status === 'PENDING_REVIEW' && (
                    <p className="flex items-center gap-1.5 pt-2 text-xs text-amber-700">
                      <Clock className="h-3.5 w-3.5" /> Waiting for admin approval
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;