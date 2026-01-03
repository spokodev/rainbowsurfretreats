import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Clock,
  Receipt,
  AlertCircle,
  CheckCircle,
  XCircle,
  Palmtree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { checkAdminAuth } from "@/lib/settings";
import { BookingActions } from "@/components/admin/booking-actions";

interface BookingDetails {
  id: string;
  booking_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  billing_address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  guests_count: number;
  check_in_date: string;
  check_out_date: string;
  subtotal: number;
  discount_amount: number;
  discount_code: string | null;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  deposit_amount: number;
  balance_due: number;
  is_early_bird: boolean;
  early_bird_discount: number;
  status: string;
  payment_status: string;
  accept_terms: boolean;
  newsletter_opt_in: boolean;
  // B2B fields
  customer_type: "private" | "business";
  company_name: string | null;
  vat_id: string | null;
  vat_id_valid: boolean;
  vat_id_validated_at: string | null;
  notes: string | null;
  internal_notes: string | null;
  source: string;
  language: string;
  created_at: string;
  updated_at: string;
  retreat: {
    id: string;
    destination: string;
    start_date: string;
    end_date: string;
    price: number;
  } | null;
  room: {
    id: string;
    name: string;
    price: number;
  } | null;
}

interface PaymentScheduleItem {
  id: string;
  payment_number: number;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
}

interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  payment_type: string;
  status: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getBookingDetails(id: string): Promise<{
  booking: BookingDetails | null;
  paymentSchedules: PaymentScheduleItem[];
  payments: PaymentItem[];
}> {
  const supabase = await createClient();

  // Fetch booking with related data
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      `
      *,
      retreat:retreats(id, destination, start_date, end_date, price),
      room:retreat_rooms(id, name, price)
    `
    )
    .eq("id", id)
    .single();

  if (error || !booking) {
    return { booking: null, paymentSchedules: [], payments: [] };
  }

  // Transform joined data
  const transformedBooking = {
    ...booking,
    retreat: Array.isArray(booking.retreat) ? booking.retreat[0] : booking.retreat,
    room: Array.isArray(booking.room) ? booking.room[0] : booking.room,
  } as BookingDetails;

  // Fetch payment schedules
  const { data: schedules } = await supabase
    .from("payment_schedules")
    .select("id, payment_number, amount, due_date, status, paid_at, stripe_payment_intent_id")
    .eq("booking_id", id)
    .order("payment_number", { ascending: true });

  // Fetch payments
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, currency, payment_type, status, stripe_payment_intent_id, created_at")
    .eq("booking_id", id)
    .order("created_at", { ascending: false });

  return {
    booking: transformedBooking,
    paymentSchedules: (schedules || []) as PaymentScheduleItem[],
    payments: (payments || []) as PaymentItem[],
  };
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "confirmed":
    case "completed":
      return "default";
    case "pending":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const getPaymentStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "paid":
    case "succeeded":
      return "default";
    case "deposit":
    case "pending":
    case "processing":
      return "secondary";
    case "unpaid":
    case "failed":
      return "outline";
    case "refunded":
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case "paid":
    case "succeeded":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "pending":
    case "processing":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "failed":
    case "cancelled":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

