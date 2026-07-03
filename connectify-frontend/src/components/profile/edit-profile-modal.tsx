import React from 'react';
import { UserProfile } from '@/lib/api/users.api';
import { useUpdateProfile } from '@/hooks/use-profile';
import { useAuth } from '@/contexts/auth.context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, MapPin, Link as LinkIcon } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export function EditProfileModal({ isOpen, onClose, profile }: EditProfileModalProps) {
  const { updateUser } = useAuth();
  
  const updateMutation = useUpdateProfile((updatedUser) => {
    updateUser(updatedUser as any);
  });
  
  const [formData, setFormData] = React.useState({
    fullName: profile.fullName || '',
    username: profile.username || '',
    bio: profile.bio || '',
    website: profile.website || '',
    location: profile.location || '',
  });

  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);

  const isDirty = React.useMemo(() => {
    return (
      formData.fullName !== (profile.fullName || '') ||
      formData.username !== (profile.username || '') ||
      formData.bio !== (profile.bio || '') ||
      formData.website !== (profile.website || '') ||
      formData.location !== (profile.location || '') ||
      avatarFile !== null
    );
  }, [formData, profile, avatarFile]);

  React.useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        fullName: profile.fullName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        website: profile.website || '',
        location: profile.location || '',
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvatarPreview(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvatarFile(null);
    }
  }, [isOpen, profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;
    
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });
    if (avatarFile) {
      data.append('avatar', avatarFile);
    }
    
    updateMutation.mutate(data, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        if (isDirty && !window.confirm("You have unsaved changes. Discard?")) {
          return;
        }
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background border-border">
        <DialogHeader className="p-4 border-b border-border/50 bg-muted/30">
          <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[80vh]">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-border">
                  <AvatarImage src={avatarPreview || getImageUrl(profile.avatar) || undefined} className="object-cover" />
                  <AvatarFallback className="text-2xl">{formData.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <Label 
                  htmlFor="avatar-upload" 
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="w-8 h-8 text-white" />
                </Label>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange} 
                />
              </div>
              <Label htmlFor="avatar-upload" className="text-primary font-semibold cursor-pointer hover:text-primary/80 transition-colors">
                Change Profile Photo
              </Label>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="fullName" className="text-muted-foreground font-semibold">Name</Label>
                <Input id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} className="bg-muted/50 border-none h-11" />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="username" className="text-muted-foreground font-semibold">Username</Label>
                <Input id="username" name="username" value={formData.username} onChange={handleChange} className="bg-muted/50 border-none h-11" />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="bio" className="text-muted-foreground font-semibold">Bio</Label>
                <textarea 
                  id="bio" 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange} 
                  rows={3}
                  className="bg-muted/50 border-none resize-none rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="website" className="text-muted-foreground font-semibold">Website</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="website" 
                    name="website" 
                    value={formData.website} 
                    onChange={handleChange} 
                    className="pl-10 bg-muted/50 border-none h-11" 
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location" className="text-muted-foreground font-semibold">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="location" 
                    name="location" 
                    value={formData.location} 
                    onChange={handleChange} 
                    className="pl-10 bg-muted/50 border-none h-11" 
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/50 bg-muted/30 flex justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={() => {
              if (isDirty && !window.confirm("You have unsaved changes. Discard?")) return;
              onClose();
            }} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !isDirty} className="rounded-xl px-8 font-semibold flex items-center gap-2">
              {updateMutation.isPending && <LoadingSpinner size="sm" />}
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
