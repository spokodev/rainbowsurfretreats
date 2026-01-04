import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Eye,
  Mail,
  Calendar,
  User,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { checkAdminAuth } from "@/lib/settings";

interface Booking {
  id: string;
  booking_number: string;
  first_name: string;
  last_name: string;
  email: string;
  guests_count: number;
  total_amount: number;
  deposit_amount: number;
  balance_due: number;
  status: string;
  payment_status: string;
  check_in_date: string;
  check_out_date: string;
  created_at: string;
  retreat: {
    destination: string;
  } | null;
  room: {
    name: string;
  } | null;
}

async function getBookings(): Promise<{
  bookings: Booking[];
  stats: {
    confirmed: number;
    pending: number;
    cancelled: number;
    total: number;
  };
}> {
  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      booking_number,
      first_name,
      last_name,
      email,
      guests_count,
      total_amount,
      deposit_amount,
      balance_due,
      status,
      payment_status,
      check_in_date,
      check_out_date,
      created_at,
      retreat:retreats(destination),
      room:retreat_rooms(name)
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bookings:", error);
    return {
      bookings: [],
      stats: { confirmed: 0, pending: 0, cancelled: 0, total: 0 },
    };
  }

  // Transform Supabase response to match Booking type
  // Supabase returns joined tables as arrays, we need to extract first item
  const bookingsList = (bookings || []).map((b) => ({
    ...b,
    retreat: Array.isArray(b.retreat) ? b.retreat[0] : b.retreat,
    room: Array.isArray(b.room) ? b.room[0] : b.room,
  })) as Booking[];

  const stats = {
    confirmed: bookingsList.filter((b) => b.status === "confirmed").length,
    pending: bookingsList.filter((b) => b.status === "pending").length,
    cancelled: bookingsList.filter((b) => b.status === "cancelled").length,
    total: bookingsList.length,
  };

  return { bookings: bookingsList, stats };
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "confirmed":
      return "default";
    case "pending":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const getPaymentBadgeVariant = (status: string) => {
  switch (status) {
    case "paid":
      return "default";
    case "deposit":
      return "secondary";
    case "unpaid":
      return "outline";
    case "refunded":
      return "destructive";
    default:
      return "outline";
  }
};

export default async function AdminBookingsPage() {
  // Server-side auth check (defense in depth - middleware also checks)
  const { isAdmin } = await checkAdminAuth();
  if (!isAdmin) {
    redirect("/");
  }

  const { bookings, stats } = await getBookings();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            Manage guest bookings and reservations
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/bookings/new">
            <Plus className="mr-2 h-4 w-4" />
            Add New Booking
          </Link>
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.confirmed}</div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>View and manage all guest reservations</CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No bookings found</p>
              <Button asChild>
                <Link href="/admin/bookings/new">Create your first booking</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Retreat</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-sm">
                      {booking.booking_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {booking.first_name} {booking.last_name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {booking.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.retreat?.destination || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{booking.room?.name || "Standard"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div className="text-sm">
                          <div>
                            {new Date(booking.check_in_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            to{" "}
                            {new Date(booking.check_out_date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{booking.guests_count}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600 font-medium">
                        €{booking.deposit_amount?.toFixed(2) || "0.00"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={booking.balance_due > 0 ? "text-orange-600 font-medium" : "text-muted-foreground"}>
                        €{booking.balance_due?.toFixed(2) || "0.00"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold">
                        €{booking.total_amount?.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getPaymentBadgeVariant(booking.payment_status)}
                      >
                        {booking.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/bookings/${booking.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`mailto:${booking.email}`}>
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