export default async function BookingDetailsPage({ params }: RouteParams) {
  // Server-side auth check
  const { isAdmin } = await checkAdminAuth();
  if (!isAdmin) {
    redirect("/");
  }

  const { id } = await params;
  const { booking, paymentSchedules, payments } = await getBookingDetails(id);

  if (!booking) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/bookings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              Booking {booking.booking_number}
            </h1>
            <Badge variant={getStatusBadgeVariant(booking.status)}>
              {booking.status}
            </Badge>
            <Badge variant={getPaymentStatusBadgeVariant(booking.payment_status)}>
              {booking.payment_status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Created {formatDateTime(booking.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <a href={`mailto:${booking.email}`}>
              <Mail className="mr-2 h-4 w-4" />
              Email Guest
            </a>
          </Button>
          <BookingActions
            bookingId={booking.id}
            bookingNumber={booking.booking_number}
            status={booking.status}
            paymentStatus={booking.payment_status}
            payments={payments}
            retreatEndDate={booking.retreat?.end_date || booking.check_out_date}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Guest & Retreat Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {booking.first_name} {booking.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guests</p>
                  <p className="font-medium">{booking.guests_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{booking.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{booking.phone || "Not provided"}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Billing Address</p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    {booking.billing_address ? (
                      <>
                        <p>{booking.billing_address}</p>
                        <p>
                          {booking.postal_code} {booking.city}
                        </p>
                        <p>{booking.country}</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Not provided</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* B2B Business Information */}
              {booking.customer_type === "business" && (
                <>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-800 mb-2">Business Customer</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-blue-600">Company Name</p>
                        <p className="font-medium text-blue-900">{booking.company_name || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-600">VAT ID</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-blue-900 font-mono">{booking.vat_id || "Not provided"}</p>
                          {booking.vat_id && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              booking.vat_id_valid
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {booking.vat_id_valid ? "Validated" : "Unvalidated"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {booking.vat_id_valid && booking.vat_rate === 0 && (
                      <div className="mt-2 text-sm text-green-700 font-medium">
                        Reverse Charge Applied (0% VAT)
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Type</p>
                  <p className="font-medium capitalize">{booking.customer_type || "private"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Language</p>
                  <p className="font-medium uppercase">{booking.language}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Newsletter</p>
                  <p className="font-medium">
                    {booking.newsletter_opt_in ? "Subscribed" : "Not subscribed"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Source</p>
                  <p className="font-medium">{booking.source || "Direct"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retreat Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palmtree className="h-5 w-5" />
                Retreat Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.retreat ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{booking.retreat.destination}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.room?.name || "Standard Room"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/retreats/${booking.retreat.id}/edit`}>
                        View Retreat
                      </Link>
                    </Button>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Check-in</p>
                        <p className="font-medium">{formatDate(booking.check_in_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Check-out</p>
                        <p className="font-medium">{formatDate(booking.check_out_date)}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Retreat information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Schedule */}
          {paymentSchedules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Payment Schedule
                </CardTitle>
                <CardDescription>
                  Scheduled payments for this booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {getPaymentStatusIcon(schedule.status)}
                        <div>
                          <p className="font-medium">
                            Payment {schedule.payment_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Due: {formatDate(schedule.due_date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(schedule.amount)}
                        </p>
                        <Badge
                          variant={getPaymentStatusBadgeVariant(schedule.status)}
                          className="text-xs"
                        >
                          {schedule.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Payment History
                </CardTitle>
                <CardDescription>
                  All payments received for this booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {getPaymentStatusIcon(payment.status)}
                        <div>
                          <p className="font-medium capitalize">
                            {payment.payment_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(payment.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(payment.amount)}
                        </p>
                        <Badge
                          variant={getPaymentStatusBadgeVariant(payment.status)}
                          className="text-xs"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {(booking.notes || booking.internal_notes) && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Guest Notes</p>
                    <p className="whitespace-pre-wrap">{booking.notes}</p>
                  </div>
                )}
                {booking.internal_notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Internal Notes</p>
                    <p className="whitespace-pre-wrap">{booking.internal_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Pricing Summary */}
        <div className="space-y-6">
          {/* Pricing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pricing Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(booking.subtotal)}</span>
                </div>

                {booking.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Discount
                      {booking.discount_code && (
                        <span className="ml-1 text-xs">({booking.discount_code})</span>
                      )}
                    </span>
                    <span>-{formatCurrency(booking.discount_amount)}</span>
                  </div>
                )}

                {booking.is_early_bird && booking.early_bird_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Early Bird</span>
                    <span>-{formatCurrency(booking.early_bird_discount)}</span>
                  </div>
                )}

                {booking.vat_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      VAT ({booking.vat_rate}%)
                    </span>
                    <span>{formatCurrency(booking.vat_amount)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(booking.total_amount)}</span>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit Paid</span>
                  <span className="text-green-600">
                    {formatCurrency(booking.deposit_amount)}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Balance Due</span>
                  <span
                    className={
                      booking.balance_due > 0 ? "text-orange-600" : "text-green-600"
                    }
                  >
                    {formatCurrency(booking.balance_due)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href={`mailto:${booking.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Email
                </a>
              </Button>
              {booking.phone && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`tel:${booking.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call Guest
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
