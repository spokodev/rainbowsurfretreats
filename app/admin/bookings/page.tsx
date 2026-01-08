import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { checkAdminAuth } from "@/lib/settings";
import { BookingsTable } from "@/components/admin/bookings-table";

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
  language?: string;
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
      language,
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
            <BookingsTable bookings={bookings} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
