"use client";

import { useState, useMemo } from "react";
import {
  useVendors,
  useVendor,
  useCreateVendor,
  useUpdateVendor,
  useDeleteVendor,
} from "@/hooks/use-vendors";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  CreditCard,
  Trash2,
  FileText,
  Store,
} from "lucide-react";

/* ---------- helpers ---------- */

const formatCurrency = (amount: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount));

/* ---------- types ---------- */

interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

interface Vendor {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  website: string | null;
  address: Address | null;
  taxId: string | null;
  notes: string | null;
  paymentTerms: string | null;
  is1099: boolean;
  balance: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  bills?: Bill[];
  billPayments?: BillPayment[];
}

interface Bill {
  id: string;
  billNumber: string;
  date: string;
  dueDate: string;
  status: string;
  total: number | string;
  amountDue: number | string;
}

interface BillPayment {
  id: string;
  paymentNumber: string;
  date: string;
  amount: number | string;
  method: string | null;
}

type AddressFormData = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type FormData = {
  name: string;
  company: string;
  email: string;
  phone: string;
  mobile: string;
  fax: string;
  website: string;
  address: AddressFormData;
  taxId: string;
  notes: string;
  paymentTerms: string;
  is1099: boolean;
};

const emptyAddress: AddressFormData = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  zip: "",
  country: "",
};

const emptyForm: FormData = {
  name: "",
  company: "",
  email: "",
  phone: "",
  mobile: "",
  fax: "",
  website: "",
  address: { ...emptyAddress },
  taxId: "",
  notes: "",
  paymentTerms: "",
  is1099: false,
};

function addressToForm(addr: Address | null | undefined): AddressFormData {
  if (!addr) return { ...emptyAddress };
  return {
    line1: addr.line1 ?? "",
    line2: addr.line2 ?? "",
    city: addr.city ?? "",
    state: addr.state ?? "",
    zip: addr.zip ?? "",
    country: addr.country ?? "",
  };
}

function formToAddress(addr: AddressFormData): Address | null {
  const hasValue = Object.values(addr).some((v) => v.trim() !== "");
  if (!hasValue) return null;
  const result: Address = {};
  if (addr.line1.trim()) result.line1 = addr.line1.trim();
  if (addr.line2.trim()) result.line2 = addr.line2.trim();
  if (addr.city.trim()) result.city = addr.city.trim();
  if (addr.state.trim()) result.state = addr.state.trim();
  if (addr.zip.trim()) result.zip = addr.zip.trim();
  if (addr.country.trim()) result.country = addr.country.trim();
  return result;
}

