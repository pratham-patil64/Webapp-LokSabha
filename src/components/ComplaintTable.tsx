import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, Filter, Download, RefreshCw, 
  ArrowUpDown, ArrowUp, ArrowDown, Loader2 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ComplaintDetailModal from './ComplaintDetailModal';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

// Define the structure of a complaint from Firestore
export interface Complaint {
  id: string;
  category: string;
  createdAt: Timestamp;
  description: string;
  imageUrl?: string;
  location: { latitude: number; longitude: number };
  severity: 'low' | 'medium' | 'high';
  status: 'Pending' | 'in progress' | 'Resolved' | 'Not BMC' | 'Acknowledged';
  userId: string;
  userName: string;
  priorityScore?: number;
}


type SortField = keyof Complaint | 'priorityScore';
type SortOrder = 'asc' | 'desc';

const ComplaintTable: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);


  useEffect(() => {
    const fetchComplaints = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      let complaintsQuery;

      if (user.role === 'god') {
        complaintsQuery = query(collection(db, 'complaints'));
      } else if (user.role === 'king') {
        // Fetch king's domain
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().domain) {
          const domain = userDoc.data().domain;
          // For now, we assume domain has a 'genre' which maps to 'category'
          complaintsQuery = query(collection(db, 'complaints'), where('category', '==', domain.genre));
        } else {
          // King has no domain, show no complaints
          setComplaints([]);
          setLoading(false);
          return;
        }
      }

      if (!complaintsQuery) {
          setLoading(false);
          return;
      }

      const unsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
        const complaintsData = snapshot.docs.map(doc => {
            const data = doc.data();
             // Priority score calculation
            const severityScore = { 'high': 3, 'medium': 2, 'low': 1 }[data.severity] || 1;
            const timeSince = data.createdAt ? (new Date().getTime() - data.createdAt.toDate().getTime()) / 3600000 : 0; // hours
            const priorityScore = Math.min(100, Math.round(severityScore * 20 + timeSince / 24 * 5));

            return {
                id: doc.id,
                ...data,
                priorityScore
            } as Complaint
        });
        setComplaints(complaintsData);
        setLoading(false);
      });

      return () => unsubscribe();
    };

    fetchComplaints();
  }, [user]);
  
  // Get unique values for filters
  const categories = [...new Set(complaints.map(c => c.category))];
  const statuses = ["Pending", "Not BMC", "Acknowledged", "in progress", "Resolved"];
  const severities = ['low', 'medium', 'high'];

  const handleStatusChange = async (complaintId: string, newStatus: Complaint['status']) => {
      if (user?.role !== 'king') return;
      
      setIsUpdating(complaintId);
      const complaintRef = doc(db, 'complaints', complaintId);
      try {
          await updateDoc(complaintRef, { status: newStatus });
      } catch (error) {
          console.error("Error updating status: ", error);
      } finally {
          setIsUpdating(null);
      }
  };


  // Filter and sort logic
  const filteredComplaints = useMemo(() => {
    let filtered = complaints.filter(complaint => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = complaint.description.toLowerCase().includes(searchLower) ||
                           complaint.userName.toLowerCase().includes(searchLower) ||
                           complaint.id.toLowerCase().includes(searchLower);
      const matchesCategory = categoryFilter === 'all' || complaint.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || complaint.status === statusFilter;
      const matchesSeverity = severityFilter === 'all' || complaint.severity === severityFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesSeverity;
    });

    // Sort
    filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (sortField === 'createdAt') {
            const aDate = a.createdAt?.toDate()?.getTime() || 0;
            const bDate = b.createdAt?.toDate()?.getTime() || 0;
            return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        return 0;
    });

    return filtered;
  }, [complaints, searchTerm, categoryFilter, statusFilter, severityFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'status-high';
      case 'medium': return 'status-medium';
      case 'low': return 'status-low';
      default: return 'status-low';
    }
  };

  const getStatusBadgeClass = (status: string) => {
     switch (status?.toLowerCase()) {
      case 'pending': return 'status-open';
      case 'in progress': return 'status-in-progress';
      case 'resolved': return 'status-resolved';
      case 'acknowledged': return 'bg-blue-500/20 text-blue-400';
      case 'not bmc': return 'bg-gray-500/20 text-gray-400';
      default: return 'status-open';
    }
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-semibold hover:bg-transparent"
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </div>
    </Button>
  );

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setSeverityFilter('all');
  };

  const handleComplaintClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedComplaint(null);
  };

  if (loading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Complaint Management
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'god' ? 'Full access to all complaint data' : 'Complaint overview and management'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
          <CardDescription>
            Filter and search through complaints ({filteredComplaints.length} of {complaints.length} shown)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by description, user, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {user?.role === 'god' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category} className="capitalize">{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  {severities.map(severity => (
                    <SelectItem key={severity} value={severity} className="capitalize">{severity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end col-span-full md:col-span-1">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="card-professional">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b">
                  <TableHead className="w-24"><SortHeader field="id">ID</SortHeader></TableHead>
                  <TableHead><SortHeader field="description">Details</SortHeader></TableHead>
                  {user?.role === 'god' && <TableHead><SortHeader field="category">Category</SortHeader></TableHead>}
                  <TableHead><SortHeader field="severity">Severity</SortHeader></TableHead>
                  <TableHead><SortHeader field="createdAt">Time</SortHeader></TableHead>
                  <TableHead><SortHeader field="priorityScore">Priority</SortHeader></TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.map((complaint) => (
                  <TableRow key={complaint.id} className="hover:bg-muted/50 transition-smooth">
                    <TableCell className="font-mono text-xs text-muted-foreground">{complaint.id.substring(0, 8)}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium cursor-pointer hover:text-primary transition-smooth truncate" onClick={() => handleComplaintClick(complaint)}>
                        {complaint.description}
                      </div>
                      <div className="text-xs text-muted-foreground">{complaint.userName}</div>
                    </TableCell>
                    {user?.role === 'god' && (
                      <TableCell><Badge variant="outline" className="capitalize">{complaint.category}</Badge></TableCell>
                    )}
                    <TableCell><Badge className={`text-xs capitalize ${getSeverityBadgeClass(complaint.severity)}`}>{complaint.severity}</Badge></TableCell>
                    <TableCell className="text-sm">{complaint.createdAt.toDate().toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{complaint.priorityScore}</span>
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div className="h-2 rounded-full bg-gradient-primary" style={{ width: `${complaint.priorityScore}%` }}/>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                        {user?.role === 'king' ? (
                            <Select 
                                value={complaint.status} 
                                onValueChange={(value) => handleStatusChange(complaint.id, value as Complaint['status'])}
                                disabled={isUpdating === complaint.id}
                            >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge className={`text-xs ${getStatusBadgeClass(complaint.status)}`}>{complaint.status}</Badge>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredComplaints.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No complaints found matching your filters.</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">Clear all filters</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ComplaintDetailModal 
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default ComplaintTable;
