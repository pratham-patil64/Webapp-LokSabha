import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  AlertTriangle, CheckCircle, Clock, FileText, BarChart3,
  Loader2, Smile, Frown, Meh, KeyRound, Crown, Shield,
  Activity, ChevronRight, UserCheck, MapPin, Award, Settings, Map as MapIcon, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, Timestamp, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Sentiment from 'sentiment';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import HeatmapLayer from './HeatmapLayer'; // You will need to have this component for the map

// --- INTERFACES & TYPES (Resolved) ---
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

// --- MAP COMPONENTS (New Feature from Pull) ---
const MapInteractionController = ({ isActive }: { isActive: boolean }) => {
    const map = useMap();
    useEffect(() => {
        if (isActive) {
            map.dragging.enable();
            map.scrollWheelZoom.enable();
        } else {
            map.dragging.disable();
            map.scrollWheelZoom.disable();
        }
    }, [isActive, map]);
    return null;
}

const ComplaintHeatmap = ({ complaints }: { complaints: Complaint[] }) => {
    const [isMapActive, setIsMapActive] = useState(false);
    const unresolvedComplaints = complaints.filter(c => c.status !== 'Resolved' && c.location);
    const heatmapData: [number, number, number][] = complaints.filter(c => c.location).map(c => [c.location.latitude, c.location.longitude, 1]);

    return (
      <Card className="card-professional">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MapIcon className="w-5 h-5" />Complaint Hotspots</CardTitle>
          <CardDescription>A heatmap of complaint density and unresolved issues.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden h-[400px] w-full">
            {!isMapActive && (
              <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/60 backdrop-blur-sm cursor-pointer" onClick={() => setIsMapActive(true)}>
                <div className="text-center p-4 bg-secondary text-secondary-foreground rounded-lg shadow-lg">
                  <p className="font-semibold">Click to activate map</p>
                  <p className="text-xs">Once activated, you can scroll and pan.</p>
                </div>
              </div>
            )}
            {isMapActive && (
                <Button variant="secondary" size="sm" className="absolute top-2 right-2 z-[1000] shadow-lg" onClick={() => setIsMapActive(false)}>
                    <Lock className="w-4 h-4 mr-2" /> Lock Map
                </Button>
            )}
            <MapContainer center={[19.0760, 72.8777]} zoom={12} scrollWheelZoom={false} dragging={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors' />
              <HeatmapLayer points={heatmapData} />
              {unresolvedComplaints.map(complaint => (
                <Marker key={complaint.id} position={[complaint.location.latitude, complaint.location.longitude]}>
                  <Popup><b>{complaint.category}</b><br />{complaint.description}<br />Status: {complaint.status}</Popup>
                </Marker>
              ))}
              <MapInteractionController isActive={isMapActive} />
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    );
};

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

  const complaintsByCategory = complaints.reduce((acc, c) => {
    const cat = c.category || 'Other';
    const existing = acc.find(item => item.name === cat);
    if (existing) existing.count++; else acc.push({ name: cat, count: 1 });
    return acc;
  }, [] as { name: string; count: number }[]);

  const uniqueCategories = [...new Set(complaints.map(c => c.category).filter(Boolean))];

  // --- MERGE RESOLUTION ---
  // The more robust handleKingAssignment function from the new pull has been adopted.
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
              toast({ title: "Unassigned", description: `${category} category is now unassigned.` });
          } else {
              const kingToAssign = kings.find(k => k.id === kingId);
              if (!kingToAssign) throw new Error("King not found");
              await updateDoc(doc(db, "users", kingId), { domain: { genre: category } });
              setCategoryAssignments(prev => ({ ...prev, [category]: kingId }));
              toast({ title: "Assignment Successful", description: `${category} category assigned to ${kingToAssign.username}.` });
          }
      } catch (error) {
          toast({ variant: "destructive", title: "Assignment Failed", description: "Could not update the king's domain." });
      } finally {
          setIsAssigning(null);
      }
  };

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

  if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  const StatCard = ({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType; description?: string; }) => (
    <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2">
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {description && <p className="text-xs text-muted-foreground/70">{description}</p>}
          </div>
          <div className="relative p-4 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
            <Icon className="w-7 h-7 text-primary" />
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Complaints" value={dashboardStats.totalComplaints} icon={FileText} description="All registered complaints" />
        <StatCard title="Pending" value={dashboardStats.openComplaints} icon={AlertTriangle} description="Awaiting attention" />
        <StatCard title="In Progress" value={dashboardStats.inProgress} icon={Clock} description="Being processed" />
        <StatCard title="Resolved" value={dashboardStats.resolved} icon={CheckCircle} description="Successfully completed" />
      </div>

      <ComplaintHeatmap complaints={complaints} />

      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="group lg:col-span-3 border-0 bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500">
          <CardHeader><CardTitle>Complaints Distribution</CardTitle><CardDescription>Category-wise breakdown</CardDescription></CardHeader>
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
       
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard title="Positive Sentiment" value={sentimentAnalysis.positive} icon={Smile} description="Happy community members" />
        <StatCard title="Neutral Sentiment" value={sentimentAnalysis.neutral} icon={Meh} description="Balanced feedback" />
        <StatCard title="Negative Sentiment" value={sentimentAnalysis.negative} icon={Frown} description="Concerns raised" />
      </div>
        
      {user?.role === 'god' && (
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Royal Command Center</CardTitle>
            <CardDescription>Assign and manage your kingdom's administrative domains</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-muted/30 p-6">
              <div className="flex items-center gap-3 mb-6"><Settings className="w-5 h-5 text-primary" /><h3 className="text-lg font-semibold">Domain Assignment Control</h3></div>
              <div className="grid gap-4">
                {uniqueCategories.map((category, index) => {
                  const assignedKing = kings.find(k => k.id === categoryAssignments[category]);
                  const complaintsInCategory = complaints.filter(c => c.category === category).length;
                  return (
                    <div key={category} className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-md">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="relative z-10 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300"><Award className="w-4 h-4 text-primary" /></div>
                              <div>
                                <h4 className="font-semibold capitalize text-base">{category}</h4>
                                <p className="text-sm text-muted-foreground">{complaintsInCategory} complaints • {assignedKing ? `Ruled by ${assignedKing.username}` : 'No ruler assigned'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {assignedKing && (<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20"><UserCheck className="w-3 h-3 text-primary" /><span className="text-xs font-medium text-primary">{assignedKing.username}</span></div>)}
                            <Select value={categoryAssignments[category] || 'unassigned'} onValueChange={(kingId) => handleKingAssignment(category, kingId)} disabled={isAssigning === category}>
                              <SelectTrigger className="w-[200px] h-9 bg-card/80 hover:bg-card transition-colors duration-200">
                                {isAssigning === category ? (<div className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /><span className="text-sm">Assigning...</span></div>) : (<SelectValue placeholder="Choose King" />)}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned" className="text-muted-foreground hover:text-foreground transition-colors duration-200"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-muted-foreground/50" />Unassigned</div></SelectItem>
                                {kings.map(king => (<SelectItem key={king.id} value={king.id} className="hover:bg-primary/5 transition-colors duration-200"><div className="flex items-center gap-2"><Crown className="w-3 h-3 text-primary" /><span className="font-medium">{king.username}</span></div></SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-4 hover:shadow-lg transition-all duration-300"><div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" /><div className="relative z-10 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/20"><UserCheck className="w-5 h-5 text-green-600" /></div><div><p className="text-sm text-muted-foreground">Active Kings</p><p className="text-2xl font-bold text-green-600">{Object.values(categoryAssignments).filter(v => v).length}</p></div></div></div>
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-4 hover:shadow-lg transition-all duration-300"><div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" /><div className="relative z-10 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/20"><Shield className="w-5 h-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Total Domains</p><p className="text-2xl font-bold text-blue-600">{uniqueCategories.length}</p></div></div></div>
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-4 hover:shadow-lg transition-all duration-300"><div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" /><div className="relative z-10 flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-500/20"><Activity className="w-5 h-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">Efficiency</p><p className="text-2xl font-bold text-purple-600">{uniqueCategories.length > 0 ? Math.round((Object.values(categoryAssignments).filter(v => v).length / uniqueCategories.length) * 100) : 0}%</p></div></div></div>
            </div>
          </CardContent>
        </Card>
      )}
      <style>{`.bg-grid-pattern { background-image: radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground)) 1px, transparent 0); background-size: 20px 20px; }`}</style>
    </div>
  );
};

export default Dashboard;

