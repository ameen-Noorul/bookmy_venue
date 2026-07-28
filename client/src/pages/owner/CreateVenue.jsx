import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const CreateVenue = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', address: '', city: '', state: '', pincode: '',
    capacity: '', pricePerDay: '', amenities: '', photos: '', rules: '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        pricePerDay: Number(form.pricePerDay),
        amenities: form.amenities ? form.amenities.split(',').map((a) => a.trim()) : [],
        photos: form.photos ? form.photos.split(',').map((p) => p.trim()) : [],
      };
      await api.post('/venues', payload);
      toast.success('Venue created as draft. Add photos, then submit for review.');
      navigate('/owner/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create venue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>List a New Venue</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Venue Name</Label>
              <Input name="name" required value={form.name} onChange={handleChange} placeholder="Grand Pearl Convention Hall" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe your venue..." />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input name="address" required value={form.address} onChange={handleChange} placeholder="123 MG Road" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input name="city" required value={form.city} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input name="state" required value={form.state} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input name="pincode" required value={form.pincode} onChange={handleChange} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Capacity (guests)</Label>
                <Input name="capacity" type="number" required value={form.capacity} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label>Price per day (₹)</Label>
                <Input name="pricePerDay" type="number" required value={form.pricePerDay} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Amenities (comma separated)</Label>
              <Input name="amenities" value={form.amenities} onChange={handleChange} placeholder="Parking, AC, Catering, Stage" />
            </div>
            <div className="space-y-2">
              <Label>Photo URLs (comma separated)</Label>
              <Input name="photos" value={form.photos} onChange={handleChange} placeholder="https://example.com/hall1.jpg" />
              <p className="text-xs text-gray-400">At least one photo is required before you can submit for review.</p>
            </div>
            <div className="space-y-2">
              <Label>Rules (optional)</Label>
              <Textarea name="rules" value={form.rules} onChange={handleChange} placeholder="No loud music after 10 PM..." />
            </div>
            <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Venue (as Draft)'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateVenue;