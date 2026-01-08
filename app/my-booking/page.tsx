"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Calendar,
  MapPin,
  Users,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Loader2,
  Home,
  DoorOpen,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Retreat {
  id: string;
  title: string;
  destination: string;
  location: string;
  start_date: string;
  end_date: string;
  image_url: string;
  slug: string;
}

interface Room {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface Booking {
  id: string;
  bookingNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus: "unpaid" | "deposit" | "partial" | "paid" | "refunded";
  guestsCount: number;
  checkInDate: string;
  checkOutDate: string;
  createdAt: string;
  totalAmount: number;
  depositAmount: number;
  balanceDue: number;
  discountAmount: number;
  discountCode: string;
  discountSource: string;
  vatRate: number;
  vatAmount: number;
  isEarlyBird: boolean;
  earlyBirdDiscount: number;
  retreat: Retreat;
  room: Room;
}

interface PaymentScheduleItem {
  id: string;
  paymentNumber: number;
  amount: number;
  dueDate: string;
  description: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  paidAt: string | null;
  failedAt: string | null;
  paymentDeadline: string | null;
  failureReason: string | null;
}

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  date: string;
}

interface BookingData {
  booking: Booking;
  paymentSchedule: PaymentScheduleItem[];
  paymentHistory: PaymentHistoryItem[];
  summary: {
    totalPaid: number;
    balanceDue: number;
    pendingPaymentsCount: number;
    failedPaymentsCount: number;
    nextPayment: PaymentScheduleItem | null;
  };
  customerPortalUrl: string | null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "paid":
    case "confirmed":
    case "completed":
    case "succeeded":
      return "text-green-600 bg-green-100";
    case "pending":
    case "processing":
      return "text-yellow-600 bg-yellow-100";
    case "failed":
    case "cancelled":
    case "refunded":
      return "text-red-600 bg-red-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "paid":
    case "confirmed":
    case "completed":
    case "succeeded":
      return <CheckCircle className="w-4 h-4" />;
    case "pending":
    case "processing":
      return <Clock className="w-4 h-4" />;
    case "failed":
    case "cancelled":
      return <XCircle className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
}

function MyBookingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const paymentSuccess = searchParams.get("payment");

  const [data, setData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No access token provided");
      setLoading(false);
      return;
    }

    fetch(`/api/my-booking?token=${token}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      })
      .catch((err) => {
        setError("Failed to load booking details");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--primary-teal)] mx-auto mb-4" />
          <p className="text-slate-600">Loading your booking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Unable to Load Booking
          </h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link href="/">
            <Button>
              <Home className="w-4 h-4 mr-2" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { booking, paymentSchedule, paymentHistory, summary, customerPortalUrl } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-slate-600 hover:text-slate-800">
            <Home className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-800">My Booking</h1>
          <div className="w-5" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Payment Success Banner */}
        {paymentSuccess === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center"
          >
            <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">Payment Successful!</p>
              <p className="text-sm text-green-600">
                Thank you for your payment. Your booking has been updated.
              </p>
            </div>
          </motion.div>
        )}

        {/* Failed Payment Alert */}
        {summary.failedPaymentsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4"
          >
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">
                  Payment Action Required
                </p>
                <p className="text-sm text-red-600 mb-3">
                  One or more payments have failed. Please update your payment
                  method to avoid booking cancellation.
                </p>
                {customerPortalUrl && (
                  <a
                    href={customerPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-red-700 hover:text-red-800"
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    Update Payment Method
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Booking Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6"
        >
          {/* Retreat Image */}
          {booking.retreat?.image_url && (
            <div className="relative h-48 bg-slate-100">
              <img
                src={booking.retreat.image_url}
                alt={booking.retreat.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h2 className="text-2xl font-bold">{booking.retreat.title}</h2>
                <p className="flex items-center text-sm opacity-90">
                  <MapPin className="w-4 h-4 mr-1" />
                  {booking.retreat.destination}
                </p>
              </div>
            </div>
          )}

          <div className="p-6">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                  getStatusColor(booking.status)
                )}
              >
                {getStatusIcon(booking.status)}
                <span className="ml-1.5 capitalize">{booking.status}</span>
              </span>
              <span
                className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                  getStatusColor(booking.paymentStatus)
                )}
              >
                <CreditCard className="w-4 h-4" />
                <span className="ml-1.5 capitalize">
                  {booking.paymentStatus === "paid"
                    ? "Fully Paid"
                    : booking.paymentStatus === "deposit"
                    ? "Deposit Paid"
                    : booking.paymentStatus === "partial"
                    ? "Partially Paid"
                    : booking.paymentStatus}
                </span>
              </span>
            </div>

            {/* Booking Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500 mb-1">Booking #</p>
                <p className="font-medium">{booking.bookingNumber}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Guests</p>
                <p className="font-medium flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {booking.guestsCount}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Check-in</p>
                <p className="font-medium flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(booking.checkInDate)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Check-out</p>
                <p className="font-medium flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(booking.checkOutDate)}
                </p>
              </div>
            </div>

            {/* Room Info */}
            {booking.room && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-slate-500 text-sm mb-1">Accommodation</p>
                <p className="font-medium flex items-center">
                  <DoorOpen className="w-4 h-4 mr-2 text-slate-400" />
                  {booking.room.name}
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Payment Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-cyan-600" />
            Payment Schedule
          </h3>

          <div className="space-y-4">
            {paymentSchedule.map((schedule, index) => (
              <div
                key={schedule.id}
                className={cn(
                  "border rounded-lg p-4",
                  schedule.status === "paid"
                    ? "border-green-200 bg-green-50"
                    : schedule.status === "failed"
                    ? "border-red-200 bg-red-50"
                    : "border-slate-200"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mr-2",
                          getStatusColor(schedule.status)
                        )}
                      >
                        {getStatusIcon(schedule.status)}
                        <span className="ml-1 capitalize">{schedule.status}</span>
                      </span>
                      <span className="text-sm text-slate-500">
                        Payment {schedule.paymentNumber} of {paymentSchedule.length}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800">
                      {schedule.description}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {schedule.status === "paid" && schedule.paidAt
                        ? `Paid on ${formatDate(schedule.paidAt)}`
                        : `Due: ${formatDate(schedule.dueDate)}`}
                    </p>
                    {schedule.status === "failed" && schedule.paymentDeadline && (
                      <p className="text-sm text-red-600 mt-1">
                        Payment deadline:{" "}
                        {formatDate(schedule.paymentDeadline)}
                      </p>
                    )}
                    {schedule.failureReason && (
                      <p className="text-xs text-red-500 mt-1">
                        {schedule.failureReason}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-lg font-bold text-slate-800">
                      {formatCurrency(schedule.amount)}
                    </p>
                    {(schedule.status === "pending" || schedule.status === "processing" || schedule.status === "failed") && token && (
                      <a
                        href={`/api/payments/${schedule.id}/checkout?token=${token}`}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                      >
                        <CreditCard className="w-4 h-4 mr-1.5" />
                        Pay Now
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">Total Amount</span>
              <span className="font-medium">
                {formatCurrency(booking.totalAmount)}
              </span>
            </div>
            {booking.discountAmount > 0 && (
              <div className="flex justify-between items-center mb-2 text-green-600">
                <span>
                  Discount ({booking.discountSource || "Promo"})
                </span>
                <span>-{formatCurrency(booking.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">Total Paid</span>
              <span className="font-medium text-green-600">
                {formatCurrency(summary.totalPaid)}
              </span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Balance Due</span>
              <span
                className={
                  summary.balanceDue > 0 ? "text-amber-600" : "text-green-600"
                }
              >
                {formatCurrency(summary.balanceDue)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Payment History
            </h3>
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-800 capitalize">
                      {payment.type?.replace(/_/g, " ") || "Payment"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {formatDate(payment.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-slate-500 uppercase">
                      {payment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          {customerPortalUrl && (
            <a
              href={customerPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                Manage Payment Methods
                <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </a>
          )}
          {booking.retreat?.slug && (
            <Link href={`/retreats/${booking.retreat.slug}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <MapPin className="w-4 h-4 mr-2" />
                View Retreat Details
              </Button>
            </Link>
          )}
        </motion.div>

        {/* Contact Support */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>
            Questions about your booking?{" "}
            <a
              href="mailto:info@rainbowsurfretreats.com"
              className="text-cyan-600 hover:underline"
            >
              Contact us
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function MyBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
          <Loader2 className="w-12 h-12 animate-spin text-[var(--primary-teal)]" />
        </div>
      }
    >
      <MyBookingContent />
    </Suspense>
  );
}
