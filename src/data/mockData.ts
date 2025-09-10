// Demo data for the admin complaint management system

export interface Complaint {
  id: number;
  title: string;
  category: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  location: string;
  time: string;
  priorityScore: number;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;
  reportedBy: string;
  image?: string;
  timestamp: string;
}

export const mockComplaints: Complaint[] = [
  {
    id: 1,
    title: "Water leakage in building A",
    category: "Infrastructure",
    severity: "High",
    location: "Building A, Floor 2",
    time: "2024-01-10 14:30",
    priorityScore: 85,
    status: "In Progress",
    description: "Significant water leakage observed on the second floor causing damage to ceiling tiles and potential safety hazard for staff and visitors.",
    reportedBy: "John Smith (Maintenance)",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    timestamp: "2024-01-10T14:30:00Z"
  },
  {
    id: 2,
    title: "Elevator not working",
    category: "Maintenance",
    severity: "Critical",
    location: "Main Building",
    time: "2024-01-10 09:15",
    priorityScore: 95,
    status: "Open",
    description: "Main elevator is completely out of order, trapping users between floors. Emergency services were called and elevator company notified.",
    reportedBy: "Sarah Johnson (Security)",
    image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400&h=300&fit=crop",
    timestamp: "2024-01-10T09:15:00Z"
  },
  {
    id: 3,
    title: "Noise complaint from neighbors",
    category: "Noise",
    severity: "Medium",
    location: "Residential Block C",
    time: "2024-01-09 22:45",
    priorityScore: 60,
    status: "Resolved",
    description: "Multiple residents reported excessive noise from unit 3C during late hours. Issue has been addressed with tenant and resolved.",
    reportedBy: "Michael Chen (Resident Manager)",
    timestamp: "2024-01-09T22:45:00Z"
  },
  {
    id: 4,
    title: "Parking violation reported",
    category: "Parking",
    severity: "Low",
    location: "Parking Lot B",
    time: "2024-01-09 16:20",
    priorityScore: 35,
    status: "Closed",
    description: "Vehicle parked in handicapped space without proper permit. Vehicle was towed and violation notice issued.",
    reportedBy: "David Wilson (Parking Enforcement)",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    timestamp: "2024-01-09T16:20:00Z"
  },
  {
    id: 5,
    title: "AC system malfunctioning",
    category: "HVAC",
    severity: "High",
    location: "Office Block D",
    time: "2024-01-08 11:30",
    priorityScore: 80,
    status: "In Progress",
    description: "Central air conditioning system not cooling properly. Temperature readings show 85°F when set to 72°F. Technician on-site.",
    reportedBy: "Lisa Martinez (Facilities)",
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop",
    timestamp: "2024-01-08T11:30:00Z"
  },
  {
    id: 6,
    title: "Security camera not recording",
    category: "Security",
    severity: "Critical",
    location: "Entrance Gate 1",
    time: "2024-01-08 08:00",
    priorityScore: 90,
    status: "Open",
    description: "Main entrance security camera system offline. No video recording for the past 12 hours. Security coverage compromised.",
    reportedBy: "Robert Garcia (Head of Security)",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop",
    timestamp: "2024-01-08T08:00:00Z"
  },
  {
    id: 7,
    title: "Lighting issues in hallway",
    category: "Electrical",
    severity: "Medium",
    location: "Building B, Floor 3",
    time: "2024-01-07 19:15",
    priorityScore: 55,
    status: "Resolved",
    description: "Several fluorescent lights flickering and two completely out. Electrician replaced bulbs and checked fixtures. Issue resolved.",
    reportedBy: "Amanda Taylor (Building Manager)",
    timestamp: "2024-01-07T19:15:00Z"
  },
  {
    id: 8,
    title: "Garbage disposal problem",
    category: "Sanitation",
    severity: "High",
    location: "Waste Management Area",
    time: "2024-01-07 07:45",
    priorityScore: 75,
    status: "In Progress",
    description: "Garbage disposal unit jammed and overflowing. Waste management company contacted for emergency pickup. Cleanup in progress.",
    reportedBy: "Carlos Rodriguez (Sanitation)",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=300&fit=crop",
    timestamp: "2024-01-07T07:45:00Z"
  },
  {
    id: 9,
    title: "Internet connectivity issues",
    category: "IT",
    severity: "Medium",
    location: "IT Department",
    time: "2024-01-06 14:20",
    priorityScore: 65,
    status: "Resolved",
    description: "Network outage affecting entire building. ISP reported local fiber cut. Service restored after 4 hours.",
    reportedBy: "Jennifer Kim (IT Manager)",
    timestamp: "2024-01-06T14:20:00Z"
  },
  {
    id: 10,
    title: "Fire alarm false trigger",
    category: "Safety",
    severity: "Critical",
    location: "Building C, Floor 1",
    time: "2024-01-06 03:30",
    priorityScore: 100,
    status: "Closed",
    description: "Fire alarm system activated due to faulty smoke detector. Fire department responded. Detector replaced and system tested.",
    reportedBy: "Emergency Response Team",
    image: "https://images.unsplash.com/photo-1609017108615-88db5cc324e4?w=400&h=300&fit=crop",
    timestamp: "2024-01-06T03:30:00Z"
  },
  {
    id: 11,
    title: "Window glass broken",
    category: "Infrastructure",
    severity: "Medium",
    location: "Building A, Floor 4",
    time: "2024-01-05 16:45",
    priorityScore: 50,
    status: "Open",
    description: "Large window cracked, possibly due to building settlement or temperature changes. Temporary covering applied pending glass replacement.",
    reportedBy: "Kevin Brown (Maintenance)",
    image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=300&fit=crop",
    timestamp: "2024-01-05T16:45:00Z"
  },
  {
    id: 12,
    title: "Pest control required",
    category: "Sanitation",
    severity: "Low",
    location: "Kitchen Area",
    time: "2024-01-05 10:30",
    priorityScore: 40,
    status: "In Progress",
    description: "Small ant infestation observed in kitchen area. Pest control service scheduled for next week. Temporary bait stations placed.",
    reportedBy: "Nancy White (Kitchen Staff)",
    timestamp: "2024-01-05T10:30:00Z"
  }
];

