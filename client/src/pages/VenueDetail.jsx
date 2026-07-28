import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { MapPin, Users, IndianRupee, Phone, Mail, Star } from 'lucide-react';
import { toast } from 'sonner';

const VenueDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    eventDate: '', eventEndDate: '', eventType: '', guestCount: '',
  });

  useEffect(() => {
    api.get(`/venues/${id}`).then((res) => {
      setVenue(res.data.data.venue);
      setLoading(false);
    });
  }, [id]);

  const handleBook = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login to book a venue');
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/bookings', { venueId: id, ...form, guestCount: Number(form.guestCount) });
      toast.success('Booking request sent! Awaiting owner approval.');
      setBookingOpen(false);
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-4">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!venue) return <div className="text-center py-20">Venue not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="h-96 rounded-xl bg-gray-200 overflow-hidden mb-6">
        {venue.photos?.[0] ? (
          <img src={venue.photos[0]} alt={venue.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">No photo available</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold">{venue.name}</h1>
          <p className="text-gray-500 flex items-center gap-1 mt-2">
            <MapPin className="h-4 w-4" /> {venue.address}, {venue.city}, {venue.state} - {venue.pincode}
          </p>

          <div className="flex gap-3 mt-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Up to {venue.capacity} guests
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5" /> {Number(venue.pricePerDay).toLocaleString()}/day
            </Badge>
          </div>

          <p className="text-gray-700 mt-6 leading-relaxed">{venue.description}</p>

          {venue.amenities?.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {venue.amenities.map((a, i) => <Badge key={i} variant="outline">{a}</Badge>)}
              </div>
            </div>
          )}

          {venue.rules && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Venue Rules</h3>
              <p className="text-gray-600 text-sm">{venue.rules}</p>
            </div>
          )}

          {venue.reviews?.length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-3">Reviews</h3>
              <div className="space-y-3">
                {venue.reviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{r.user.name}</span>
                        <span className="flex items-center text-amber-500 text-sm">
                          <Star className="h-3.5 w-3.5 fill-amber-500" /> {r.rating}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{r.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <Card className="sticky top-20">
            <CardContent className="p-5">
              <p className="text-2xl font-bold">₹{Number(venue.pricePerDay).toLocaleString()}<span className="text-sm text-gray-500 font-normal"> /day</span></p>

              <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-rose-600 hover:bg-rose-700 mt-4">Request to Book</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Book {venue.name}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBook} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Event Type</Label>
                      <Input required placeholder="Wedding, Birthday, Corporate..." value={form.eventType}
                        onChange={(e) => setForm({ ...form, eventType: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" required value={form.eventDate}
                          onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input type="date" required value={form.eventEndDate}
                          onChange={(e) => setForm({ ...form, eventEndDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Guest Count</Label>
                      <Input type="number" required max={venue.capacity} placeholder={`Max ${venue.capacity}`}
                        value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={submitting}>
                        {submitting ? 'Sending request...' : 'Send Booking Request'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="mt-5 pt-5 border-t space-y-2">
                <p className="text-sm font-medium">Hosted by {venue.owner?.name}</p>
                {venue.owner?.email && (
                  <p className="text-sm text-gray-500 flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{venue.owner.email}</p>
                )}
                {venue.owner?.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{venue.owner.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VenueDetail;