import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin,
  Users,
  IndianRupee,
  Phone,
  Mail,
  Star,
  ImageOff,
  ChevronLeft,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const money = (n) => Number(n).toLocaleString("en-IN");

const VenueDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [form, setForm] = useState({
    eventDate: "",
    eventEndDate: "",
    eventType: "",
    guestCount: "",
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setActivePhoto(0);

    api
      .get(`/venues/${id}`)
      .then((res) => {
        if (cancelled) return;
        setVenue(res.data.data?.venue ?? res.data.data ?? null);
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
  }, [id]);

  const handleBook = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to book a venue");
      navigate("/login");
      return;
    }

    if (
      form.eventEndDate &&
      form.eventDate &&
      form.eventEndDate < form.eventDate
    ) {
      toast.error("End date cannot be before start date");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/bookings", {
        venueId: id,
        ...form,
        guestCount: Number(form.guestCount),
      });
      toast.success("Booking request sent. Awaiting owner approval.");
      setBookingOpen(false);
      setForm({
        eventDate: "",
        eventEndDate: "",
        eventType: "",
        guestCount: "",
      });
      navigate("/my-bookings");
    } catch (err) {
      const apiError = err.response?.data?.error;
      const first = apiError?.details?.[0];
      if (first) {
        toast.error(`${first.field.replace("body.", "")}: ${first.message}`);
      } else {
        toast.error(
          apiError?.message || err.response?.data?.message || "Booking failed",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <Skeleton className="aspect-[16/7] w-full rounded-2xl" />
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <p className="font-medium">We couldn't load this venue.</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <p className="font-medium">Venue not found</p>
        <Link
          to="/"
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Back to all venues
        </Link>
      </div>
    );
  }

  const photos = venue.photos ?? [];
  const cover = photos[activePhoto];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> All venues
      </Link>

      {/* Gallery */}
      <div className="mb-8">
        <div className="relative aspect-[16/7] overflow-hidden rounded-2xl bg-muted ring-1 ring-black/5">
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-10 w-10 opacity-40" />
          </div>
          {cover && (
            <img
              src={cover}
              alt={venue.name}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="relative h-full w-full object-cover"
            />
          )}
        </div>

        {photos.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {photos.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setActivePhoto(i)}
                aria-label={`Show photo ${i + 1}`}
                className={`aspect-[4/3] overflow-hidden rounded-lg ring-2 transition ${
                  i === activePhoto
                    ? "ring-primary"
                    : "ring-transparent hover:ring-border"
                }`}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
        {/* Details */}
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {venue.name}
          </h1>
          <p className="mt-2 flex items-start gap-1.5 text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {venue.address}, {venue.city}, {venue.state} - {venue.pincode}
            </span>
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Users className="h-3.5 w-3.5" /> Up to {venue.capacity} guests
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <IndianRupee className="h-3.5 w-3.5" /> ₹
              {money(venue.pricePerDay)} per day
            </Badge>
          </div>

          {venue.description && (
            <div className="mt-8">
              <h2 className="mb-2 text-lg font-semibold">About this venue</h2>
              <p className="leading-relaxed text-muted-foreground">
                {venue.description}
              </p>
            </div>
          )}

          {venue.amenities?.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {venue.amenities.map((a, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="px-3 py-1 font-normal"
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {venue.rules && (
            <div className="mt-8">
              <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="h-4 w-4" /> Venue rules
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {venue.rules}
              </p>
            </div>
          )}

          {venue.reviews?.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Reviews</h2>
              <div className="space-y-3">
                {venue.reviews.map((r) => (
                  <Card
                    key={r.id}
                    className="border-0 shadow-sm ring-1 ring-black/5"
                  >
                    <CardContent className="p-4">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-medium">{r.user?.name}</span>
                        <span className="flex items-center gap-1 text-sm text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-amber-500" />{" "}
                          {r.rating}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {r.comment}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking panel */}
        <aside>
          <Card className="sticky top-24 gap-0 border-0 py-0 shadow-lg ring-1 ring-black/5">
            <CardContent className="space-y-5 p-6">
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-3xl font-bold">
                  ₹{money(venue.pricePerDay)}
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    / day
                  </span>
                </p>
              </div>

              <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                <DialogTrigger asChild>
                  <Button className="h-11 w-full">
                    <CalendarDays className="mr-2 h-4 w-4" /> Request to book
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Book {venue.name}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBook} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Event type</Label>
                      <Input
                        required
                        placeholder="Wedding, birthday, corporate..."
                        value={form.eventType}
                        onChange={(e) =>
                          setForm({ ...form, eventType: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Start date</Label>
                        <Input
                          type="date"
                          required
                          value={form.eventDate}
                          onChange={(e) =>
                            setForm({ ...form, eventDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End date</Label>
                        <Input
                          type="date"
                          required
                          min={form.eventDate || undefined}
                          value={form.eventEndDate}
                          onChange={(e) =>
                            setForm({ ...form, eventEndDate: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Guest count</Label>
                      <Input
                        type="number"
                        required
                        min="1"
                        max={venue.capacity}
                        placeholder={`Up to ${venue.capacity}`}
                        value={form.guestCount}
                        onChange={(e) =>
                          setForm({ ...form, guestCount: e.target.value })
                        }
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        type="submit"
                        className="h-11 w-full"
                        disabled={submitting}
                      >
                        {submitting
                          ? "Sending request..."
                          : "Send booking request"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <div className="space-y-2 border-t pt-5">
                <p className="text-sm font-medium">
                  Hosted by {venue.owner?.name ?? "the owner"}
                </p>
                {venue.owner?.email && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {venue.owner.email}
                  </p>
                )}
                {venue.owner?.phone && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {venue.owner.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default VenueDetail;
