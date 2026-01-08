"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mail,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailLog {
  id: string;
  email_type: string;
  recipient_email: string;
  recipient_type: "customer" | "admin";
  subject: string;
  booking_id: string | null;
  payment_id: string | null;
  resend_email_id: string | null;
  status: "sent" | "delivered" | "failed" | "bounced";
  error_message: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  bounce_reason: string | null;
  complained_at: string | null;
  open_count: number;
  click_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  booking?: {
    id: string;
    booking_number: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const EMAIL_TYPES = [
  { value: "", label: "All Types" },
  { value: "payment_failed", label: "Payment Failed" },
  { value: "deadline_reminder", label: "Deadline Reminder" },
  { value: "booking_confirmation", label: "Booking Confirmation" },
  { value: "booking_cancelled", label: "Booking Cancelled" },
  { value: "admin_payment_failed", label: "Admin: Payment Failed" },
  { value: "admin_waitlist_join", label: "Admin: Waitlist Join" },
  { value: "admin_new_booking", label: "Admin: New Booking" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "sent", label: "Sent" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "bounced", label: "Bounced" },
];

const RECIPIENT_TYPES = [
  { value: "", label: "All Recipients" },
  { value: "customer", label: "Customer" },
  { value: "admin", label: "Admin" },
];

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "delivered":
      return "default";
    case "sent":
      return "secondary";
    case "failed":
    case "bounced":
      return "destructive";
    default:
      return "outline";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "delivered":
      return <CheckCircle className="h-3 w-3" />;
    case "sent":
      return <Clock className="h-3 w-3" />;
    case "failed":
    case "bounced":
      return <XCircle className="h-3 w-3" />;
    default:
      return null;
  }
};

const getTypeLabel = (type: string) => {
  const found = EMAIL_TYPES.find((t) => t.value === type);
  return found?.label || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateForInput = (date: Date) => {
  return date.toISOString().split("T")[0];
};

const exportToCSV = (logs: EmailLog[]) => {
  const headers = [
    "Date",
    "Type",
    "Recipient",
    "Recipient Type",
    "Subject",
    "Status",
    "Delivered",
    "Opened",
    "Clicked",
    "Booking",
    "Error",
  ];

  const rows = logs.map((log) => [
    new Date(log.created_at).toISOString(),
    log.email_type,
    log.recipient_email,
    log.recipient_type,
    log.subject,
    log.status,
    log.delivered_at ? "Yes" : "No",
    log.opened_at ? `Yes (${log.open_count}x)` : "No",
    log.clicked_at ? `Yes (${log.click_count}x)` : "No",
    log.booking?.booking_number || "",
    log.error_message || log.bounce_reason || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `email-logs-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function AdminEmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    recipientType: "",
    search: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, filters]);

  async function fetchLogs() {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.type) params.append("type", filters.type);
      if (filters.status) params.append("status", filters.status);
      if (filters.recipientType)
        params.append("recipientType", filters.recipientType);
      if (filters.search) params.append("search", filters.search);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const res = await fetch(`/api/admin/email-logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch email logs");
      const data = await res.json();

      setLogs(data.data || []);
      setPagination((prev) => ({
        ...prev,
        ...data.pagination,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  function clearFilters() {
    setFilters({
      type: "",
      status: "",
      recipientType: "",
      search: "",
      dateFrom: "",
      dateTo: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  // Calculate stats from current view
  const stats = {
    sent: logs.filter((l) => l.status === "sent").length,
    delivered: logs.filter((l) => l.status === "delivered").length,
    failed: logs.filter((l) => l.status === "failed" || l.status === "bounced")
      .length,
    opened: logs.filter((l) => l.opened_at).length,
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Error loading email logs</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchLogs} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Logs</h1>
          <p className="text-muted-foreground">
            Track all sent emails with delivery and engagement status
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => exportToCSV(logs)}
            disabled={logs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sent
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
            <p className="text-xs text-muted-foreground">Total emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.delivered}
            </div>
            <p className="text-xs text-muted-foreground">In current view</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed/Bounced
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.failed}
            </div>
            <p className="text-xs text-muted-foreground">In current view</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opened
            </CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.opened}
            </div>
            <p className="text-xs text-muted-foreground">In current view</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <div className="space-y-2">
                <Label>Email Type</Label>
                <Select
                  value={filters.type}
                  onValueChange={(v) => handleFilterChange("type", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value || "all"}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => handleFilterChange("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem
                        key={status.value}
                        value={status.value || "all"}
                      >
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recipient Type</Label>
                <Select
                  value={filters.recipientType}
                  onValueChange={(v) => handleFilterChange("recipientType", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Recipients" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECIPIENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value || "all"}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Search Email</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Email address..."
                    className="pl-8"
                    value={filters.search}
                    onChange={(e) =>
                      handleFilterChange("search", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Activity</CardTitle>
          <CardDescription>
            Showing {logs.length} of {pagination.total} emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email logs found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Booking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.recipient_type === "admin"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {getTypeLabel(log.email_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm truncate max-w-[200px]">
                            {log.recipient_email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.recipient_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-sm truncate block max-w-[250px]"
                          title={log.subject}
                        >
                          {log.subject}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={getStatusBadgeVariant(log.status)}
                            className="gap-1 w-fit"
                          >
                            {getStatusIcon(log.status)}
                            {log.status}
                          </Badge>
                          {log.error_message && (
                            <span
                              className="text-xs text-destructive truncate max-w-[150px]"
                              title={log.error_message}
                            >
                              {log.error_message}
                            </span>
                          )}
                          {log.bounce_reason && (
                            <span
                              className="text-xs text-destructive truncate max-w-[150px]"
                              title={log.bounce_reason}
                            >
                              {log.bounce_reason}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.delivered_at && (
                            <span
                              className="text-green-600"
                              title={`Delivered: ${formatDate(log.delivered_at)}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </span>
                          )}
                          {log.opened_at && (
                            <span
                              className="text-blue-600 flex items-center gap-0.5"
                              title={`Opened: ${formatDate(log.opened_at)}`}
                            >
                              <Eye className="h-4 w-4" />
                              {log.open_count > 1 && (
                                <span className="text-xs">{log.open_count}</span>
                              )}
                            </span>
                          )}
                          {log.clicked_at && (
                            <span
                              className="text-purple-600 flex items-center gap-0.5"
                              title={`Clicked: ${formatDate(log.clicked_at)}`}
                            >
                              <MousePointer className="h-4 w-4" />
                              {log.click_count > 1 && (
                                <span className="text-xs">{log.click_count}</span>
                              )}
                            </span>
                          )}
                          {log.complained_at && (
                            <span
                              className="text-orange-600"
                              title={`Spam complaint: ${formatDate(log.complained_at)}`}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </span>
                          )}
                          {!log.delivered_at &&
                            !log.opened_at &&
                            !log.clicked_at &&
                            log.status === "sent" && (
                              <span className="text-muted-foreground text-xs">
                                Pending
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.booking?.booking_number ? (
                          <Link
                            href={`/admin/bookings/${log.booking_id}`}
                            className="text-primary hover:underline font-mono text-sm"
                          >
                            {log.booking.booking_number}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
