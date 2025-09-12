import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Trophy, Shield, Crown } from 'lucide-react';

// --- INTERFACES ---
interface King {
  id: string;
  username: string;
  email: string;
  resolvedCount: number;
  avgResolutionTime: number | null; // in milliseconds
}

interface Complaint {
  id: string;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: string;
}

// --- HELPER FUNCTIONS ---
const formatDuration = (ms: number | null): string => {
  if (ms === null || ms < 0) return "N/A";
  if (ms === 0) return "No issues resolved";
  
  let seconds = Math.floor(ms / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  hours = hours % 24;
  minutes = minutes % 60;
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : "< 1m";
};

// --- COMPONENT ---
const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<King[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch all kings
        const kingsQuery = query(collection(db, 'users'), where('role', '==', 'king'));
        const kingsSnapshot = await getDocs(kingsQuery);
        const kingsData = kingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as { username: string; email: string } }));

        // 2. Fetch all resolved complaints
        const complaintsQuery = query(collection(db, 'complaints'), where('status', '==', 'Resolved'));
        const complaintsSnapshot = await getDocs(complaintsQuery);
        const resolvedComplaints = complaintsSnapshot.docs.map(doc => doc.data() as Complaint);

        // 3. Calculate stats for each king
        const kingsWithStats: King[] = kingsData.map(king => {
          const theirResolvedComplaints = resolvedComplaints.filter(c => c.resolvedBy === king.id);
          
          if (theirResolvedComplaints.length === 0) {
            return { ...king, resolvedCount: 0, avgResolutionTime: 0 };
          }
          
          let totalDuration = 0;
          let validCount = 0;
          theirResolvedComplaints.forEach(c => {
            if (c.createdAt && c.resolvedAt) {
              const duration = c.resolvedAt.toMillis() - c.createdAt.toMillis();
              totalDuration += duration;
              validCount++;
            }
          });
          
          const avgTime = validCount > 0 ? totalDuration / validCount : null;
          return { ...king, resolvedCount: validCount, avgResolutionTime: avgTime };
        });

        // 4. Sort the leaderboard
        kingsWithStats.sort((a, b) => {
          if (a.avgResolutionTime === null) return 1;
          if (b.avgResolutionTime === null) return -1;
          if (a.avgResolutionTime === 0) return 1;
          if (b.avgResolutionTime === 0) return -1;
          return a.avgResolutionTime - b.avgResolutionTime;
        });

        setLeaderboard(kingsWithStats);
      } catch (error) {
        console.error("Failed to fetch leaderboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const getRankIndicator = (rank: number) => {
    if (rank === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-yellow-600" />;
    return <span className="font-mono text-sm text-muted-foreground">{rank + 1}</span>;
  };

  return (
    <Card className="card-professional">
      <CardHeader>
        <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
                <CardTitle className="text-2xl">King's Leaderboard</CardTitle>
                <CardDescription>Ranking based on average complaint resolution time.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Rank</TableHead>
              <TableHead>Administrator</TableHead>
              <TableHead className="text-right">Issues Resolved</TableHead>
              <TableHead className="text-right">Avg. Resolution Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.length > 0 ? leaderboard.map((king, index) => (
              <TableRow key={king.id}>
                <TableCell className="font-bold text-center">
                  <div className="flex items-center justify-center h-full">
                    {getRankIndicator(index)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-gradient-secondary text-secondary-foreground">
                        {king.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium capitalize">{king.username}</p>
                      <p className="text-xs text-muted-foreground">{king.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{king.resolvedCount}</TableCell>
                <TableCell className="text-right font-bold text-primary">
                  {formatDuration(king.avgResolutionTime)}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  No kings found or no issues have been resolved yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default LeaderboardPage;
