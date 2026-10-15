import { MainCategory, MediaItem, MediaSlide } from '@/data/portfolioData';

export type TabType = 'overview' | 'contents' | 'categories' | 'layout';

export interface AdminSubCategory {
  id: string;
  label: string;
  description?: string;
  order_index?: number;
  status?: 'published' | 'archived' | 'draft';
}

export interface AdminCategory {
  id: string;
  label: string;
  description?: string;
  order_index?: number;
  status?: 'published' | 'archived' | 'draft';
  subcategories: AdminSubCategory[];
}

export interface ContentFormData {
  categoryId: string;
  subcategoryId: string;
  description: string;
  type: 'photo' | 'video';
  image: string;
  videoUrl: string;
  status: 'draft' | 'published' | 'archived';
  ratio?: string;
  slides?: MediaSlide[];
}

export interface BulkEditFormData {
  updateCategory: boolean;
  categoryId: string;
  subcategoryId: string;
  updateStatus: boolean;
  status: 'draft' | 'published' | 'archived';
}

export interface CategoryFormData {
  id: string;
  label: string;
  description: string;
  status?: 'published' | 'archived';
}

export interface SubcategoryFormData {
  id: string;
  categoryId: string;
  label: string;
  description: string;
  status?: 'published' | 'archived';
}

export interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
