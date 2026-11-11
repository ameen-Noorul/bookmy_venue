import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Users, IndianRupee, SearchX, MapPin, XCircle } from 'lucide-react';
import { toast } from 'sonner';

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

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  CANCELLED: 'bg-muted text-muted-foreground hover:bg-muted',
  REJECTED: 'bg-red-100 text-red-800 hover:bg-red-100',
};

const StatusBadge = ({ status }) => (
  <Badge className={`font-medium capitalize ${STATUS_STYLES[status] ?? 'bg-muted text-muted-foreground hover:bg-muted'}`}>
    {String(status ?? 'unknown').toLowerCase()}
  </Badge>
);

// A booking can be cancelled only if it is active and its start date is still in the future.
const canCancel = (b) => {
  if (b.status !== 'CONFIRMED' && b.status !== 'PENDING') return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return new Date(b.eventDate) > today;
};

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    api
      .get('/bookings/mine')
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

  const handleCancel = async (b) => {
    if (!window.confirm('Cancel this booking? The dates will be released.')) return;

    setCancellingId(b.id);
    try {
      await api.delete(`/bookings/${b.id}`);
      setBookings((prev) => prev.map((x) => (x.id === b.id ? { ...x, status: 'CANCELLED' } : x)));
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Could not cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My bookings</h1>
        <p className="mt-1 text-muted-foreground">Track your venue requests and confirmations.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <SearchX className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">We couldn't load your bookings.</p>
          <p className="mb-4 text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
            Try again
          </Button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No bookings yet.</p>
          <p className="mb-4 text-sm text-muted-foreground">Find a venue and send your first request.</p>
          <Button asChild variant="outline">
            <Link to="/">Browse venues</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const venueName = b.venue?.name ?? 'Venue booking';
            const city = b.venue?.city;
            return (
              <Card key={b.id} className="gap-0 border-0 py-0 shadow-sm ring-1 ring-black/5">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold">{venueName}</h2>
                      <StatusBadge status={b.status} />
                    </div>
                    {city && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {city}
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

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="flex items-center gap-1 text-lg font-semibold">
                      <IndianRupee className="h-4 w-4" />
                      {money(b.totalAmount).replace('₹', '')}
                    </p>
                    <div className="flex items-center gap-3">
                      {b.venueId && (
                        <Link to={`/venues/${b.venueId}`} className="text-sm font-medium text-primary hover:underline">
                          View venue
                        </Link>
                      )}
                      {canCancel(b) && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={cancellingId === b.id}
                          onClick={() => handleCancel(b)}
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          {cancellingId === b.id ? 'Cancelling…' : 'Cancel'}
                        </Button>
                      )}
                    </div>
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

export default MyBookings;