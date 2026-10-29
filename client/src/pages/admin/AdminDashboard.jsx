import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { MapPin, Users, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

const errMsg = (err, fallback) => err.response?.data?.error?.message || fallback;

const AdminDashboard = () => {
  const { user: me } = useAuth();

  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const fetchPending = useCallback(async () => {
    setLoadingVenues(true);
    try {
      const res = await api.get('/venues/pending');
      setVenues(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      toast.error(errMsg(err, 'Could not load pending venues'));
    } finally {
      setLoadingVenues(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await api.get('/users', { params: { page, limit: 20, ...(search ? { search } : {}) } });
      setUsers(Array.isArray(res.data.data) ? res.data.data : []);
      setPagination(res.data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      toast.error(errMsg(err, 'Could not load users'));
    } finally {
      setLoadingUsers(false);
    }
  }, [page, search]);

  useEffect(() => { fetchPending(); }, [fetchPending]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const review = async (id, status) => {
    try {
      await api.patch(`/venues/${id}/review`, { status });
      toast.success(status === 'ACTIVE' ? 'Venue approved: now live' : 'Venue rejected');
      setRejectTarget(null);
      fetchPending();
    } catch (err) {
      toast.error(errMsg(err, 'Review failed'));
    }
  };

  const handleBan = async (id, isBanned) => {
    try {
      await api.patch(`/users/${id}/ban`, { isBanned: !isBanned });
      toast.success(!isBanned ? 'User banned' : 'User unbanned');
      fetchUsers();
    } catch (err) {
      toast.error(errMsg(err, 'Action failed'));
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await api.patch(`/users/${id}/role`, { role });
      toast.success(`Role updated to ${role}`);
      fetchUsers();
    } catch (err) {
      toast.error(errMsg(err, 'Role change failed'));
    }
  };

  const runSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      <Tabs defaultValue="venues">
        <TabsList>
          <TabsTrigger value="venues">Pending Venues ({venues.length})</TabsTrigger>
          <TabsTrigger value="users">Users ({pagination.total})</TabsTrigger>
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
                    <p className="text-xs text-gray-400 mt-2">
                      Owner: {v.owner?.name || 'No name'} ({v.owner?.email || 'unknown'})
                    </p>

                    <div className="flex gap-2 mt-4">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-1" onClick={() => review(v.id, 'ACTIVE')}>
                        Approve
                      </Button>
                      <Dialog open={rejectTarget === v.id} onOpenChange={(open) => setRejectTarget(open ? v.id : null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 flex-1">Reject</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject venue</DialogTitle>
                            <DialogDescription>
                              "{v.name}" will be marked SUSPENDED and will not appear in public listings.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="destructive" onClick={() => review(v.id, 'SUSPENDED')}>Confirm Rejection</Button>
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
          <form onSubmit={runSearch} className="flex gap-2 mb-4 max-w-md">
            <Input
              placeholder="Search by name or email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline">Search</Button>
          </form>

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
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-gray-500 py-10">No users found.</TableCell>
                      </TableRow>
                    )}
                    {users.map((u) => {
                      const locked = u.id === me?.id || u.role === 'ADMIN';
                      return (
                        <TableRow key={u.id}>
                          <TableCell>{u.name || 'None'}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                          <TableCell>
                            {u.isBanned
                              ? <Badge className="bg-red-100 text-red-700">Banned</Badge>
                              : <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {locked ? (
                              <span className="text-xs text-gray-400">protected</span>
                            ) : (
                              <>
                                {u.role === 'USER' && (
                                  <Button size="sm" variant="outline" onClick={() => handleRoleChange(u.id, 'OWNER')}>Make Owner</Button>
                                )}
                                {u.role === 'OWNER' && (
                                  <Button size="sm" variant="outline" onClick={() => handleRoleChange(u.id, 'USER')}>Make User</Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={u.isBanned ? 'text-emerald-600' : 'text-red-600'}
                                  onClick={() => handleBan(u.id, u.isBanned)}
                                >
                                  {u.isBanned ? 'Unban' : 'Ban'}
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages || 1}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;