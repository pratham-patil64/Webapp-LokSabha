import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, Filter, Download,
  ArrowUpDown, ArrowUp, ArrowDown, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ComplaintDetailModal from '@/components/ComplaintDetailModal';
import { db } from '../../firebase';
import { collection, onSnapshot, query, where, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

// --- INTERFACE (Resolved) ---
// Added the 'supporters' field for the new priority score calculation.
export interface Complaint {
  id: string;
  category: string;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
  description: string;
  imageUrl?: string;
  location: { latitude: number; longitude: number };
  severity: 'low' | 'medium' | 'high';
  status: 'Pending' | 'in progress' | 'Resolved' | 'Not BMC' | 'Acknowledged';
  userId: string;
  userName: string;
  supporters?: string[]; // For crowd-sourced priority
  priorityScore?: number;
}

type SortField = keyof Complaint | 'priorityScore';
type SortOrder = 'asc' | 'desc';

// --- Advanced Priority Score Configuration (from new pull) ---
const categoryWeights: { [key: string]: number } = {
  'water supply': 5,
  'sanitation': 4,
  'lighting': 3,
  'street maintance': 2,
  'others': 1,
};

const severityWeights = {
  'high': 30,
  'medium': 15,
  'low': 5,
};

const CROWD_WEIGHT = 5; // Points per supporter

const ComplaintTable: React.FC = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('priorityScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetchComplaints = async () => {
      if (!user) return setLoading(false);
      setLoading(true);
      
      let complaintsQuery;
      if (user.role === 'god') {
        complaintsQuery = query(collection(db, 'complaints'));
      } else if (user.role === 'king') {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().domain?.genre) {
          complaintsQuery = query(collection(db, 'complaints'), where('category', '==', userDoc.data().domain.genre));
        } else {
          setComplaints([]);
          return setLoading(false);
        }
      }

      if (!complaintsQuery) return setLoading(false);

      const unsubscribe = onSnapshot(complaintsQuery, (snapshot) => {
        // --- MERGE RESOLUTION ---
        // The more advanced priority score logic from the new pull has been adopted.
        const complaintsData = snapshot.docs.map(d => {
            const data = d.data();
            let priorityScore = 0;
            
            if (data.status !== 'Resolved') {
              const categoryWeight = categoryWeights[data.category?.toLowerCase()] || categoryWeights['others'];
              const hazardScore = severityWeights[data.severity] || 0;
              let baseScore = (categoryWeight * 5) + hazardScore;
              const crowdScore = (data.supporters?.length || 0) * CROWD_WEIGHT;
              const hoursSinceCreation = data.createdAt ? (new Date().getTime() - data.createdAt.toDate().getTime()) / 3600000 : 0;
              const stalenessScore = Math.floor(hoursSinceCreation / 24) * 2;
              priorityScore = baseScore + crowdScore + stalenessScore;
            }

            return {
                id: d.id,
                ...data,
                priorityScore: Math.min(100, Math.round(priorityScore))
            } as Complaint;
        });
        setComplaints(complaintsData);
        setLoading(false);
      });
      return () => unsubscribe();
    };
    fetchComplaints();
  }, [user]);
  
  const handleStatusChange = async (complaintId: string, newStatus: Complaint['status']) => {
      if (!user) return;
      setIsUpdating(complaintId);
      const complaintRef = doc(db, 'complaints', complaintId);
      try {
          const updateData: { status: string; resolvedBy?: string; resolvedAt?: Timestamp } = { status: newStatus };
          
          if (newStatus === 'Resolved') {
              updateData.resolvedBy = user.uid;
              updateData.resolvedAt = Timestamp.now();
          }
          
          await updateDoc(complaintRef, updateData as any);
      } catch (error) { 
          console.error("Error updating status: ", error); 
      } finally { 
          setIsUpdating(null); 
      }
  };

  const filteredComplaints = useMemo(() => {
    let filtered = complaints.filter(c => 
      (c.description.toLowerCase().includes(searchTerm.toLowerCase()) || c.userName.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (categoryFilter === 'all' || c.category === categoryFilter) &&
      (statusFilter === 'all' || c.status === statusFilter) &&
      (severityFilter === 'all' || c.severity === severityFilter)
    );

    filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (sortField === 'createdAt' || sortField === 'resolvedAt') {
            const aDate = aVal ? (aVal as Timestamp).toMillis() : null;
            const bDate = bVal ? (bVal as Timestamp).toMillis() : null;
            if (aDate === bDate) return 0;
            if (aDate === null) return 1;
            if (bDate === null) return -1;
            return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        if (typeof aVal === 'string' && typeof bVal === 'string') return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        return 0;
    });
    return filtered;
  }, [complaints, searchTerm, categoryFilter, statusFilter, severityFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    setSortOrder(sortField === field && sortOrder === 'desc' ? 'asc' : 'desc');
    setSortField(field);
  };
  
  const getSeverityBadgeClass = (s: string) => ({ 'high': 'bg-red-500/20 text-red-500', 'medium': 'bg-orange-500/20 text-orange-500', 'low': 'bg-yellow-500/20 text-yellow-500' }[s] || 'bg-gray-500/20');
  const getStatusBadgeClass = (s: string) => ({ 'pending': 'status-open', 'in progress': 'status-in-progress', 'resolved': 'status-resolved', 'acknowledged': 'bg-blue-500/20 text-blue-400', 'not bmc': 'bg-gray-500/20 text-gray-400' }[s] || '');
  
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (<Button variant="ghost" onClick={() => handleSort(field)} className="h-auto p-0 font-semibold hover:bg-transparent"><div className="flex items-center gap-1">{children}{sortField === field ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}</div></Button>);
  
  const clearFilters = () => { setSearchTerm(''); setCategoryFilter('all'); setStatusFilter('all'); setSeverityFilter('all'); };
  const handleComplaintClick = (complaint: Complaint) => { setSelectedComplaint(complaint); setIsModalOpen(true); };
  const handleModalClose = () => { setIsModalOpen(false); setSelectedComplaint(null); };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const statuses = ["Pending", "Not BMC", "Acknowledged", "in progress", "Resolved"];
  const categories = [...new Set(complaints.map(c => c.category))];
  const severities = ['low', 'medium', 'high'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Filters & Search</CardTitle><CardDescription>Filter and search through complaints ({filteredComplaints.length} of {complaints.length} shown)</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Search by description, user, or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {user?.role === 'god' && (<div><label className="text-sm font-medium mb-2 block">Category</label><Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select></div>)}
            <div><label className="text-sm font-medium mb-2 block">Status</label><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><label className="text-sm font-medium mb-2 block">Severity</label><Select value={severityFilter} onValueChange={setSeverityFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Severities</SelectItem>{severities.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-end col-span-full md:col-span-1"><Button variant="outline" onClick={clearFilters} className="w-full">Clear Filters</Button></div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHeader field="priorityScore">Priority</SortHeader></TableHead>
                  <TableHead>Details</TableHead>
                  {user?.role === 'god' && <TableHead><SortHeader field="category">Category</SortHeader></TableHead>}
                  <TableHead><SortHeader field="severity">Severity</SortHeader></TableHead>
                  <TableHead><SortHeader field="createdAt">Created</SortHeader></TableHead>
                  <TableHead><SortHeader field="resolvedAt">Resolved</SortHeader></TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredComplaints.map(c => (
                  <TableRow key={c.id}>
                    <TableCell><div className="flex items-center gap-2"><span className="font-medium">{c.priorityScore}</span><div className="w-16 bg-muted rounded-full h-2"><div className="h-2 rounded-full bg-gradient-primary" style={{width: `${c.priorityScore}%`}}/></div></div></TableCell>
                    <TableCell><div onClick={() => handleComplaintClick(c)} className="font-medium cursor-pointer hover:text-primary truncate">{c.description}</div><div className="text-xs text-muted-foreground">{c.userName}</div></TableCell>
                    {user?.role === 'god' && (<TableCell><Badge variant="outline" className="capitalize">{c.category}</Badge></TableCell>)}
                    <TableCell><Badge className={`capitalize ${getSeverityBadgeClass(c.severity)}`}>{c.severity}</Badge></TableCell>
                    <TableCell className="text-sm">{c.createdAt.toDate().toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{c.resolvedAt ? c.resolvedAt.toDate().toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Select value={c.status} onValueChange={(value) => handleStatusChange(c.id, value as Complaint['status'])} disabled={isUpdating === c.id}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredComplaints.length === 0 && (<div className="text-center py-12"><p className="text-muted-foreground">No complaints found matching your filters.</p><Button variant="link" onClick={clearFilters}>Clear all filters</Button></div>)}
        </CardContent>
      </Card>
      <ComplaintDetailModal complaint={selectedComplaint} isOpen={isModalOpen} onClose={handleModalClose}/>
    </div>
  );
};

export default ComplaintTable;