function formatAddress(addr: Address | null | undefined): string {
  if (!addr) return "Not provided";
  const parts: string[] = [];
  if (addr.line1) parts.push(addr.line1);
  if (addr.line2) parts.push(addr.line2);
  const cityLine = [addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
  if (cityLine) parts.push(cityLine);
  if (addr.country) parts.push(addr.country);
  return parts.length > 0 ? parts.join("\n") : "Not provided";
}

/* ---------- page ---------- */

export default function VendorsPage() {
  /* -- filters -- */
  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState<"true" | "">("true");
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("transactions");

  /* -- dialog state -- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  /* -- data -- */
  const { data: vendorsData, isLoading } = useVendors({
    search: search || undefined,
    active: showActive || undefined,
  });
  const vendors = (vendorsData?.vendors ?? []) as Vendor[];

  const { data: selectedVendorRaw } = useVendor(selectedId);
  const selectedVendor = selectedVendorRaw as Vendor | undefined;

  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();
  const deleteMutation = useDeleteVendor();

  /* -- filtered list for display -- */
  const filteredVendors = useMemo(() => {
    return vendors;
  }, [vendors]);

  /* -- dialog helpers -- */
  function openCreate() {
    setEditingVendor(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setForm({
      name: vendor.name,
      company: vendor.company ?? "",
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      mobile: vendor.mobile ?? "",
      fax: vendor.fax ?? "",
      website: vendor.website ?? "",
      address: addressToForm(vendor.address),
      taxId: vendor.taxId ?? "",
      notes: vendor.notes ?? "",
      paymentTerms: vendor.paymentTerms ?? "",
      is1099: vendor.is1099 ?? false,
    });
    setDialogOpen(true);
  }

  function handleDelete(vendor: Vendor) {
    if (!confirm(`Deactivate "${vendor.name}"? This will hide the vendor from active lists.`)) {
      return;
    }
    deleteMutation.mutate(vendor.id, {
      onSuccess: () => {
        toast.success(`"${vendor.name}" deactivated`);
        if (selectedId === vendor.id) setSelectedId("");
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Failed to deactivate"),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
    };
    if (form.company.trim()) payload.company = form.company.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.mobile.trim()) payload.mobile = form.mobile.trim();
    if (form.fax.trim()) payload.fax = form.fax.trim();
    if (form.website.trim()) payload.website = form.website.trim();
    if (form.taxId.trim()) payload.taxId = form.taxId.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();
    if (form.paymentTerms.trim()) payload.paymentTerms = form.paymentTerms.trim();
    payload.is1099 = form.is1099;

    const address = formToAddress(form.address);
    if (address) payload.address = address;

    if (editingVendor) {
      updateMutation.mutate(
        { id: editingVendor.id, data: payload },
        {
          onSuccess: () => {
            toast.success(`"${form.name}" updated`);
            setDialogOpen(false);
          },
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Failed to update vendor"),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(`"${form.name}" created`);
          setDialogOpen(false);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to create vendor"),
      });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  /* -- field updater -- */
  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setAddressField(field: keyof AddressFormData, value: string) {
    setForm((f) => ({
      ...f,
      address: { ...f.address, [field]: value },
    }));
  }

  /* ---------- render ---------- */
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ========== Toolbar ========== */}
      <div className="flex items-center gap-3 border-b bg-gradient-to-b from-orange-50 to-white px-4 py-2">
        <h1 className="text-base font-bold text-orange-900 mr-2">Vendor Center</h1>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Active / All toggle */}
        <div className="flex items-center rounded-md border bg-white">
          <button
            type="button"
            onClick={() => setShowActive("true")}
            className={`px-3 py-1 text-xs font-medium rounded-l-md transition-colors ${
              showActive === "true"
                ? "bg-orange-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setShowActive("")}
            className={`px-3 py-1 text-xs font-medium rounded-r-md transition-colors ${
              showActive === ""
                ? "bg-orange-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            All
          </button>
        </div>

        {/* New Vendor */}
        <Button size="sm" onClick={openCreate} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="size-4 mr-1" />
          New Vendor
        </Button>
      </div>

      {/* ========== Main content: left panel + right panel ========== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---------- Left panel: Vendor list ---------- */}
        <div className="w-80 border-r bg-white flex flex-col">
          <div className="px-3 py-2 border-b bg-gray-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {filteredVendors.length} Vendor{filteredVendors.length !== 1 && "s"}
            </span>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="divide-y">
              {isLoading ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Loading vendors...
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No vendors found.
                </div>
              ) : (
                filteredVendors.map((vendor) => (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(vendor.id);
                      setActiveTab("transactions");
                    }}
                    className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-orange-50 ${
                      selectedId === vendor.id
                        ? "bg-orange-100 border-l-2 border-l-orange-600"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {vendor.name}
                        </div>
                        {vendor.company && (
                          <div className="text-xs text-gray-500 truncate">
                            {vendor.company}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-mono tabular-nums ${
                            Number(vendor.balance) < 0
                              ? "text-red-600"
                              : Number(vendor.balance) > 0
                                ? "text-gray-900"
                                : "text-gray-400"
                          }`}
                        >
                          {formatCurrency(vendor.balance)}
                        </div>
                        {!vendor.isActive && (
                          <Badge variant="outline" className="text-[10px] mt-0.5">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ---------- Right panel: Details ---------- */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {!selectedId || !selectedVendor ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Store className="size-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a vendor to view details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Vendor header */}
              <div className="flex items-center justify-between border-b bg-white px-5 py-3">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {selectedVendor.name}
                    </h2>
                    {selectedVendor.company && (
                      <p className="text-sm text-gray-500">{selectedVendor.company}</p>
                    )}
                  </div>
                  {selectedVendor.is1099 && (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                      1099
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">AP Balance</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-orange-900">
                      {formatCurrency(selectedVendor.balance)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(selectedVendor)}
                  >
                    Edit
                  </Button>
                  {selectedVendor.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(selectedVendor)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as string)}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <TabsList variant="line" className="px-5 border-b bg-white shrink-0">
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="information">Information</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                {/* -- Transactions Tab -- */}
                <TabsContent value="transactions" className="flex-1 overflow-auto p-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(!selectedVendor.bills || selectedVendor.bills.length === 0) &&
                       (!selectedVendor.billPayments || selectedVendor.billPayments.length === 0) ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                          No transactions yet.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/60">
                              <TableHead>Type</TableHead>
                              <TableHead>Number</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(selectedVendor.bills ?? []).map((bill) => (
                              <TableRow key={bill.id}>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[11px]">
                                    Bill
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {bill.billNumber}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {new Date(bill.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      bill.status === "PAID"
                                        ? "secondary"
                                        : bill.status === "VOIDED"
                                          ? "destructive"
                                          : "outline"
                                    }
                                    className="text-[11px]"
                                  >
                                    {bill.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-xs">
                                  {formatCurrency(bill.total)}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-xs">
                                  {formatCurrency(bill.amountDue)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {(selectedVendor.billPayments ?? []).map((pmt) => (
                              <TableRow key={pmt.id}>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[11px] bg-orange-100 text-orange-800">
                                    Payment
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {pmt.paymentNumber}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {new Date(pmt.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[11px]">
                                    {pmt.method ?? "N/A"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-xs text-orange-700">
                                  -{formatCurrency(pmt.amount)}
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                  --
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* -- Information Tab -- */}
                <TabsContent value="information" className="flex-1 overflow-auto p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Contact Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Store className="size-4 text-orange-600" />
                          Contact Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <Mail className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-xs text-gray-500">Email</dt>
                              <dd className="text-gray-900">
                                {selectedVendor.email || "Not provided"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-xs text-gray-500">Phone</dt>
                              <dd className="text-gray-900">
                                {selectedVendor.phone || "Not provided"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-xs text-gray-500">Mobile</dt>
                              <dd className="text-gray-900">
                                {selectedVendor.mobile || "Not provided"}
                              </dd>
                            </div>
                          </div>
                          {selectedVendor.fax && (
                            <div className="flex items-start gap-2">
                              <Phone className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                              <div>
                                <dt className="text-xs text-gray-500">Fax</dt>
                                <dd className="text-gray-900">{selectedVendor.fax}</dd>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <Globe className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-xs text-gray-500">Website</dt>
                              <dd className="text-gray-900">
                                {selectedVendor.website || "Not provided"}
                              </dd>
                            </div>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>

                    {/* Payment Info */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CreditCard className="size-4 text-orange-600" />
                          Payment Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-xs text-gray-500">Payment Terms</dt>
                            <dd className="text-gray-900">
                              {selectedVendor.paymentTerms ?? "Not set"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Tax ID</dt>
                            <dd className="text-gray-900">
                              {selectedVendor.taxId || "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">1099 Vendor</dt>
                            <dd>
                              {selectedVendor.is1099 ? (
                                <Badge className="text-[11px] bg-orange-100 text-orange-800 border-orange-200">
                                  Yes - 1099
                                </Badge>
                              ) : (
                                <span className="text-gray-500">No</span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Status</dt>
                            <dd>
                              {selectedVendor.isActive ? (
                                <Badge variant="secondary" className="text-[11px]">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                  Inactive
                                </Badge>
                              )}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>

                    {/* Address */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="size-4 text-orange-600" />
                          Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-900 whitespace-pre-line">
                          {formatAddress(selectedVendor.address)}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="size-4 text-orange-600" />
                          Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-xs text-gray-500">Total Bills</dt>
                            <dd className="text-gray-900">
                              {selectedVendor.bills?.length ?? 0}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Total Payments</dt>
                            <dd className="text-gray-900">
                              {selectedVendor.billPayments?.length ?? 0}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Member Since</dt>
                            <dd className="text-gray-900">
                              {new Date(selectedVendor.createdAt).toLocaleDateString()}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* -- Notes Tab -- */}
                <TabsContent value="notes" className="flex-1 overflow-auto p-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <NotesEditor
                        vendorId={selectedVendor.id}
                        initialNotes={selectedVendor.notes ?? ""}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* ========== New / Edit Vendor Dialog ========== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVendor ? "Edit Vendor" : "New Vendor"}
            </DialogTitle>
            <DialogDescription>
              {editingVendor
                ? "Update the vendor details below."
                : "Fill in the details to create a new vendor."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-5 py-2">
            {/* ---- Contact Section ---- */}
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-orange-800 border-b border-orange-200 pb-1 mb-1">
                Contact
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="vend-name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Full name or display name"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-company">Company</Label>
                  <Input
                    id="vend-company"
                    value={form.company}
                    onChange={(e) => setField("company", e.target.value)}
                    placeholder="Company name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-email">Email</Label>
                  <Input
                    id="vend-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-phone">Phone</Label>
                  <Input
                    id="vend-phone"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-mobile">Mobile</Label>
                  <Input
                    id="vend-mobile"
                    value={form.mobile}
                    onChange={(e) => setField("mobile", e.target.value)}
                    placeholder="(555) 987-6543"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-fax">Fax</Label>
                  <Input
                    id="vend-fax"
                    value={form.fax}
                    onChange={(e) => setField("fax", e.target.value)}
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-website">Website</Label>
                  <Input
                    id="vend-website"
                    value={form.website}
                    onChange={(e) => setField("website", e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </fieldset>

            {/* ---- Address Section ---- */}
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-orange-800 border-b border-orange-200 pb-1 mb-1">
                Address
              </legend>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-line1">Address Line 1</Label>
                  <Input
                    id="vend-line1"
                    value={form.address.line1}
                    onChange={(e) => setAddressField("line1", e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-line2">Address Line 2</Label>
                  <Input
                    id="vend-line2"
                    value={form.address.line2}
                    onChange={(e) => setAddressField("line2", e.target.value)}
                    placeholder="Suite 100"
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="grid gap-1.5 col-span-2">
                    <Label htmlFor="vend-city">City</Label>
                    <Input
                      id="vend-city"
                      value={form.address.city}
                      onChange={(e) => setAddressField("city", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="vend-state">State</Label>
                    <Input
                      id="vend-state"
                      value={form.address.state}
                      onChange={(e) => setAddressField("state", e.target.value)}
                      placeholder="ST"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="vend-zip">ZIP</Label>
                    <Input
                      id="vend-zip"
                      value={form.address.zip}
                      onChange={(e) => setAddressField("zip", e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-country">Country</Label>
                  <Input
                    id="vend-country"
                    value={form.address.country}
                    onChange={(e) => setAddressField("country", e.target.value)}
                    placeholder="United States"
                  />
                </div>
              </div>
            </fieldset>

            {/* ---- Payment Section ---- */}
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-orange-800 border-b border-orange-200 pb-1 mb-1">
                Payment
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-terms">Payment Terms</Label>
                  <Input
                    id="vend-terms"
                    value={form.paymentTerms}
                    onChange={(e) => setField("paymentTerms", e.target.value)}
                    placeholder="Net 30, Due on receipt..."
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="vend-taxid">Tax ID</Label>
                  <Input
                    id="vend-taxid"
                    value={form.taxId}
                    onChange={(e) => setField("taxId", e.target.value)}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Checkbox
                  id="vend-1099"
                  checked={form.is1099}
                  onCheckedChange={(checked) =>
                    setField("is1099", checked === true)
                  }
                />
                <Label htmlFor="vend-1099" className="text-sm font-normal cursor-pointer">
                  This vendor is eligible for 1099 reporting
                </Label>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="vend-notes">Notes</Label>
                <Textarea
                  id="vend-notes"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Internal notes about this vendor..."
                  rows={3}
                />
              </div>
            </fieldset>

            {/* Footer */}
            <DialogFooter className="-mx-4 -mb-2 mt-2">
              <DialogClose
                render={<Button variant="outline" type="button" />}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isSaving} className="bg-orange-600 hover:bg-orange-700">
                {isSaving
                  ? "Saving..."
                  : editingVendor
                    ? "Save Changes"
                    : "Create Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Notes Editor sub-component ---------- */

function NotesEditor({
  vendorId,
  initialNotes,
}: {
  vendorId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isDirty, setIsDirty] = useState(false);
  const updateMutation = useUpdateVendor();

  function handleSave() {
    updateMutation.mutate(
      { id: vendorId, data: { notes: notes.trim() || null } },
      {
        onSuccess: () => {
          toast.success("Notes saved");
          setIsDirty(false);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to save notes"),
      }
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setIsDirty(true);
        }}
        placeholder="Add notes about this vendor..."
        rows={6}
        className="resize-y"
      />
      {isDirty && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {updateMutation.isPending ? "Saving..." : "Save Notes"}
          </Button>
        </div>
      )}
    </div>
  );
}
