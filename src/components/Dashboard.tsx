// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, AlertTriangle, CheckCircle, Clock,
<<<<<<< Updated upstream
  FileText, BarChart3, Users, Settings, Loader2, Smile, Frown, Meh, 
  KeyRound, Crown, Shield, Zap, Star, Activity, ChevronRight, 
  UserCheck, MapPin, Calendar, Eye, Edit3, Trash2, Award
=======
  FileText, BarChart3, Users, Settings, Loader2, Smile, Frown, Meh, KeyRound, Map as MapIcon, Lock
>>>>>>> Stashed changes
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, Timestamp, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Sentiment from 'sentiment';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
<<<<<<< Updated upstream
=======
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import HeatmapLayer from './HeatmapLayer';
>>>>>>> Stashed changes

// --- INTERFACES ---
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

interface CommunityPost {
  id: string;
  text: string;
  createdAt: Timestamp;
  userName: string;
}

interface KingUser {
    id: string;
    email: string;
    username: string;
    domain?: {
        genre: string;
    }
}

// Helper component to control map interactions
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
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Complaint Hotspots
          </CardTitle>
          <CardDescription>
            A heatmap of complaint density and unresolved issues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden" style={{ height: '400px', width: '100%' }}>
            {/* Overlay to activate the map */}
            {!isMapActive && (
              <div
                className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/60 backdrop-blur-sm cursor-pointer"
                onClick={() => setIsMapActive(true)}
              >
                <div className="text-center p-4 bg-secondary text-secondary-foreground rounded-lg shadow-lg">
                    <p className="font-semibold">Click to activate map</p>
                    <p className="text-xs">Once activated, you can scroll and pan.</p>
                </div>
              </div>
            )}

            {/* Button to deactivate the map */}
            {isMapActive && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2 z-[1000] shadow-lg"
                    onClick={() => setIsMapActive(false)}
                >
                    <Lock className="w-4 h-4 mr-2" />
                    Lock Map
                </Button>
            )}

            <MapContainer
              center={[19.0760, 72.8777]}
              zoom={12}
              scrollWheelZoom={false} // Initially disabled
              dragging={false} // Initially disabled
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              />
              <HeatmapLayer points={heatmapData} />

              {unresolvedComplaints.map(complaint => (
                <Marker key={complaint.id} position={[complaint.location.latitude, complaint.location.longitude]}>
                  <Popup>
                    <b>{complaint.category}</b><br />
                    {complaint.description}<br />
                    Status: {complaint.status}
                  </Popup>
                </Marker>
              ))}
              {/* Add the controller to the map */}
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
<<<<<<< Updated upstream
  const [selectedKingCard, setSelectedKingCard] = useState<string | null>(null);
  
=======

