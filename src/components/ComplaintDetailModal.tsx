import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MapPin, User, AlertTriangle, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { Complaint } from './ComplaintTable'; // Import from ComplaintTable

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
}

const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({ 
  complaint, 
  isOpen, 
  onClose 
}) => {
  if (!complaint) return null;

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/30';
      case 'medium':
        return 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 border border-orange-500/30';
      case 'low':
        return 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-500 hover:bg-gray-500/30 border border-gray-500/30';
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

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    // Convert Firestore Timestamp to JS Date
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <DialogTitle className="text-2xl font-bold text-foreground truncate">
            Complaint #{complaint.id}
          </DialogTitle>
          
          <div className="flex flex-wrap gap-3">
            <Badge className={`text-sm capitalize ${getSeverityBadgeClass(complaint.severity)}`}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              {complaint.severity}
            </Badge>
            <Badge className={`text-sm ${getStatusBadgeClass(complaint.status)}`}>
              {complaint.status}
            </Badge>
            <Badge variant="outline" className="text-sm capitalize">
              {complaint.category}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              Description
            </h3>
             <p className="text-muted-foreground leading-relaxed">
              {complaint.description}
            </p>
          </div>

          <Separator />
          
          {complaint.imageUrl && (
            <div className="space-y-2">
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Evidence Image
              </h4>
              <div className="rounded-lg overflow-hidden border border-border">
                <a href={complaint.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={complaint.imageUrl} 
                      alt={`Evidence for complaint ${complaint.id}`}
                      className="w-full h-auto max-h-80 object-cover"
                    />
                </a>
              </div>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Reported By
                </h4>
                <p className="text-muted-foreground">{complaint.userName}</p>
              </div>
               <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </h4>
                <p className="text-muted-foreground">
                    {complaint.location ? `Lat: ${complaint.location.latitude.toFixed(5)}, Lon: ${complaint.location.longitude.toFixed(5)}` : "Not specified"}
                </p>
              </div>
            </div>
            <div className="space-y-4">
               <div className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Reported On
                </h4>
                <p className="text-muted-foreground text-sm">
                  {formatTimestamp(complaint.createdAt)}
                </p>
              </div>
              {complaint.resolvedAt && (
                <div className="space-y-2">
                  <h4 className="font-medium text-foreground flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    Resolved On
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    {formatTimestamp(complaint.resolvedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-foreground">Priority Score</h4>
            <div className="flex items-center gap-3">
              <span className="font-bold text-xl">{complaint.priorityScore}</span>
              <div className="flex-1 bg-muted rounded-full h-3">
                <div 
                  className="h-3 rounded-full bg-gradient-primary transition-all duration-500" 
                  style={{ width: `${complaint.priorityScore}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {complaint.priorityScore && complaint.priorityScore >= 70 ? 'High' : 
                 complaint.priorityScore && complaint.priorityScore >= 40 ? 'Medium' : 'Low'}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComplaintDetailModal;