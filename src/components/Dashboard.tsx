import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Clock,
  FileText, BarChart3, Loader2, Smile, Frown, Meh, KeyRound
} from 'lucide-react';
import { collection, onSnapshot, query, Timestamp, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Sentiment from 'sentiment';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

// --- INTERFACES & TYPES ---
interface Complaint { id: string; category: string; createdAt: Timestamp; description: string; imageUrl?: string; location: { latitude: number; longitude: number }; severity: 'low' | 'medium' | 'high'; status: 'Pending' | 'in progress' | 'Resolved' | 'Not BMC' | 'Acknowledged'; userId: string; userName: string; priorityScore?: number; }
interface CommunityPost { id: string; text: string; createdAt: Timestamp; userName: string; }
interface KingUser { id: string; email: string; username: string; domain?: { genre: string; } }


const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [kings, setKings] = useState<KingUser[]>([]);
  const [categoryAssignments, setCategoryAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalComplaints: 0, openComplaints: 0, inProgress: 0, resolved: 0, criticalCount: 0,
  });

  // --- DATA FETCHING ---
  useEffect(() => {
    const complaintsQuery = query(collection(db, 'complaints'));
    const unsubscribeComplaints = onSnapshot(complaintsQuery, (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
        setComplaints(data);
        setDashboardStats({
            totalComplaints: data.length,
            openComplaints: data.filter(c => c.status === 'Pending').length,
            inProgress: data.filter(c => c.status === 'in progress').length,
            resolved: data.filter(c => c.status === 'Resolved').length,
            criticalCount: data.filter(c => c.severity === 'high').length,
        });
    });

    const postsQuery = query(collection(db, 'community_posts'));
    const unsubscribePosts = onSnapshot(postsQuery, (snap) => {
        setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost)));
    });

    let unsubscribeKings = () => {};
    if (user?.role === 'god') {
        const kingsQuery = query(collection(db, 'users'), where('role', '==', 'king'));
        unsubscribeKings = onSnapshot(kingsQuery, (snap) => {
            const kingsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as KingUser));
            setKings(kingsData);
            const assignments: Record<string, string> = {};
            kingsData.forEach(k => { if (k.domain?.genre) assignments[k.domain.genre] = k.id; });
            setCategoryAssignments(assignments);
        });
    }

    Promise.all([new Promise(res => onSnapshot(complaintsQuery, res)), new Promise(res => onSnapshot(postsQuery, res))])
        .then(() => setLoading(false));

    return () => {
        unsubscribeComplaints();
        unsubscribePosts();
        unsubscribeKings();
    };
  }, [user]);

  // --- DATA PROCESSING ---
  const complaintsByCategory = complaints.reduce((acc, c) => {
    const cat = c.category || 'Other';
    const existing = acc.find(item => item.name === cat);
    if (existing) existing.count++; else acc.push({ name: cat, count: 1 });
    return acc;
  }, [] as { name: string; count: number }[]);
  
  const sentimentAnalyzer = new Sentiment();
  const sentimentAnalysis = posts.reduce((acc, post) => {
    const result = sentimentAnalyzer.analyze(post.text);
    if (result.score > 0) acc.positive++;
    else if (result.score < 0) acc.negative++;
    else acc.neutral++;
    return acc;
  }, { positive: 0, negative: 0, neutral: 0 });

  const sentimentChartData = [
    { name: 'Positive', value: sentimentAnalysis.positive, color: '#22c55e' },
    { name: 'Neutral', value: sentimentAnalysis.neutral, color: '#a1a1aa' },
    { name: 'Negative', value: sentimentAnalysis.negative, color: '#ef4444' },
  ].filter(item => item.value > 0);

  const uniqueCategories = [...new Set(complaints.map(c => c.category).filter(Boolean))];

  const handleKingAssignment = async (category: string, kingId: string) => {
    setIsAssigning(category);
      try {
          const currentKingId = categoryAssignments[category];
          if (currentKingId && currentKingId !== kingId) {
              await updateDoc(doc(db, "users", currentKingId), { domain: {} });
          }
          if (kingId === 'unassigned') {
              if (currentKingId) await updateDoc(doc(db, "users", currentKingId), { domain: {} });
              setCategoryAssignments(prev => { const newA = { ...prev }; delete newA[category]; return newA; });
              toast({ title: "Unassigned", description: `${category} is now unassigned.` });
          } else {
              const kingToAssign = kings.find(k => k.id === kingId);
              if (!kingToAssign) throw new Error("King not found");
              await updateDoc(doc(db, "users", kingId), { domain: { genre: category } });
              setCategoryAssignments(prev => ({ ...prev, [category]: kingId }));
              toast({ title: "Assignment Successful", description: `${category} assigned to ${kingToAssign.email}.` });
          }
      } catch (error) {
          toast({ variant: "destructive", title: "Assignment Failed" });
      } finally {
          setIsAssigning(null);
      }
  };
  
  const StatCard = ({ title, value, icon: Icon, color = "primary" }: { title: string; value: string | number; icon: React.ElementType; color?: string; }) => ( <Card className="hover:shadow-lg transition-shadow"> <CardContent className="p-6"> <div className="flex items-center justify-between"> <div> <p className="text-sm font-medium text-muted-foreground">{title}</p> <p className="text-3xl font-bold">{value}</p> </div> <div className={`p-3 rounded-full bg-${color}/10`}> <Icon className={`w-6 h-6 text-${color}`} /> </div> </div> </CardContent> </Card> );

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* The page header and navigation are now handled by Layout.tsx */}
      
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Complaints" value={dashboardStats.totalComplaints} icon={FileText} color="primary" />
        <StatCard title="Pending" value={dashboardStats.openComplaints} icon={AlertTriangle} color="destructive" />
        <StatCard title="In Progress" value={dashboardStats.inProgress} icon={Clock} color="warning" />
        <StatCard title="Resolved" value={dashboardStats.resolved} icon={CheckCircle} color="success" />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="card-professional lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />Complaints by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={complaintsByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} tickFormatter={(value) => typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : value} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}/>
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-professional lg:col-span-2">
          <CardHeader>
            <CardTitle>Community Sentiment</CardTitle>
            <CardDescription>Analysis of community posts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
               <PieChart>
                <Pie data={sentimentChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={12}>
                  {sentimentChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
       
      <div className="grid gap-6 md:grid-cols-3">
          <StatCard title="Positive Posts" value={sentimentAnalysis.positive} icon={Smile} color="success" />
          <StatCard title="Neutral Posts" value={sentimentAnalysis.neutral} icon={Meh} color="gray" />
          <StatCard title="Negative Posts" value={sentimentAnalysis.negative} icon={Frown} color="destructive" />
      </div>
        
      {/* King Access Portal */}
      {user?.role === 'god' && (
        <Card className="card-professional">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" />King Access Portal</CardTitle>
                <CardDescription>Assign complaint categories to King administrators.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Assigned King</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {uniqueCategories.map(category => (
                            <TableRow key={category}>
                                <TableCell className="font-medium capitalize">{category}</TableCell>
                                <TableCell>
                                    <Select value={categoryAssignments[category] || 'unassigned'} onValueChange={(kingId) => handleKingAssignment(category, kingId)} disabled={isAssigning === category}>
                                        <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select a King" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {kings.map(king => (<SelectItem key={king.id} value={king.id}>{king.email}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