// Demo login credentials
export const adminCredentials = {
  god: {
    username: "god",
    password: "admin123",
    role: "god" as const
  },
  king: {
    username: "king", 
    password: "king123",
    role: "king" as const
  }
};

// Dashboard statistics
export const dashboardStats = {
  totalComplaints: mockComplaints.length,
  openComplaints: mockComplaints.filter(c => c.status === 'Open').length,
  inProgress: mockComplaints.filter(c => c.status === 'In Progress').length,
  resolved: mockComplaints.filter(c => c.status === 'Resolved').length,
  averagePriority: Math.round(mockComplaints.reduce((sum, c) => sum + c.priorityScore, 0) / mockComplaints.length),
  criticalCount: mockComplaints.filter(c => c.severity === 'Critical').length,
};

// Chart data for dashboard
export const complaintsByCategory = [
  { name: 'Infrastructure', count: 2, color: '#3B82F6' },
  { name: 'Maintenance', count: 1, color: '#EF4444' },
  { name: 'Noise', count: 1, color: '#F59E0B' },
  { name: 'Parking', count: 1, color: '#10B981' },
  { name: 'HVAC', count: 1, color: '#8B5CF6' },
  { name: 'Security', count: 1, color: '#F97316' },
  { name: 'Electrical', count: 1, color: '#06B6D4' },
  { name: 'Sanitation', count: 2, color: '#84CC16' },
  { name: 'IT', count: 1, color: '#6366F1' },
  { name: 'Safety', count: 1, color: '#EC4899' }
];

export const complaintsByStatus = [
  { name: 'Open', value: 3, color: '#3B82F6' },
  { name: 'In Progress', value: 4, color: '#F59E0B' },
  { name: 'Resolved', value: 3, color: '#10B981' },
  { name: 'Closed', value: 2, color: '#6B7280' }
];

export const priorityTrend = [
  { date: '2024-01-06', avgPriority: 82 },
  { date: '2024-01-07', avgPriority: 65 },
  { date: '2024-01-08', avgPriority: 85 },
  { date: '2024-01-09', avgPriority: 47 },
  { date: '2024-01-10', avgPriority: 90 }
];