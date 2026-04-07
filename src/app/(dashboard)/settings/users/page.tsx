"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Shield,
  UserMinus,
  Lock,
  Loader2,
  ShieldAlert,
} from "lucide-react";

/* ---------- types ---------- */

interface MemberUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
}

interface Membership {
  id: string;
  role: string;
  isActive: boolean;
  invitedAt: string;
  joinedAt: string | null;
  userId: string;
  organizationId: string;
  user: MemberUser;
}

/* ---------- constants ---------- */

const ALL_ROLES = [
  "OWNER",
  "ADMIN",
  "ACCOUNTANT",
  "ACCOUNTS_PAYABLE",
  "ACCOUNTS_RECEIVABLE",
  "BANKING",
  "SALES",
  "PURCHASING",
  "VIEWER",
  "MEMBER",
] as const;

const ASSIGNABLE_ROLES = ALL_ROLES.filter((r) => r !== "OWNER");

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  ACCOUNTANT: "Accountant",
  ACCOUNTS_PAYABLE: "Accounts Payable",
  ACCOUNTS_RECEIVABLE: "Accounts Receivable",
  BANKING: "Banking",
  SALES: "Sales",
  PURCHASING: "Purchasing",
  VIEWER: "Viewer",
  MEMBER: "Member",
};

/* ---------- helpers ---------- */

function roleBadgeClasses(role: string): string {
  switch (role) {
    case "OWNER":
      return "bg-amber-100 text-amber-800";
    case "ADMIN":
      return "bg-blue-100 text-blue-800";
    case "ACCOUNTANT":
      return "bg-emerald-100 text-emerald-800";
    case "VIEWER":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-purple-100 text-purple-800";
  }
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Pending";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------- page ---------- */

export default function UsersPage() {
  const { data: session } = useSession();
  const currentRole = session?.user?.role;
  const currentUserId = session?.user?.id;

  const isAuthorized = currentRole === "OWNER" || currentRole === "ADMIN";

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="h-10 w-10 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-700">Access Denied</h2>
        <p className="text-sm text-gray-500">
          You don&apos;t have permission to access this page. Only Owners and
          Admins can manage users.
        </p>
      </div>
    );
  }

  return <UsersContent currentRole={currentRole} currentUserId={currentUserId!} />;
}

/* ---------- main content ---------- */

