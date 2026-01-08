'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Tag,
  Percent,
  Euro,
  Calendar,
  Users,
  Check,
  X,
  Copy,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { PromoCode, Retreat, RetreatRoom } from '@/lib/types/database'

interface PromoCodeWithStats extends PromoCode {
  stats?: {
    totalRedemptions: number
    totalDiscountGiven: number
    totalRevenue: number
    averageDiscount: number
  }
}

interface PromoCodeFormData {
  code: string
  description: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: string
  scope: 'global' | 'retreat' | 'room'
  retreat_id: string
  room_id: string
  valid_from: string
  valid_until: string
  max_uses: string
  min_order_amount: string
  is_active: boolean
}

const defaultFormData: PromoCodeFormData = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  scope: 'global',
  retreat_id: '',
  room_id: '',
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
  max_uses: '',
  min_order_amount: '',
  is_active: true,
}

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCodeWithStats[]>([])
  const [retreats, setRetreats] = useState<Retreat[]>([])
  const [rooms, setRooms] = useState<RetreatRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<PromoCodeFormData>(defaultFormData)

  const fetchPromoCodes = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/promo-codes?stats=true')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch promo codes')
      }

      setPromoCodes(result.data || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load promo codes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchRetreats = useCallback(async () => {
    try {
      const response = await fetch('/api/retreats')
      const result = await response.json()
      setRetreats(result.data || [])
    } catch (error) {
      console.error('Fetch retreats error:', error)
    }
  }, [])

  const fetchRooms = useCallback(async (retreatId: string) => {
    try {
      const response = await fetch(`/api/retreats/${retreatId}/rooms`)
      const result = await response.json()
      setRooms(result.data || [])
    } catch (error) {
      console.error('Fetch rooms error:', error)
    }
  }, [])

  useEffect(() => {
    fetchPromoCodes()
    fetchRetreats()
  }, [fetchPromoCodes, fetchRetreats])

  useEffect(() => {
    if (formData.retreat_id && formData.scope === 'room') {
      fetchRooms(formData.retreat_id)
    }
  }, [formData.retreat_id, formData.scope, fetchRooms])

  const handleOpenDialog = (promoCode?: PromoCodeWithStats) => {
    if (promoCode) {
      setEditingId(promoCode.id)
      setFormData({
        code: promoCode.code,
        description: promoCode.description || '',
        discount_type: promoCode.discount_type,
        discount_value: promoCode.discount_value.toString(),
        scope: promoCode.scope,
        retreat_id: promoCode.retreat_id || '',
        room_id: promoCode.room_id || '',
        valid_from: promoCode.valid_from,
        valid_until: promoCode.valid_until || '',
        max_uses: promoCode.max_uses?.toString() || '',
        min_order_amount: promoCode.min_order_amount?.toString() || '',
        is_active: promoCode.is_active,
      })
      if (promoCode.retreat_id) {
        fetchRooms(promoCode.retreat_id)
      }
    } else {
      setEditingId(null)
      setFormData(defaultFormData)
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    // Validation
    if (!formData.code.trim()) {
      toast.error('Promo code is required')
      return
    }
    if (!formData.discount_value || parseFloat(formData.discount_value) <= 0) {
      toast.error('Valid discount value is required')
      return
    }
    if (formData.discount_type === 'percentage' && parseFloat(formData.discount_value) > 100) {
      toast.error('Percentage discount cannot exceed 100%')
      return
    }
    if (formData.scope === 'retreat' && !formData.retreat_id) {
      toast.error('Please select a retreat')
      return
    }
    if (formData.scope === 'room' && !formData.room_id) {
      toast.error('Please select a room')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ...(editingId && { id: editingId }),
        code: formData.code.toUpperCase().trim(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        scope: formData.scope,
        retreat_id: formData.scope !== 'global' ? formData.retreat_id || null : null,
        room_id: formData.scope === 'room' ? formData.room_id || null : null,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until || null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
        is_active: formData.is_active,
      }

      const response = await fetch('/api/admin/promo-codes', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save promo code')
      }

      toast.success(editingId ? 'Promo code updated' : 'Promo code created')
      setDialogOpen(false)
      fetchPromoCodes()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save promo code')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      const response = await fetch(`/api/admin/promo-codes?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete promo code')
      }

      toast.success('Promo code deleted')
      setPromoCodes((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete promo code')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Copied: ${code}`)
  }

  const handleDuplicate = async (promo: PromoCodeWithStats) => {
    setIsDuplicating(promo.id)
    try {
      // Generate new code with -COPY suffix
      let newCode = `${promo.code}-COPY`
      let counter = 1
      while (promoCodes.some(p => p.code === newCode)) {
        newCode = `${promo.code}-COPY${counter}`
        counter++
      }

      const payload = {
        code: newCode,
        description: promo.description ? `(Copy) ${promo.description}` : '(Copy)',
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        scope: promo.scope,
        retreat_id: promo.retreat_id || null,
        room_id: promo.room_id || null,
        valid_from: new Date().toISOString().split('T')[0], // Reset to today
        valid_until: promo.valid_until || null,
        max_uses: promo.max_uses || null,
        min_order_amount: promo.min_order_amount || null,
        is_active: false, // Draft status
      }

      const response = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to duplicate promo code')
      }

      toast.success(`Duplicated as "${newCode}" (inactive draft)`)
      fetchPromoCodes()
    } catch (error) {
      console.error('Duplicate error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate promo code')
    } finally {
      setIsDuplicating(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Stats cards
  const totalCodes = promoCodes.length
  const activeCodes = promoCodes.filter((p) => p.is_active).length
  const totalRedemptions = promoCodes.reduce((sum, p) => sum + (p.stats?.totalRedemptions || 0), 0)
  const totalDiscountGiven = promoCodes.reduce(
    (sum, p) => sum + (p.stats?.totalDiscountGiven || 0),
    0
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promo Codes</h1>
          <p className="text-muted-foreground">Manage discount codes for your retreats</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPromoCodes} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Promo Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
                <DialogDescription>
                  {editingId
                    ? 'Update the promo code details below'
                    : 'Create a new promotional discount code'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Code */}
                <div className="grid gap-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="SUMMER10"
                    className="uppercase"
                  />
                </div>

                {/* Description */}
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Internal notes about this promo code"
                    rows={2}
                  />
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Discount Type *</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(v: 'percentage' | 'fixed_amount') =>
                        setFormData({ ...formData, discount_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed_amount">Fixed Amount (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="discount_value">
                      Value * {formData.discount_type === 'percentage' ? '(%)' : '(€)'}
                    </Label>
                    <Input
                      id="discount_value"
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
                      min="0"
                      max={formData.discount_type === 'percentage' ? '100' : undefined}
                    />
                  </div>
                </div>

                {/* Scope */}
                <div className="grid gap-2">
                  <Label>Scope</Label>
                  <Select
                    value={formData.scope}
                    onValueChange={(v: 'global' | 'retreat' | 'room') =>
                      setFormData({ ...formData, scope: v, retreat_id: '', room_id: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">All Retreats</SelectItem>
                      <SelectItem value="retreat">Specific Retreat</SelectItem>
                      <SelectItem value="room">Specific Room</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Retreat Selection */}
                {(formData.scope === 'retreat' || formData.scope === 'room') && (
                  <div className="grid gap-2">
                    <Label>Retreat *</Label>
                    <Select
                      value={formData.retreat_id}
                      onValueChange={(v) =>
                        setFormData({ ...formData, retreat_id: v, room_id: '' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a retreat" />
                      </SelectTrigger>
                      <SelectContent>
                        {retreats.map((retreat) => (
                          <SelectItem key={retreat.id} value={retreat.id}>
                            {retreat.destination} ({formatDate(retreat.start_date)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Room Selection */}
                {formData.scope === 'room' && formData.retreat_id && (
                  <div className="grid gap-2">
                    <Label>Room *</Label>
                    <Select
                      value={formData.room_id}
                      onValueChange={(v) => setFormData({ ...formData, room_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} (€{room.price})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="valid_from">Valid From *</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="valid_until">Valid Until</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                {/* Usage Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="max_uses">Max Uses</Label>
                    <Input
                      id="max_uses"
                      type="number"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                      placeholder="Unlimited"
                      min="1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="min_order_amount">Min Order (€)</Label>
                    <Input
                      id="min_order_amount"
                      type="number"
                      value={formData.min_order_amount}
                      onChange={(e) =>
                        setFormData({ ...formData, min_order_amount: e.target.value })
                      }
                      placeholder="No minimum"
                      min="0"
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-sm text-muted-foreground">
                      Deactivate to temporarily disable this code
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCodes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCodes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRedemptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discounts Given</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalDiscountGiven.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Promo Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Promo Codes</CardTitle>
          <CardDescription>Manage your promotional discount codes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : promoCodes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No promo codes found</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first promo code
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-semibold bg-muted px-2 py-1 rounded">
                          {promo.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyCode(promo.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {promo.description && (
                        <p className="text-xs text-muted-foreground mt-1">{promo.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {promo.discount_type === 'percentage' ? (
                          <>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{promo.discount_value}%</span>
                          </>
                        ) : (
                          <>
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{promo.discount_value}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {promo.scope === 'global'
                          ? 'All Retreats'
                          : promo.scope === 'retreat'
                          ? promo.retreat?.destination || 'Retreat'
                          : promo.room?.name || 'Room'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatDate(promo.valid_from)}
                          {promo.valid_until && ` — ${formatDate(promo.valid_until)}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{promo.current_uses}</span>
                        <span className="text-muted-foreground">
                          {promo.max_uses ? ` / ${promo.max_uses}` : ' uses'}
                        </span>
                      </div>
                      {promo.stats && promo.stats.totalDiscountGiven > 0 && (
                        <p className="text-xs text-muted-foreground">
                          €{promo.stats.totalDiscountGiven.toFixed(0)} saved
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                        {promo.is_active ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="mr-1 h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(promo)}
                          disabled={isDuplicating === promo.id}
                          title="Duplicate as draft"
                        >
                          {isDuplicating === promo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(promo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={isDeleting === promo.id}
                            >
                              {isDeleting === promo.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Promo Code?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the promo code &quot;{promo.code}
                                &quot;. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(promo.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
