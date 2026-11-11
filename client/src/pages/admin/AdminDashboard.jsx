import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MapPin,
  Users,
  IndianRupee,
  Mail,
  ImageOff,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

const errMsg = (err, fallback) =>
  err.response?.data?.error?.message || err.response?.data?.message || fallback;

// Accept any common response shape: bare array, { data: [...] }, or { data: { items: [...] } }.
const extractList = (body, key) => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.[key])) return body.data[key];
  if (Array.isArray(body?.[key])) return body[key];
  return [];
};

const extractPagination = (body) =>
  body?.pagination ??
  body?.data?.pagination ?? { page: 1, totalPages: 1, total: 0 };

const money = (n) =>
  n == null || n === "" ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;

const STATUS_CLASS = {
  ACTIVE: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  PENDING_REVIEW: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  SUSPENDED: "bg-red-100 text-red-800 hover:bg-red-100",
  DRAFT: "bg-muted text-muted-foreground hover:bg-muted",
};

const AdminDashboard = () => {
  const { user: me } = useAuth();

  // Pending venues
  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venueError, setVenueError] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [busyVenueId, setBusyVenueId] = useState(null);

  // Users
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [busyUserId, setBusyUserId] = useState(null);

  const fetchPending = useCallback(async () => {
    setLoadingVenues(true);
    setVenueError(false);
    try {
      const res = await api.get("/venues/pending");
      setVenues(extractList(res.data, "venues"));
    } catch (err) {
      console.error(err);
      setVenueError(true);
    } finally {
      setLoadingVenues(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUserError(false);
    try {
      const res = await api.get("/users", {
        params: { page, limit: 20, ...(search ? { search } : {}) },
      });
      setUsers(extractList(res.data, "users"));
      setPagination({
        ...{ page: 1, totalPages: 1, total: 0 },
        ...extractPagination(res.data),
      });
    } catch (err) {
      console.error(err);
      setUserError(true);
    } finally {
      setLoadingUsers(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const reviewVenue = async (id, status) => {
    setBusyVenueId(id);
    try {
      await api.patch(`/venues/${id}/review`, { status });
      toast.success(
        status === "ACTIVE" ? "Venue approved and now live" : "Venue rejected",
      );
      setRejectTarget(null);
      setVenues((prev) => prev.filter((v) => v.id !== id));
      fetchPending();
    } catch (err) {
      toast.error(errMsg(err, "Review failed"));
    } finally {
      setBusyVenueId(null);
    }
  };

  const handleBan = async (u) => {
    setBusyUserId(u.id);
    try {
      await api.patch(`/users/${u.id}/ban`, { isBanned: !u.isBanned });
      toast.success(u.isBanned ? "User unbanned" : "User banned");
      fetchUsers();
    } catch (err) {
      toast.error(errMsg(err, "Action failed"));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRoleChange = async (u, role) => {
    setBusyUserId(u.id);
    try {
      await api.patch(`/users/${u.id}/role`, { role });
      toast.success(`Role updated to ${role.toLowerCase()}`);
      fetchUsers();
    } catch (err) {
      toast.error(errMsg(err, "Role change failed"));
    } finally {
      setBusyUserId(null);
    }
  };

  const runSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const totalPages = pagination.totalPages || 1;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin panel</h1>
        <p className="mt-1 text-muted-foreground">
          Review venues and manage users.
        </p>
      </div>

      <Tabs defaultValue="venues">
        <TabsList>
          <TabsTrigger value="venues">
            Pending venues{!loadingVenues && ` (${venues.length})`}
          </TabsTrigger>
          <TabsTrigger value="users">
            Users{!loadingUsers && ` (${pagination.total ?? users.length})`}
          </TabsTrigger>
        </TabsList>

        {/* ---------- PENDING VENUES ---------- */}
        <TabsContent value="venues" className="mt-6">
          {loadingVenues ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : venueError ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
              <p className="font-medium">We couldn't load pending venues.</p>
              <Button variant="outline" className="mt-4" onClick={fetchPending}>
                Try again
              </Button>
            </div>
          ) : venues.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
              <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No venues awaiting review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {venues.map((v) => {
                const photo = v.photos?.[0];
                const busy = busyVenueId === v.id;
                return (
                  <Card
                    key={v.id}
                    className="gap-0 overflow-hidden border-0 py-0 shadow-sm ring-1 ring-black/5"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <ImageOff className="h-8 w-8 opacity-40" />
                      </div>
                      {photo && (
                        <img
                          src={photo}
                          alt={v.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          className="relative h-full w-full object-cover"
                        />
                      )}
                      <Badge
                        className={`absolute left-3 top-3 shadow-sm ${STATUS_CLASS[v.status] ?? STATUS_CLASS.DRAFT}`}
                      >
                        {String(v.status ?? "")
                          .replace(/_/g, " ")
                          .toLowerCase()}
                      </Badge>
                    </div>

                    <CardContent className="space-y-2 p-4">
                      <h3 className="truncate text-lg font-semibold">
                        {v.name}
                      </h3>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {v.city}
                        {v.state ? `, ${v.state}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> {v.capacity} guests
                        </span>
                        <span className="flex items-center gap-1.5">
                          <IndianRupee className="h-3.5 w-3.5" />{" "}
                          {money(v.pricePerDay).replace("₹", "")}/day
                        </span>
                      </div>
                      <div className="border-t pt-3 text-sm">
                        <p className="text-xs text-muted-foreground">
                          Submitted{" "}
                          {v.createdAt
                            ? new Date(v.createdAt).toLocaleString("en-IN")
                            : "—"}{" "}
                          · ID {String(v.id).slice(0, 8)}
                        </p>
                        <p className="font-medium">
                          Owner: {v.owner?.name || "No name"}
                        </p>
                        {v.owner?.email && (
                          <p className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" /> {v.owner.email}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          disabled={busy}
                          onClick={() => reviewVenue(v.id, "ACTIVE")}
                        >
                          Approve
                        </Button>

                        <Dialog
                          open={rejectTarget === v.id}
                          onOpenChange={(open) =>
                            setRejectTarget(open ? v.id : null)
                          }
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-red-200 text-red-600"
                              disabled={busy}
                            >
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject venue</DialogTitle>
                              <DialogDescription>
                                "{v.name}" will be suspended and hidden from
                                public listings.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="destructive"
                                disabled={busy}
                                onClick={() => reviewVenue(v.id, "SUSPENDED")}
                              >
                                Confirm rejection
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ---------- USERS ---------- */}
        <TabsContent value="users" className="mt-6">
          <form onSubmit={runSearch} className="mb-4 flex max-w-md gap-2">
            <Input
              placeholder="Search by name or email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>

          {loadingUsers ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : userError ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
              <p className="font-medium">We couldn't load users.</p>
              <Button variant="outline" className="mt-4" onClick={fetchUsers}>
                Try again
              </Button>
            </div>
          ) : (
            <Card className="gap-0 border-0 py-0 shadow-sm ring-1 ring-black/5">
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
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No users found.
                        </TableCell>
                      </TableRow>
                    )}
                    {users.map((u) => {
                      const locked = u.id === me?.id || u.role === "ADMIN";
                      const busy = busyUserId === u.id;
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            {u.name || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {String(u.role).toLowerCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {u.isBanned ? (
                              <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                                Banned
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {locked ? (
                              <span className="text-xs text-muted-foreground">
                                Protected
                              </span>
                            ) : (
                              <div className="flex justify-end gap-2">
                                {u.role === "USER" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => handleRoleChange(u, "OWNER")}
                                  >
                                    Make owner
                                  </Button>
                                )}
                                {u.role === "OWNER" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => handleRoleChange(u, "USER")}
                                  >
                                    Make user
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  className={
                                    u.isBanned
                                      ? "text-emerald-600"
                                      : "text-red-600"
                                  }
                                  onClick={() => handleBan(u)}
                                >
                                  {u.isBanned ? "Unban" : "Ban"}
                                </Button>
                              </div>
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

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {pagination.page || page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
