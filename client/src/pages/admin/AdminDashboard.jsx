import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { MapPin, Users, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [venues, setVenues] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);

  const fetchPending = async () => {
    setLoadingVenues(true);
    const res = await api.get('/venues/admin/pending');
    setVenues(res.data.data.venues);
    setLoadingVenues(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const res = await api.get('/users');
    setUsers(res.data.data.users);
    setLoadingUsers(false);
  };

  useEffect(() => { fetchPending(); fetchUsers(); }, []);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/venues/${id}/approve`);
      toast.success('Venue approved — now live');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approve failed');
    }
  };

  const handleReject = async () => {
    try {
      await api.patch(`/venues/${rejectTarget}/reject`, { reason: rejectNote });
      toast.success('Venue rejected, sent back to owner');
      setRejectTarget(null);
      setRejectNote('');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reject failed');
    }
  };

  const handleBan = async (id, isBanned) => {
    try {
      await api.patch(`/users/${id}/ban`, { isBanned: !isBanned });
      toast.success(!isBanned ? 'User banned' : 'User unbanned');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.patch(`/users/${id}/role`, { role });
      toast.success(`Role updated to ${role}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Role change failed');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      <Tabs defaultValue="venues">
        <TabsList>
          <TabsTrigger value="venues">Pending Venues ({venues.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="venues" className="mt-6">
          {loadingVenues ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
            </div>
          ) : venues.length === 0 ? (
            <p className="text-gray-500 text-center py-16">No venues awaiting review.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{v.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="h-3.5 w-3.5" />{v.city}, {v.state}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Users className="h-3.5 w-3.5" />{v.capacity} guests</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><IndianRupee className="h-3.5 w-3.5" />{Number(v.pricePerDay).toLocaleString()}/day</p>
                    <p className="text-xs text-gray-400 mt-2">Owner: {v.owner.name} ({v.owner.email})</p>

                    <div className="flex gap-2 mt-4">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-1" onClick={() => handleApprove(v.id)}>
                        Approve
                      </Button>
                      <Dialog open={rejectTarget === v.id} onOpenChange={(open) => setRejectTarget(open ? v.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 flex-1">Reject</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Reject venue</DialogTitle></DialogHeader>
                          <Textarea placeholder="Reason (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                          <DialogFooter>
                            <Button variant="destructive" onClick={handleReject}>Confirm Rejection</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          {loadingUsers ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.name || '—'}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.isBanned ? <Badge className="bg-red-100 text-red-700">Banned</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {u.role === 'USER' && (
                            <Button size="sm" variant="outline" onClick={() => handleRoleChange(u.id, 'OWNER')}>Make Owner</Button>
                          )}
                          <Button size="sm" variant="outline" className={u.isBanned ? 'text-emerald-600' : 'text-red-600'} onClick={() => handleBan(u.id, u.isBanned)}>
                            {u.isBanned ? 'Unban' : 'Ban'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;