'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import {
  MainCategory,
  MediaItem,
  getYouTubeThumbnail,
} from '@/data/portfolioData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  uploadToCloudinary,
  deleteCloudinaryMedia,
  extractCloudinaryPublicId,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/cloudinary';
import {
  TabType,
  AdminCategory,
  AdminSubCategory,
  ContentFormData,
  BulkEditFormData,
  CategoryFormData,
  SubcategoryFormData,
  ChangePasswordFormData,
} from '@/types/admin';

// Admin Components
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import OverviewTab from '@/components/admin/tabs/OverviewTab';
import ContentsTab from '@/components/admin/tabs/ContentsTab';
import CategoriesTab from '@/components/admin/tabs/CategoriesTab';
import ContentModal from '@/components/admin/modals/ContentModal';
import CategoryModals from '@/components/admin/modals/CategoryModals';
import BulkModals from '@/components/admin/modals/BulkModals';
import DeleteContentModal from '@/components/admin/modals/DeleteContentModal';
import ChangePasswordModal from '@/components/admin/modals/ChangePasswordModal';

export default function AdminPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  // Auth User
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null);

  // Categories & Subcategories State
  const [categoriesList, setCategoriesList] = useState<AdminCategory[]>([]);

  // Bulk Selection & Action State
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [bulkEditData, setBulkEditData] = useState<BulkEditFormData>({
    updateCategory: true,
    categoryId: '',
    subcategoryId: '',
    updateStatus: false,
    status: 'published',
  });

  // Change Password Modal State
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [changePasswordData, setChangePasswordData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Content Modal (Add / Edit Work)
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [contentFormData, setContentFormData] = useState<ContentFormData>({
    categoryId: '',
    subcategoryId: '',
    description: '',
    type: 'photo',
    image: '',
    videoUrl: '',
    status: 'published',
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [deletingItem, setDeletingItem] = useState<MediaItem | null>(null);

  // Hidden file input for replacing image
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Track images during modal session for clean cancellation and safe updates
  const initialEditingImageRef = useRef<string>('');
  const sessionUploadedImagesRef = useRef<string[]>([]);

  // Category Modal (Add / Edit Category)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'create' | 'edit'>('create');
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    id: '',
    label: '',
    description: '',
  });
  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null);

  // Subcategory Modal (Add / Edit Subcategory)
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [subcategoryModalMode, setSubcategoryModalMode] = useState<'create' | 'edit'>('create');
  const [subcategoryFormData, setSubcategoryFormData] = useState<SubcategoryFormData>({
    id: '',
    categoryId: '',
    label: '',
    description: '',
  });
  const [deletingSubcategory, setDeletingSubcategory] = useState<{
    categoryId: string;
    subcategory: AdminSubCategory;
  } | null>(null);

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Check auth session
  useEffect(() => {
    const verifyAdminAuth = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setCheckingAuth(false);
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace('/admin/login');
        } else {
          setCurrentUser({ email: session.user.email, id: session.user.id });
          setCheckingAuth(false);
        }
      } catch (err) {
        console.warn('Auth verification notice:', err);
        router.replace('/admin/login');
      }
    };

    verifyAdminAuth();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          router.replace('/admin/login');
        } else {
          setCurrentUser({ email: session.user.email, id: session.user.id });
          setCheckingAuth(false);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, [router]);

  // Load Categories, Subcategories & Contents from Database
  const loadDatabaseData = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      // 1. Fetch categories
      const { data: catRows } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      // 2. Fetch subcategories
      const { data: subcatRows } = await supabase
        .from('subcategories')
        .select('*')
        .order('created_at', { ascending: true });

      if (catRows) {
        const structured: AdminCategory[] = catRows.map((cat) => ({
          id: cat.id,
          label: cat.label,
          description: cat.description || '',
          subcategories: (subcatRows || [])
            .filter((s) => s.category_id === cat.id)
            .map((s) => ({
              id: s.id,
              label: s.label,
              description: s.description || '',
            })),
        }));
        setCategoriesList(structured);
      } else {
        setCategoriesList([]);
      }

      // 3. Fetch contents
      const { data: dbContents } = await supabase
        .from('contents')
        .select(`
          id,
          description,
          subcategory_id,
          image_url,
          type,
          video_url,
          status,
          created_at,
          subcategories:subcategory_id (
            id,
            label,
            categories:category_id (
              id,
              label
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (dbContents) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: MediaItem[] = dbContents.map((d: any) => ({
          id: d.id,
          category: (d.subcategories?.categories?.label?.toLowerCase().replace(/\s+/g, '-') ||
            'photography') as MainCategory,
          categoryLabel: d.subcategories?.categories?.label || 'Portfolio',
          subcategory: d.subcategories?.id || d.subcategory_id,
          subcategoryLabel: d.subcategories?.label || 'Work',
          description: d.description || '',
          type: (d.type || 'photo') as 'photo' | 'video',
          image: d.image_url,
          videoUrl: d.video_url || undefined,
          status: (d.status || 'published') as 'draft' | 'published' | 'archived',
        }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn('Sync notice:', err);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  // Clean up uncommitted Cloudinary uploads on page unload or back navigation
  useEffect(() => {
    const handleUnload = () => {
      if (sessionUploadedImagesRef.current.length > 0) {
        for (const tempUrl of sessionUploadedImagesRef.current) {
          if (tempUrl.includes('res.cloudinary.com')) {
            const publicId = extractCloudinaryPublicId(tempUrl);
            if (publicId && typeof navigator !== 'undefined' && navigator.sendBeacon) {
              navigator.sendBeacon(
                '/api/media/delete',
                new Blob([JSON.stringify({ publicId, resourceType: 'image' })], {
                  type: 'application/json',
                })
              );
            }
          }
        }
        sessionUploadedImagesRef.current = [];
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('popstate', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('popstate', handleUnload);
    };
  }, []);

  // Handle Escape key to close modal safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isContentModalOpen && !uploadingMedia) {
        handleCloseContentModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isContentModalOpen, uploadingMedia]);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCurrentUser(null);
    router.replace('/admin/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);

    if (!isSupabaseConfigured || !supabase) {
      setChangePasswordError('Authentication service is not configured.');
      return;
    }

    if (changePasswordData.newPassword.length < 6) {
      setChangePasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (changePasswordData.newPassword !== changePasswordData.confirmPassword) {
      setChangePasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      if (changePasswordData.currentPassword && currentUser?.email) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: currentUser.email,
          password: changePasswordData.currentPassword,
        });

        if (verifyError) {
          throw new Error('Current password is incorrect. Please verify and try again.');
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: changePasswordData.newPassword,
      });

      if (error) {
        throw error;
      }

      showToast('Password successfully changed!');
      setIsChangePasswordModalOpen(false);
      setChangePasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: unknown) {
      const error = err as Error;
      setChangePasswordError(error.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Bulk Actions Handlers
  const handleToggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allFilteredSelected =
      filteredItems.length > 0 &&
      filteredItems.every((item) => selectedItemIds.includes(item.id));

    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredItems.map((i) => i.id));
      setSelectedItemIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedItemIds, ...filteredItems.map((i) => i.id)]);
      setSelectedItemIds(Array.from(newIds));
    }
  };

  const openBulkEditModal = () => {
    const firstCat = categoriesList[0];
    const firstSub = firstCat?.subcategories[0];
    setBulkEditData({
      updateCategory: true,
      categoryId: firstCat?.id || '',
      subcategoryId: firstSub?.id || '',
      updateStatus: false,
      status: 'published',
    });
    setIsBulkEditModalOpen(true);
  };

  const handleBulkEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItemIds.length === 0) return;
    if (!bulkEditData.updateCategory && !bulkEditData.updateStatus) {
      showToast('Select at least one field (Category or Status) to update');
      return;
    }

    setIsBulkSaving(true);
    const itemsToUpdate = items.filter((i) => selectedItemIds.includes(i.id));

    const parentCat = categoriesList.find((c) => c.id === bulkEditData.categoryId);
    const selectedSub = parentCat?.subcategories.find((s) => s.id === bulkEditData.subcategoryId);

    let finalSubcatId = bulkEditData.subcategoryId;
    if (bulkEditData.updateCategory && isSupabaseConfigured && supabase) {
      const isSubcatUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalSubcatId);
      if (!isSubcatUuid && selectedSub?.label) {
        const { data: foundDbSub } = await supabase
          .from('subcategories')
          .select('id')
          .eq('label', selectedSub.label)
          .limit(1)
          .maybeSingle();
        if (foundDbSub?.id) finalSubcatId = foundDbSub.id;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (bulkEditData.updateCategory && finalSubcatId) {
      updatePayload.subcategory_id = finalSubcatId;
    }
    if (bulkEditData.updateStatus) {
      updatePayload.status = bulkEditData.status;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const uuidIds = itemsToUpdate
          .filter((i) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.id)
          )
          .map((i) => i.id);

        const nonUuidImages = itemsToUpdate
          .filter(
            (i) =>
              !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.id)
          )
          .map((i) => i.image);

        if (uuidIds.length > 0) {
          const { error: err1 } = await supabase
            .from('contents')
            .update(updatePayload)
            .in('id', uuidIds);
          if (err1) console.error('Bulk update error (UUID):', err1);
        }
        if (nonUuidImages.length > 0) {
          const { error: err2 } = await supabase
            .from('contents')
            .update(updatePayload)
            .in('image_url', nonUuidImages);
          if (err2) console.error('Bulk update error (Non-UUID):', err2);
        }
        await loadDatabaseData();
      } catch (err) {
        console.error('Bulk update error:', err);
      }
    } else {
      setItems((prev) =>
        prev.map((i) => {
          if (!selectedItemIds.includes(i.id)) return i;
          return {
            ...i,
            category: bulkEditData.updateCategory && parentCat ? (parentCat.label.toLowerCase().replace(/\s+/g, '-') as MainCategory) : i.category,
            categoryLabel: bulkEditData.updateCategory && parentCat ? parentCat.label : i.categoryLabel,
            subcategory: bulkEditData.updateCategory ? bulkEditData.subcategoryId : i.subcategory,
            subcategoryLabel: bulkEditData.updateCategory && selectedSub ? selectedSub.label : i.subcategoryLabel,
            status: bulkEditData.updateStatus ? bulkEditData.status : i.status,
          };
        })
      );
    }

    showToast(`Updated ${selectedItemIds.length} works successfully.`);
    setIsBulkEditModalOpen(false);
    setSelectedItemIds([]);
    setIsBulkSaving(false);
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.length === 0) return;
    setIsBulkDeleting(true);
    const itemsToDelete = items.filter((i) => selectedItemIds.includes(i.id));

    // Delete associated Cloudinary images
    for (const item of itemsToDelete) {
      if (item.image && item.image.includes('res.cloudinary.com')) {
        await deleteCloudinaryMedia(item.image);
      }
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const uuidIds = itemsToDelete
          .filter((i) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.id)
          )
          .map((i) => i.id);

        const nonUuidImages = itemsToDelete
          .filter(
            (i) =>
              !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(i.id)
          )
          .map((i) => i.image);

        if (uuidIds.length > 0) {
          const { error: err1 } = await supabase.from('contents').delete().in('id', uuidIds);
          if (err1) console.error('Bulk delete error (UUID):', err1);
        }
        if (nonUuidImages.length > 0) {
          const { error: err2 } = await supabase
            .from('contents')
            .delete()
            .in('image_url', nonUuidImages);
          if (err2) console.error('Bulk delete error (Non-UUID):', err2);
        }
        await loadDatabaseData();
      } catch (err) {
        console.error('Bulk delete error:', err);
      }
    } else {
      setItems((prev) => prev.filter((i) => !selectedItemIds.includes(i.id)));
    }

    showToast(`Deleted ${itemsToDelete.length} works successfully.`);
    setIsBulkDeleteModalOpen(false);
    setSelectedItemIds([]);
    setIsBulkDeleting(false);
  };

  // Content Modal Handlers
  const openCreateContentModal = () => {
    if (categoriesList.length === 0) {
      showToast('Please create a category first before adding works.');
      return;
    }
    setEditingItem(null);
    initialEditingImageRef.current = '';
    sessionUploadedImagesRef.current = [];
    const firstCat = categoriesList[0];
    const firstSub = firstCat?.subcategories[0];

    setContentFormData({
      categoryId: firstCat?.id || '',
      subcategoryId: firstSub?.id || '',
      description: '',
      type: 'photo',
      image: '',
      videoUrl: '',
      status: 'published',
    });
    setIsContentModalOpen(true);
  };

  const openEditContentModal = (item: MediaItem) => {
    setEditingItem(item);
    initialEditingImageRef.current = item.type === 'photo' ? item.image || '' : '';
    sessionUploadedImagesRef.current = [];
    const foundCat =
      categoriesList.find(
        (c) =>
          c.id === item.category ||
          c.label.toLowerCase() === item.categoryLabel.toLowerCase() ||
          c.subcategories.some((s) => s.id === item.subcategory)
      ) || categoriesList[0];

    const foundSub =
      foundCat?.subcategories.find(
        (s) =>
          s.id === item.subcategory ||
          s.label.toLowerCase() === item.subcategoryLabel.toLowerCase()
      ) || foundCat?.subcategories[0];

    setContentFormData({
      categoryId: foundCat?.id || '',
      subcategoryId: foundSub?.id || '',
      description: item.description || '',
      type: item.type,
      image: item.type === 'photo' ? item.image || '' : '',
      videoUrl: item.type === 'video' ? item.videoUrl || '' : '',
      status: item.status || 'published',
    });
    setIsContentModalOpen(true);
  };

  const handleUploadNewImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Only image files (PNG, JPG, WEBP, AVIF, GIF, etc.) are allowed.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
      showToast(
        `File size (${sizeInMb}MB) exceeds the 10MB limit. Please upload an image smaller than 10MB.`
      );
      return;
    }

    setUploadingMedia(true);
    try {
      if (sessionUploadedImagesRef.current.length > 0) {
        for (const tempUrl of sessionUploadedImagesRef.current) {
          if (tempUrl.includes('res.cloudinary.com')) {
            await deleteCloudinaryMedia(tempUrl);
          }
        }
        sessionUploadedImagesRef.current = [];
      }

      const res = await uploadToCloudinary(file);
      sessionUploadedImagesRef.current.push(res.url);
      setContentFormData((prev) => ({ ...prev, image: res.url }));
      showToast('Image uploaded successfully!');
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Failed to upload image');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!contentFormData.image) return;

    if (sessionUploadedImagesRef.current.includes(contentFormData.image)) {
      if (contentFormData.image.includes('res.cloudinary.com')) {
        await deleteCloudinaryMedia(contentFormData.image);
      }
      sessionUploadedImagesRef.current = sessionUploadedImagesRef.current.filter(
        (url) => url !== contentFormData.image
      );
    }

    setContentFormData((prev) => ({ ...prev, image: '' }));
    showToast('Image removed.');
  };

  const handleCloseContentModal = async () => {
    if (sessionUploadedImagesRef.current.length > 0) {
      for (const uploadedUrl of sessionUploadedImagesRef.current) {
        if (uploadedUrl.includes('res.cloudinary.com')) {
          try {
            await deleteCloudinaryMedia(uploadedUrl);
          } catch (err) {
            console.warn('Failed to clean up cancelled upload:', err);
          }
        }
      }
      sessionUploadedImagesRef.current = [];
    }
    initialEditingImageRef.current = '';
    setIsContentModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentFormData.subcategoryId) {
      showToast('Please select a subcategory');
      return;
    }

    let finalImage = '';
    let finalVideoUrl: string | null = null;

    if (contentFormData.type === 'video') {
      finalVideoUrl = contentFormData.videoUrl.trim();
      finalImage = getYouTubeThumbnail(finalVideoUrl) || '';
      if (sessionUploadedImagesRef.current.length > 0) {
        for (const tempUrl of sessionUploadedImagesRef.current) {
          if (tempUrl.includes('res.cloudinary.com')) {
            await deleteCloudinaryMedia(tempUrl);
          }
        }
        sessionUploadedImagesRef.current = [];
      }
    } else {
      finalVideoUrl = null;
      finalImage = contentFormData.image.trim();
    }

    if (!finalImage) {
      showToast(
        contentFormData.type === 'video'
          ? 'Please provide a valid YouTube link'
          : 'Please upload an image file'
      );
      return;
    }

    const parentCat = categoriesList.find((c) => c.id === contentFormData.categoryId);
    const selectedSub = parentCat?.subcategories.find((s) => s.id === contentFormData.subcategoryId);

    let finalSubcatId = contentFormData.subcategoryId;
    if (isSupabaseConfigured && supabase) {
      const isSubcatUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalSubcatId);
      if (!isSubcatUuid) {
        const subLabel = selectedSub?.label;
        if (subLabel) {
          const { data: foundDbSub } = await supabase
            .from('subcategories')
            .select('id')
            .eq('label', subLabel)
            .limit(1)
            .maybeSingle();
          if (foundDbSub?.id) finalSubcatId = foundDbSub.id;
        }
        if (
          !finalSubcatId ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalSubcatId)
        ) {
          const { data: firstSub } = await supabase
            .from('subcategories')
            .select('id')
            .limit(1)
            .maybeSingle();
          if (firstSub?.id) finalSubcatId = firstSub.id;
        }
      }
    }

    const payload = {
      description: contentFormData.description.trim() || null,
      subcategory_id: finalSubcatId,
      image_url: finalImage,
      type: contentFormData.type,
      video_url: finalVideoUrl,
      status: contentFormData.status,
    };

    if (isSupabaseConfigured && supabase && finalSubcatId) {
      try {
        if (editingItem) {
          const isItemUuid =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              editingItem.id
            );

          if (isItemUuid) {
            const { error: updateError } = await supabase
              .from('contents')
              .update({
                ...payload,
                updated_at: new Date().toISOString(),
              })
              .eq('id', editingItem.id);

            if (updateError) {
              console.error('Update error:', updateError);
              showToast(`Failed to update: ${updateError.message}`);
              return;
            }
            showToast('Work updated successfully.');
          } else {
            const { data: existingRow } = await supabase
              .from('contents')
              .select('id')
              .eq('image_url', finalImage)
              .limit(1)
              .maybeSingle();

            if (existingRow?.id) {
              const { error: updateError } = await supabase
                .from('contents')
                .update({
                  ...payload,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingRow.id);

              if (updateError) {
                console.error('Update error:', updateError);
                showToast(`Failed to update: ${updateError.message}`);
                return;
              }
              showToast('Work updated successfully.');
            } else {
              const { error: insertError } = await supabase.from('contents').insert(payload);
              if (insertError) {
                console.error('Insert error:', insertError);
                showToast(`Failed to save: ${insertError.message}`);
                return;
              }
              showToast('Work saved successfully.');
            }
          }
        } else {
          const { error: insertError } = await supabase.from('contents').insert(payload);
          if (insertError) {
            console.error('Insert error:', insertError);
            showToast(`Failed to create work: ${insertError.message}`);
            return;
          }
          showToast('New work created successfully.');
        }

        // Deferred delete of old Cloudinary image on Save
        if (
          editingItem &&
          initialEditingImageRef.current &&
          initialEditingImageRef.current !== finalImage &&
          initialEditingImageRef.current.includes('res.cloudinary.com')
        ) {
          try {
            await deleteCloudinaryMedia(initialEditingImageRef.current);
          } catch (err) {
            console.warn('Failed to delete old image from Cloudinary:', err);
          }
        }

        await loadDatabaseData();
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Save error:', error);
        showToast(error.message || 'Error saving work');
        return;
      }
    } else {
      const savedItem: MediaItem = {
        id: editingItem ? editingItem.id : `content-${Date.now()}`,
        category: (parentCat?.label.toLowerCase().replace(/\s+/g, '-') ||
          'photography') as MainCategory,
        categoryLabel: parentCat?.label || 'Category',
        subcategory: contentFormData.subcategoryId,
        subcategoryLabel: selectedSub?.label || 'Work',
        description: contentFormData.description,
        type: contentFormData.type,
        image: finalImage,
        videoUrl: finalVideoUrl || undefined,
        status: contentFormData.status,
      };

      if (editingItem) {
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? savedItem : i)));
        showToast('Work updated successfully.');
      } else {
        setItems((prev) => [savedItem, ...prev]);
        showToast('New work created successfully.');
      }
    }

    sessionUploadedImagesRef.current = [];
    initialEditingImageRef.current = '';
    setIsContentModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteContent = async () => {
    if (!deletingItem) return;

    if (deletingItem.image && deletingItem.image.includes('res.cloudinary.com')) {
      await deleteCloudinaryMedia(deletingItem.image);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deletingItem.id);
        if (isUuid) {
          await supabase.from('contents').delete().eq('id', deletingItem.id);
        } else {
          await supabase.from('contents').delete().eq('image_url', deletingItem.image);
        }
        await loadDatabaseData();
      } catch (err) {
        console.warn('Content delete notice:', err);
      }
    }

    setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
    setDeletingItem(null);
    showToast('Work removed successfully.');
  };

  // Category CRUD Handlers
  const openCreateCategoryModal = () => {
    setCategoryModalMode('create');
    setCategoryFormData({ id: '', label: '', description: '' });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: AdminCategory) => {
    setCategoryModalMode('edit');
    setCategoryFormData({
      id: cat.id,
      label: cat.label,
      description: cat.description || '',
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.label.trim()) return;

    if (categoryModalMode === 'create') {
      const alreadyExists = categoriesList.some(
        (c) => c.label.toLowerCase() === categoryFormData.label.trim().toLowerCase()
      );
      if (alreadyExists) {
        showToast(`Category "${categoryFormData.label}" already exists.`);
        return;
      }

      let newId = `cat-${Date.now()}`;
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase
            .from('categories')
            .insert({
              label: categoryFormData.label.trim(),
              description: categoryFormData.description.trim() || null,
            })
            .select()
            .single();
          if (data?.id) newId = data.id;
        } catch (err) {
          console.warn('Category insert notice:', err);
        }
      }

      const newCategory: AdminCategory = {
        id: newId,
        label: categoryFormData.label.trim(),
        description: categoryFormData.description.trim(),
        subcategories: [],
      };
      setCategoriesList((prev) => [...prev, newCategory]);
      showToast(`Category "${categoryFormData.label}" created.`);
    } else {
      if (isSupabaseConfigured && supabase) {
        try {
          if (categoryFormData.id && !categoryFormData.id.startsWith('cat-')) {
            await supabase
              .from('categories')
              .update({
                label: categoryFormData.label.trim(),
                description: categoryFormData.description.trim() || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', categoryFormData.id);
          }
        } catch (err) {
          console.warn('Category update notice:', err);
        }
      }

      setCategoriesList((prev) =>
        prev.map((c) =>
          c.id === categoryFormData.id
            ? {
                ...c,
                label: categoryFormData.label.trim(),
                description: categoryFormData.description.trim(),
              }
            : c
        )
      );
      showToast(`Category "${categoryFormData.label}" updated.`);
    }

    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    // Dependency check: Category must not have subcategories or contents
    const childSubcategoriesCount = deletingCategory.subcategories?.length || 0;
    const linkedContentsCount = items.filter((i) => {
      if (i.category === deletingCategory.id) return true;
      if (i.categoryLabel && deletingCategory.label && i.categoryLabel.toLowerCase() === deletingCategory.label.toLowerCase()) return true;
      return deletingCategory.subcategories?.some(
        (s) =>
          s.id === i.subcategory ||
          (s.label && i.subcategoryLabel && s.label.toLowerCase() === i.subcategoryLabel.toLowerCase())
      );
    }).length;

    if (childSubcategoriesCount > 0 || linkedContentsCount > 0) {
      showToast(
        `Cannot delete: Category "${deletingCategory.label}" is in use (${linkedContentsCount} works, ${childSubcategoriesCount} subcategories). Delete associated items first.`
      );
      setDeletingCategory(null);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        if (deletingCategory.id && !deletingCategory.id.startsWith('cat-')) {
          // Double-check database foreign keys
          const { count: dbSubcatCount } = await supabase
            .from('subcategories')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', deletingCategory.id);

          if (dbSubcatCount && dbSubcatCount > 0) {
            showToast(
              `Cannot delete: There are still ${dbSubcatCount} subcategories in the database for this category.`
            );
            setDeletingCategory(null);
            return;
          }

          const { error } = await supabase.from('categories').delete().eq('id', deletingCategory.id);
          if (error) {
            console.warn('Category delete error:', error);
            showToast(`Failed to delete category: ${error.message}`);
            setDeletingCategory(null);
            return;
          }
        }
      } catch (err) {
        console.warn('Category delete notice:', err);
      }
    }

    // Only remove the empty category from local state
    setCategoriesList((prev) => prev.filter((c) => c.id !== deletingCategory.id));
    showToast(`Category "${deletingCategory.label}" deleted.`);
    setDeletingCategory(null);
  };

  // Subcategory CRUD Handlers
  const openCreateSubcategoryModal = (parentCatId?: string) => {
    if (categoriesList.length === 0) {
      showToast('Please create a category first before adding subcategories.');
      return;
    }
    setSubcategoryModalMode('create');
    const targetCatId = parentCatId || categoriesList[0]?.id || '';
    setSubcategoryFormData({
      id: '',
      categoryId: targetCatId,
      label: '',
      description: '',
    });
    setIsSubcategoryModalOpen(true);
  };

  const openEditSubcategoryModal = (categoryId: string, sub: AdminSubCategory) => {
    setSubcategoryModalMode('edit');
    setSubcategoryFormData({
      id: sub.id,
      categoryId: categoryId,
      label: sub.label,
      description: sub.description || '',
    });
    setIsSubcategoryModalOpen(true);
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryFormData.label.trim() || !subcategoryFormData.categoryId) return;

    const parentCat = categoriesList.find((c) => c.id === subcategoryFormData.categoryId);
    if (!parentCat) {
      showToast('Please select a valid parent category');
      return;
    }

    if (subcategoryModalMode === 'create') {
      const alreadyExists = parentCat.subcategories.some(
        (s) => s.label.toLowerCase() === subcategoryFormData.label.trim().toLowerCase()
      );
      if (alreadyExists) {
        showToast(`Subcategory "${subcategoryFormData.label}" already exists in this category.`);
        return;
      }

      let newId = `sub-${Date.now()}`;
      if (isSupabaseConfigured && supabase) {
        try {
          const parentCatId = parentCat.id;
          if (parentCatId && !parentCatId.startsWith('cat-')) {
            const { data } = await supabase
              .from('subcategories')
              .insert({
                category_id: parentCatId,
                label: subcategoryFormData.label.trim(),
                description: subcategoryFormData.description.trim() || null,
              })
              .select()
              .single();
            if (data?.id) newId = data.id;
          }
        } catch (err) {
          console.warn('Subcategory insert notice:', err);
        }
      }

      const newSub: AdminSubCategory = {
        id: newId,
        label: subcategoryFormData.label.trim(),
        description: subcategoryFormData.description.trim(),
      };

      setCategoriesList((prev) =>
        prev.map((c) =>
          c.id === parentCat.id ? { ...c, subcategories: [...c.subcategories, newSub] } : c
        )
      );
      showToast(`Subcategory "${subcategoryFormData.label}" added successfully.`);
    } else {
      if (isSupabaseConfigured && supabase) {
        try {
          if (subcategoryFormData.id && !subcategoryFormData.id.startsWith('sub-')) {
            await supabase
              .from('subcategories')
              .update({
                label: subcategoryFormData.label.trim(),
                description: subcategoryFormData.description.trim() || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', subcategoryFormData.id);
          }
        } catch (err) {
          console.warn('Subcategory update notice:', err);
        }
      }

      setCategoriesList((prev) =>
        prev.map((c) => {
          const filteredSubs = c.subcategories.filter((s) => s.id !== subcategoryFormData.id);
          if (c.id === subcategoryFormData.categoryId) {
            return {
              ...c,
              subcategories: [
                ...filteredSubs,
                {
                  id: subcategoryFormData.id,
                  label: subcategoryFormData.label.trim(),
                  description: subcategoryFormData.description.trim(),
                },
              ],
            };
          }
          return { ...c, subcategories: filteredSubs };
        })
      );

      showToast(`Subcategory "${subcategoryFormData.label}" updated successfully.`);
    }

    setIsSubcategoryModalOpen(false);
  };

  const handleDeleteSubcategory = async () => {
    if (!deletingSubcategory) return;
    const { categoryId, subcategory } = deletingSubcategory;

    // Dependency check: Subcategory must not be used by any contents
    const linkedContentsCount = items.filter(
      (i) =>
        i.subcategory === subcategory.id ||
        (i.subcategoryLabel &&
          subcategory.label &&
          i.subcategoryLabel.toLowerCase() === subcategory.label.toLowerCase())
    ).length;

    if (linkedContentsCount > 0) {
      showToast(
        `Cannot delete: Subcategory "${subcategory.label}" is in use by ${linkedContentsCount} works. Delete works first.`
      );
      setDeletingSubcategory(null);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        if (subcategory.id && !subcategory.id.startsWith('sub-')) {
          // Double-check database foreign keys
          const { count: dbContentCount } = await supabase
            .from('contents')
            .select('*', { count: 'exact', head: true })
            .eq('subcategory_id', subcategory.id);

          if (dbContentCount && dbContentCount > 0) {
            showToast(
              `Cannot delete: There are still ${dbContentCount} contents in the database using this subcategory.`
            );
            setDeletingSubcategory(null);
            return;
          }

          const { error } = await supabase.from('subcategories').delete().eq('id', subcategory.id);
          if (error) {
            console.warn('Subcategory delete error:', error);
            showToast(`Failed to delete subcategory: ${error.message}`);
            setDeletingSubcategory(null);
            return;
          }
        }
      } catch (err) {
        console.warn('Subcategory delete notice:', err);
      }
    }

    // Only remove the empty subcategory from local state
    setCategoriesList((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              subcategories: c.subcategories.filter((s) => s.id !== subcategory.id),
            }
          : c
      )
    );

    showToast(`Subcategory "${subcategory.label}" removed.`);
    setDeletingSubcategory(null);
  };

  // Filtered items computation
  const filteredItems = items.filter((item) => {
    const matchesCat =
      selectedCategory === 'all' ||
      item.category === selectedCategory ||
      item.categoryLabel.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStatus =
      selectedStatus === 'all' || (item.status || 'published') === selectedStatus;

    const matchesQuery =
      searchQuery.trim() === '' ||
      item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subcategoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesStatus && matchesQuery;
  });

  const isContentFormValid = Boolean(
    contentFormData.categoryId &&
      contentFormData.subcategoryId &&
      !uploadingMedia &&
      (contentFormData.type === 'video'
        ? Boolean(
            contentFormData.videoUrl &&
              contentFormData.videoUrl.trim() &&
              getYouTubeThumbnail(contentFormData.videoUrl.trim())
          )
        : Boolean(
            contentFormData.image &&
              contentFormData.image.trim() &&
              !contentFormData.image.includes('youtube.com') &&
              !contentFormData.image.includes('ytimg.com')
          ))
  );

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0d] flex flex-col items-center justify-center text-white select-none">
        <RefreshCw className="w-8 h-8 text-neutral-400 animate-spin mb-4" />
        <span className="text-xs font-mono tracking-widest uppercase text-neutral-500">
          Verifying administrator session...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#0e0e11] text-[#ececee]">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-[#18181c] border border-white/15 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Hidden file input for Replace Image in modal */}
      <input
        type="file"
        ref={replaceFileInputRef}
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadNewImage(file);
          if (e.target) e.target.value = '';
        }}
        className="hidden"
      />

      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        items={items}
        categoriesList={categoriesList}
        onOpenChangePassword={() => {
          setChangePasswordError(null);
          setChangePasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
          setIsChangePasswordModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AdminHeader activeTab={activeTab} onLogout={handleLogout} />

        {/* Tab Content Body */}
        <div className="p-6 md:p-10 space-y-8 flex-1">
          {activeTab === 'overview' && (
            <OverviewTab
              items={items}
              categoriesList={categoriesList}
              onNavigateToContents={() => setActiveTab('contents')}
              onEditItem={openEditContentModal}
            />
          )}

          {activeTab === 'contents' && (
            <ContentsTab
              items={items}
              filteredItems={filteredItems}
              categoriesList={categoriesList}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              selectedItemIds={selectedItemIds}
              onToggleSelectItem={handleToggleSelectItem}
              onToggleSelectAll={handleToggleSelectAll}
              onOpenCreateContent={openCreateContentModal}
              onOpenEditContent={openEditContentModal}
              onOpenDeleteContent={setDeletingItem}
              onOpenBulkEdit={openBulkEditModal}
              onOpenBulkDelete={() => setIsBulkDeleteModalOpen(true)}
              onDeselectAll={() => setSelectedItemIds([])}
            />
          )}

          {activeTab === 'categories' && (
            <CategoriesTab
              categoriesList={categoriesList}
              items={items}
              onOpenCreateCategory={openCreateCategoryModal}
              onOpenEditCategory={openEditCategoryModal}
              onOpenDeleteCategory={setDeletingCategory}
              onOpenCreateSubcategory={openCreateSubcategoryModal}
              onOpenEditSubcategory={openEditSubcategoryModal}
              onOpenDeleteSubcategory={(catId, sub) =>
                setDeletingSubcategory({ categoryId: catId, subcategory: sub })
              }
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <ContentModal
        isOpen={isContentModalOpen}
        editingItem={editingItem}
        contentFormData={contentFormData}
        setContentFormData={setContentFormData}
        categoriesList={categoriesList}
        uploadingMedia={uploadingMedia}
        isContentFormValid={isContentFormValid}
        onClose={handleCloseContentModal}
        onSubmit={handleSaveContent}
        onUploadNewImage={handleUploadNewImage}
        onRemoveImage={handleRemoveImage}
        onTriggerReplaceImage={() => replaceFileInputRef.current?.click()}
      />

      <CategoryModals
        isCategoryModalOpen={isCategoryModalOpen}
        categoryModalMode={categoryModalMode}
        categoryFormData={categoryFormData}
        setCategoryFormData={setCategoryFormData}
        onCloseCategoryModal={() => setIsCategoryModalOpen(false)}
        onSaveCategory={handleSaveCategory}
        isSubcategoryModalOpen={isSubcategoryModalOpen}
        subcategoryModalMode={subcategoryModalMode}
        subcategoryFormData={subcategoryFormData}
        setSubcategoryFormData={setSubcategoryFormData}
        categoriesList={categoriesList}
        onCloseSubcategoryModal={() => setIsSubcategoryModalOpen(false)}
        onSaveSubcategory={handleSaveSubcategory}
        deletingCategory={deletingCategory}
        onCloseDeleteCategory={() => setDeletingCategory(null)}
        onConfirmDeleteCategory={handleDeleteCategory}
        deletingSubcategory={deletingSubcategory}
        onCloseDeleteSubcategory={() => setDeletingSubcategory(null)}
        onConfirmDeleteSubcategory={handleDeleteSubcategory}
        items={items}
      />

      <BulkModals
        isBulkEditModalOpen={isBulkEditModalOpen}
        bulkEditData={bulkEditData}
        setBulkEditData={setBulkEditData}
        selectedItemIds={selectedItemIds}
        categoriesList={categoriesList}
        isBulkSaving={isBulkSaving}
        onCloseBulkEdit={() => setIsBulkEditModalOpen(false)}
        onSaveBulkEdit={handleBulkEditSave}
        isBulkDeleteModalOpen={isBulkDeleteModalOpen}
        items={items}
        isBulkDeleting={isBulkDeleting}
        onCloseBulkDelete={() => setIsBulkDeleteModalOpen(false)}
        onConfirmBulkDelete={handleBulkDelete}
      />

      <DeleteContentModal
        deletingItem={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteContent}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        currentUser={currentUser}
        changePasswordData={changePasswordData}
        setChangePasswordData={setChangePasswordData}
        isChangingPassword={isChangingPassword}
        changePasswordError={changePasswordError}
        onClose={() => setIsChangePasswordModalOpen(false)}
        onSubmit={handleChangePassword}
      />
    </div>
  );
}
