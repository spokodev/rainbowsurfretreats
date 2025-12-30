"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Mail,
  Edit,
  Eye,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

interface EmailTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  subject: string
  html_content: string
  text_content: string | null
  category: string
  is_active: boolean
  available_variables: string[]
  language: string
  updated_at: string
}

const languageFlags: Record<string, string> = {
  en: '🇺🇸',
  de: '🇩🇪',
  es: '🇪🇸',
  fr: '🇫🇷',
  nl: '🇳🇱',
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean
    template: EmailTemplate | null
    isSaving: boolean
  }>({
    open: false,
    template: null,
    isSaving: false,
  })

  // Preview dialog state
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean
    html: string
    subject: string
    isLoading: boolean
  }>({
    open: false,
    html: "",
    subject: "",
    isLoading: false,
  })

  // Test email dialog state
  const [testDialog, setTestDialog] = useState<{
    open: boolean
    templateId: string | null
    email: string
    isSending: boolean
    result: { success: boolean; message: string } | null
  }>({
    open: false,
    templateId: null,
    email: "",
    isSending: false,
    result: null,
  })

  // Form state for editing
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    subject: "",
    html_content: "",
    is_active: true,
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/email-templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      setTemplates(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  function openEditDialog(template: EmailTemplate) {
    setFormData({
      name: template.name,
      description: template.description || "",
      subject: template.subject,
      html_content: template.html_content,
      is_active: template.is_active,
    })
    setEditDialog({ open: true, template, isSaving: false })
  }

  async function handleSave() {
    if (!editDialog.template) return

    setEditDialog((prev) => ({ ...prev, isSaving: true }))

    try {
      const res = await fetch(`/api/admin/email-templates/${editDialog.template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error("Failed to save template")

      await fetchTemplates()
      setEditDialog({ open: false, template: null, isSaving: false })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template")
      setEditDialog((prev) => ({ ...prev, isSaving: false }))
    }
  }

  async function handlePreview(template: EmailTemplate) {
    setPreviewDialog({ open: true, html: "", subject: "", isLoading: true })

    try {
      const res = await fetch("/api/admin/email-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: template.subject,
          html_content: template.html_content,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate preview")

      const data = await res.json()
      setPreviewDialog({
        open: true,
        html: data.html,
        subject: data.subject,
        isLoading: false,
      })
    } catch {
      setPreviewDialog({ open: false, html: "", subject: "", isLoading: false })
      toast.error("Failed to generate preview")
    }
  }

  async function handleSendTest() {
    if (!testDialog.templateId || !testDialog.email) return

    const template = templates.find((t) => t.id === testDialog.templateId)
    if (!template) return

    setTestDialog((prev) => ({ ...prev, isSending: true, result: null }))

    try {
      const res = await fetch("/api/admin/email-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: template.subject,
          html_content: template.html_content,
          action: "send_test",
          testEmail: testDialog.email,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setTestDialog((prev) => ({
          ...prev,
          isSending: false,
          result: { success: false, message: data.error || "Failed to send" },
        }))
      } else {
        setTestDialog((prev) => ({
          ...prev,
          isSending: false,
          result: { success: true, message: data.message },
        }))
      }
    } catch {
      setTestDialog((prev) => ({
        ...prev,
        isSending: false,
        result: { success: false, message: "Failed to send test email" },
      }))
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "transactional":
        return "default"
      case "marketing":
        return "secondary"
      case "custom":
        return "outline"
      default:
        return "outline"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Error loading templates</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchTemplates} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
          <p className="text-muted-foreground">
            Customize the emails sent to your customers
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Templates
          </CardTitle>
          <CardDescription>
            Click on a template to edit its content. Use variables like{" "}
            <code className="bg-muted px-1 rounded">{"{{firstName}}"}</code> for
            dynamic content.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-lg" title={template.language?.toUpperCase()}>
                      {languageFlags[template.language || 'en'] || '🌐'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? "default" : "secondary"}>
                      {template.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(template.updated_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(template)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setTestDialog({
                            open: true,
                            templateId: template.id,
                            email: "",
                            isSending: false,
                            result: null,
                          })
                        }
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Variables Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Available Variables</CardTitle>
          <CardDescription>
            Use these variables in your templates. They will be replaced with
            actual data when sending emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              "firstName",
              "lastName",
              "bookingNumber",
              "retreatDestination",
              "retreatDates",
              "roomName",
              "totalAmount",
              "depositAmount",
              "balanceDue",
              "amount",
              "paymentNumber",
              "dueDate",
              "daysUntilRetreat",
              "refundAmount",
            ].map((variable) => (
              <code
                key={variable}
                className="bg-muted px-2 py-1 rounded text-sm"
              >
                {`{{${variable}}}`}
              </code>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Conditionals:{" "}
            <code className="bg-muted px-1 rounded">
              {"{{#if variable}}...{{/if}}"}
            </code>
          </p>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) =>
          !editDialog.isSaving && setEditDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {editDialog.template?.name}</DialogTitle>
            <DialogDescription>
              Customize the email content. Use variables for dynamic data.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="content" className="mt-4">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Email subject..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="html_content">HTML Content</Label>
                <Textarea
                  id="html_content"
                  value={formData.html_content}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      html_content: e.target.value,
                    }))
                  }
                  placeholder="<h2>Email content...</h2>"
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What this template is used for..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive templates won&apos;t be used for sending emails
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() =>
                setEditDialog({ open: false, template: null, isSaving: false })
              }
              disabled={editDialog.isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={editDialog.isSaving}>
              {editDialog.isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) =>
          setPreviewDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              Subject: {previewDialog.subject}
            </DialogDescription>
          </DialogHeader>

          {previewDialog.isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                srcDoc={previewDialog.html}
                className="w-full h-[500px]"
                title="Email Preview"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog
        open={testDialog.open}
        onOpenChange={(open) =>
          !testDialog.isSending &&
          setTestDialog((prev) => ({ ...prev, open, result: null }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify the template looks correct.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="your@email.com"
                value={testDialog.email}
                onChange={(e) =>
                  setTestDialog((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            {testDialog.result && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  testDialog.result.success
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {testDialog.result.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {testDialog.result.message}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setTestDialog((prev) => ({ ...prev, open: false, result: null }))
              }
              disabled={testDialog.isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={testDialog.isSending || !testDialog.email}
            >
              {testDialog.isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
