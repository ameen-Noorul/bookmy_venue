import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, MapPin, Users, IndianRupee, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-600',
  PENDING_REVIEW: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-red-100 text-red-700',
};

const OwnerDashboard = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVenues = async () => {
    setLoading(true);
    const res = await api.get('/venues/my');
    setVenues(res.data.data.venues);
    setLoading(false);
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleSubmit = async (id) => {
    try {
      await api.patch(`/venues/${id}/submit`);
      toast.success('Venue submitted for admin review');
      fetchVenues();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submit failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Venues</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your venue listings</p>
        </div>
        <div className="flex gap-3">
          <Link to="/owner/bookings">
            <Button variant="outline"><CalendarClock className="h-4 w-4 mr-2" />Booking Requests</Button>
          </Link>
          <Link to="/owner/venues/new">
            <Button className="bg-rose-600 hover:bg-rose-700"><Plus className="h-4 w-4 mr-2" />Add Venue</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : venues.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16 text-gray-500">
            <p className="mb-4">You haven't listed any venues yet.</p>
            <Link to="/owner/venues/new">
              <Button className="bg-rose-600 hover:bg-rose-700">List your first venue</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <div className="h-40 bg-gray-200">
                {v.photos?.[0] ? (
                  <img src={v.photos[0]} alt={v.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No photo</div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{v.name}</h3>
                  <Badge className={statusColors[v.status]}>{v.status.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{v.city}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Users className="h-3.5 w-3.5" />{v.capacity} guests</p>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><IndianRupee className="h-3.5 w-3.5" />{Number(v.pricePerDay).toLocaleString()}/day</p>

                {v.status === 'DRAFT' && (
                  <Button size="sm" className="w-full mt-3 bg-rose-600 hover:bg-rose-700" onClick={() => handleSubmit(v.id)}>
                    Submit for Review
                  </Button>
                )}
                {v.status === 'PENDING_REVIEW' && (
                  <p className="text-xs text-amber-600 mt-3 text-center">Waiting for admin approval</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;