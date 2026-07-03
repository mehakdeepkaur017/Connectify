'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth.context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateMe } from '@/lib/api/users.api';
import { getImageUrl } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = React.useState({
    fullName: user?.fullName || '',
    bio: user?.bio || '',
    website: user?.website || '',
    gender: user?.gender || '',
    phone: user?.phone || '',
  });

  const [avatarPreview, setAvatarPreview] = React.useState(getImageUrl(user?.avatar) || '');
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: (data: FormData) => updateMe(data),
    onSuccess: (data) => {
      // Update global auth context
      updateUser(data as unknown as Parameters<typeof updateUser>[0]);
      
      // Invalidate the auth user and their profile to trigger global UI re-render
      queryClient.invalidateQueries();
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile');
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value as string);
    });
    if (selectedFile) {
      data.append('avatar', selectedFile);
    }
    mutation.mutate(data);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Edit Profile</h1>
      
      <div className="bg-muted/30 p-4 sm:p-5 rounded-2xl flex items-center gap-4 sm:gap-6 mb-8 w-full">
        <img 
          src={avatarPreview} 
          alt="Avatar" 
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 border"
        />
        <div className="flex flex-col min-w-0">
          <h3 className="font-bold text-base sm:text-xl leading-tight truncate">{user?.username}</h3>
          <p className="text-muted-foreground text-sm truncate hidden sm:block">{user?.fullName}</p>
          <button 
            type="button"
            className="text-blue-500 font-semibold text-sm sm:text-base mt-1 text-left hover:text-blue-600 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            Change profile photo
          </button>
        </div>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <Input 
            id="fullName" 
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            placeholder=" " 
            className="peer pt-6 pb-2 px-4 h-14 bg-transparent border-input rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
          />
          <Label htmlFor="fullName" className="absolute text-muted-foreground text-xs font-semibold duration-200 transform -translate-y-2 scale-100 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-110 peer-placeholder-shown:translate-y-1.5 peer-placeholder-shown:text-base peer-focus:scale-100 peer-focus:-translate-y-2 peer-focus:text-xs">
            Name
          </Label>
        </div>

        <div className="relative">
          <textarea 
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            className="peer w-full flex min-h-[120px] rounded-xl border border-input bg-transparent px-4 pt-6 pb-2 text-sm shadow-sm placeholder:text-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
            placeholder=" "
            maxLength={150}
          />
          <Label htmlFor="bio" className="absolute text-muted-foreground text-xs font-semibold duration-200 transform -translate-y-2 scale-100 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-110 peer-placeholder-shown:translate-y-1.5 peer-placeholder-shown:text-base peer-focus:scale-100 peer-focus:-translate-y-2 peer-focus:text-xs">
            Bio
          </Label>
        </div>

        <div className="relative">
          <Input 
            id="website" 
            value={formData.website}
            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            placeholder=" " 
            className="peer pt-6 pb-2 px-4 h-14 bg-transparent border-input rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
          />
          <Label htmlFor="website" className="absolute text-muted-foreground text-xs font-semibold duration-200 transform -translate-y-2 scale-100 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-110 peer-placeholder-shown:translate-y-1.5 peer-placeholder-shown:text-base peer-focus:scale-100 peer-focus:-translate-y-2 peer-focus:text-xs">
            Website
          </Label>
        </div>

        <div className="relative">
          <Input 
            id="gender" 
            value={formData.gender}
            onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
            placeholder=" " 
            className="peer pt-6 pb-2 px-4 h-14 bg-transparent border-input rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
          />
          <Label htmlFor="gender" className="absolute text-muted-foreground text-xs font-semibold duration-200 transform -translate-y-2 scale-100 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-110 peer-placeholder-shown:translate-y-1.5 peer-placeholder-shown:text-base peer-focus:scale-100 peer-focus:-translate-y-2 peer-focus:text-xs">
            Gender
          </Label>
        </div>

        <div className="relative">
          <Input 
            id="phone" 
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder=" " 
            className="peer pt-6 pb-2 px-4 h-14 bg-transparent border-input rounded-xl focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
          />
          <Label htmlFor="phone" className="absolute text-muted-foreground text-xs font-semibold duration-200 transform -translate-y-2 scale-100 top-3 z-10 origin-[0] left-4 peer-placeholder-shown:scale-110 peer-placeholder-shown:translate-y-1.5 peer-placeholder-shown:text-base peer-focus:scale-100 peer-focus:-translate-y-2 peer-focus:text-xs">
            Phone Number
          </Label>
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={mutation.isPending} 
            className="px-8 font-semibold"
          >
            {mutation.isPending ? 'Saving...' : 'Submit'}
          </Button>
        </div>
      </form>
    </div>
  );
}
