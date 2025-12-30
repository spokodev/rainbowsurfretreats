"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CancelBookingDialog } from "./cancel-booking-dialog";
import { RefundDialog } from "./refund-dialog";
import {
  CheckCircle,
  XCircle,
  CreditCard,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
}

interface BookingActionsProps {
  bookingId: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  payments: Payment[];
  retreatEndDate: string;
}

export function BookingActions({
  bookingId,
  bookingNumber,
  status,
  paymentStatus,
  payments,
  retreatEndDate,
}: BookingActionsProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const retreatEnded = new Date(retreatEndDate) < new Date();
  const canConfirm = status === "pending" && paymentStatus !== "unpaid";
  const canCancel = status !== "cancelled" && status !== "completed";
  const canRefund = paymentStatus === "paid" || paymentStatus === "deposit";
  const canComplete = status === "confirmed" && retreatEnded;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to confirm booking");
      }

      toast.success("Booking confirmed successfully");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm booking");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete booking");
      }

      toast.success("Booking marked as completed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete booking");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCancelSuccess = () => {
    toast.success("Booking cancelled successfully");
    router.refresh();
  };

  const handleRefundSuccess = () => {
    toast.success("Refund processed successfully");
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canConfirm && (
          <Button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="bg-green-600 hover:bg-green-700"
          >
            {isConfirming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Confirm Booking
          </Button>
        )}

        {canComplete && (
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            variant="outline"
          >
            {isCompleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            Mark Completed
          </Button>
        )}

        {canRefund && (
          <Button
            variant="outline"
            onClick={() => setShowRefundDialog(true)}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Process Refund
          </Button>
        )}

        {canCancel && (
          <Button
            variant="destructive"
            onClick={() => setShowCancelDialog(true)}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Booking
          </Button>
        )}
      </div>

      <CancelBookingDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        bookingId={bookingId}
        bookingNumber={bookingNumber}
        paymentStatus={paymentStatus}
        onSuccess={handleCancelSuccess}
      />

      <RefundDialog
        open={showRefundDialog}
        onOpenChange={setShowRefundDialog}
        bookingId={bookingId}
        bookingNumber={bookingNumber}
        payments={payments}
        onSuccess={handleRefundSuccess}
      />
    </>
  );
}
