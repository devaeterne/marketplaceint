import React, { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import { Edit2, Facebook, Twitter, Linkedin, Instagram, Loader2, AlertCircle } from "lucide-react";
import Swal from "sweetalert2";

// Types
interface SocialLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
}

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  position?: string;
  location?: string;
  avatar?: string;
  socialLinks?: SocialLinks;
}

interface UserMetaCardProps {
  userId?: number;
  className?: string;
}

export default function UserMetaCard({ userId, className = "" }: UserMetaCardProps) {
  // States
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<UserProfile>({
    id: 0,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
    position: "",
    location: "",
    avatar: "",
    socialLinks: {
      facebook: "",
      twitter: "",
      linkedin: "",
      instagram: ""
    }
  });

  const { isOpen, openModal, closeModal } = useModal();

  // API Functions
  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("authToken");
      const endpoint = userId
        ? `${import.meta.env.VITE_API_URL}/api/users/${userId}`
        : `${import.meta.env.VITE_API_URL}/api/auth/profile`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const profile = data.user || data.profile || data.data;
        setUserProfile(profile);
        setFormData({
          id: profile.id || 0,
          firstName: profile.firstName || profile.first_name || "",
          lastName: profile.lastName || profile.last_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          bio: profile.bio || "",
          position: profile.position || profile.job_title || "",
          location: profile.location || "",
          avatar: profile.avatar || profile.profile_picture || "",
          socialLinks: {
            facebook: profile.socialLinks?.facebook || profile.facebook_url || "",
            twitter: profile.socialLinks?.twitter || profile.twitter_url || "",
            linkedin: profile.socialLinks?.linkedin || profile.linkedin_url || "",
            instagram: profile.socialLinks?.instagram || profile.instagram_url || ""
          }
        });
      } else {
        throw new Error(data.message || "Failed to fetch user profile");
      }
    } catch (err) {
      console.error("❌ User profile fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("authToken");
      const endpoint = userId
        ? `${import.meta.env.VITE_API_URL}/api/users/${userId}`
        : `${import.meta.env.VITE_API_URL}/api/auth/profile`;

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setUserProfile(formData);
        closeModal();

        // Show success message
        if (typeof window !== 'undefined' && window.alert) {
          alert("Profile updated successfully!");
        }
      } else {
        throw new Error(data.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("❌ Profile update error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update profile";

      if (typeof window !== 'undefined' && Swal.alert) {
        alert(`Error: ${errorMessage}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Event Handlers
  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform: keyof SocialLinks, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handleSave = () => {
    updateUserProfile();
  };

  const handleEditClick = () => {
    // Sync current profile data to form
    if (userProfile) {
      setFormData(userProfile);
    }
    openModal();
  };

  // Effects
  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  // Render Loading State
  if (loading) {
    return (
      <div className={`p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading profile...</span>
        </div>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
      <div className={`p-5 border border-red-200 rounded-2xl dark:border-red-800 lg:p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div className="ml-2">
            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load profile</p>
            <p className="text-sm text-red-500 dark:text-red-500">{error}</p>
            <button
              onClick={fetchUserProfile}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Main Component
  if (!userProfile) {
    return (
      <div className={`p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          No profile data available
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 ${className}`}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            {/* Avatar */}
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
              <img
                src={userProfile.avatar || "/images/user/default-avatar.jpg"}
                alt={`${userProfile.firstName} ${userProfile.lastName}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/images/user/default-avatar.jpg";
                }}
              />
            </div>

            {/* User Info */}
            <div className="order-3 xl:order-2">
              <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
                {userProfile.firstName} {userProfile.lastName}
              </h4>
              <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                {userProfile.position && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {userProfile.position}
                  </p>
                )}
                {userProfile.position && userProfile.location && (
                  <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                )}
                {userProfile.location && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {userProfile.location}
                  </p>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center order-2 gap-2 grow xl:order-3 xl:justify-end">
              {userProfile.socialLinks?.facebook && (
                <a
                  href={userProfile.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}

              {userProfile.socialLinks?.twitter && (
                <a
                  href={userProfile.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                  title="Twitter"
                >
                  <Twitter className="w-5 h-5" />
                </a>
              )}

              {userProfile.socialLinks?.linkedin && (
                <a
                  href={userProfile.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                  title="LinkedIn"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              )}

              {userProfile.socialLinks?.instagram && (
                <a
                  href={userProfile.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Edit Button */}
          <button
            onClick={handleEditClick}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Personal Information
            </h4>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
              Update your details to keep your profile up-to-date.
            </p>
          </div>

          <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
              {/* Social Links Section */}
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Social Links
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div>
                    <Label>Facebook</Label>
                    <Input
                      type="url"
                      value={formData.socialLinks?.facebook || ""}
                      onChange={(e) => handleSocialLinkChange("facebook", e.target.value)}
                      placeholder="https://www.facebook.com/username"
                    />
                  </div>

                  <div>
                    <Label>Twitter</Label>
                    <Input
                      type="url"
                      value={formData.socialLinks?.twitter || ""}
                      onChange={(e) => handleSocialLinkChange("twitter", e.target.value)}
                      placeholder="https://twitter.com/username"
                    />
                  </div>

                  <div>
                    <Label>LinkedIn</Label>
                    <Input
                      type="url"
                      value={formData.socialLinks?.linkedin || ""}
                      onChange={(e) => handleSocialLinkChange("linkedin", e.target.value)}
                      placeholder="https://www.linkedin.com/in/username"
                    />
                  </div>

                  <div>
                    <Label>Instagram</Label>
                    <Input
                      type="url"
                      value={formData.socialLinks?.instagram || ""}
                      onChange={(e) => handleSocialLinkChange("instagram", e.target.value)}
                      placeholder="https://instagram.com/username"
                    />
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  <div className="col-span-2 lg:col-span-1">
                    <Label>First Name</Label>
                    <Input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Last Name</Label>
                    <Input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={formData.phone || ""}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Position</Label>
                    <Input
                      type="text"
                      value={formData.position || ""}
                      onChange={(e) => handleInputChange("position", e.target.value)}
                      placeholder="e.g. Team Manager"
                    />
                  </div>

                  <div className="col-span-2 lg:col-span-1">
                    <Label>Location</Label>
                    <Input
                      type="text"
                      value={formData.location || ""}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder="e.g. Arizona, United States"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Bio</Label>
                    <Input
                      type="text"
                      value={formData.bio || ""}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Avatar URL</Label>
                    <Input
                      type="url"
                      value={formData.avatar || ""}
                      onChange={(e) => handleInputChange("avatar", e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={closeModal}
                disabled={saving}
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}