>>>>>>> Stashed changes
  const [dashboardStats, setDashboardStats] = useState({
    totalComplaints: 0,
    openComplaints: 0,
    inProgress: 0,
    resolved: 0,
    criticalCount: 0,
  });

  // --- DATA FETCHING ---
  useEffect(() => {
    // Fetch Complaints and update stats in real-time
    const complaintsQuery = query(collection(db, 'complaints'));
    const unsubscribeComplaints = onSnapshot(complaintsQuery, (querySnapshot) => {
      const complaintsData: Complaint[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Complaint));
      setComplaints(complaintsData);

      // Explicitly calculate and set stats for real-time updates
      setDashboardStats({
        totalComplaints: querySnapshot.size,
        openComplaints: complaintsData.filter(c => c.status === 'Pending').length,
        inProgress: complaintsData.filter(c => c.status === 'in progress').length,
        resolved: complaintsData.filter(c => c.status === 'Resolved').length,
        criticalCount: complaintsData.filter(c => c.severity === 'high').length,
      });

    }, (error) => console.error("Error fetching complaints: ", error));

    // Fetch Community Posts for sentiment analysis
    const postsQuery = query(collection(db, 'community_posts'));
    const unsubscribePosts = onSnapshot(postsQuery, (querySnapshot) => {
      const postsData: CommunityPost[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost));
      setPosts(postsData);
    }, (error) => console.error("Error fetching posts: ", error));

    // Fetch Kings if user is god
    let unsubscribeKings = () => {};
    if (user?.role === 'god') {
        const kingsQuery = query(collection(db, 'users'), where('role', '==', 'king'));
        unsubscribeKings = onSnapshot(kingsQuery, (snapshot) => {
            const kingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KingUser));
            setKings(kingsData);

            // Set initial assignments
            const assignments: Record<string, string> = {};
            kingsData.forEach(king => {
                if (king.domain?.genre) {
                    assignments[king.domain.genre] = king.id;
                }
            });
            setCategoryAssignments(assignments);
        });
    }

    // Combined loading state
    Promise.all([new Promise(res => onSnapshot(complaintsQuery, res)), new Promise(res => onSnapshot(postsQuery, res))])
      .then(() => setLoading(false))
      .catch(() => setLoading(false));

    return () => {
      unsubscribeComplaints();
      unsubscribePosts();
      unsubscribeKings();
    };
  }, [user]);

  // --- DATA PROCESSING ---
  const complaintsByCategory = complaints.reduce((acc, complaint) => {
    const category = complaint.category || 'Other';
    const existing = acc.find(item => item.name === category);
    if (existing) existing.count += 1;
    else acc.push({ name: category, count: 1 });
    return acc;
  }, [] as { name: string; count: number }[]);

  const uniqueCategories = [...new Set(complaints.map(c => c.category).filter(Boolean))];

  const handleKingAssignment = async (category: string, kingId: string) => {
      setIsAssigning(category);
      try {
          const currentKingId = categoryAssignments[category];

          // Unassign from the previous king if there was one and it's a different king
          if (currentKingId && currentKingId !== kingId) {
              const currentKingRef = doc(db, "users", currentKingId);
              await updateDoc(currentKingRef, { domain: {} });
          }

          // Handle unassignment
          if (kingId === 'unassigned') {
              if (currentKingId) {
                  const currentKingRef = doc(db, "users", currentKingId);
                  await updateDoc(currentKingRef, { domain: {} });
              }
              setCategoryAssignments(prev => {
                  const newAssignments = { ...prev };
                  delete newAssignments[category];
                  return newAssignments;
              });
              toast({
                  title: "Unassigned",
                  description: `${category} category is now unassigned.`,
              });
          } else {
              // Handle new assignment
              const kingToAssign = kings.find(k => k.id === kingId);
              if (!kingToAssign) throw new Error("King not found");

              const newKingRef = doc(db, "users", kingId);
              await updateDoc(newKingRef, { domain: { genre: category } });

              setCategoryAssignments(prev => ({ ...prev, [category]: kingId }));
              toast({
                  title: "Assignment Successful",
                  description: `${category} category assigned to ${kingToAssign.email}.`,
              });
          }
      } catch (error) {
          console.error("Error assigning category: ", error);
          toast({
              variant: "destructive",
              title: "Assignment Failed",
              description: "Could not update the king's domain.",
          });
      } finally {
          setIsAssigning(null);
      }
  };

  const complaintsByStatus = [
    { name: 'Pending', value: dashboardStats.openComplaints, color: '#f59e0b' },
    { name: 'In Progress', value: dashboardStats.inProgress, color: '#3b82f6' },
    { name: 'Resolved', value: dashboardStats.resolved, color: '#22c55e' },
  ].filter(item => item.value > 0);

  // Sentiment Analysis Processing
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-primary/20 animate-pulse" />
        </div>
      </div>
    );
  }

  // --- COMPONENTS ---
  const StatCard = ({ title, value, icon: Icon, trend, color = "primary", description }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    color?: string;
    description?: string;
  }) => (
    <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card to-card/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-2">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">{title}</p>
            <p className="text-3xl font-bold tracking-tight group-hover:scale-105 transform transition-transform duration-300">{value}</p>
            {trend && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors duration-300">
                <TrendingUp className="w-3 h-3" />
                {trend}
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground/70">{description}</p>
            )}
          </div>
          <div className={`relative p-4 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className={`w-7 h-7 text-primary group-hover:text-primary transition-colors duration-300`} />
            <div className="absolute inset-0 rounded-2xl bg-primary/5 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
          <p className="text-primary font-medium">
            Count: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Animated Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/10">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Divine Dashboard
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Welcome back, God Admin. Command your digital realm with supreme oversight.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/complaints')} 
            className="group relative overflow-hidden bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            <FileText className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
            View All Complaints
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Complaints" 
          value={dashboardStats.totalComplaints} 
          icon={FileText} 
          color="primary"
          description="All registered complaints"
        />
        <StatCard 
          title="Pending" 
          value={dashboardStats.openComplaints} 
          icon={AlertTriangle} 
          color="destructive"
          description="Awaiting attention"
        />
        <StatCard 
          title="In Progress" 
          value={dashboardStats.inProgress} 
          icon={Clock} 
          color="warning"
          description="Being processed"
        />
        <StatCard 
          title="Resolved" 
          value={dashboardStats.resolved} 
          icon={CheckCircle} 
          color="success"
          description="Successfully completed"
        />
      </div>

<<<<<<< Updated upstream
      {/* Enhanced Charts Grid */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Enhanced Complaints by Category */}
        <Card className="group lg:col-span-3 border-0 bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              Complaints Distribution
=======
      {/* Complaint Heatmap */}
      <ComplaintHeatmap complaints={complaints} />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Complaints by Category */}
        <Card className="card-professional lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Complaints by Category
>>>>>>> Stashed changes
            </CardTitle>
            <CardDescription>Category-wise breakdown of all complaints</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={complaintsByCategory} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tickFormatter={(value) => typeof value === 'string' ? value.charAt(0).toUpperCase() + value.slice(1) : value}
                />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="url(#barGradient)" 
                  radius={[6, 6, 0, 0]}
                  className="hover:opacity-80 transition-opacity duration-200"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Enhanced Sentiment Analysis */}
        <Card className="group lg:col-span-2 border-0 bg-gradient-to-br from-card to-card/50 hover:shadow-2xl transition-all duration-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              Community Pulse
            </CardTitle>
            <CardDescription>Real-time sentiment analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie 
                  data={sentimentChartData} 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={90}
                  innerRadius={40}
                  dataKey="value" 
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} 
                  labelLine={false} 
                  fontSize={12}
                >
                  {sentimentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} className="hover:opacity-80 transition-opacity duration-200" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Sentiment Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard 
          title="Positive Sentiment" 
          value={sentimentAnalysis.positive} 
          icon={Smile} 
          color="success"
          description="Happy community members"
        />
        <StatCard 
          title="Neutral Sentiment" 
          value={sentimentAnalysis.neutral} 
          icon={Meh} 
          color="gray"
          description="Balanced feedback"
        />
        <StatCard 
          title="Negative Sentiment" 
          value={sentimentAnalysis.negative} 
          icon={Frown} 
          color="destructive"
          description="Concerns raised"
        />
      </div>
        
      {/* Revolutionary King Access Portal */}
      {user?.role === 'god' && (
        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
          
          <CardHeader className="relative z-10 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500">
                    <Crown className="w-7 h-7 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                    Royal Command Center
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    Assign and manage your kingdom's administrative domains
                  </CardDescription>
                </div>
              </div>
              <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20">
                <Shield className="w-3 h-3 mr-1" />
                God Access
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 space-y-6">
            {/* Kings Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {kings.map((king) => {
                const assignedCategory = Object.keys(categoryAssignments).find(cat => categoryAssignments[cat] === king.id);
                const isSelected = selectedKingCard === king.id;
                
                return (
                  <div
                    key={king.id}
                    onClick={() => setSelectedKingCard(isSelected ? null : king.id)}
                    className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 cursor-pointer ${
                      isSelected 
                        ? 'border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg scale-105' 
                        : 'border-border/50 bg-gradient-to-br from-card to-muted/20 hover:border-primary/30 hover:shadow-md hover:scale-102'
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="relative z-10 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl transition-all duration-300 ${
                            assignedCategory 
                              ? 'bg-primary/20 text-primary' 
                              : 'bg-muted/50 text-muted-foreground'
                          }`}>
                            <Crown className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{king.username}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                              {king.email}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                          isSelected ? 'rotate-90' : 'group-hover:translate-x-1'
                        }`} />
                      </div>
                      
                      <div className={`transition-all duration-500 ${isSelected ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <div className="pt-2 border-t border-border/30">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {assignedCategory ? `Ruling ${assignedCategory}` : 'Awaiting domain'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <Badge 
                          variant={assignedCategory ? "default" : "secondary"} 
                          className={`text-xs transition-all duration-300 ${
                            assignedCategory 
                              ? 'bg-primary/20 text-primary border-primary/30' 
                              : 'bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          {assignedCategory || 'Unassigned'}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                            assignedCategory ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/50'
                          }`} />
                          <span className="text-xs text-muted-foreground">
                            {assignedCategory ? 'Active' : 'Idle'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Assignment Interface */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-muted/30 to-muted/10 p-6">
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Domain Assignment Control</h3>
                </div>
                
                <div className="grid gap-4">
                  {uniqueCategories.map((category, index) => {
                    const assignedKing = kings.find(k => k.id === categoryAssignments[category]);
                    const complaintsInCategory = complaints.filter(c => c.category === category).length;
                    
                    return (
                      <div
                        key={category}
                        className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/50 hover:bg-card transition-all duration-300 hover:shadow-md"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="relative z-10 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                                  <Award className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-semibold capitalize text-base">{category}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {complaintsInCategory} complaints • {assignedKing ? `Ruled by ${assignedKing.username}` : 'No ruler assigned'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {assignedKing && (
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                  <UserCheck className="w-3 h-3 text-primary" />
                                  <span className="text-xs font-medium text-primary">{assignedKing.email}</span>
                                </div>
                              )}
                              
                              <Select
                                value={categoryAssignments[category] || 'unassigned'}
                                onValueChange={(kingId) => handleKingAssignment(category, kingId)}
                                disabled={isAssigning === category}
                              >
                                <SelectTrigger className="w-[200px] h-9 bg-card/80 hover:bg-card transition-colors duration-200">
                                  {isAssigning === category ? (
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span className="text-sm">Assigning...</span>
                                    </div>
                                  ) : (
                                    <SelectValue placeholder="Choose King" />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem 
                                    value="unassigned"
                                    className="text-muted-foreground hover:text-foreground transition-colors duration-200"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                                      Unassigned
                                    </div>
                                  </SelectItem>
                                  {kings.map(king => (
                                    <SelectItem 
                                      key={king.id} 
                                      value={king.id}
                                      className="hover:bg-primary/5 transition-colors duration-200"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Crown className="w-3 h-3 text-primary" />
                                        <div>
                                          <span className="font-medium">{king.username}</span>
                                          <span className="text-xs text-muted-foreground ml-2">
                                            {king.email}
                                          </span>
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {/* Progress indicator */}
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Category Load</span>
                              <span className="font-medium">{complaintsInCategory} complaints</span>
                            </div>
                            <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-1000 ease-out"
                                style={{ 
                                  width: `${Math.min((complaintsInCategory / Math.max(...uniqueCategories.map(cat => complaints.filter(c => c.category === cat).length))) * 100, 100)}%` 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Stats for King Management */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 p-4 hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <UserCheck className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Kings</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Object.keys(categoryAssignments).length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 p-4 hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Domains</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {uniqueCategories.length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 p-4 hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Efficiency</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {Math.round((Object.keys(categoryAssignments).length / uniqueCategories.length) * 100)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Styles for Grid Pattern */}
      <style jsx>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground)) 1px, transparent 0);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;