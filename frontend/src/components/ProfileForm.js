// frontend/src/components/ProfileForm.js
'use client';

import { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/api'; // Your client-side Axios API helper
import { supabase } from '@/lib/supabaseClient'; // For storage uploads
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // If needed

export default function ProfileForm({ initialData, serverError }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(null);
  const avatarFileInputRef = useRef(null);

  const [currentBannerUrl, setCurrentBannerUrl] = useState(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState(null);
  const [previewBannerUrl, setPreviewBannerUrl] = useState(null);
  const bannerFileInputRef = useRef(null);
  
  const [isInitialDataSet, setIsInitialDataSet] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (serverError && serverError.status !== 404 && serverError.code !== 'PROFILE_NOT_FOUND') {
      setFormError(`Error loading profile: ${serverError.message || serverError.bodyText || "Server error"}`);
    }
    if (initialData && !isInitialDataSet) {
      setUsername(initialData.username || '');
      setDisplayName(initialData.displayName || '');
      setBio(initialData.bio || '');
      setCurrentAvatarUrl(initialData.profileImageUrl || null);
      setCurrentBannerUrl(initialData.bannerImageUrl || null);
      setIsInitialDataSet(true);
    } else if (!initialData && !serverError && !isInitialDataSet) {
      // New user, initialData might be {} if PROFILE_NOT_FOUND was handled in server component
      setIsInitialDataSet(true); 
    }
  }, [initialData, serverError, isInitialDataSet]);

  const handleFileChange = (event, type) => {
    const file = event.target.files?.[0];
    let errorSetter = setFormError; 
    let fileSetter, previewSetter, inputRef;

    if (type === 'avatar') {
      fileSetter = setSelectedAvatarFile;
      previewSetter = setPreviewAvatarUrl;
      inputRef = avatarFileInputRef;
    } else { // banner
      fileSetter = setSelectedBannerFile;
      previewSetter = setPreviewBannerUrl;
      inputRef = bannerFileInputRef;
    }

    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        errorSetter(`${type === 'avatar' ? 'Avatar' : 'Banner'} is too large. Max 5MB.`);
        fileSetter(null); previewSetter(null); if (inputRef.current) inputRef.current.value = ""; return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        errorSetter(`Invalid file type for ${type}. Use JPG, PNG, GIF, WEBP.`);
        fileSetter(null); previewSetter(null); if (inputRef.current) inputRef.current.value = ""; return;
      }
      fileSetter(file);
      previewSetter(URL.createObjectURL(file)); // Create a temporary local URL for preview
      setFormError(null); 
    } else {
      fileSetter(null);
      previewSetter(null);
    }
  };

  const uploadFileToSupabase = async (file, userId, fileType) => {
    if (!file) return null;
    if (fileType === 'avatar') setUploadingAvatar(true);
    if (fileType === 'banner') setUploadingBanner(true);

    // Path structure: avatars/USER_ID/avatarORbanner/timestamp_filename.ext
    const fileName = `${userId}/${fileType}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    
    try {
      console.log(`Uploading ${fileType} to Supabase Storage: avatars/${fileName}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars') // Your bucket name
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
      if (!urlData?.publicUrl) throw new Error("Could not get public URL for uploaded image.");
      
      console.log(`${fileType} uploaded successfully, URL:`, urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
        console.error(`Supabase storage ${fileType} upload error:`, error);
        // Try to provide a more specific error message if possible
        const message = error.message || (error.error ? `${error.error}: ${error.message}` : 'Unknown upload error');
        throw new Error(`Failed to upload ${fileType}: ${message}`);
    } finally {
        if (fileType === 'avatar') setUploadingAvatar(false);
        if (fileType === 'banner') setUploadingBanner(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true); setFormError(null); setFormSuccess(null);

    if (!username.trim()) { setFormError("Username cannot be empty."); setFormLoading(false); return; }
    if (!/^[a-zA-Z0-9_.-]{3,20}$/.test(username.trim())) { setFormError("Username: 3-20 chars (letters, numbers, _, ., -)."); setFormLoading(false); return; }

    let finalAvatarUrl = currentAvatarUrl;
    let finalBannerUrl = currentBannerUrl;

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) throw new Error("Authentication session error. Please log in again.");
      const userId = sessionData.session.user.id;

      if (selectedAvatarFile) {
        console.log("Attempting to upload new avatar...");
        finalAvatarUrl = await uploadFileToSupabase(selectedAvatarFile, userId, 'avatar');
        setCurrentAvatarUrl(finalAvatarUrl); 
        setSelectedAvatarFile(null); setPreviewAvatarUrl(null); 
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
      }
      if (selectedBannerFile) {
        console.log("Attempting to upload new banner...");
        finalBannerUrl = await uploadFileToSupabase(selectedBannerFile, userId, 'banner');
        setCurrentBannerUrl(finalBannerUrl); 
        setSelectedBannerFile(null); setPreviewBannerUrl(null);
        if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
      }
    } catch (uploadErr) {
      // uploadFileToSupabase should throw an error with a message
      setFormError(uploadErr.message || "An image upload failed.");
      setFormLoading(false);
      return;
    }
    
    try {
      const profilePayload = {
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        profileImageUrl: finalAvatarUrl,
        bannerImageUrl: finalBannerUrl,
      };
      // console.log("Submitting profile to backend with payload:", profilePayload);
      // Path is relative to apiClient's baseURL (http://localhost:3001/api)
      const response = await apiClient.post('/users/profile', profilePayload); 
      
      setFormSuccess('Profile saved successfully!');
      if (response.data) { 
          setUsername(response.data.username || '');
          setDisplayName(response.data.displayName || '');
          setBio(response.data.bio || '');
          setCurrentAvatarUrl(response.data.profileImageUrl || null);
          setCurrentBannerUrl(response.data.bannerImageUrl || null);
      }
       router.refresh(); // Good practice to refresh Server Components after mutation
    } catch (err) {
      console.error("Profile save error (backend):", err.response?.data || err.message);
      setFormError(err.response?.data?.message || 'Failed to save profile details.');
    } finally {
      setFormLoading(false);
    }
  };

  const displayAvatar = previewAvatarUrl || currentAvatarUrl;
  const displayBanner = previewBannerUrl || currentBannerUrl;

  if (serverError && !initialData && serverError.status !== 404 && serverError.code !== 'PROFILE_NOT_FOUND') {
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto text-center">
            <h1 className="text-2xl font-bold mb-6 text-red-700">Profile Error</h1>
            <p className="text-red-500 p-3 bg-red-100 rounded text-sm">
                Could not load your profile data: {serverError.message || serverError.bodyText || "An unexpected server error occurred."}
            </p>
             <button onClick={() => router.refresh()} className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Try Again
            </button>
        </div>
    );
  }

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        {initialData && initialData.username ? 'Edit Your Profile' : 'Create Your Profile'}
      </h1>
      {formError && <p className="text-red-500 mb-4 p-3 bg-red-100 rounded text-sm text-center">{formError}</p>}
      {formSuccess && <p className="text-green-600 mb-4 p-3 bg-green-100 rounded text-sm text-center">{formSuccess}</p>}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Banner Image Upload Section */}
        <div className="space-y-2">
          <label htmlFor="bannerUploadButton" className="block text-sm font-medium text-gray-700">Banner Image (Recommended: 1200x400 or similar 3:1 ratio)</label>
          {displayBanner ? (
            <div className="w-full aspect-[3/1] relative rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
              <Image src={displayBanner} alt="Banner Preview" layout="fill" objectFit="cover" key={displayBanner} />
            </div>
          ) : (
            <div className="w-full aspect-[3/1] bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 border border-dashed border-gray-300">
              <span>No banner uploaded</span>
            </div>
          )}
          <input type="file" id="bannerUploadInput" accept="image/png, image/jpeg, image/gif, image/webp" onChange={(e) => handleFileChange(e, 'banner')} className="hidden" ref={bannerFileInputRef} />
          <button id="bannerUploadButton" type="button" onClick={() => bannerFileInputRef.current?.click()} disabled={uploadingBanner} className="mt-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            {uploadingBanner ? 'Uploading...' : (currentBannerUrl || previewBannerUrl ? 'Change Banner' : 'Upload Banner')}
          </button>
        </div>

        {/* Avatar Upload Section */}
        <div className="flex flex-col items-center space-y-3">
          <label htmlFor="avatarUploadButton" className="block text-sm font-medium text-gray-700 self-start">Profile Picture</label>
          {displayAvatar ? (
            <Image src={displayAvatar} alt="Profile Avatar Preview" width={128} height={128} className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 shadow-sm" onError={() => {setCurrentAvatarUrl(null); setPreviewAvatarUrl(null);}} key={displayAvatar} />
          ) : ( <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl border-2 border-gray-300 shadow-sm"> {displayName ? displayName.charAt(0).toUpperCase() : (username ? username.charAt(0).toUpperCase() : '?')} </div> )}
          <input type="file" id="avatarUploadInput" accept="image/png, image/jpeg, image/gif, image/webp" onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" ref={avatarFileInputRef} />
          <button id="avatarUploadButton" type="button" onClick={() => avatarFileInputRef.current?.click()} disabled={uploadingAvatar} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"> 
            {uploadingAvatar ? 'Uploading...' : (currentAvatarUrl || previewAvatarUrl ? 'Change Avatar' : 'Upload Avatar')}
          </button>
        </div>

        {/* Text Fields */}
        <div><label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label><input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength="3" maxLength="20" pattern="^[a-zA-Z0-9_.-]+$" title="3-20 chars. Letters, numbers, _, ., -." className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500" /></div>
        <div><label htmlFor="displayName" className="block text-sm font-medium text-gray-700">Display Name</label><input type="text" id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500" /></div>
        <div><label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label><textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows="4" className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm text-black focus:ring-blue-500 focus:border-blue-500" placeholder="A little about yourself..."></textarea></div>
        
        <button type="submit" disabled={formLoading || uploadingAvatar || uploadingBanner} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70">
          {formLoading ? 'Saving Profile...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
}