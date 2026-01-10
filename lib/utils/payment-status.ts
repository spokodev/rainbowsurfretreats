import { CheckCircle, Clock, AlertCircle, type LucideIcon } from 'lucide-react'
import type { PaymentStatus } from '@/lib/types/database'

interface PaymentStatusConfig {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: LucideIcon
  label: string
  className: string
}

/**
 * Shared payment status configuration for consistent UI across admin pages
 * Use this instead of duplicating the configuration in each component
 */
export function getPaymentStatusConfig(status: PaymentStatus): PaymentStatusConfig {
  const config: Record<PaymentStatus, PaymentStatusConfig> = {
    paid: {
      variant: 'default',
      icon: CheckCircle,
      label: 'Paid',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    deposit: {
      variant: 'secondary',
      icon: Clock,
      label: 'Deposit',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    unpaid: {
      variant: 'destructive',
      icon: AlertCircle,
      label: 'Unpaid',
      className: 'bg-red-100 text-red-800 border-red-200',
    },
    refunded: {
      variant: 'outline',
      icon: AlertCircle,
      label: 'Refunded',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
    partial_refund: {
      variant: 'outline',
      icon: AlertCircle,
      label: 'Partial Refund',
      className: 'bg-orange-100 text-orange-800 border-orange-200',
    },
  }
  return config[status] || config.unpaid
}

/**
 * Helper to get just the badge variant for simple Badge components
 */
export function getPaymentBadgeVariant(status: PaymentStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  return getPaymentStatusConfig(status).variant
}
