"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Download,
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  RotateCcw,
  XCircle,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Payment {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  amount: number;
  currency: string;
  payment_type: string;
  status: string;
  payment_method: string | null;
  created_at: string;
  booking?: {
    id: string;
    booking_number: string;
    first_name: string;
    last_name: string;
    email: string;
    retreat?: {
      destination: string;
    };
  };
}

interface PaymentSchedule {
  id: string;
  booking_id: string;
  payment_number: number;
  amount: number;
  due_date: string;
  status: string;
  description: string | null;
  attempts: number;
  max_attempts: number;
  failure_reason: string | null;
  paid_at: string | null;
  booking?: {
    id: string;
    booking_number: string;
    first_name: string;
    last_name: string;
    email: string;
    retreat?: {
      destination: string;
    };
  };
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "succeeded":
    case "paid":
      return "default";
    case "pending":
    case "processing":
      return "secondary";
    case "failed":
      return "destructive";
    case "refunded":
      return "outline";
    case "cancelled":
      return "outline";
    default:
      return "secondary";
  }
};

const getTypeBadgeVariant = (type: string) => {
  switch (type) {
    case "deposit":
    case "full":
    case "installment":
    case "balance":
      return "default";
    case "refund":
      return "destructive";
    default:
      return "outline";
  }
};

