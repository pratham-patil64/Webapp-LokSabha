import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Clock, FileText, BarChart3, 
  Loader2, Smile, Frown, Meh, KeyRound, Crown, Shield, 
  Activity, ChevronRight, UserCheck, MapPin, Award, Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, Timestamp, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Sentiment from 'sentiment';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

// --- INTERFACES & TYPES ---
interface Complaint {
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
interface CommunityPost { id: string; text: string; createdAt: Timestamp; userName: string; }
interface KingUser { id: string; email: string; username: string; domain?: { genre: string; } }

const sentimentAnalyzer = new Sentiment();

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [kings, setKings] = useState<KingUser[]>([]);
  const [categoryAssignments, setCategoryAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState<string | null>(null);
  const [selectedKingCard, setSelectedKingCard] = useState<string | null>(null);
  
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
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  // --- UI HELPER COMPONENTS ---
  const StatCard = ({ title, value, icon: Icon, color = "primary", description }: { title: string; value: string | number; icon: React.ElementType; color?: string; description?: string; }) => (
    <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2">
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {description && <p className="text-xs text-muted-foreground/70">{description}</p>}
          </div>
          <div className="relative p-4 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
            <Icon className={`w-7 h-7 text-primary`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 shadow-xl">
          <p className="font-semibold text-foreground capitalize">{label}</p>
          <p className="text-primary font-medium">Count: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* The main page header is now in Layout.tsx */}
      
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Complaints" value={dashboardStats.totalComplaints} icon={FileText} description="All registered complaints" />
        <StatCard title="Pending" value={dashboardStats.openComplaints} icon={AlertTriangle} description="Awaiting attention" />
        <StatCard title="In Progress" value={dashboardStats.inProgress} icon={Clock} description="Being processed" />
        <StatCard title="Resolved" value={dashboardStats.resolved} icon={CheckCircle} description="Successfully completed" />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="group lg:col-span-3 border-0 bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500">
          <CardHeader><CardTitle>Complaints Distribution</CardTitle><CardDescription>Category-wise breakdown of all complaints</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={complaintsByCategory} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <defs><linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} angle={-45} textAnchor="end" height={80} tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="group lg:col-span-2 border-0 bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500">
          <CardHeader><CardTitle>Community Pulse</CardTitle><CardDescription>Real-time sentiment analysis</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={sentimentChartData} cx="50%" cy="50%" outerRadius={90} innerRadius={40} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={12}>
                  {sentimentChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
       
      {/* Sentiment Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Positive Sentiment" value={sentimentAnalysis.positive} icon={Smile} description="Happy community members" />
        <StatCard title="Neutral Sentiment" value={sentimentAnalysis.neutral} icon={Meh} description="Balanced feedback" />
        <StatCard title="Negative Sentiment" value={sentimentAnalysis.negative} icon={Frown} description="Concerns raised" />
      </div>
        
      {/* Royal Command Center (King Access Portal) */}
      {user?.role === 'god' && (
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Royal Command Center</CardTitle>
            <CardDescription>Assign and manage your kingdom's administrative domains</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {kings.map(king => {
                const assignedCategory = Object.keys(categoryAssignments).find(cat => categoryAssignments[cat] === king.id);
                const isSelected = selectedKingCard === king.id;
                return (
                  <div key={king.id} onClick={() => setSelectedKingCard(isSelected ? null : king.id)} className={`group p-4 space-y-3 rounded-2xl border transition-all duration-500 cursor-pointer ${isSelected ? 'border-primary/50 bg-primary/5 shadow-lg scale-105' : 'border-border/50 hover:border-primary/30 hover:shadow-md'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${assignedCategory ? 'bg-primary/20 text-primary' : 'bg-muted/50 text-muted-foreground'}`}><Crown className="w-4 h-4" /></div>
                        <div><p className="font-semibold text-sm">{king.username}</p><p className="text-xs text-muted-foreground truncate max-w-[140px]">{king.email}</p></div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : 'group-hover:translate-x-1'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-muted/30 p-6">
              <div className="flex items-center gap-3 mb-6"><Settings className="w-5 h-5 text-primary" /><h3 className="text-lg font-semibold">Domain Assignment Control</h3></div>
              <div className="grid gap-4">
                {uniqueCategories.map(category => (
                  <div key={category} className="p-4 rounded-xl border border-border/50 bg-card/50">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="font-semibold capitalize text-base">{category}</h4>
                      <Select value={categoryAssignments[category] || 'unassigned'} onValueChange={(kingId) => handleKingAssignment(category, kingId)} disabled={isAssigning === category}>
                        <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Choose King" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {kings.map(king => <SelectItem key={king.id} value={king.id}>{king.username}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <style jsx>{`.bg-grid-pattern { background-image: radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground)) 1px, transparent 0); background-size: 20px 20px; }`}</style>
    </div>
  );
};

export default Dashboard;

