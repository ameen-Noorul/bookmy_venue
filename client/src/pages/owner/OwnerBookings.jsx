import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CalendarDays, Users, MapPin, SearchX, Mail, Phone, Inbox } from 'lucide-react';

// Accept whichever shape the API returns: a bare array or { data: [...] }.
const extractBookings = (body) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.bookings)) return body.data.bookings;
  if (Array.isArray(body?.bookings)) return body.bookings;
  return [];
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const money = (n) => (n == null || n === '' ? '—' : `₹${Number(n).toLocaleString('en-IN')}`);

const STATUS = {
  PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' },
  CANCELLED: { label: 'Cancelled', className: 'bg-muted text-muted-foreground hover:bg-muted' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS[status] ?? {
    label: String(status ?? 'Unknown').toLowerCase(),
    className: 'bg-muted text-muted-foreground hover:bg-muted',
  };
  return <Badge className={`font-medium capitalize ${s.className}`}>{s.label}</Badge>;
};

const OwnerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    api
      .get('/bookings/owner')
      .then((res) => {
        if (!cancelled) setBookings(extractBookings(res.data));
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Booking requests</h1>
        <p className="mt-1 text-muted-foreground">Bookings made on your venues.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <SearchX className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">We couldn't load booking requests.</p>
          <p className="mb-4 text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </Button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No booking requests yet.</p>
          <p className="text-sm text-muted-foreground">They'll appear here when customers book your venues.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const venueName = b.venue?.name ?? 'Venue';
            const customerName = b.user?.name ?? 'Customer';
            return (
              <Card key={b.id} className="gap-0 border-0 py-0 shadow-sm ring-1 ring-black/5">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold">{venueName}</h2>
                      <StatusBadge status={b.status} />
                    </div>
                    {b.venue?.city && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {b.venue.city}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(b.eventDate)}
                        {b.eventEndDate && b.eventEndDate !== b.eventDate && ` to ${formatDate(b.eventEndDate)}`}
                      </span>
                      {b.guestCount != null && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> {b.guestCount} guests
                        </span>
                      )}
                      {b.eventType && <span>{b.eventType}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 space-y-1.5 text-left sm:text-right">
                    <p className="text-sm font-medium">{customerName}</p>
                    {b.user?.email && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground sm:justify-end">
                        <Mail className="h-3.5 w-3.5" /> {b.user.email}
                      </p>
                    )}
                    {b.user?.phone && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground sm:justify-end">
                        <Phone className="h-3.5 w-3.5" /> {b.user.phone}
                      </p>
                    )}
                    <p className="pt-1 text-lg font-semibold">{money(b.ownerAmount)}</p>
                    <p className="text-xs text-muted-foreground">Your share</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OwnerBookings;