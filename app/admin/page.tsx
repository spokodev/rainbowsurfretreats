import {
  DollarSign,
  CalendarCheck,
  Users,
  TrendingUp,
  MapPin,
} from "lucide-react";
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

interface DashboardStats {
  totalRevenue: number;
  totalBookings: number;
  totalGuests: number;
  confirmedBookings: number;
}

interface RecentBooking {
  id: string;
  booking_number: string;
  first_name: string;
  last_name: string;
  total_amount: number;
  status: string;
  retreat: {
    destination: string;
  } | null;
}

interface UpcomingRetreat {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  price: number;
  status: string;
}

async function getDashboardData(): Promise<{
  stats: DashboardStats;
  recentBookings: RecentBooking[];
  upcomingRetreats: UpcomingRetreat[];
}> {
  const supabase = await createClient();

  // Fetch stats
  const { data: bookingsData } = await supabase
    .from("bookings")
    .select("total_amount, guests_count, status");

  const stats: DashboardStats = {
    totalRevenue: 0,
    totalBookings: 0,
    totalGuests: 0,
    confirmedBookings: 0,
  };

  if (bookingsData) {
    stats.totalBookings = bookingsData.length;
    stats.totalGuests = bookingsData.reduce(
      (sum, b) => sum + (b.guests_count || 1),
      0
    );
    stats.confirmedBookings = bookingsData.filter(
      (b) => b.status === "confirmed"
    ).length;
    stats.totalRevenue = bookingsData
      .filter((b) => b.status === "confirmed")
      .reduce((sum, b) => sum + (b.total_amount || 0), 0);
  }

  // Fetch recent bookings
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select(
      `
      id,
      booking_number,
      first_name,
      last_name,
      total_amount,
      status,
      retreat:retreats(destination)
    `
    )
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch upcoming retreats
  const { data: upcomingRetreats } = await supabase
    .from("retreats")
    .select("id, destination, start_date, end_date, price, status")
    .gte("start_date", new Date().toISOString().split("T")[0])
    .order("start_date", { ascending: true })
    .limit(4);

  // Transform Supabase response - joined tables are returned as arrays
  const transformedBookings = (recentBookings || []).map((b) => ({
    ...b,
    retreat: Array.isArray(b.retreat) ? b.retreat[0] : b.retreat,
  })) as RecentBooking[];

  return {
    stats,
    recentBookings: transformedBookings,
    upcomingRetreats: (upcomingRetreats as UpcomingRetreat[]) || [],
  };
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

export default async function AdminDashboard() {
  const { stats, recentBookings, upcomingRetreats } = await getDashboardData();

  const statsCards = [
    {
      title: "Total Revenue",
      value: `€${stats.totalRevenue.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
    },
    {
      title: "Bookings",
      value: stats.totalBookings.toString(),
      icon: CalendarCheck,
    },
    {
      title: "Total Guests",
      value: stats.totalGuests.toString(),
      icon: Users,
    },
    {
      title: "Confirmed",
      value: stats.confirmedBookings.toString(),
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your retreat business.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>Latest bookings from your retreats</CardDescription>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No bookings yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Retreat</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.first_name} {booking.last_name}
                      </TableCell>
                      <TableCell>
                        {booking.retreat?.destination || "N/A"}
                      </TableCell>
                      <TableCell>€{booking.total_amount?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Retreats */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Upcoming Retreats</CardTitle>
            <CardDescription>Your scheduled retreat experiences</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingRetreats.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No upcoming retreats
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingRetreats.map((retreat) => (
                  <div
                    key={retreat.id}
                    className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{retreat.destination}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(retreat.start_date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}{" "}
                        -{" "}
                        {new Date(retreat.end_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">€{retreat.price}</div>
                      <Badge variant="outline">{retreat.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
