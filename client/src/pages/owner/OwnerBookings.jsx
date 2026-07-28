import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar, Users, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
  COMPLETED: 'bg-indigo-100 text-indigo-700',
};

const OwnerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    const res = await api.get('/bookings/owner');
    setBookings(res.data.data.bookings);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleConfirm = async (id) => {
    try {
      await api.patch(`/bookings/${id}/confirm`);
      toast.success('Booking confirmed');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Confirm failed');
    }
  };

  const handleReject = async () => {
    try {
      await api.patch(`/bookings/${rejectTarget}/reject`, { ownerNote: rejectNote });
      toast.success('Booking rejected');
      setRejectTarget(null);
      setRejectNote('');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reject failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Booking Requests</h1>

      {loading ? (
        <div className="space-y-4">{[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No booking requests yet.</div>
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
                      <Calendar className="h-3.5 w-3.5" /> {format(new Date(b.eventDate), 'PPP')} • {b.eventType}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Users className="h-3.5 w-3.5" /> {b.guestCount} guests
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Mail className="h-3.5 w-3.5" /> {b.user.email}</p>
                    {b.user.phone && <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Phone className="h-3.5 w-3.5" /> {b.user.phone}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{Number(b.totalAmount).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">You earn ₹{Number(b.ownerAmount).toLocaleString()}</p>

                    {b.status === 'PENDING' && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleConfirm(b.id)}>
                          Confirm
                        </Button>
                        <Dialog open={rejectTarget === b.id} onOpenChange={(open) => setRejectTarget(open ? b.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200">Reject</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Reject booking</DialogTitle></DialogHeader>
                            <Textarea placeholder="Reason for rejection (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                            <DialogFooter>
                              <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerBookings;