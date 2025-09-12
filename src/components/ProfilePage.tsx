import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Phone, Mail, BookUser, Pencil, Save, Clock, ShieldCheck, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define the structure for a user's profile data
interface UserProfile {
  username: string;
  email: string;
  phone?: string;
  about?: string;
  role: 'king' | 'god';
}

// A reusable component to display and edit a single profile field
const ProfileField = ({ field, label, icon: Icon, value, isEditing, onToggleEdit, onSave, onChange, isTextarea = false }: {
  field: keyof UserProfile;
  label: string;
  icon: React.ElementType;
  value: string;
  isEditing: boolean;
  onToggleEdit: (field: keyof UserProfile) => void;
  onSave: (field: keyof UserProfile) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  isTextarea?: boolean;
}) => (
    <div className="space-y-2">
        <Label htmlFor={field} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Icon className="w-4 h-4" /> {label}
        </Label>
        {isEditing ? (
            <div className="flex items-center gap-2">
                {isTextarea ? (
                    <Textarea id={field} name={field} value={value || ''} onChange={onChange} className="flex-grow" rows={4} />
                ) : (
                    <Input id={field} name={field} type={field === 'phone' ? 'tel' : 'text'} value={value || ''} onChange={onChange} className="flex-grow" />
                )}
                <Button size="icon" onClick={() => onSave(field)}><Save className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" onClick={() => onToggleEdit(field)}><X className="w-4 h-4" /></Button>
            </div>
        ) : (
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/40 min-h-[40px]">
                <p className="text-sm whitespace-pre-wrap">{value || `No ${label.toLowerCase()} set.`}</p>
                <Button size="icon" variant="ghost" onClick={() => onToggleEdit(field)}><Pencil className="w-4 h-4" /></Button>
            </div>
        )}
    </div>
);


const ProfilePage: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
    const [formData, setFormData] = useState<Partial<UserProfile>>({});
    const [avgResolutionTime, setAvgResolutionTime] = useState<string | null>(null);

    const formatDuration = (ms: number): string => {
        if (ms <= 0) return "N/A";
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    };

    const fetchProfile = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            setProfile(data);
            setFormData({ username: data.username, phone: data.phone, about: data.about });
        }
        setLoading(false);
    }, [user]);

    const calculateAvgTime = useCallback(async () => {
        if (!user || profile?.role !== 'king') return;

        const complaintsQuery = query(
            collection(db, 'complaints'),
            where('resolvedBy', '==', user.uid),
            where('status', '==', 'Resolved')
        );
        const querySnapshot = await getDocs(complaintsQuery);

        if (querySnapshot.empty) {
            setAvgResolutionTime("No resolved issues yet.");
            return;
        }

        let totalDuration = 0;
        let validDocsCount = 0;
        querySnapshot.forEach(doc => {
            const complaint = doc.data();
            if (complaint.createdAt instanceof Timestamp && complaint.resolvedAt instanceof Timestamp) {
                totalDuration += complaint.resolvedAt.toMillis() - complaint.createdAt.toMillis();
                validDocsCount++;
            }
        });

        const avgMillis = validDocsCount > 0 ? totalDuration / validDocsCount : 0;
        setAvgResolutionTime(formatDuration(avgMillis));
    }, [user, profile]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if (profile) {
            calculateAvgTime();
        }
    }, [profile, calculateAvgTime]);

    const handleEditToggle = (field: keyof UserProfile) => {
        setIsEditing(prev => ({ ...prev, [field]: !prev[field] }));
        // Reset form data for the specific field to its original profile value when canceling
        if (profile && isEditing[field]) {
            setFormData(prev => ({ ...prev, [field]: profile[field] }));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (field: keyof UserProfile) => {
        if (!user) return;
        const userDocRef = doc(db, 'users', user.uid);
        try {
            await updateDoc(userDocRef, { [field]: formData[field] });
            setProfile(prev => prev ? { ...prev, [field]: formData[field] } : null);
            handleEditToggle(field);
            toast({
                title: "Success!",
                description: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: `Could not update ${field}. Please try again.`,
            });
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    if (!profile) {
        return <div className="text-center mt-10">Could not find user profile.</div>;
    }

    return (
        <div className="p-4 md:p-8">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold">Admin Profile</CardTitle>
                            <CardDescription>View and manage your personal details.</CardDescription>
                        </div>
                        <div className="px-3 py-1 mt-2 sm:mt-0 text-sm font-semibold text-white uppercase bg-gray-800 rounded-full w-fit">
                            {profile.role}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <ProfileField field="username" label="Name" icon={User} value={formData.username || ''} isEditing={!!isEditing.username} onToggleEdit={handleEditToggle} onSave={handleSave} onChange={handleInputChange} />
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Mail className="w-4 h-4" /> Email</Label>
                        <p className="text-sm p-3 border rounded-md bg-muted/40 text-muted-foreground">{profile.email}</p>
                    </div>
                    <ProfileField field="phone" label="Phone Number" icon={Phone} value={formData.phone || ''} isEditing={!!isEditing.phone} onToggleEdit={handleEditToggle} onSave={handleSave} onChange={handleInputChange} />
                    <ProfileField field="about" label="About" icon={BookUser} value={formData.about || ''} isEditing={!!isEditing.about} onToggleEdit={handleEditToggle} onSave={handleSave} onChange={handleInputChange} isTextarea />

                    {profile.role === 'king' && (
                        <Alert>
                            <ShieldCheck className="w-4 h-4" />
                            <AlertTitle className="font-semibold">King Performance Metrics</AlertTitle>
                            <AlertDescription className="mt-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4" />
                                    <span>Average Issue Resolution Time:</span>
                                    <span className="font-bold">{avgResolutionTime || <Loader2 className="w-4 h-4 animate-spin"/>}</span>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ProfilePage;
