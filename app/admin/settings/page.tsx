"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Save,
  Globe,
  Mail,
  Bell,
  CreditCard,
  Shield,
  Palette,
  Building,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function AdminSettingsPage() {
  // General settings state
  const [siteName, setSiteName] = useState("Rainbow Surf Retreats");
  const [siteDescription, setSiteDescription] = useState(
    "LGBTQ+ surf retreats around the world. Join our inclusive community and catch the perfect wave."
  );
  const [contactEmail, setContactEmail] = useState("hello@rainbowsurfretreats.com");
  const [supportEmail, setSupportEmail] = useState("support@rainbowsurfretreats.com");
  const [phoneNumber, setPhoneNumber] = useState("+1 (555) 123-4567");

  // Notification settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [bookingAlerts, setBookingAlerts] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(true);

  // Payment settings state
  const [currency, setCurrency] = useState("USD");
  const [depositPercentage, setDepositPercentage] = useState("30");
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [paypalEnabled, setPaypalEnabled] = useState(true);

  // Booking settings state
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [requireDeposit, setRequireDeposit] = useState(true);
  const [cancellationDays, setCancellationDays] = useState("30");
  const [maxParticipants, setMaxParticipants] = useState("14");

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Settings saved");
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your site configuration and preferences
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>
              Basic information about your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteDescription">Site Description</Label>
              <Textarea
                id="siteDescription"
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Email Settings</CardTitle>
            </div>
            <CardDescription>
              Configure email addresses for communication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support Email</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Email Templates Link */}
            <Link
              href="/admin/settings/emails"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Email Templates</div>
                  <div className="text-sm text-muted-foreground">
                    Customize the content of automated emails
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for important updates
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Booking Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when new bookings are made
                </p>
              </div>
              <Switch
                checked={bookingAlerts}
                onCheckedChange={setBookingAlerts}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payment Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when payments are received
                </p>
              </div>
              <Switch
                checked={paymentAlerts}
                onCheckedChange={setPaymentAlerts}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Receive marketing and promotional emails
                </p>
              </div>
              <Switch
                checked={marketingEmails}
                onCheckedChange={setMarketingEmails}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly summary reports via email
                </p>
              </div>
              <Switch
                checked={weeklyReports}
                onCheckedChange={setWeeklyReports}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Payment Settings</CardTitle>
            </div>
            <CardDescription>
              Configure payment options and methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="USD"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositPercentage">Deposit Percentage</Label>
                <Input
                  id="depositPercentage"
                  type="number"
                  value={depositPercentage}
                  onChange={(e) => setDepositPercentage(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Stripe Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Accept credit card payments via Stripe
                </p>
              </div>
              <Switch
                checked={stripeEnabled}
                onCheckedChange={setStripeEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>PayPal Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Accept payments via PayPal
                </p>
              </div>
              <Switch
                checked={paypalEnabled}
                onCheckedChange={setPaypalEnabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Booking Settings</CardTitle>
            </div>
            <CardDescription>
              Configure booking rules and policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cancellationDays">
                  Cancellation Period (days)
                </Label>
                <Input
                  id="cancellationDays"
                  type="number"
                  value={cancellationDays}
                  onChange={(e) => setCancellationDays(e.target.value)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  Days before retreat for full refund
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">
                  Default Max Participants
                </Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  placeholder="14"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum participants per retreat
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Confirm Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically confirm bookings when payment is received
                </p>
              </div>
              <Switch
                checked={autoConfirm}
                onCheckedChange={setAutoConfirm}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Deposit</Label>
                <p className="text-sm text-muted-foreground">
                  Require deposit payment to confirm booking
                </p>
              </div>
              <Switch
                checked={requireDeposit}
                onCheckedChange={setRequireDeposit}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
