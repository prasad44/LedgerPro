"use client";

import { useState, useMemo } from "react";
import {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "@/hooks/use-customers";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Plus,
  UserCircle,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  CreditCard,
  Trash2,
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

interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  website: string | null;
  billingAddress: Address | null;
  shippingAddress: Address | null;
  taxId: string | null;
  notes: string | null;
  paymentTermsId: string | null;
  paymentTerms: { id: string; name: string; daysUntilDue: number } | null;
  creditLimit: number | string | null;
  balance: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  invoices?: Invoice[];
  payments?: Payment[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: string;
  totalAmount: number | string;
  amountDue: number | string;
}

interface Payment {
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
  billingAddress: AddressFormData;
  shippingAddress: AddressFormData;
  taxId: string;
  notes: string;
  paymentTermsId: string;
  creditLimit: string;
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
  billingAddress: { ...emptyAddress },
  shippingAddress: { ...emptyAddress },
  taxId: "",
  notes: "",
  paymentTermsId: "",
  creditLimit: "",
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

export default function CustomersPage() {
  /* -- filters -- */
  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState<"true" | "">("true");
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("transactions");

  /* -- dialog state -- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  /* -- data -- */
  const { data: customersData, isLoading } = useCustomers({
    search: search || undefined,
    active: showActive || undefined,
  });
  const customers = (customersData?.customers ?? []) as Customer[];

  const { data: selectedCustomerRaw } = useCustomer(selectedId);
  const selectedCustomer = selectedCustomerRaw as Customer | undefined;

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  /* -- filtered list for display -- */
  const filteredCustomers = useMemo(() => {
    return customers;
  }, [customers]);

  /* -- dialog helpers -- */
  function openCreate() {
    setEditingCustomer(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      company: customer.company ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      mobile: customer.mobile ?? "",
      fax: customer.fax ?? "",
      website: customer.website ?? "",
      billingAddress: addressToForm(customer.billingAddress),
      shippingAddress: addressToForm(customer.shippingAddress),
      taxId: customer.taxId ?? "",
      notes: customer.notes ?? "",
      paymentTermsId: customer.paymentTermsId ?? "",
      creditLimit: customer.creditLimit != null ? String(customer.creditLimit) : "",
    });
    setDialogOpen(true);
  }

  function handleDelete(customer: Customer) {
    if (!confirm(`Deactivate "${customer.name}"? This will hide the customer from active lists.`)) {
      return;
    }
    deleteMutation.mutate(customer.id, {
      onSuccess: () => {
        toast.success(`"${customer.name}" deactivated`);
        if (selectedId === customer.id) setSelectedId("");
      },
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : "Failed to deactivate"),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Customer name is required");
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
    if (form.paymentTermsId) payload.paymentTermsId = form.paymentTermsId;
    if (form.creditLimit.trim()) payload.creditLimit = Number(form.creditLimit);

    const billing = formToAddress(form.billingAddress);
    const shipping = formToAddress(form.shippingAddress);
    if (billing) payload.billingAddress = billing;
    if (shipping) payload.shippingAddress = shipping;

    if (editingCustomer) {
      updateMutation.mutate(
        { id: editingCustomer.id, data: payload },
        {
          onSuccess: () => {
            toast.success(`"${form.name}" updated`);
            setDialogOpen(false);
          },
          onError: (err) =>
            toast.error(err instanceof Error ? err.message : "Failed to update customer"),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(`"${form.name}" created`);
          setDialogOpen(false);
        },
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : "Failed to create customer"),
      });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  /* -- field updater -- */
  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setAddressField(
    type: "billingAddress" | "shippingAddress",
    field: keyof AddressFormData,
    value: string
  ) {
    setForm((f) => ({
      ...f,
      [type]: { ...f[type], [field]: value },
    }));
  }

  /* ---------- render ---------- */
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ========== Toolbar ========== */}
      <div className="flex items-center gap-3 border-b bg-gradient-to-b from-blue-50 to-white px-4 py-2">
        <h1 className="text-base font-bold text-blue-900 mr-2">Customer Center</h1>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
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
                ? "bg-blue-600 text-white"
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
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            All
          </button>
        </div>

        {/* New Customer */}
        <Button size="sm" onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="size-4 mr-1" />
          New Customer
        </Button>
      </div>

      {/* ========== Main content: left panel + right panel ========== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---------- Left panel: Customer list ---------- */}
        <div className="w-80 border-r bg-white flex flex-col">
          <div className="px-3 py-2 border-b bg-gray-50">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {filteredCustomers.length} Customer{filteredCustomers.length !== 1 && "s"}
            </span>
          </div>
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="divide-y">
              {isLoading ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Loading customers...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No customers found.
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(customer.id);
                      setActiveTab("transactions");
                    }}
                    className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-blue-50 ${
                      selectedId === customer.id
                        ? "bg-blue-100 border-l-2 border-l-blue-600"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {customer.name}
                        </div>
                        {customer.company && (
                          <div className="text-xs text-gray-500 truncate">
                            {customer.company}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-mono tabular-nums ${
                            Number(customer.balance) < 0
                              ? "text-red-600"
                              : Number(customer.balance) > 0
                                ? "text-gray-900"
                                : "text-gray-400"
                          }`}
                        >
                          {formatCurrency(customer.balance)}
                        </div>
                        {!customer.isActive && (
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
          {!selectedId || !selectedCustomer ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <UserCircle className="size-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a customer to view details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Customer header */}
              <div className="flex items-center justify-between border-b bg-white px-5 py-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedCustomer.name}
                  </h2>
                  {selectedCustomer.company && (
                    <p className="text-sm text-gray-500">{selectedCustomer.company}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-3">
                    <div className="text-xs text-gray-500 uppercase tracking-wider">Balance</div>
                    <div className="text-lg font-bold font-mono tabular-nums text-blue-900">
                      {formatCurrency(selectedCustomer.balance)}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(selectedCustomer)}
                  >
                    Edit
                  </Button>
                  {selectedCustomer.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(selectedCustomer)}
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
                      {(!selectedCustomer.invoices || selectedCustomer.invoices.length === 0) &&
                       (!selectedCustomer.payments || selectedCustomer.payments.length === 0) ? (
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
                            {(selectedCustomer.invoices ?? []).map((inv) => (
                              <TableRow key={inv.id}>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[11px]">
                                    Invoice
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {inv.invoiceNumber}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {new Date(inv.date).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      inv.status === "PAID"
                                        ? "secondary"
                                        : inv.status === "OVERDUE"
                                          ? "destructive"
                                          : "outline"
                                    }
                                    className="text-[11px]"
                                  >
                                    {inv.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-xs">
                                  {formatCurrency(inv.totalAmount)}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums text-xs">
                                  {formatCurrency(inv.amountDue)}
                                </TableCell>
                              </TableRow>
                            ))}
                            {(selectedCustomer.payments ?? []).map((pmt) => (
                              <TableRow key={pmt.id}>
                                <TableCell>
                                  <Badge variant="secondary" className="text-[11px] bg-green-100 text-green-800">
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
                                <TableCell className="text-right font-mono tabular-nums text-xs text-green-700">
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
                          <UserCircle className="size-4 text-blue-600" />
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
                                {selectedCustomer.email || "Not provided"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-xs text-gray-500">Phone</dt>
                              <dd className="text-gray-900">
                                {selectedCustomer.phone || "Not provided"}
                              </dd>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-xs text-gray-500">Mobile</dt>
                              <dd className="text-gray-900">
                                {selectedCustomer.mobile || "Not provided"}
                              </dd>
                            </div>
                          </div>
                          {selectedCustomer.fax && (
                            <div className="flex items-start gap-2">
                              <Phone className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                              <div>
                                <dt className="text-xs text-gray-500">Fax</dt>
                                <dd className="text-gray-900">{selectedCustomer.fax}</dd>
                              </div>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <Globe className="size-3.5 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                              <dt className="text-xs text-gray-500">Website</dt>
                              <dd className="text-gray-900">
                                {selectedCustomer.website || "Not provided"}
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
                          <CreditCard className="size-4 text-blue-600" />
                          Payment Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-xs text-gray-500">Payment Terms</dt>
                            <dd className="text-gray-900">
                              {selectedCustomer.paymentTerms?.name ?? "Not set"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Credit Limit</dt>
                            <dd className="text-gray-900">
                              {selectedCustomer.creditLimit != null
                                ? formatCurrency(selectedCustomer.creditLimit)
                                : "No limit"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Tax ID</dt>
                            <dd className="text-gray-900">
                              {selectedCustomer.taxId || "Not provided"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">Status</dt>
                            <dd>
                              {selectedCustomer.isActive ? (
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

                    {/* Billing Address */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <MapPin className="size-4 text-blue-600" />
                          Billing Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-900 whitespace-pre-line">
                          {formatAddress(selectedCustomer.billingAddress)}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Shipping Address */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Building2 className="size-4 text-blue-600" />
                          Shipping Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-900 whitespace-pre-line">
                          {formatAddress(selectedCustomer.shippingAddress)}
                        </p>
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
                        customerId={selectedCustomer.id}
                        initialNotes={selectedCustomer.notes ?? ""}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* ========== New / Edit Customer Dialog ========== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer" : "New Customer"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? "Update the customer details below."
                : "Fill in the details to create a new customer."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-5 py-2">
            {/* ---- Contact Section ---- */}
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-blue-800 border-b border-blue-200 pb-1 mb-1">
                Contact
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cust-name"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Full name or display name"
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-company">Company</Label>
                  <Input
                    id="cust-company"
                    value={form.company}
                    onChange={(e) => setField("company", e.target.value)}
                    placeholder="Company name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-email">Email</Label>
                  <Input
                    id="cust-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-phone">Phone</Label>
                  <Input
                    id="cust-phone"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-mobile">Mobile</Label>
                  <Input
                    id="cust-mobile"
                    value={form.mobile}
                    onChange={(e) => setField("mobile", e.target.value)}
                    placeholder="(555) 987-6543"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-fax">Fax</Label>
                  <Input
                    id="cust-fax"
                    value={form.fax}
                    onChange={(e) => setField("fax", e.target.value)}
                    placeholder="(555) 000-0000"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-website">Website</Label>
                  <Input
                    id="cust-website"
                    value={form.website}
                    onChange={(e) => setField("website", e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </fieldset>

            {/* ---- Billing Address Section ---- */}
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-blue-800 border-b border-blue-200 pb-1 mb-1">
                Billing Address
              </legend>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="bill-line1">Address Line 1</Label>
                  <Input
                    id="bill-line1"
                    value={form.billingAddress.line1}
                    onChange={(e) => setAddressField("billingAddress", "line1", e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="bill-line2">Address Line 2</Label>
                  <Input
                    id="bill-line2"
                    value={form.billingAddress.line2}
                    onChange={(e) => setAddressField("billingAddress", "line2", e.target.value)}
                    placeholder="Suite 100"
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="grid gap-1.5 col-span-2">
                    <Label htmlFor="bill-city">City</Label>
                    <Input
                      id="bill-city"
                      value={form.billingAddress.city}
                      onChange={(e) => setAddressField("billingAddress", "city", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="bill-state">State</Label>
                    <Input
                      id="bill-state"
                      value={form.billingAddress.state}
                      onChange={(e) => setAddressField("billingAddress", "state", e.target.value)}
                      placeholder="ST"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="bill-zip">ZIP</Label>
                    <Input
                      id="bill-zip"
                      value={form.billingAddress.zip}
                      onChange={(e) => setAddressField("billingAddress", "zip", e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="bill-country">Country</Label>
                  <Input
                    id="bill-country"
                    value={form.billingAddress.country}
                    onChange={(e) => setAddressField("billingAddress", "country", e.target.value)}
                    placeholder="United States"
                  />
                </div>
              </div>
            </fieldset>

            {/* ---- Shipping Address Section ---- */}
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-blue-800 border-b border-blue-200 pb-1 mb-1">
                Shipping Address
              </legend>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="ship-line1">Address Line 1</Label>
                  <Input
                    id="ship-line1"
                    value={form.shippingAddress.line1}
                    onChange={(e) => setAddressField("shippingAddress", "line1", e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ship-line2">Address Line 2</Label>
                  <Input
                    id="ship-line2"
                    value={form.shippingAddress.line2}
                    onChange={(e) => setAddressField("shippingAddress", "line2", e.target.value)}
                    placeholder="Suite 100"
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="grid gap-1.5 col-span-2">
                    <Label htmlFor="ship-city">City</Label>
                    <Input
                      id="ship-city"
                      value={form.shippingAddress.city}
                      onChange={(e) => setAddressField("shippingAddress", "city", e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ship-state">State</Label>
                    <Input
                      id="ship-state"
                      value={form.shippingAddress.state}
                      onChange={(e) => setAddressField("shippingAddress", "state", e.target.value)}
                      placeholder="ST"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="ship-zip">ZIP</Label>
                    <Input
                      id="ship-zip"
                      value={form.shippingAddress.zip}
                      onChange={(e) => setAddressField("shippingAddress", "zip", e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ship-country">Country</Label>
                  <Input
                    id="ship-country"
                    value={form.shippingAddress.country}
                    onChange={(e) => setAddressField("shippingAddress", "country", e.target.value)}
                    placeholder="United States"
                  />
                </div>
              </div>
            </fieldset>

            {/* ---- Payment Section ---- */}
            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold text-blue-800 border-b border-blue-200 pb-1 mb-1">
                Payment
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-taxid">Tax ID</Label>
                  <Input
                    id="cust-taxid"
                    value={form.taxId}
                    onChange={(e) => setField("taxId", e.target.value)}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cust-credit-limit">Credit Limit</Label>
                  <Input
                    id="cust-credit-limit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.creditLimit}
                    onChange={(e) => setField("creditLimit", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cust-notes">Notes</Label>
                <Textarea
                  id="cust-notes"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Internal notes about this customer..."
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
              <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving
                  ? "Saving..."
                  : editingCustomer
                    ? "Save Changes"
                    : "Create Customer"}
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
  customerId,
  initialNotes,
}: {
  customerId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [isDirty, setIsDirty] = useState(false);
  const updateMutation = useUpdateCustomer();

  function handleSave() {
    updateMutation.mutate(
      { id: customerId, data: { notes: notes.trim() || null } },
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
        placeholder="Add notes about this customer..."
        rows={6}
        className="resize-y"
      />
      {isDirty && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {updateMutation.isPending ? "Saving..." : "Save Notes"}
          </Button>
        </div>
      )}
    </div>
  );
}
