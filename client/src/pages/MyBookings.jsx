import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  COMPLETED: 'bg-indigo-100 text-indigo-700',
};

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    const res = await api.get('/bookings/my');
    setBookings(res.data.data.bookings);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      const res = await api.patch(`/bookings/${id}/cancel`);
      const refund = res.data.data.refund;
      toast.success(`Booking cancelled. Refund: ${refund.refundPercent}% (₹${refund.refundAmount})`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No bookings yet. Browse venues to get started.</div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <Card key={b.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{b.venue.name}</h3>
                      <Badge className={statusColors[b.status]}>{b.status}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {b.venue.city}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar className="h-3.5 w-3.5" /> {format(new Date(b.eventDate), 'PPP')} • {b.eventType}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Users className="h-3.5 w-3.5" /> {b.guestCount} guests
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{Number(b.totalAmount).toLocaleString()}</p>
                    {['PENDING', 'CONFIRMED'].includes(b.status) && (
                      <Button variant="outline" size="sm" className="mt-2 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleCancel(b.id)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
                {b.ownerNote && b.status === 'REJECTED' && (
                  <p className="text-sm text-red-600 mt-3 bg-red-50 p-2 rounded">Owner note: {b.ownerNote}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;