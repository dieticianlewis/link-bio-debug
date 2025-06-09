// frontend/src/components/ProfileForm.js
'use client';
import { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/api'; // Axios client with baseURL: http://localhost:3001/api
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function ProfileForm({ initialData, serverError }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isInitialDataSet, setIsInitialDataSet] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (serverError && serverError.status !== 404) {
      setFormError(`Error loading profile: ${serverError.message || "Server error"}`);
    }
    if (initialData && !isInitialDataSet) {
      setUsername(initialData.username || '');
      setDisplayName(initialData.displayName || '');
      setBio(initialData.bio || '');
      setCurrentAvatarUrl(initialData.profileImageUrl || null);
      setIsInitialDataSet(true);
    } else if (!initialData && !serverError && !isInitialDataSet) {
      setIsInitialDataSet(true); 
    }
  }, [initialData, serverError, isInitialDataSet]);

  const handleFileChange = (event) => { /* ... same as previous version ... */
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit example
        setFormError("File is too large. Maximum 5MB.");
        setSelectedFile(null); setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        setFormError("Invalid file type. (JPG, PNG, GIF, WEBP).");
        setSelectedFile(null); setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; return;
      }
      setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); setFormError(null);
    } else {
      setSelectedFile(null); setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true); setFormError(null); setFormSuccess(null);

    if (!username.trim()) {
        setFormError("Username cannot be empty."); setFormLoading(false); return;
    }
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username.trim())) {
        setFormError("Username: 3-20 chars (letters, numbers, _, ., -)."); setFormLoading(false); return;
    }

    let uploadedImageUrl = currentAvatarUrl;
    if (selectedFile) {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) throw new Error("User not authenticated for upload.");
        const userId = sessionData.session.user.id;
        const fileName = `${userId}/${Date.now()}_${selectedFile.name.replace(/\s+/g, '_')}`; 
        const { data: uploadData, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
        if (!urlData?.publicUrl) throw new Error("Could not get public URL.");
        uploadedImageUrl = urlData.publicUrl;
        setCurrentAvatarUrl(uploadedImageUrl); setSelectedFile(null); setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (uploadErr) {
        setFormError(`Image upload error: ${uploadErr.message}`); setFormLoading(false); return;
      }
    }

    try {
      const profilePayload = { username: username.trim(), displayName: displayName.trim(), bio: bio.trim(), profileImageUrl: uploadedImageUrl };
      // Path is relative to apiClient's baseURL (http://localhost:3001/api)
      // So, this calls http://localhost:3001/api/users/profile
      const response = await apiClient.post('/users/profile', profilePayload); 
      setFormSuccess('Profile saved!');
      if (response.data) { 
          setUsername(response.data.username || '');
          setDisplayName(response.data.displayName || '');
          setBio(response.data.bio || '');
          setCurrentAvatarUrl(response.data.profileImageUrl || null);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setFormLoading(false);
    }
  };

  const currentDisplayAvatar = previewUrl || currentAvatarUrl;

  // ... (rest of the ProfileForm JSX - no change from previous version)
  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        {initialData && initialData.username ? 'Edit Your Profile' : 'Create Your Profile'}
      </h1>
      {formError && <p className="text-red-500 mb-4 p-3 bg-red-100 rounded text-sm text-center">{formError}</p>}
      {formSuccess && <p className="text-green-600 mb-4 p-3 bg-green-100 rounded text-sm text-center">{formSuccess}</p>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-center space-y-4 mb-6">
          {currentDisplayAvatar ? (
            <Image src={currentDisplayAvatar} alt="Profile Avatar Preview" width={128} height={128} className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 shadow-sm" onError={() => { setCurrentAvatarUrl(null); setPreviewUrl(null); }} key={currentDisplayAvatar} />
          ) : ( <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl border-2 border-gray-300 shadow-sm"> {displayName ? displayName.charAt(0).toUpperCase() : (username ? username.charAt(0).toUpperCase() : '?')} </div> )}
          <input type="file" id="avatarUpload" accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"> {currentDisplayAvatar ? 'Change Avatar' : 'Upload Avatar'} </button>
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
          <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength="3" maxLength="20" pattern="^[a-zA-Z0-9_.-]+$" title="3-20 characters. Letters, numbers, _, ., -." className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label>
          <input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows="4" className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500" placeholder="A little about yourself..."></textarea>
        </div>
        <button type="submit" disabled={formLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70"> {formLoading ? 'Saving...' : 'Save Profile'} </button>
      </form>
    </div>
  );
}