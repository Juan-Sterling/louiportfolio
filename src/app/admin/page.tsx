'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  FolderOpen,
  Image as ImageIcon,
  Video,
  Settings,
  Plus,
  Search,
  ExternalLink,
  Edit3,
  Trash2,
  CheckCircle2,
  UploadCloud,
  X,
  Play,
  ArrowUpRight,
  Database,
  Cloud,
  Layers,
  RefreshCw,
  LogOut,
  User,
  Sparkles,
  FolderPlus,
  AlertTriangle,
} from 'lucide-react';
import {
  portfolioItems as initialPortfolioItems,
  CATEGORIES,
  MainCategory,
  MediaItem,
  getYouTubeThumbnail,
} from '@/data/portfolioData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  uploadToCloudinary,
  deleteCloudinaryMedia,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/cloudinary';

type TabType = 'overview' | 'contents' | 'categories' | 'system';

export interface AdminSubCategory {
  id: string;
  label: string;
  description?: string;
}

export interface AdminCategory {
  id: string;
  label: string;
  description?: string;
  subcategories: AdminSubCategory[];
}

export default function AdminPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [items, setItems] = useState<MediaItem[]>(initialPortfolioItems);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Auth User
  const [currentUser, setCurrentUser] = useState<{ email?: string; id?: string } | null>(null);

  // Categories & Subcategories State
  const [categoriesList, setCategoriesList] = useState<AdminCategory[]>(
    CATEGORIES.map((c, catIdx) => ({
      id: `cat-${catIdx + 1}`,
      label: c.label,
      description: c.description,
      subcategories: c.subcategories.map((s, subIdx) => ({
        id: `sub-${catIdx + 1}-${subIdx + 1}`,
        label: s.label,
        description: s.description,
      })),
    }))
  );

  const [isSeeding, setIsSeeding] = useState(false);

  // Content Modal (Add / Edit Work)
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [contentFormData, setContentFormData] = useState({
    title: '',
    categoryId: '',
    subcategoryId: '',
    description: '',
    type: 'photo' as 'photo' | 'video',
    image: '',
    videoUrl: '',
    status: 'published' as 'draft' | 'published' | 'archived',
  });
  const [deletingItem, setDeletingItem] = useState<MediaItem | null>(null);

  // Hidden file input for replacing image
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Category Modal (Add / Edit Category)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'create' | 'edit'>('create');
  const [categoryFormData, setCategoryFormData] = useState({
    id: '',
    label: '',
    description: '',
  });
  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null);

  // Subcategory Modal (Add / Edit Subcategory)
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [subcategoryModalMode, setSubcategoryModalMode] = useState<'create' | 'edit'>('create');
  const [subcategoryFormData, setSubcategoryFormData] = useState({
    id: '',
    categoryId: '',
    label: '',
    description: '',
  });
  const [deletingSubcategory, setDeletingSubcategory] = useState<{
    categoryId: string;
    subcategory: AdminSubCategory;
  } | null>(null);

  // Upload progress state
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Toast Notification
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3800);
  };

  // Auth Guard
  useEffect(() => {
    async function verifyAdminAuth() {
      if (!isSupabaseConfigured || !supabase) {
        router.replace('/admin/login');
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace('/admin/login');
          return;
        }
        setCurrentUser({ email: session.user.email, id: session.user.id });
        setCheckingAuth(false);
      } catch (err) {
        console.warn('Auth notice:', err);
        router.replace('/admin/login');
      }
    }

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
    setIsLoading(true);
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

      if (catRows && catRows.length > 0) {
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
      }

      // 3. Fetch contents
      const { data: dbContents } = await supabase
        .from('contents')
        .select(`
          id,
          title,
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

      if (dbContents && dbContents.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: MediaItem[] = dbContents.map((d: any) => ({
          id: d.id,
          title: d.title || d.subcategories?.label || 'Untitled Work',
          category: (d.subcategories?.categories?.label?.toLowerCase().replace(/\s+/g, '-') || 'photography') as MainCategory,
          categoryLabel: d.subcategories?.categories?.label || 'Portfolio',
          subcategory: d.subcategories?.id || d.subcategory_id,
          subcategoryLabel: d.subcategories?.label || d.title,
          description: d.description || '',
          type: (d.type || 'photo') as 'photo' | 'video',
          image: d.image_url,
          videoUrl: d.video_url || undefined,
          status: (d.status || 'published') as 'draft' | 'published' | 'archived',
        }));
        setItems(mapped);
      }
    } catch (err) {
      console.warn('Sync notice:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setCurrentUser(null);
    router.replace('/admin/login');
  };

  // Seed Default Portfolio Data
  const handleSeedDatabase = async () => {
    if (!supabase) {
      showToast('Storage connection is currently offline.');
      return;
    }
    setIsSeeding(true);
    try {
      // 1. Insert Categories
      for (const cat of CATEGORIES) {
        await supabase.from('categories').upsert(
          {
            label: cat.label,
            description: cat.description,
          },
          { onConflict: 'label' }
        );
      }

      // 2. Fetch inserted categories
      const { data: catRows } = await supabase.from('categories').select('id, label');
      const catMap = new Map((catRows || []).map((c) => [c.label, c.id]));

      // 3. Insert Subcategories
      for (const cat of CATEGORIES) {
        const catId = catMap.get(cat.label);
        if (!catId) continue;
        for (const sub of cat.subcategories) {
          await supabase.from('subcategories').insert({
            category_id: catId,
            label: sub.label,
            description: sub.description,
          });
        }
      }

      // 4. Fetch subcategories
      const { data: subcatRows } = await supabase.from('subcategories').select('id, label');
      const subMap = new Map((subcatRows || []).map((s) => [s.label, s.id]));

      // 5. Insert Initial Contents
      for (const item of initialPortfolioItems) {
        const subId = subMap.get(item.subcategoryLabel) || Array.from(subMap.values())[0];
        if (!subId) continue;
        await supabase.from('contents').insert({
          title: item.subcategoryLabel,
          description: item.description || null,
          subcategory_id: subId,
          image_url: item.image,
          type: item.type,
          video_url: item.videoUrl || null,
          status: 'published',
        });
      }

      showToast('Portfolio master data loaded successfully!');
      await loadDatabaseData();
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Failed to load initial data');
    } finally {
      setIsSeeding(false);
    }
  };

  // ----------------------------------------------------
  // CONTENT MANAGEMENT (PORTFOLIO WORKS) HANDLERS
  // ----------------------------------------------------
  const openCreateContentModal = () => {
    setEditingItem(null);
    const firstCat = categoriesList[0];
    const firstSub = firstCat?.subcategories[0];

    setContentFormData({
      title: '',
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
    const foundCat =
      categoriesList.find(
        (c) =>
          c.id === item.category ||
          c.label.toLowerCase() === item.categoryLabel.toLowerCase() ||
          c.subcategories.some((s) => s.id === item.subcategory)
      ) || categoriesList[0];

    const foundSub =
      foundCat?.subcategories.find(
        (s) => s.id === item.subcategory || s.label.toLowerCase() === item.subcategoryLabel.toLowerCase()
      ) || foundCat?.subcategories[0];

    setContentFormData({
      title: item.title || item.subcategoryLabel,
      categoryId: foundCat?.id || '',
      subcategoryId: foundSub?.id || '',
      description: item.description || '',
      type: item.type,
      image: item.image,
      videoUrl: item.videoUrl || '',
      status: item.status || 'published',
    });
    setIsContentModalOpen(true);
  };

  // Upload or Replace Image with strict 10MB limit and old image cleanup
  const handleUploadNewImage = async (file: File) => {
    // 10MB Limit Guard
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
      showToast(
        `File size (${sizeInMb}MB) exceeds the 10MB limit. Please upload an image smaller than 10MB.`
      );
      return;
    }

    setUploadingMedia(true);
    try {
      // If previous image was on Cloudinary, purge it first
      if (contentFormData.image && contentFormData.image.includes('res.cloudinary.com')) {
        await deleteCloudinaryMedia(contentFormData.image);
      }

      const res = await uploadToCloudinary(file);
      setContentFormData((prev) => ({ ...prev, image: res.url }));
      showToast('Image uploaded successfully to folder louiportfolio!');
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Failed to upload image');
    } finally {
      setUploadingMedia(false);
    }
  };

  // Remove Image and Delete from Storage
  const handleRemoveImage = async () => {
    if (!contentFormData.image) return;

    if (contentFormData.image.includes('res.cloudinary.com')) {
      await deleteCloudinaryMedia(contentFormData.image);
    }

    setContentFormData((prev) => ({ ...prev, image: '' }));
    showToast('Image removed from storage.');
  };

  const handleReplaceImageClick = () => {
    replaceFileInputRef.current?.click();
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentFormData.title.trim()) {
      showToast('Work title is required');
      return;
    }

    let finalImage = contentFormData.image;
    if (contentFormData.type === 'video' && contentFormData.videoUrl) {
      finalImage = getYouTubeThumbnail(contentFormData.videoUrl) || contentFormData.image;
    }

    if (!finalImage) {
      finalImage =
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop';
    }

    const parentCat = categoriesList.find((c) => c.id === contentFormData.categoryId);
    const selectedSub = parentCat?.subcategories.find((s) => s.id === contentFormData.subcategoryId);

    // Resolve valid subcategory UUID for the database
    let finalSubcatId = contentFormData.subcategoryId;
    if (isSupabaseConfigured && supabase) {
      const isSubcatUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalSubcatId);
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
        if (!finalSubcatId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalSubcatId)) {
          const { data: firstSub } = await supabase.from('subcategories').select('id').limit(1).maybeSingle();
          if (firstSub?.id) finalSubcatId = firstSub.id;
        }
      }
    }

    const payload = {
      title: contentFormData.title.trim(),
      description: contentFormData.description.trim() || null,
      subcategory_id: finalSubcatId,
      image_url: finalImage,
      type: contentFormData.type,
      video_url: contentFormData.type === 'video' ? contentFormData.videoUrl.trim() : null,
      status: contentFormData.status,
    };

    if (isSupabaseConfigured && supabase && finalSubcatId) {
      try {
        if (editingItem) {
          // --- UPDATE EXISTING WORK ---
          const isItemUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingItem.id);

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
            showToast(`Work "${contentFormData.title}" updated successfully.`);
          } else {
            // Non-UUID ID (e.g. initial item): check if exists by image or title
            const { data: existingRow } = await supabase
              .from('contents')
              .select('id')
              .or(`image_url.eq."${finalImage}",title.eq."${contentFormData.title.trim()}"`)
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
              showToast(`Work "${contentFormData.title}" updated successfully.`);
            } else {
              // Truly new -> insert
              const { error: insertError } = await supabase.from('contents').insert(payload);
              if (insertError) {
                console.error('Insert error:', insertError);
                showToast(`Failed to save: ${insertError.message}`);
                return;
              }
              showToast(`Work "${contentFormData.title}" saved successfully.`);
            }
          }
        } else {
          // --- CREATE NEW WORK ---
          const { error: insertError } = await supabase.from('contents').insert(payload);
          if (insertError) {
            console.error('Insert error:', insertError);
            showToast(`Failed to create work: ${insertError.message}`);
            return;
          }
          showToast(`New work "${contentFormData.title}" created successfully.`);
        }

        // Always reload fresh data from database to stay 100% in sync!
        await loadDatabaseData();
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Save error:', error);
        showToast(error.message || 'Error saving work');
      }
    } else {
      // Offline fallback state update
      const savedItem: MediaItem = {
        id: editingItem ? editingItem.id : `content-${Date.now()}`,
        title: contentFormData.title.trim(),
        category: (parentCat?.label.toLowerCase().replace(/\s+/g, '-') || 'photography') as MainCategory,
        categoryLabel: parentCat?.label || 'Category',
        subcategory: contentFormData.subcategoryId,
        subcategoryLabel: selectedSub?.label || contentFormData.title,
        description: contentFormData.description,
        type: contentFormData.type,
        image: finalImage,
        videoUrl: contentFormData.videoUrl ? contentFormData.videoUrl : undefined,
        status: contentFormData.status,
      };

      if (editingItem) {
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? savedItem : i)));
        showToast(`Work "${contentFormData.title}" updated successfully.`);
      } else {
        setItems((prev) => [savedItem, ...prev]);
        showToast(`New work "${contentFormData.title}" created successfully.`);
      }
    }

    setIsContentModalOpen(false);
  };

  // Delete Content & delete Cloud storage image
  const handleDeleteContent = async () => {
    if (!deletingItem) return;

    if (deletingItem.image && deletingItem.image.includes('res.cloudinary.com')) {
      await deleteCloudinaryMedia(deletingItem.image);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          deletingItem.id
        );
        if (isUuid) {
          await supabase.from('contents').delete().eq('id', deletingItem.id);
        } else {
          await supabase.from('contents').delete().eq('image_url', deletingItem.image);
        }
        await loadDatabaseData();
      } catch (err) {
        console.warn('Database delete notice:', err);
      }
    } else {
      setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
    }

    showToast(`Work "${deletingItem.title || deletingItem.subcategoryLabel}" deleted successfully.`);
    setDeletingItem(null);
  };

  // ----------------------------------------------------
  // CATEGORIES CRUD HANDLERS
  // ----------------------------------------------------
  const openCreateCategoryModal = () => {
    setCategoryModalMode('create');
    setCategoryFormData({
      id: '',
      label: '',
      description: '',
    });
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
    if (!categoryFormData.label.trim()) {
      showToast('Category name is required');
      return;
    }

    if (categoryModalMode === 'create') {
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
      showToast(`Category "${categoryFormData.label}" created successfully.`);
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

      setItems((prev) =>
        prev.map((item) =>
          item.categoryLabel === categoryFormData.label
            ? { ...item, categoryLabel: categoryFormData.label.trim() }
            : item
        )
      );

      showToast(`Category "${categoryFormData.label}" updated successfully.`);
    }

    setIsCategoryModalOpen(false);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    const targetId = deletingCategory.id;

    if (isSupabaseConfigured && supabase) {
      try {
        if (targetId && !targetId.startsWith('cat-')) {
          await supabase.from('categories').delete().eq('id', targetId);
        }
      } catch (err) {
        console.warn('Category delete notice:', err);
      }
    }

    setCategoriesList((prev) => prev.filter((c) => c.id !== targetId));
    setItems((prev) => prev.filter((i) => i.categoryLabel !== deletingCategory.label));
    showToast(`Category "${deletingCategory.label}" and its contents deleted.`);
    setDeletingCategory(null);
  };

  // ----------------------------------------------------
  // SUBCATEGORIES CRUD HANDLERS
  // ----------------------------------------------------
  const openCreateSubcategoryModal = (parentCatId?: string) => {
    const parentId = parentCatId || categoriesList[0]?.id || '';
    setSubcategoryModalMode('create');
    setSubcategoryFormData({
      id: '',
      categoryId: parentId,
      label: '',
      description: '',
    });
    setIsSubcategoryModalOpen(true);
  };

  const openEditSubcategoryModal = (
    parentCatId: string,
    sub: AdminSubCategory
  ) => {
    setSubcategoryModalMode('edit');
    setSubcategoryFormData({
      id: sub.id,
      categoryId: parentCatId,
      label: sub.label,
      description: sub.description || '',
    });
    setIsSubcategoryModalOpen(true);
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcategoryFormData.label.trim()) {
      showToast('Subcategory name is required');
      return;
    }

    const parentCat = categoriesList.find((c) => c.id === subcategoryFormData.categoryId);

    if (!parentCat) {
      showToast('Parent category must be selected');
      return;
    }

    if (subcategoryModalMode === 'create') {
      let newId = `sub-${Date.now()}`;
      if (isSupabaseConfigured && supabase) {
        try {
          let parentCatId = parentCat.id;
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
          c.id === parentCat.id
            ? { ...c, subcategories: [...c.subcategories, newSub] }
            : c
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
          const filteredSubs = c.subcategories.filter(
            (s) => s.id !== subcategoryFormData.id
          );
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

    if (isSupabaseConfigured && supabase) {
      try {
        if (subcategory.id && !subcategory.id.startsWith('sub-')) {
          await supabase.from('subcategories').delete().eq('id', subcategory.id);
        }
      } catch (err) {
        console.warn('Subcategory delete notice:', err);
      }
    }

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
    setItems((prev) => prev.filter((i) => i.subcategory !== subcategory.id));
    showToast(`Subcategory "${subcategory.label}" deleted.`);
    setDeletingSubcategory(null);
  };

  // Filtered Items for Content Manager
  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.categoryLabel === selectedCategory;
    const matchesQuery =
      item.subcategoryLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description &&
        item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const currentCategoryObj = categoriesList.find((c) => c.id === contentFormData.categoryId);
  const availableSubcategories = currentCategoryObj?.subcategories || [];

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
      <aside className="w-full md:w-64 bg-[#131317] border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between p-6 shrink-0">
        <div>
          {/* Logo & Platform Name */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white text-black font-bold flex items-center justify-center font-heading text-lg">
                L
              </div>
              <div>
                <h1 className="font-heading font-black text-lg tracking-tight uppercase">
                  LOUI PORTFOLIO
                </h1>
                <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
                  Admin Platform
                </span>
              </div>
            </div>
          </div>

          {/* User Auth Info */}
          {currentUser && (
            <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-mono text-neutral-300 truncate" title={currentUser.email}>
                  {currentUser.email}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-neutral-400 hover:text-white transition-colors p-1"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Clean Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('contents')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'contents'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Portfolio Works</span>
              <span className="ml-auto text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-neutral-300">
                {items.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'categories'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Categories & Subcategories</span>
              <span className="ml-auto text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded-full text-neutral-300">
                {categoriesList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'system'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>System Status</span>
            </button>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-white/10 flex flex-col gap-3">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-neutral-300 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
          >
            <span>View Live Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <header className="px-6 md:px-10 py-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111115]/60 backdrop-blur-md sticky top-0 z-30">
          <div>
            <h2 className="font-heading font-black text-2xl uppercase tracking-tight text-white">
              {activeTab === 'overview' && 'Portfolio Overview'}
              {activeTab === 'contents' && 'Manage Portfolio Works'}
              {activeTab === 'categories' && 'Categories & Subcategories'}
              {activeTab === 'system' && 'System Status & Storage'}
            </h2>
            <p className="text-xs text-neutral-400 font-sans mt-0.5">
              LOUI Portfolio Content Management
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Clean Status Badge */}
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>System Online & Operational</span>
              </span>
            </div>

            {activeTab === 'categories' ? (
              <button
                onClick={openCreateCategoryModal}
                className="flex items-center gap-2 bg-white text-black font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-full hover:bg-neutral-200 transition-all shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Category</span>
              </button>
            ) : (
              <button
                onClick={openCreateContentModal}
                className="flex items-center gap-2 bg-white text-black font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-full hover:bg-neutral-200 transition-all shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Work</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab Content Body */}
        <div className="p-6 md:p-10 space-y-8 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Quick Data Initialization Banner */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-white uppercase tracking-tight">
                      Initialize Master Portfolio Data
                    </h3>
                    <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl mt-0.5">
                      Load default categories, subcategories, and sample portfolio works into system storage with a single click.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSeedDatabase}
                  disabled={isSeeding}
                  className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-xs uppercase tracking-wider px-5 py-3 rounded-full transition-all shrink-0 disabled:opacity-60"
                >
                  {isSeeding ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Load Portfolio Data</span>
                    </>
                  )}
                </button>
              </div>

              {/* Metric Statistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                  <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
                    Total Portfolio Works
                  </span>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-heading font-black text-5xl text-white">
                      {items.length}
                    </span>
                    <span className="text-xs text-neutral-400 font-sans">Active Works</span>
                  </div>
                </div>

                <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                  <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
                    Video Works (YouTube)
                  </span>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-heading font-black text-5xl text-emerald-400">
                      {items.filter((i) => i.type === 'video').length}
                    </span>
                    <span className="text-xs text-neutral-400 font-sans">Videos</span>
                  </div>
                </div>

                <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                  <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
                    Photos & Graphic Works
                  </span>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-heading font-black text-5xl text-white">
                      {items.filter((i) => i.type === 'photo').length}
                    </span>
                    <span className="text-xs text-neutral-400 font-sans">Photos / Art</span>
                  </div>
                </div>

                <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                  <span className="text-xs uppercase font-mono tracking-wider text-neutral-400">
                    Main Categories
                  </span>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-heading font-black text-5xl text-white">
                      {categoriesList.length}
                    </span>
                    <span className="text-xs text-neutral-400 font-sans">Categories</span>
                  </div>
                </div>
              </div>

              {/* Recent Works Overview */}
              <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white">
                      Recent Works
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Published works currently showcased on the live website
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('contents')}
                    className="text-xs uppercase font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <span>View All ({items.length})</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="group bg-[#1a1a20] border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden transition-all flex flex-col"
                    >
                      <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.subcategoryLabel}
                          fill
                          sizes="(max-width: 768px) 100vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {item.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-9 h-9 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
                              <Play className="w-4 h-4 fill-current translate-x-0.5" />
                            </div>
                          </div>
                        )}
                        <span className="absolute top-2.5 left-2.5 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white border border-white/10">
                          {item.categoryLabel}
                        </span>
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-heading font-bold text-sm text-white uppercase tracking-tight line-clamp-1">
                            {item.subcategoryLabel}
                          </h4>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1">
                            {item.description || 'No description provided'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Live on Website
                          </span>
                          <button
                            onClick={() => openEditContentModal(item)}
                            className="text-xs text-neutral-400 hover:text-white transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTENTS MANAGEMENT */}
          {activeTab === 'contents' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Filter & Search Bar */}
              <div className="bg-[#15151a] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search by title, category, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1e1e24] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-[#1e1e24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.label}>
                        {cat.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-[#1e1e24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="all">All Status</option>
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>

                  <button
                    onClick={openCreateContentModal}
                    className="bg-white text-black font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-xl hover:bg-neutral-200 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Work</span>
                  </button>
                </div>
              </div>

              {/* Contents Table */}
              <div className="bg-[#15151a] border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-neutral-400 bg-[#121216]">
                        <th className="py-4 px-6">Media & Title</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6">Type</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-neutral-400 text-xs">
                            No portfolio works found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-white/[0.02] transition-colors group"
                          >
                            {/* Media & Title */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-4">
                                <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                                  <Image
                                    src={item.image}
                                    alt={item.subcategoryLabel}
                                    fill
                                    sizes="64px"
                                    className="object-cover"
                                  />
                                  {item.type === 'video' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                      <Play className="w-3.5 h-3.5 fill-white text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-heading font-bold text-sm text-white uppercase tracking-tight line-clamp-1">
                                    {item.title || item.subcategoryLabel}
                                  </div>
                                  <div className="text-xs text-neutral-400 line-clamp-1 font-sans">
                                    {item.description || 'No description'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category & Subcategory */}
                            <td className="py-4 px-6">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wide">
                                  {item.categoryLabel}
                                </span>
                                <span className="text-[11px] font-mono text-neutral-400">
                                  {item.subcategoryLabel}
                                </span>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="py-4 px-6">
                              {item.type === 'video' ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                                  <Video className="w-3 h-3" />
                                  <span>Video</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2.5 py-1 rounded-full">
                                  <ImageIcon className="w-3 h-3" />
                                  <span>Photo</span>
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-4 px-6">
                              {item.status === 'draft' ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  <span>Draft</span>
                                </span>
                              ) : item.status === 'archived' ? (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 bg-neutral-500/10 border border-neutral-500/20 px-2.5 py-1 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                                  <span>Archived</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                  <span>Published</span>
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditContentModal(item)}
                                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-all"
                                  title="Edit Work"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingItem(item)}
                                  className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all"
                                  title="Delete Work"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES & SUBCATEGORIES MANAGEMENT */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header Box with Add Actions */}
              <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white mb-1">
                    Manage Categories & Subcategories
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 font-sans">
                    Create, edit, or delete main categories and subcategories freely.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openCreateSubcategoryModal()}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>+ Add Subcategory</span>
                  </button>
                  <button
                    onClick={openCreateCategoryModal}
                    className="flex items-center gap-2 bg-white text-black font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl hover:bg-neutral-200 transition-all shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Category</span>
                  </button>
                </div>
              </div>

              {/* Categories Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categoriesList.map((cat) => {
                  const itemCount = items.filter((i) => i.categoryLabel === cat.label).length;

                  return (
                    <div
                      key={cat.id}
                      className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-mono bg-white/10 text-white px-2.5 py-0.5 rounded-full">
                            {itemCount} Works
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditCategoryModal(cat)}
                              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white flex items-center justify-center transition-all"
                              title="Edit Category"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingCategory(cat)}
                              className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white mb-2">
                          {cat.label}
                        </h3>

                        <p className="text-xs text-neutral-400 font-sans leading-relaxed mb-6">
                          {cat.description || 'No additional description provided.'}
                        </p>
                      </div>

                      {/* Subcategories List */}
                      <div className="border-t border-white/10 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                            Subcategories ({cat.subcategories.length}):
                          </span>
                          <button
                            onClick={() => openCreateSubcategoryModal(cat.id)}
                            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Subcategory</span>
                          </button>
                        </div>

                        {cat.subcategories.length === 0 ? (
                          <p className="text-xs text-neutral-500 font-mono py-2">
                            No subcategories yet. Click "+ Add Subcategory" above.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {cat.subcategories.map((sub) => {
                              return (
                                <div
                                  key={sub.id}
                                  className="group flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 pl-3 pr-2 py-1.5 rounded-xl text-neutral-200 transition-all"
                                >
                                  <span>{sub.label}</span>
                                  <button
                                    onClick={() => openEditSubcategoryModal(cat.id, sub)}
                                    className="p-1 text-neutral-400 hover:text-white transition-colors"
                                    title="Edit Subcategory"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setDeletingSubcategory({
                                        categoryId: cat.id,
                                        subcategory: sub,
                                      })
                                    }
                                    className="p-1 text-red-400/70 hover:text-red-400 transition-colors"
                                    title="Delete Subcategory"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM STATUS */}
          {activeTab === 'system' && (
            <div className="space-y-8 animate-fadeIn max-w-4xl">
              <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8">
                <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white mb-2">
                  System Status & Storage
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-sans">
                  Your portfolio data and cloud media storage are securely connected and fully operational.
                </p>
              </div>

              {/* Status Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-base text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-emerald-400" />
                      <span>Database Storage</span>
                    </span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      Active & Connected
                    </span>
                  </div>
                  <div className="text-xs font-mono text-neutral-400 space-y-1">
                    <div>Real-time Synchronization: <span className="text-white">Active</span></div>
                    <div>Master Tables: <span className="text-emerald-400">Categories, Subcategories, Contents</span></div>
                  </div>
                </div>

                <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-base text-white flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-sky-400" />
                      <span>Media & Photo Storage</span>
                    </span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      Ready for Use
                    </span>
                  </div>
                  <div className="text-xs font-mono text-neutral-400 space-y-1">
                    <div>Target Folder: <span className="text-white">louiportfolio</span></div>
                    <div>Max File Size: <span className="text-emerald-400">10MB Limit Guard</span></div>
                  </div>
                </div>
              </div>

              {/* Master Data Re-seed Action */}
              <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-heading font-bold text-base uppercase tracking-tight text-white mb-1">
                      Reload Master Portfolio Data
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Instantly populate categories, subcategories, and initial works with default portfolio assets.
                    </p>
                  </div>

                  <button
                    onClick={handleSeedDatabase}
                    disabled={isSeeding}
                    className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-black font-semibold text-xs uppercase tracking-wider px-5 py-3 rounded-full transition-all shrink-0 disabled:opacity-60"
                  >
                    {isSeeding ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        <span>Sync Master Data</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ==================================================== */}
      {/* 1. MODAL ADD / EDIT PORTFOLIO WORK */}
      {/* ==================================================== */}
      {isContentModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 md:p-8 flex items-center justify-center animate-fadeIn"
          onClick={() => setIsContentModalOpen(false)}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl my-auto bg-[#16161b] text-white rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto overscroll-contain custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Modal Header */}
            <div className="sticky -top-6 sm:-top-8 bg-[#16161b] z-20 pt-1 pb-4 border-b border-white/10 mb-6 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-2xl uppercase tracking-tight">
                  {editingItem ? 'Edit Portfolio Work' : 'Add New Portfolio Work'}
                </h3>
                <span className="text-xs text-neutral-400 font-sans">
                  {editingItem
                    ? `Editing: ${editingItem.subcategoryLabel}`
                    : 'Add photos or videos to the showcase gallery'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsContentModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveContent} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  Work Title / Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={contentFormData.title}
                  onChange={(e) =>
                    setContentFormData({ ...contentFormData, title: e.target.value })
                  }
                  placeholder="e.g. Official Music Video / Event Photoshoot 2025"
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                    Main Category *
                  </label>
                  <select
                    value={contentFormData.categoryId}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      const parentObj = categoriesList.find((c) => c.id === newCatId);
                      const newSubId = parentObj?.subcategories[0]?.id || '';
                      setContentFormData({
                        ...contentFormData,
                        categoryId: newCatId,
                        subcategoryId: newSubId,
                      });
                    }}
                    className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  >
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                    Subcategory *
                  </label>
                  <select
                    value={contentFormData.subcategoryId}
                    onChange={(e) =>
                      setContentFormData({ ...contentFormData, subcategoryId: e.target.value })
                    }
                    className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  >
                    {availableSubcategories.length === 0 ? (
                      <option value="">(No subcategories available)</option>
                    ) : (
                      availableSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Media Type */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  Media Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setContentFormData({
                        ...contentFormData,
                        type: 'video',
                      })
                    }
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                      contentFormData.type === 'video'
                        ? 'bg-white text-black border-white'
                        : 'bg-[#1e1e26] text-neutral-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Video (YouTube)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setContentFormData({
                        ...contentFormData,
                        type: 'photo',
                      })
                    }
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                      contentFormData.type === 'photo'
                        ? 'bg-white text-black border-white'
                        : 'bg-[#1e1e26] text-neutral-400 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Photo / Art</span>
                  </button>
                </div>
              </div>

              {/* Video URL & Thumbnail Live Preview */}
              {contentFormData.type === 'video' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                      YouTube Video Link *
                    </label>
                    <input
                      type="text"
                      required
                      value={contentFormData.videoUrl}
                      onChange={(e) =>
                        setContentFormData({ ...contentFormData, videoUrl: e.target.value })
                      }
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30"
                    />
                    <span className="text-[11px] text-emerald-400 mt-1.5 block font-mono">
                      ✓ High-definition YouTube thumbnail is automatically generated.
                    </span>
                  </div>

                  {/* Video Live Preview Box */}
                  {contentFormData.videoUrl && (
                    <div className="rounded-2xl border border-white/15 bg-[#121216] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Video Thumbnail Preview
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400">YouTube Auto</span>
                      </div>
                      <div className="w-full min-h-[160px] max-h-[360px] flex items-center justify-center p-3 rounded-xl bg-black/60 border border-white/10 overflow-hidden">
                        <div className="relative max-h-[330px] max-w-full flex items-center justify-center rounded-lg overflow-hidden shadow-xl">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              getYouTubeThumbnail(contentFormData.videoUrl) ||
                              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200'
                            }
                            alt="Video Thumbnail Preview"
                            className="max-h-[330px] max-w-full w-auto h-auto object-contain rounded-lg block"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
                              <Play className="w-4 h-4 fill-current translate-x-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Photo Upload / URL with Live Preview, Replace & Remove */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400">
                      Image Source (Upload File or Enter URL) *
                    </label>
                    <span className="text-[10px] font-mono text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                      Max 10MB
                    </span>
                  </div>

                  {/* Preview Box if image exists */}
                  {contentFormData.image ? (
                    <div className="rounded-2xl border border-white/15 bg-[#121216] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Natural Image Preview
                        </span>
                        <span className="text-[11px] font-mono text-neutral-400 truncate max-w-[200px]">
                          {contentFormData.image.includes('res.cloudinary.com')
                            ? 'Cloud Storage: folder louiportfolio'
                            : 'External Link'}
                        </span>
                      </div>

                      {/* Visual Preview displaying natural dimensions */}
                      <div className="w-full min-h-[160px] max-h-[360px] flex items-center justify-center p-3 rounded-xl bg-black/60 border border-white/10 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={contentFormData.image}
                          alt="Natural Image Preview"
                          className="max-h-[330px] max-w-full w-auto h-auto object-contain rounded-lg shadow-xl block"
                        />
                      </div>

                      {/* Action Buttons: Replace Image & Remove Image */}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={handleReplaceImageClick}
                          disabled={uploadingMedia}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${uploadingMedia ? 'animate-spin' : ''}`}
                          />
                          <span>{uploadingMedia ? 'Uploading...' : 'Replace Image'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          disabled={uploadingMedia}
                          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Image</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Dropzone & Input when no image is present */
                    <div className="space-y-3">
                      <div className="relative border-2 border-dashed border-white/15 hover:border-white/30 rounded-2xl p-6 text-center transition-all bg-[#121216]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadNewImage(file);
                            if (e.target) e.target.value = '';
                          }}
                          disabled={uploadingMedia}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-col items-center justify-center pointer-events-none">
                          <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center mb-2">
                            {uploadingMedia ? (
                              <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                              <UploadCloud className="w-5 h-5" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-white">
                            {uploadingMedia
                              ? 'Uploading to folder louiportfolio...'
                              : 'Click or Drag an Image Here from Your Computer'}
                          </span>
                          <span className="text-[10px] text-neutral-400 mt-1 font-mono">
                            Maximum size: 10MB • Saved in folder louiportfolio
                          </span>
                        </div>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={contentFormData.image}
                          onChange={(e) =>
                            setContentFormData({ ...contentFormData, image: e.target.value })
                          }
                          placeholder="Or paste an image URL from the web..."
                          className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Publication Status */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  Publication Status
                </label>
                <select
                  value={contentFormData.status}
                  onChange={(e) =>
                    setContentFormData({
                      ...contentFormData,
                      status: e.target.value as 'draft' | 'published' | 'archived',
                    })
                  }
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                >
                  <option value="published">Published (Visible on Website)</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  Work Description / Notes
                </label>
                <textarea
                  rows={3}
                  value={contentFormData.description}
                  onChange={(e) =>
                    setContentFormData({ ...contentFormData, description: e.target.value })
                  }
                  placeholder="Brief project details, camera/software used, or background story..."
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              {/* Sticky Submit / Cancel Buttons */}
              <div className="sticky -bottom-6 sm:-bottom-8 bg-[#16161b] z-20 pt-4 pb-2 border-t border-white/10 mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsContentModalOpen(false)}
                  className="px-6 py-3 rounded-xl border border-white/15 text-neutral-300 hover:text-white hover:border-white/30 text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all shadow-md"
                >
                  {editingItem ? 'Save Changes' : 'Create Work'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. MODAL ADD / EDIT CATEGORY */}
      {/* ==================================================== */}
      {isCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 md:p-8 flex items-center justify-center animate-fadeIn"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="relative w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto overscroll-contain custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div>
                <h3 className="font-heading font-bold text-xl uppercase tracking-tight">
                  {categoryModalMode === 'create' ? 'Add New Category' : 'Edit Category'}
                </h3>
                <span className="text-xs text-neutral-400 font-sans">
                  Main category for grouping portfolio works
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryFormData.label}
                  onChange={(e) =>
                    setCategoryFormData((prev) => ({
                      ...prev,
                      label: e.target.value,
                    }))
                  }
                  placeholder="e.g. Drone & Aerial / 3D Artwork"
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Category Description
                </label>
                <textarea
                  rows={3}
                  value={categoryFormData.description}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, description: e.target.value })
                  }
                  placeholder="Brief description of the works in this category..."
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all shadow-md"
                >
                  {categoryModalMode === 'create' ? 'Create Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. MODAL ADD / EDIT SUBCATEGORY */}
      {/* ==================================================== */}
      {isSubcategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 md:p-8 flex items-center justify-center animate-fadeIn"
          onClick={() => setIsSubcategoryModalOpen(false)}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="relative w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto overscroll-contain custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div>
                <h3 className="font-heading font-bold text-xl uppercase tracking-tight">
                  {subcategoryModalMode === 'create' ? 'Add Subcategory' : 'Edit Subcategory'}
                </h3>
                <span className="text-xs text-neutral-400 font-sans">
                  Specific sub-group under a main category
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSubcategoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white text-white hover:text-black flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategory} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Select Parent Category *
                </label>
                <select
                  value={subcategoryFormData.categoryId}
                  onChange={(e) =>
                    setSubcategoryFormData({
                      ...subcategoryFormData,
                      categoryId: e.target.value,
                    })
                  }
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                >
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Subcategory Name *
                </label>
                <input
                  type="text"
                  required
                  value={subcategoryFormData.label}
                  onChange={(e) =>
                    setSubcategoryFormData((prev) => ({
                      ...prev,
                      label: e.target.value,
                    }))
                  }
                  placeholder="e.g. Graduation Shoot / Cinematic B-Roll"
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                  Subcategory Description
                </label>
                <textarea
                  rows={3}
                  value={subcategoryFormData.description}
                  onChange={(e) =>
                    setSubcategoryFormData({
                      ...subcategoryFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description about this subcategory..."
                  className="w-full bg-[#1e1e26] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubcategoryModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-all shadow-md"
                >
                  {subcategoryModalMode === 'create' ? 'Add Subcategory' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. CONFIRM DELETE WORK MODAL */}
      {/* ==================================================== */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
          onClick={() => setDeletingItem(null)}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-red-500/20 shadow-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white mb-2">
              Delete This Work?
            </h3>

            <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
              Are you sure you want to delete{' '}
              <strong className="text-white">"{deletingItem.subcategoryLabel}"</strong>?
              Associated media in storage will also be purged. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteContent}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md"
              >
                Delete Work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. CONFIRM DELETE CATEGORY MODAL */}
      {/* ==================================================== */}
      {deletingCategory && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
          onClick={() => setDeletingCategory(null)}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-red-500/20 shadow-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white mb-2">
              Delete Category "{deletingCategory.label}"?
            </h3>

            <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
              Deleting this category will also remove all its subcategories and associated portfolio works. Are you sure you want to proceed?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md"
              >
                Delete Category & Contents
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. CONFIRM DELETE SUBCATEGORY MODAL */}
      {/* ==================================================== */}
      {deletingSubcategory && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fadeIn"
          onClick={() => setDeletingSubcategory(null)}
        >
          <div
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="w-full max-w-md my-auto bg-[#16161b] text-white rounded-3xl border border-red-500/20 shadow-2xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-heading font-bold text-xl uppercase tracking-tight text-white mb-2">
              Delete Subcategory "{deletingSubcategory.subcategory.label}"?
            </h3>

            <p className="text-xs text-neutral-400 leading-relaxed mb-6 font-sans">
              This subcategory and its associated works will be permanently removed from your portfolio.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingSubcategory(null)}
                className="px-5 py-2.5 rounded-xl border border-white/15 text-neutral-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubcategory}
                className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-md"
              >
                Delete Subcategory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
