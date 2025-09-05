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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Users, UserPlus, Upload, FileText, X, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Papa from "papaparse";

// Form validation schema matching backend requirements
const createUserSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  username: z.string().min(1, "Username is required"),
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
  username: string;
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
  username: string;
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
      username: "",
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
            username: row.username || row.Username || '',
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
          if (!user.username) user.errors.push('Username is required');
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
      username: user.username,
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
    const csvContent = `employeeId,username,password,name,email,mobile,department,designation,role
EMP001,john.doe,password123,John Doe,john.doe@company.com,+1234567890,IT,Software Developer,user
EMP002,jane.smith,password123,Jane Smith,jane.smith@company.com,+1234567891,HR,HR Manager,admin`;
    
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
                <div className="grid grid-cols-2 gap-4">
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
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="john.doe" data-testid="input-username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
      </div>

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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.employeeId}`}>
                          <TableCell className="font-medium">{user.employeeId}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">@{user.username}</div>
                            </div>
                          </TableCell>
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