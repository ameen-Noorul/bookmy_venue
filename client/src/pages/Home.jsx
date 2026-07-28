import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Users, IndianRupee } from 'lucide-react';

const Home = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ city: '', minCapacity: '', maxPrice: '' });

  const fetchVenues = async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get('/venues', { params });
      setVenues(res.data.data.venues);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (filters.city) params.city = filters.city;
    if (filters.minCapacity) params.minCapacity = filters.minCapacity;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    fetchVenues(params);
  };

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-rose-600 to-rose-700 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Find the perfect venue for your event
          </h1>
          <p className="text-rose-100 text-lg mb-8">
            Weddings, birthdays, corporate events — book trusted halls in seconds
          </p>

          <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-3 flex flex-col md:flex-row gap-2">
            <div className="flex-1 flex items-center gap-2 px-3">
              <MapPin className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="City (e.g. Thrissur)"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 md:border-l">
              <Users className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Min guests"
                type="number"
                value={filters.minCapacity}
                onChange={(e) => setFilters({ ...filters, minCapacity: e.target.value })}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 md:border-l">
              <IndianRupee className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Max budget/day"
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 px-6">
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="text-xl font-semibold mb-6">
          {venues.length > 0 ? `${venues.length} venues available` : 'Browse venues'}
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No venues found. Try adjusting your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue) => (
              <Link key={venue.id} to={`/venues/${venue.id}`}>
                <Card className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer h-full">
                  <div className="h-48 bg-gray-200 relative">
                    {venue.photos?.[0] ? (
                      <img src={venue.photos[0]} alt={venue.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">No photo</div>
                    )}
                    <Badge className="absolute top-3 right-3 bg-white text-gray-800">
                      ₹{Number(venue.pricePerDay).toLocaleString()}/day
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg truncate">{venue.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5" /> {venue.city}, {venue.state}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Users className="h-3.5 w-3.5" /> Up to {venue.capacity} guests
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;