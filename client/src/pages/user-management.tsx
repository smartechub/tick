import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Users, UserPlus, Upload, FileText, X, Download, AlertCircle, CheckCircle2, Edit, Trash2, Eye, MoreHorizontal, Lock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Papa from "papaparse";

// Form validation schema matching backend requirements
const createUserSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email is required"),
  mobile: z.string().min(1, "Mobile number is required"),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  role: z.enum(["admin", "viewer", "user"], {
    required_error: "Role is required",
  }),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  mobile: string;
  department: string;
  designation: string;
  role: "admin" | "viewer" | "user";
  createdAt: string;
}

interface ParsedUserData {
  employeeId: string;
  password: string;
  name: string;
  email: string;
  mobile: string;
  department: string;
  designation: string;
  role: "admin" | "viewer" | "user";
  isValid: boolean;
  errors: string[];
}

export default function UserManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteEmployeeIds, setBulkDeleteEmployeeIds] = useState("");
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedUserData[]>([]);
  const [isProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      employeeId: "",
      password: "",
      name: "",
      email: "",
      mobile: "",
      department: "",
      designation: "",
      role: "user",
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      const response = await apiRequest('POST', '/api/users', userData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "User created successfully",
        description: "The new user has been added to the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || "An error occurred while creating the user.",
        variant: "destructive",
      });
    },
  });

  // Bulk user creation mutation
  const bulkCreateMutation = useMutation({
    mutationFn: async (users: CreateUserForm[]) => {
      const response = await apiRequest('POST', '/api/users/bulk', { users });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setBulkImportFile(null);
      setParsedData([]);
      setBulkProgress(0);
      setBulkProcessing(false);
      toast({
        title: "Bulk import completed",
        description: `Successfully created ${result.results.length} users${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}.`,
      });
    },
    onError: (error: any) => {
      setBulkProcessing(false);
      toast({
        title: "Bulk import failed",
        description: error.message || "An error occurred during bulk import.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  // User action handlers
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    // Pre-populate form with user data
    form.reset({
      employeeId: user.employeeId,
      password: "", // Don't pre-fill password
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      department: user.department,
      designation: user.designation,
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
  };

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('DELETE', `/api/users/${userId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User deleted successfully",
        description: "The user has been removed from the system.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete user",
        description: error.message || "An error occurred while deleting the user.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: CreateUserForm }) => {
      // Remove empty password field if not provided
      const updateData = { ...userData };
      if (!updateData.password) {
        const { password, ...dataWithoutPassword } = updateData;
        const response = await apiRequest('PUT', `/api/users/${userId}`, dataWithoutPassword);
        return response.json();
      }
      const response = await apiRequest('PUT', `/api/users/${userId}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      form.reset();
      toast({
        title: "User updated successfully",
        description: "The user information has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update user",
        description: error.message || "An error occurred while updating the user.",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const response = await apiRequest('PUT', `/api/users/${userId}/reset-password`, { password: newPassword });
      return response.json();
    },
    onSuccess: () => {
      setIsResetPasswordDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Password reset successfully",
        description: "The user's password has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reset password",
        description: error.message || "An error occurred while resetting the password.",
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (employeeIds: string[]) => {
      const response = await apiRequest('DELETE', '/api/users/bulk', { employeeIds });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteEmployeeIds("");
      toast({
        title: "Bulk delete completed",
        description: `Successfully deleted ${result.deleted} users${result.notFound.length > 0 ? `, ${result.notFound.length} not found` : ''}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete users",
        description: error.message || "An error occurred during bulk delete.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
      return;
    }

    setBulkImportFile(file);
    parseCSVFile(file);
    event.target.value = '';
  };

  const parseCSVFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedUsers: ParsedUserData[] = results.data.map((row: any, index) => {
          const user: ParsedUserData = {
            employeeId: row.employeeId || row.EmployeeID || row['Employee ID'] || '',
            password: row.password || row.Password || '',
            name: row.name || row.Name || row['Full Name'] || '',
            email: row.email || row.Email || row['Email Address'] || '',
            mobile: row.mobile || row.Mobile || row['Mobile Number'] || '',
            department: row.department || row.Department || '',
            designation: row.designation || row.Designation || '',
            role: (row.role || row.Role || 'user').toLowerCase() as "admin" | "viewer" | "user",
            isValid: true,
            errors: []
          };

          // Validate each field
          if (!user.employeeId) user.errors.push('Employee ID is required');
          if (!user.password) user.errors.push('Password is required');
          if (!user.name) user.errors.push('Full name is required');
          if (!user.email || !user.email.includes('@')) user.errors.push('Valid email is required');
          if (!user.mobile) user.errors.push('Mobile number is required');
          if (!user.department) user.errors.push('Department is required');
          if (!user.designation) user.errors.push('Designation is required');
          if (!['admin', 'viewer', 'user'].includes(user.role)) {
            user.errors.push('Role must be admin, viewer, or user');
            user.role = 'user';
          }

          user.isValid = user.errors.length === 0;
          return user;
        });

        setParsedData(parsedUsers);
        toast({
          title: "File parsed successfully",
          description: `Found ${parsedUsers.length} users, ${parsedUsers.filter(u => u.isValid).length} valid.`,
        });
      },
      error: (error) => {
        toast({
          title: "Failed to parse file",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleBulkImport = () => {
    const validUsers = parsedData.filter(user => user.isValid);
    if (validUsers.length === 0) {
      toast({
        title: "No valid users to import",
        description: "Please fix the errors in your data before importing.",
        variant: "destructive",
      });
      return;
    }

    setBulkProcessing(true);
    setBulkProgress(0);
    
    // Convert to the format expected by the API
    const usersToCreate: CreateUserForm[] = validUsers.map(user => ({
      employeeId: user.employeeId,
      password: user.password,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      department: user.department,
      designation: user.designation,
      role: user.role,
    }));

    bulkCreateMutation.mutate(usersToCreate);
  };

  const removeImportFile = () => {
    setBulkImportFile(null);
    setParsedData([]);
    setBulkProgress(0);
  };

  const downloadTemplate = () => {
    const csvContent = `employeeId,password,name,email,mobile,department,designation,role
EMP001,password123,John Doe,john.doe@company.com,+1234567890,IT,Software Developer,user
EMP002,password123,Jane Smith,jane.smith@company.com,+1234567891,HR,HR Manager,admin`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'user-import-template.csv');
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'viewer': return 'secondary';
      case 'user': return 'default';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users and their roles
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-user-button">
                <Plus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]" data-testid="create-user-dialog">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system. All fields are required.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP001" data-testid="input-employee-id" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" data-testid="input-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" data-testid="input-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john.doe@company.com" data-testid="input-email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" data-testid="input-mobile" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-department">
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="IT">IT</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Operations">Operations</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation</FormLabel>
                        <FormControl>
                          <Input placeholder="Senior Developer" data-testid="input-designation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="cancel-create-user"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                    data-testid="submit-create-user"
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
          
          <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" data-testid="bulk-delete-button">
                <Trash2 className="mr-2 h-4 w-4" />
                Bulk Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Bulk Delete Users</DialogTitle>
                <DialogDescription>
                  Enter employee IDs separated by commas, spaces, or new lines to delete multiple users at once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeIds">Employee IDs</Label>
                  <textarea
                    id="employeeIds"
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter employee IDs (e.g., EMP001, EMP002, EMP003)"
                    value={bulkDeleteEmployeeIds}
                    onChange={(e) => setBulkDeleteEmployeeIds(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can separate IDs with commas, spaces, or new lines
                  </p>
                </div>
                
                {bulkDeleteEmployeeIds.trim() && (
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Preview:</p>
                    <div className="flex flex-wrap gap-1">
                      {bulkDeleteEmployeeIds
                        .split(/[,\s\n]+/)
                        .filter(id => id.trim())
                        .map((id, index) => (
                          <Badge key={index} variant="secondary">
                            {id.trim()}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This action cannot be undone. All selected users will be permanently removed from the system.
                  </AlertDescription>
                </Alert>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsBulkDeleteDialogOpen(false);
                    setBulkDeleteEmployeeIds("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    const employeeIds = bulkDeleteEmployeeIds
                      .split(/[,\s\n]+/)
                      .map(id => id.trim())
                      .filter(id => id);
                    
                    if (employeeIds.length === 0) {
                      toast({
                        title: "No employee IDs provided",
                        description: "Please enter at least one employee ID.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    bulkDeleteMutation.mutate(employeeIds);
                  }}
                  disabled={bulkDeleteMutation.isPending || !bulkDeleteEmployeeIds.trim()}
                >
                  {bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${bulkDeleteEmployeeIds.split(/[,\s\n]+/).filter(id => id.trim()).length} Users`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View User Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about this user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Employee ID</Label>
                  <p className="text-sm">{selectedUser.employeeId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                <p className="text-sm">{selectedUser.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Mobile</Label>
                <p className="text-sm">{selectedUser.mobile}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Department</Label>
                  <p className="text-sm">{selectedUser.department}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Designation</Label>
                  <p className="text-sm">{selectedUser.designation}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                  <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Leave password blank to keep unchanged.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => {
              // Update the selected user
              if (selectedUser) {
                updateUserMutation.mutate({ userId: selectedUser.id, userData: data });
              }
            })} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (leave blank to keep unchanged)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="IT">IT</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                          <SelectItem value="Operations">Operations</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.name} ({selectedUser?.employeeId})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const newPassword = formData.get('newPassword') as string;
            const confirmPassword = formData.get('confirmPassword') as string;
            
            if (newPassword !== confirmPassword) {
              toast({
                title: "Password mismatch",
                description: "Passwords do not match.",
                variant: "destructive",
              });
              return;
            }
            
            if (newPassword.length < 6) {
              toast({
                title: "Password too short",
                description: "Password must be at least 6 characters long.",
                variant: "destructive",
              });
              return;
            }
            
            if (selectedUser) {
              resetPasswordMutation.mutate({ userId: selectedUser.id, newPassword });
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input 
                id="newPassword" 
                name="newPassword" 
                type="password" 
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword" 
                name="confirmPassword" 
                type="password" 
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsResetPasswordDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Delete User</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  This action cannot be undone and will permanently remove the user from the system.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          
          {userToDelete && (
            <div className="my-4 rounded-lg border border-border bg-muted/50 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">User Details</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {userToDelete.name}
                  </div>
                  <div>
                    <span className="font-medium">Employee ID:</span> {userToDelete.employeeId}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {userToDelete.email}
                  </div>
                  <div>
                    <span className="font-medium">Department:</span> {userToDelete.department}
                  </div>
                  <div>
                    <span className="font-medium">Role:</span>
                    <Badge variant={getRoleBadgeVariant(userToDelete.role)} className="ml-2">
                      {userToDelete.role}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Designation:</span> {userToDelete.designation}
                  </div>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="mr-2 h-4 w-4" />
            All Users
          </TabsTrigger>
          <TabsTrigger value="bulk" data-testid="tab-bulk">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8" data-testid="loading-users">
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-users">
                  No users found
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.employeeId}`}>
                          <TableCell className="font-medium">{user.employeeId}</TableCell>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.department}</TableCell>
                          <TableCell>{user.designation}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)} data-testid={`badge-role-${user.role}`}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleEditUser(user)}
                                      data-testid={`edit-user-${user.employeeId}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Edit User</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteUser(user)}
                                      data-testid={`delete-user-${user.employeeId}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Delete User</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleResetPassword(user)}
                                      data-testid={`reset-password-${user.employeeId}`}
                                    >
                                      <Lock className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Reset Password</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Bulk User Import
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadTemplate}
                  data-testid="download-template-button"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </CardTitle>
              <CardDescription>
                Import multiple users from a CSV file. Download the template to see the required format.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload Section */}
              {!bulkImportFile && (
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="bulk-file-upload" className="cursor-pointer text-primary hover:underline text-lg">
                      Choose CSV file to upload
                    </Label>
                    <Input
                      id="bulk-file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      data-testid="bulk-file-input"
                    />
                    <p className="text-sm text-muted-foreground">
                      CSV files only. Make sure your file follows the template format.
                    </p>
                  </div>
                </div>
              )}

              {/* File Selected */}
              {bulkImportFile && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{bulkImportFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(bulkImportFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeImportFile}
                      data-testid="remove-bulk-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Data Preview */}
                  {parsedData.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Data Preview</h3>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            {parsedData.filter(u => u.isValid).length} valid
                          </span>
                          {parsedData.filter(u => !u.isValid).length > 0 && (
                            <span className="flex items-center gap-1 text-red-600">
                              <AlertCircle className="h-4 w-4" />
                              {parsedData.filter(u => !u.isValid).length} errors
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Error Summary */}
                      {parsedData.some(u => !u.isValid) && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Some rows have errors and will be skipped during import. Check the table below for details.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Data Table */}
                      <div className="border rounded-lg max-h-96 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Status</TableHead>
                              <TableHead>Employee ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Department</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Errors</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedData.map((user, index) => (
                              <TableRow key={index} data-testid={`bulk-row-${index}`}>
                                <TableCell>
                                  {user.isValid ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{user.employeeId}</TableCell>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.department}</TableCell>
                                <TableCell>
                                  <Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge>
                                </TableCell>
                                <TableCell>
                                  {user.errors.length > 0 && (
                                    <div className="text-xs text-red-600">
                                      {user.errors.join(', ')}
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Import Actions */}
                      <div className="flex items-center justify-between pt-4">
                        <Button 
                          variant="outline" 
                          onClick={removeImportFile}
                          data-testid="cancel-bulk-import"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleBulkImport}
                          disabled={isProcessing || parsedData.filter(u => u.isValid).length === 0}
                          data-testid="start-bulk-import"
                        >
                          {isProcessing ? (
                            <>Processing...</>
                          ) : (
                            <>
                              Import {parsedData.filter(u => u.isValid).length} Users
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Progress Bar */}
                      {isProcessing && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Importing users...</span>
                            <span>{bulkProgress}%</span>
                          </div>
                          <Progress value={bulkProgress} data-testid="bulk-import-progress" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}