function UsersContent({
  currentRole,
  currentUserId,
}: {
  currentRole: string;
  currentUserId: string;
}) {
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [changeRoleTarget, setChangeRoleTarget] = useState<Membership | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Membership | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/settings/users");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load users");
      setMembers(json.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /* -- status toggle -- */
  async function handleToggleStatus(member: Membership) {
    const newStatus = !member.isActive;
    try {
      const res = await fetch(`/api/v1/settings/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update status");
      toast.success(
        `${member.user.name || member.user.email} has been ${newStatus ? "activated" : "deactivated"}`
      );
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  /* -- remove user -- */
  async function handleRemoveUser(member: Membership) {
    try {
      const res = await fetch(`/api/v1/settings/users/${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to remove user");
      }
      toast.success(
        `${member.user.name || member.user.email} has been removed from the organization`
      );
      setRemoveTarget(null);
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove user");
    }
  }

  /* -- permission checks -- */
  function isProtectedRow(member: Membership): boolean {
    return member.role === "OWNER";
  }

  function isSelf(member: Membership): boolean {
    return member.userId === currentUserId;
  }

  function canChangeRole(member: Membership): boolean {
    if (isProtectedRow(member)) return false;
    if (isSelf(member)) return false;
    // ADMIN cannot change another ADMIN's role
    if (currentRole === "ADMIN" && member.role === "ADMIN") return false;
    return true;
  }

  function canToggleStatus(member: Membership): boolean {
    if (isProtectedRow(member)) return false;
    if (isSelf(member)) return false;
    return true;
  }

  function canRemove(member: Membership): boolean {
    if (isProtectedRow(member)) return false;
    if (isSelf(member)) return false;
    return true;
  }

  return (
    <div className="p-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="h-5 w-5" /> User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage team members and their roles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {members.length} user{members.length !== 1 && "s"}
          </span>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="size-4 mr-1" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="min-w-[220px]">User</TableHead>
              <TableHead className="w-[170px]">Role</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead className="w-[120px]">Joined</TableHead>
              <TableHead className="w-[70px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <span className="text-sm">Loading users...</span>
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  No team members found. Click &quot;Invite User&quot; to add
                  someone.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member, idx) => {
                const protected_ = isProtectedRow(member);
                const self = isSelf(member);

                return (
                  <TableRow
                    key={member.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}
                  >
                    {/* User cell */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold shrink-0">
                          {getInitials(member.user.name, member.user.email)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {member.user.name || "Unnamed User"}
                            {self && (
                              <span className="ml-1.5 text-xs text-gray-400 font-normal">
                                (you)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Role cell */}
                    <TableCell>
                      {protected_ && (
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={`${roleBadgeClasses(member.role)} border-0 text-[11px]`}
                          >
                            {ROLE_LABELS[member.role] || member.role}
                          </Badge>
                          <Lock className="h-3 w-3 text-gray-400" />
                        </div>
                      )}
                      {!protected_ && (
                        <Badge
                          className={`${roleBadgeClasses(member.role)} border-0 text-[11px]`}
                        >
                          {ROLE_LABELS[member.role] || member.role}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Status cell */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {member.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[11px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-0 text-[11px]">
                            Inactive
                          </Badge>
                        )}
                        <Switch
                          size="sm"
                          checked={member.isActive}
                          onCheckedChange={() => handleToggleStatus(member)}
                          disabled={!canToggleStatus(member)}
                        />
                      </div>
                    </TableCell>

                    {/* Joined cell */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(member.joinedAt)}
                    </TableCell>

                    {/* Actions cell */}
                    <TableCell className="text-right">
                      {protected_ ? (
                        <Lock className="h-4 w-4 text-gray-300 ml-auto" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-xs" />
                            }
                          >
                            <MoreHorizontal className="size-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={!canChangeRole(member)}
                              onClick={() => setChangeRoleTarget(member)}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={!canRemove(member)}
                              onClick={() => setRemoveTarget(member)}
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove from Organization
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {!loading && members.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            {members.filter((m) => m.isActive).length} active of{" "}
            {members.length} total member{members.length !== 1 && "s"}
          </div>
        )}
      </div>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={fetchMembers}
      />

      {/* Change Role Dialog */}
      {changeRoleTarget && (
        <ChangeRoleDialog
          member={changeRoleTarget}
          open={!!changeRoleTarget}
          onOpenChange={(open) => {
            if (!open) setChangeRoleTarget(null);
          }}
          onSuccess={fetchMembers}
        />
      )}

      {/* Remove Confirmation Dialog */}
      {removeTarget && (
        <RemoveUserDialog
          member={removeTarget}
          open={!!removeTarget}
          onOpenChange={(open) => {
            if (!open) setRemoveTarget(null);
          }}
          onConfirm={() => handleRemoveUser(removeTarget)}
        />
      )}
    </div>
  );
}

/* ---------- Invite User Dialog ---------- */

function InviteUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setEmail("");
    setName("");
    setPassword("");
    setRole("MEMBER");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        email: email.trim(),
        role,
      };
      if (name.trim()) body.name = name.trim();
      if (password.trim()) body.password = password.trim();

      const res = await fetch("/api/v1/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to invite user");

      toast.success(`Invitation sent to ${email.trim()}`);
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Add a new team member to your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Email */}
          <div className="grid gap-1.5">
            <Label htmlFor="invite-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          {/* Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="invite-name">
              Name{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>

          {/* Password */}
          <div className="grid gap-1.5">
            <Label htmlFor="invite-password">
              Password{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="invite-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Default: 12345678"
            />
          </div>

          {/* Role */}
          <div className="grid gap-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? "MEMBER")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="-mx-4 -mb-2 mt-2">
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Change Role Dialog ---------- */

function ChangeRoleDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: {
  member: Membership;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [role, setRole] = useState(member.role);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (role === member.role) {
      onOpenChange(false);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/settings/users/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update role");

      toast.success(
        `${member.user.name || member.user.email} is now ${ROLE_LABELS[role] || role}`
      );
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>
            Update the role for{" "}
            <span className="font-semibold text-foreground">
              {member.user.name || member.user.email}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <span>Current role:</span>
            <Badge
              className={`${roleBadgeClasses(member.role)} border-0 text-[11px]`}
            >
              {ROLE_LABELS[member.role] || member.role}
            </Badge>
          </div>

          <Separator className="mb-3" />

          <div className="grid gap-1.5">
            <Label>New Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? role)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Update Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Remove User Confirmation Dialog ---------- */

function RemoveUserDialog({
  member,
  open,
  onOpenChange,
  onConfirm,
}: {
  member: Membership;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm();
    setSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove User</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{" "}
            <span className="font-semibold text-foreground">
              {member.user.name || member.user.email}
            </span>{" "}
            from your organization? They will lose access to all data
            immediately. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Remove User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