const formatCurrency = (amount: number, currency: string = "EUR") => {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateForCSV = (dateString: string) => {
  return new Date(dateString).toISOString().split("T")[0];
};

const exportToCSV = (payments: Payment[]) => {
  // CSV headers
  const headers = [
    "Date",
    "Booking ID",
    "Guest Name",
    "Email",
    "Retreat",
    "Type",
    "Amount",
    "Currency",
    "Status",
    "Payment Method",
    "Stripe ID",
  ];

  // Convert payments to CSV rows
  const rows = payments.map((payment) => [
    formatDateForCSV(payment.created_at),
    payment.booking?.booking_number || "",
    payment.booking
      ? `${payment.booking.first_name} ${payment.booking.last_name}`
      : "",
    payment.booking?.email || "",
    payment.booking?.retreat?.destination || "",
    payment.payment_type,
    payment.payment_type === "refund"
      ? `-${payment.amount.toFixed(2)}`
      : payment.amount.toFixed(2),
    payment.currency,
    payment.status,
    payment.payment_method || "",
    payment.stripe_payment_intent_id || "",
  ]);

  // Build CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `payments-export-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refund dialog state
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    payment: Payment | null;
    amount: string;
    reason: string;
    isProcessing: boolean;
  }>({
    open: false,
    payment: null,
    amount: "",
    reason: "",
    isProcessing: false,
  });

  // Cancel dialog state
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    schedule: PaymentSchedule | null;
    reason: string;
    isProcessing: boolean;
  }>({
    open: false,
    schedule: null,
    reason: "",
    isProcessing: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch payments
      const paymentsRes = await fetch("/api/payments");
      if (!paymentsRes.ok) throw new Error("Failed to fetch payments");
      const paymentsData = await paymentsRes.json();
      setPayments(paymentsData.data || []);

      // Fetch payment schedules
      const schedulesRes = await fetch("/api/payment-schedules");
      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(schedulesData.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefund() {
    if (!refundDialog.payment) return;

    setRefundDialog((prev) => ({ ...prev, isProcessing: true }));

    try {
      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: refundDialog.payment.id,
          amount: refundDialog.amount
            ? parseFloat(refundDialog.amount)
            : undefined,
          reason: refundDialog.reason || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund");
      }

      // Refresh data
      await fetchData();

      // Close dialog
      setRefundDialog({
        open: false,
        payment: null,
        amount: "",
        reason: "",
        isProcessing: false,
      });

      toast.success(data.message || "Refund processed successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process refund");
      setRefundDialog((prev) => ({ ...prev, isProcessing: false }));
    }
  }

  async function handleCancelSchedule() {
    if (!cancelDialog.schedule) return;

    setCancelDialog((prev) => ({ ...prev, isProcessing: true }));

    try {
      const res = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          paymentScheduleId: cancelDialog.schedule.id,
          reason: cancelDialog.reason || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel payment");
      }

      // Refresh data
      await fetchData();

      // Close dialog
      setCancelDialog({
        open: false,
        schedule: null,
        reason: "",
        isProcessing: false,
      });

      toast.success(data.message || "Payment cancelled successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel payment");
      setCancelDialog((prev) => ({ ...prev, isProcessing: false }));
    }
  }

  async function triggerPaymentProcessing() {
    try {
      const res = await fetch("/api/cron/process-payments", {
        method: "POST",
      });
      const data = await res.json();
      toast.success(
        `Processing complete: ${data.processed || 0} processed, ${
          data.succeeded || 0
        } succeeded, ${data.failed || 0} failed`
      );
      await fetchData();
    } catch {
      toast.error("Failed to trigger payment processing");
    }
  }

  // Calculate stats
  const totalRevenue = payments
    .filter((p) => p.status === "succeeded" && p.payment_type !== "refund")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRefunds = payments
    .filter((p) => p.payment_type === "refund")
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);

  const pendingSchedules = schedules.filter((s) => s.status === "pending");
  const pendingAmount = pendingSchedules.reduce((sum, s) => sum + s.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Error loading payments</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Track payments, refunds, and scheduled transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => exportToCSV(payments)} disabled={payments.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={triggerPaymentProcessing}>
            <Clock className="mr-2 h-4 w-4" />
            Process Due Payments
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="mr-1 h-3 w-3" />
              {payments.filter((p) => p.status === "succeeded").length} successful payments
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Refunds
            </CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalRefunds)}
            </div>
            <p className="text-xs text-muted-foreground">
              {payments.filter((p) => p.payment_type === "refund").length} refunds processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scheduled Pending
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingSchedules.length} upcoming payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Income
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue - totalRefunds)}
            </div>
            <p className="text-xs text-muted-foreground">After refunds</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">
            Completed Payments ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled ({schedules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All completed payment transactions and refunds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payments yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Retreat</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {payment.booking?.booking_number ? (
                            <Link
                              href={`/admin/bookings/${payment.booking_id}`}
                              className="text-primary hover:underline font-mono text-sm"
                            >
                              {payment.booking.booking_number}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {payment.booking
                            ? `${payment.booking.first_name} ${payment.booking.last_name}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {payment.booking?.retreat?.destination || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(payment.payment_type)}>
                            {payment.payment_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${
                              payment.payment_type === "refund"
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {payment.payment_type === "refund" ? "-" : "+"}
                            {formatCurrency(Math.abs(payment.amount), payment.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(payment.status)}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(payment.created_at)}</TableCell>
                        <TableCell className="text-right">
                          {payment.status === "succeeded" &&
                            payment.payment_type !== "refund" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setRefundDialog({
                                    open: true,
                                    payment,
                                    amount: "",
                                    reason: "",
                                    isProcessing: false,
                                  })
                                }
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Refund
                              </Button>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Payments</CardTitle>
              <CardDescription>
                Upcoming and pending scheduled payments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No scheduled payments
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell>
                          {schedule.booking?.booking_number ? (
                            <Link
                              href={`/admin/bookings/${schedule.booking_id}`}
                              className="text-primary hover:underline font-mono text-sm"
                            >
                              {schedule.booking.booking_number}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {schedule.booking
                            ? `${schedule.booking.first_name} ${schedule.booking.last_name}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            #{schedule.payment_number}
                          </Badge>
                        </TableCell>
                        <TableCell>{schedule.description || "-"}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(schedule.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(schedule.due_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(schedule.status)}>
                            {schedule.status}
                          </Badge>
                          {schedule.failure_reason && (
                            <p className="text-xs text-destructive mt-1">
                              {schedule.failure_reason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {schedule.attempts}/{schedule.max_attempts}
                        </TableCell>
                        <TableCell className="text-right">
                          {(schedule.status === "pending" ||
                            schedule.status === "failed") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setCancelDialog({
                                  open: true,
                                  schedule,
                                  reason: "",
                                  isProcessing: false,
                                })
                              }
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog
        open={refundDialog.open}
        onOpenChange={(open) =>
          !refundDialog.isProcessing &&
          setRefundDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Refund payment for{" "}
              {refundDialog.payment?.booking
                ? `${refundDialog.payment.booking.first_name} ${refundDialog.payment.booking.last_name}`
                : "this booking"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Original Amount</Label>
              <p className="text-2xl font-bold">
                {refundDialog.payment &&
                  formatCurrency(
                    refundDialog.payment.amount,
                    refundDialog.payment.currency
                  )}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">
                Refund Amount (leave empty for full refund)
              </Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                placeholder={`Max: ${refundDialog.payment?.amount || 0}`}
                value={refundDialog.amount}
                onChange={(e) =>
                  setRefundDialog((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason (optional)</Label>
              <Textarea
                id="refund-reason"
                placeholder="Reason for refund..."
                value={refundDialog.reason}
                onChange={(e) =>
                  setRefundDialog((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setRefundDialog((prev) => ({ ...prev, open: false }))
              }
              disabled={refundDialog.isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={refundDialog.isProcessing}
            >
              {refundDialog.isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Process Refund
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Schedule Dialog */}
      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) =>
          !cancelDialog.isProcessing &&
          setCancelDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Scheduled Payment</DialogTitle>
            <DialogDescription>
              Cancel payment #{cancelDialog.schedule?.payment_number} for{" "}
              {cancelDialog.schedule?.booking
                ? `${cancelDialog.schedule.booking.first_name} ${cancelDialog.schedule.booking.last_name}`
                : "this booking"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Scheduled Amount</Label>
              <p className="text-2xl font-bold">
                {cancelDialog.schedule &&
                  formatCurrency(cancelDialog.schedule.amount)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <p>
                {cancelDialog.schedule && formatDate(cancelDialog.schedule.due_date)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason (optional)</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Reason for cancellation..."
                value={cancelDialog.reason}
                onChange={(e) =>
                  setCancelDialog((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCancelDialog((prev) => ({ ...prev, open: false }))
              }
              disabled={cancelDialog.isProcessing}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSchedule}
              disabled={cancelDialog.isProcessing}
            >
              {cancelDialog.isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
