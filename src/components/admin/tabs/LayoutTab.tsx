'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  LayoutGrid,
  RotateCcw,
  Plus,
  X,
  Search,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  Video,
  ImageIcon,
  AlertTriangle,
  Play,
  Layers,
  Trash2,
  Lock,
} from 'lucide-react';
import { AdminCategory } from '@/types/admin';
import { MediaItem, getYouTubeThumbnail } from '@/data/portfolioData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { resolveVideoPlayUrl } from '@/lib/r2';
import { getOptimizedCloudinaryUrl } from '@/lib/cloudinary';

interface LayoutTabProps {
  categoriesList: AdminCategory[];
  items: MediaItem[];
  selectedSubcategoryId?: string;
  onSubcategoryChange?: (subcatId: string) => void;
  onRefreshData?: () => Promise<void> | void;
  onOptimisticUpdateItems?: (assignments: Record<number, string>, subcatId: string) => void;
  showToast: (message: string) => void;
}

export default function LayoutTab({
  categoriesList,
  items,
  selectedSubcategoryId,
  onSubcategoryChange,
  onRefreshData,
  onOptimisticUpdateItems,
  showToast,
}: LayoutTabProps) {
  // Flatten all subcategories with their parent category info
  const allSubcategories = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      description?: string;
      categoryId: string;
      categoryLabel: string;
      status?: string;
    }> = [];

    for (const cat of categoriesList) {
      for (const sub of cat.subcategories || []) {
        list.push({
          id: sub.id,
          label: sub.label,
          description: sub.description,
          categoryId: cat.id,
          categoryLabel: cat.label,
          status: sub.status,
        });
      }
    }
    return list;
  }, [categoriesList]);

  // Active subcategory ID state
  const [activeSubcatId, setActiveSubcatId] = useState<string>(() => {
    if (selectedSubcategoryId && allSubcategories.some((s) => s.id === selectedSubcategoryId)) {
      return selectedSubcategoryId;
    }
    return allSubcategories[0]?.id || '';
  });

  // Keep in sync if prop selectedSubcategoryId changes
  useEffect(() => {
    if (selectedSubcategoryId && allSubcategories.some((s) => s.id === selectedSubcategoryId)) {
      setActiveSubcatId(selectedSubcategoryId);
    }
  }, [selectedSubcategoryId, allSubcategories]);

  // Handle subcategory selection change
  const handleSelectSubcat = (newId: string) => {
    setActiveSubcatId(newId);
    if (onSubcategoryChange) {
      onSubcategoryChange(newId);
    }
  };

  // Find active subcategory object
  const activeSubcat = useMemo(() => {
    return allSubcategories.find((s) => s.id === activeSubcatId) || allSubcategories[0];
  }, [allSubcategories, activeSubcatId]);

  // Scope Isolation: Only published items belonging strictly to active subcategory
  const subcategoryPublishedItems = useMemo(() => {
    if (!activeSubcat) return [];
    return items.filter((item) => {
      const isStatusOk = !item.status || item.status === 'published';
      const isSubMatch =
        item.subcategory === activeSubcat.id ||
        (item.subcategoryLabel &&
          activeSubcat.label &&
          item.subcategoryLabel.toLowerCase() === activeSubcat.label.toLowerCase());
      return isStatusOk && isSubMatch;
    });
  }, [items, activeSubcat]);

  // Slot assignments state: mapping slotNum (number) -> itemId (string)
  const [slotAssignments, setSlotAssignments] = useState<Record<number, string>>({});
  // Total slots to display (minimum 5: Row 1 has Slots 1 & 2; Row 2 has Slots 3, 4, 5)
  const [totalSlots, setTotalSlots] = useState<number>(5);
  // Tracking if layout has unsaved modifications
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Work selector modal state
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState<boolean>(false);
  const [targetSlotForSelection, setTargetSlotForSelection] = useState<number | null>(null);
  const [selectorSearchQuery, setSelectorSearchQuery] = useState<string>('');

  // Total Reset confirmation modal state
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState<boolean>(false);

  // Refs to guard against race-condition re-renders during active saves
  const prevSubcatIdRef = useRef<string | null>(null);
  const isSavingRef = useRef<boolean>(false);

  // Initialize or re-sync slot assignments whenever active subcategory or items change
  useEffect(() => {
    if (!activeSubcat) return;

    // 1. If an auto-save or reset is currently in progress, DO NOT overwrite the optimistic state!
    if (isSavingRef.current) return;

    const isSubcatChanged = prevSubcatIdRef.current !== activeSubcat.id;
    prevSubcatIdRef.current = activeSubcat.id;

    const initialMap: Record<number, string> = {};
    let maxAssignedSlot = 0;

    for (const item of subcategoryPublishedItems) {
      if (item.order_index && item.order_index > 0) {
        initialMap[item.order_index] = item.id;
        if (item.order_index > maxAssignedSlot) {
          maxAssignedSlot = item.order_index;
        }
      }
    }

    if (isSubcatChanged) {
      setSlotAssignments(initialMap);
      setIsDirty(false);
    } else {
      // Avoid flicker: only update if initialMap truly differs from current slotAssignments
      const currentKeys = Object.keys(slotAssignments);
      const newKeys = Object.keys(initialMap);
      const isIdentical =
        currentKeys.length === newKeys.length &&
        currentKeys.every((k) => slotAssignments[Number(k)] === initialMap[Number(k)]);

      if (!isIdentical) {
        setSlotAssignments(initialMap);
        setIsDirty(false);
      }
    }

    // Compute appropriate total slots (minimum 5, expands in increments of 3)
    if (maxAssignedSlot <= 5) {
      setTotalSlots(5);
    } else {
      const extraRows = Math.ceil((maxAssignedSlot - 5) / 3);
      setTotalSlots(5 + extraRows * 3);
    }
  }, [activeSubcat?.id, subcategoryPublishedItems]);

  // Helper to find MediaItem by ID from subcategoryPublishedItems
  const getItemById = (itemId: string): MediaItem | undefined => {
    return subcategoryPublishedItems.find((it) => it.id === itemId);
  };

  // Helper to get which slot an item currently occupies (if any)
  const getSlotOfItem = (itemId: string): number | null => {
    for (const [slotStr, assignedId] of Object.entries(slotAssignments)) {
      if (assignedId === itemId) {
        return parseInt(slotStr, 10);
      }
    }
    return null;
  };

  // Open modal to assign a work to a specific slot
  const handleOpenSelector = (slotNum: number) => {
    setTargetSlotForSelection(slotNum);
    setSelectorSearchQuery('');
    setIsSelectorModalOpen(true);
  };

  // Close selector modal
  const handleCloseSelector = () => {
    setIsSelectorModalOpen(false);
    setTargetSlotForSelection(null);
    setSelectorSearchQuery('');
  };

  // Auto-Save Transaction to Supabase
  const persistLayout = async (
    targetAssignments: Record<number, string>,
    successMessage?: string
  ) => {
    if (!activeSubcat) return;

    setIsSaving(true);
    isSavingRef.current = true;
    try {
      // 1. Immediately sync parent state in memory so subsequent re-renders have zero discrepancy
      if (onOptimisticUpdateItems) {
        onOptimisticUpdateItems(targetAssignments, activeSubcat.id);
      }

      if (isSupabaseConfigured && supabase) {
        // Step 1: Purge stale indexes for this subcategory
        const { error: purgeError } = await supabase
          .from('contents')
          .update({ order_index: 0 })
          .eq('subcategory_id', activeSubcat.id);

        if (purgeError) {
          throw new Error(`Failed to clear old indexes: ${purgeError.message}`);
        }

        // Step 2: Batch update target slots
        const client = supabase;
        const entries = Object.entries(targetAssignments).filter(([_, itemId]) => Boolean(itemId));

        if (entries.length > 0) {
          const updatePromises = entries.map(([slotStr, itemId]) => {
            const slotNum = parseInt(slotStr, 10);
            return client
              .from('contents')
              .update({ order_index: slotNum })
              .eq('id', itemId);
          });

          const results = await Promise.all(updatePromises);
          const failed = results.find((r) => r.error);
          if (failed?.error) {
            throw new Error(`Failed to save slot assignments: ${failed.error.message}`);
          }
        }

        if (successMessage) {
          showToast(successMessage);
        }
        setIsDirty(false);

        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        if (successMessage) {
          showToast(successMessage);
        }
        setIsDirty(false);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Auto-save layout error:', error);
      showToast(error.message || 'An error occurred while auto-saving the layout');
    } finally {
      setIsSaving(false);
      // Brief debounce so trailing parent re-renders don't clobber state
      setTimeout(() => {
        isSavingRef.current = false;
      }, 150);
    }
  };

  // Auto-Swap & Move Logic (PRD Section 7) with Immediate Auto-Save
  const handleSelectWorkForSlot = async (selectedItem: MediaItem) => {
    if (targetSlotForSelection === null) return;

    const targetSlot = targetSlotForSelection;
    const currentSlotOfSelectedItem = getSlotOfItem(selectedItem.id);
    const existingItemInTargetSlotId = slotAssignments[targetSlot];

    const next = { ...slotAssignments };

    if (currentSlotOfSelectedItem !== null && currentSlotOfSelectedItem !== targetSlot) {
      // The selected item already belongs to another slot (Slot A)
      if (existingItemInTargetSlotId) {
        // AUTO-SWAP: Slot A and Slot B swap items atomically!
        next[currentSlotOfSelectedItem] = existingItemInTargetSlotId;
        next[targetSlot] = selectedItem.id;
      } else {
        // MOVE: Selected item moves to target slot, Slot A becomes empty!
        delete next[currentSlotOfSelectedItem];
        next[targetSlot] = selectedItem.id;
      }
    } else {
      // Selected item is either new or overwriting target slot
      next[targetSlot] = selectedItem.id;
    }

    setSlotAssignments(next);
    handleCloseSelector();
    await persistLayout(next, `Slot #${targetSlot} updated and auto-saved!`);
  };

  // Remove work from slot, shift subsequent slots forward, and Immediate Auto-Save
  const handleRemoveSlot = async (slotNum: number) => {
    const next: Record<number, string> = {};
    const slotKeys = Object.keys(slotAssignments)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);

    for (const s of slotKeys) {
      if (s < slotNum) {
        next[s] = slotAssignments[s];
      } else if (s === slotNum) {
        // Target work removed (deprioritized)
        continue;
      } else if (s > slotNum) {
        // Shift forward by 1 slot
        next[s - 1] = slotAssignments[s];
      }
    }

    setSlotAssignments(next);
    await persistLayout(next, `Work removed from Slot #${slotNum}. Auto-saved.`);
  };

  // Total Reset: Clear all slots back to automatic FIFO (order_index = 0)
  const handleConfirmTotalReset = async () => {
    setIsResetConfirmModalOpen(false);
    setSlotAssignments({});
    setIsDirty(false);

    if (activeSubcat && onOptimisticUpdateItems) {
      onOptimisticUpdateItems({}, activeSubcat.id);
    }

    if (isSupabaseConfigured && supabase && activeSubcat) {
      try {
        setIsSaving(true);
        isSavingRef.current = true;
        // Direct execute database purge for this subcategory
        const { error } = await supabase
          .from('contents')
          .update({ order_index: 0 })
          .eq('subcategory_id', activeSubcat.id);

        if (error) {
          console.warn('Supabase reset notice:', error);
          showToast(`Failed to reset in database: ${error.message}`);
        } else {
          showToast(`Layout for "${activeSubcat.label}" reset and auto-saved!`);
          setIsDirty(false);
          if (onRefreshData) await onRefreshData();
        }
      } catch (err: unknown) {
        const error = err as Error;
        showToast(error.message || 'Failed to reset layout');
      } finally {
        setIsSaving(false);
        setTimeout(() => {
          isSavingRef.current = false;
        }, 150);
      }
    } else {
      showToast(`Layout for "${activeSubcat?.label}" restored to automatic.`);
    }
  };

  // Expand rows: adds 3 empty slots
  const handleAddRow = () => {
    setTotalSlots((prev) => prev + 3);
  };

  // Filtered items inside the selection modal
  const filteredModalItems = useMemo(() => {
    return subcategoryPublishedItems.filter((item) => {
      if (!selectorSearchQuery.trim()) return true;
      const q = selectorSearchQuery.toLowerCase();
      return (
        item.description?.toLowerCase().includes(q) ||
        item.subcategoryLabel?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q)
      );
    });
  }, [subcategoryPublishedItems, selectorSearchQuery]);

  // Calculate rows count:
  // Row 1: Description (Col 1), Slot 1 (Col 2), Slot 2 (Col 3)
  // Row 2: Slot 3 (Col 1), Slot 4 (Col 2), Slot 5 (Col 3)
  // Row N: (N-2)*3 + 3, (N-2)*3 + 4, (N-2)*3 + 5
  const rowCount = Math.max(2, 1 + Math.ceil(Math.max(0, totalSlots - 2) / 3));

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* ==================================================== */}
      {/* 1. HEADER & SUB-CATEGORY SELECTOR BAR                */}
      {/* ==================================================== */}
      <div className="bg-[#15151a] border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-1.5">
            <h2 className="font-heading font-black text-2xl sm:text-3xl uppercase tracking-tight text-white flex items-center gap-3">
              <LayoutGrid className="w-7 h-7 text-white" />
              <span>Gallery Layout</span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-2xl leading-relaxed">
              Arrange prioritized works precisely on the 3-column public gallery grid per subcategory.
              Unassigned slots are seamlessly filled by recent regular works (FIFO).
            </p>
          </div>

          {/* Subcategory Picker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-neutral-300" />
                <span>Select Subcategory:</span>
              </label>
              <select
                value={activeSubcatId}
                onChange={(e) => handleSelectSubcat(e.target.value)}
                className="bg-[#1e1e24] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer min-w-[240px]"
              >
                {categoriesList.map((cat) => (
                  <optgroup key={cat.id} label={cat.label.toUpperCase()}>
                    {cat.subcategories.map((sub) => {
                      const count = items.filter(
                        (i) =>
                          (!i.status || i.status === 'published') &&
                          (i.subcategory === sub.id ||
                            (i.subcategoryLabel &&
                              sub.label &&
                              i.subcategoryLabel.toLowerCase() === sub.label.toLowerCase()))
                      ).length;
                      return (
                        <option key={sub.id} value={sub.id}>
                          {sub.label} ({count} active works)
                        </option>
                      );
                    })}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Subcategory Status Banner & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
            Active Subcategory:{' '}
            <span className="text-white font-semibold uppercase">{activeSubcat?.label}</span>{' '}
            <span className="text-neutral-500">({activeSubcat?.categoryLabel})</span> —{' '}
            <span className="text-emerald-400 font-bold">
              {subcategoryPublishedItems.length} published works
            </span>
          </div>

          {/* Action Buttons: Auto-save Indicator, Reset, Add Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-save Status Indicator */}
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono bg-white/5 border border-white/10 select-none">
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  <span className="text-neutral-300">Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-neutral-400">Auto-saved</span>
                </>
              )}
            </div>

            {/* Reset Total Button */}
            <button
              type="button"
              onClick={() => setIsResetConfirmModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              title="Reset all slots to automatic chronological order"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
              <span>Reset to Auto</span>
            </button>

            {/* Expand Row Button */}
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
              title="Add 3 new slots for the next row"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Row (+3 Slots)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. SPATIAL MATRIX GRID                               */}
      {/* ==================================================== */}
      <div className="space-y-4">
        {/* Column Headers Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center select-none">
          <div className="bg-[#15151a] border border-white/10 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-neutral-500" />
            <span>COLUMN 1 (LEFT)</span>
          </div>
          <div className="bg-[#15151a] border border-white/10 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>COLUMN 2 (CENTER)</span>
          </div>
          <div className="bg-[#15151a] border border-white/10 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>COLUMN 3 (RIGHT)</span>
          </div>
        </div>

        {/* Matrix Rows Wrapper */}
        <div className="space-y-6">
          {Array.from({ length: rowCount }).map((_, rIdx) => {
            const rowNumber = rIdx + 1;

            if (rIdx === 0) {
              const s2 = 1; // Col 2 (Center)
              const s3 = 2; // Col 3 (Right)

              return (
                <div key={rowNumber} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                      ROW 1 (TOP)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    {/* Column 1: Locked Editorial Card (Description) */}
                    <LockedEditorialCard
                      categoryLabel={activeSubcat?.categoryLabel}
                      subcategoryLabel={activeSubcat?.label}
                      description={activeSubcat?.description}
                    />

                    {/* Column 2: Slot #1 */}
                    <SlotCard
                      slotNum={s2}
                      itemId={slotAssignments[s2]}
                      item={getItemById(slotAssignments[s2])}
                      subtext="Row 1 • Col 2 (Center)"
                      onSelect={() => handleOpenSelector(s2)}
                      onRemove={() => handleRemoveSlot(s2)}
                    />

                    {/* Column 3: Slot #2 */}
                    <SlotCard
                      slotNum={s3}
                      itemId={slotAssignments[s3]}
                      item={getItemById(slotAssignments[s3])}
                      subtext="Row 1 • Col 3 (Right)"
                      onSelect={() => handleOpenSelector(s3)}
                      onRemove={() => handleRemoveSlot(s3)}
                    />
                  </div>
                </div>
              );
            }

            const s1 = (rIdx - 1) * 3 + 3; // Col 1 (Left)
            const s2 = (rIdx - 1) * 3 + 4; // Col 2 (Center)
            const s3 = (rIdx - 1) * 3 + 5; // Col 3 (Right)

            return (
              <div key={rowNumber} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400">
                    ROW {rowNumber}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  <SlotCard
                    slotNum={s1}
                    itemId={slotAssignments[s1]}
                    item={getItemById(slotAssignments[s1])}
                    subtext={`Row ${rowNumber} • Col 1 (Left)`}
                    onSelect={() => handleOpenSelector(s1)}
                    onRemove={() => handleRemoveSlot(s1)}
                  />
                  <SlotCard
                    slotNum={s2}
                    itemId={slotAssignments[s2]}
                    item={getItemById(slotAssignments[s2])}
                    subtext={`Row ${rowNumber} • Col 2 (Center)`}
                    onSelect={() => handleOpenSelector(s2)}
                    onRemove={() => handleRemoveSlot(s2)}
                  />
                  <SlotCard
                    slotNum={s3}
                    itemId={slotAssignments[s3]}
                    item={getItemById(slotAssignments[s3])}
                    subtext={`Row ${rowNumber} • Col 3 (Right)`}
                    onSelect={() => handleOpenSelector(s3)}
                    onRemove={() => handleRemoveSlot(s3)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================== */}
      {/* 3. WORK SELECTOR MODAL (AUTO-SWAP & MOVE LOGIC)      */}
      {/* ==================================================== */}
      {isSelectorModalOpen && targetSlotForSelection !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#15151a] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                    SLOT #{targetSlotForSelection}
                  </span>
                  <span className="text-xs text-neutral-400">
                    Subcategory: <strong className="text-white">{activeSubcat?.label}</strong>
                  </span>
                </div>
                <h3 className="font-heading font-black text-xl uppercase tracking-tight text-white">
                  Select Work for Slot #{targetSlotForSelection}
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCloseSelector}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Filter Bar */}
            <div className="p-4 border-b border-white/5 bg-[#121216]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search works by description or type..."
                  value={selectorSearchQuery}
                  onChange={(e) => setSelectorSearchQuery(e.target.value)}
                  className="w-full bg-[#1b1b22] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/50"
                  autoFocus
                />
              </div>
            </div>

            {/* Works List / Grid */}
            <div className="p-6 overflow-y-auto flex-1 divide-y divide-white/5">
              {filteredModalItems.length === 0 ? (
                <div className="py-16 text-center text-neutral-400 text-xs font-mono space-y-2">
                  <p>No published works found matching this query.</p>
                  <p className="text-neutral-500 text-[11px]">
                    (Ensure works belong to subcategory &quot;{activeSubcat?.label}&quot; and are published)
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredModalItems.map((item) => {
                    const currentSlotOfItem = getSlotOfItem(item.id);
                    const isTargetSlot = currentSlotOfItem === targetSlotForSelection;
                    const existingInTargetSlotId = slotAssignments[targetSlotForSelection];
                    const isOccupiedElsewhere =
                      currentSlotOfItem !== null && currentSlotOfItem !== targetSlotForSelection;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${isTargetSlot
                            ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                            : isOccupiedElsewhere
                              ? 'bg-white/[0.03] border-white/10 hover:border-white/20'
                              : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/[0.07]'
                          }`}
                      >
                        {/* Thumbnail & Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                            <Image
                              src={
                                getOptimizedCloudinaryUrl(
                                  (item.image ? resolveVideoPlayUrl(item.image) : '') ||
                                  getYouTubeThumbnail(item.videoUrl) ||
                                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%2322222a"/></svg>',
                                  { width: 160 }
                                )
                              }
                              alt={item.description || item.subcategoryLabel}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                            {item.type === 'video' && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Play className="w-3.5 h-3.5 fill-white text-white" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5">
                              {item.type === 'video' ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded">
                                  <Video className="w-2.5 h-2.5" />
                                  VIDEO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded">
                                  <ImageIcon className="w-2.5 h-2.5" />
                                  PHOTO
                                </span>
                              )}

                              {currentSlotOfItem && (
                                <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded">
                                  SLOT #{currentSlotOfItem}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-white line-clamp-1 font-medium">
                              {item.description || 'Untitled Work'}
                            </p>
                          </div>
                        </div>

                        {/* Action Selection Button with Auto-Swap Badges */}
                        <div className="shrink-0">
                          {isTargetSlot ? (
                            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 text-[11px] font-mono font-semibold border border-amber-500/30">
                              <Check className="w-3.5 h-3.5" />
                              <span>Current Slot</span>
                            </span>
                          ) : isOccupiedElsewhere ? (
                            existingInTargetSlotId ? (
                              // AUTO-SWAP BADGE: Slot A and Slot B will swap
                              <button
                                type="button"
                                onClick={() => handleSelectWorkForSlot(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold transition-all hover:scale-105"
                                title={`Swap positions between Slot #${currentSlotOfItem} and Slot #${targetSlotForSelection}`}
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>SWAP (#{currentSlotOfItem} ⇄ #{targetSlotForSelection})</span>
                              </button>
                            ) : (
                              // MOVE BADGE: Moves from Slot A to empty target Slot B
                              <button
                                type="button"
                                onClick={() => handleSelectWorkForSlot(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-[11px] font-mono font-bold transition-all hover:scale-105"
                                title={`Move work from Slot #${currentSlotOfItem} to Slot #${targetSlotForSelection}`}
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>MOVE FROM #{currentSlotOfItem}</span>
                              </button>
                            )
                          ) : (
                            // FRESH ASSIGNMENT
                            <button
                              type="button"
                              onClick={() => handleSelectWorkForSlot(item)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black text-[11px] font-mono font-bold transition-all hover:scale-105"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>ASSIGN</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. TOTAL RESET CONFIRMATION MODAL                    */}
      {/* ==================================================== */}
      {isResetConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#18181f] border border-white/15 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h3 className="font-heading font-black text-xl uppercase tracking-tight text-white">
                Reset to Auto?
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 font-sans leading-relaxed">
                This action will clear all assigned slots for subcategory{' '}
                <strong className="text-white">&quot;{activeSubcat?.label}&quot;</strong>.
                All works will return to standard chronological order (FIFO) in the live gallery.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTotalReset}
                className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-black bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition-all"
              >
                Yes, Reset All Slots
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================
// SUB-COMPONENT: Deterministic Slot Card
// ==========================================================
interface SlotCardProps {
  slotNum: number;
  itemId?: string;
  item?: MediaItem;
  subtext?: string;
  onSelect: () => void;
  onRemove: () => void;
}

function SlotCard({
  slotNum,
  item,
  subtext,
  onSelect,
  onRemove,
}: SlotCardProps) {
  const isFilled = Boolean(item);

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all min-h-[300px] border ${isFilled
          ? 'bg-[#15151a] border-white/15 hover:border-white/30 shadow-xl'
          : 'bg-[#111115] border-dashed border-white/15 hover:border-amber-400/40 hover:bg-[#14141a]'
        }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full ${isFilled
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-white/10 text-neutral-400'
              }`}
          >
            <span>SLOT #{slotNum}</span>
          </span>

          {subtext && (
            <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">
              • {subtext}
            </span>
          )}
        </div>

        {/* Clear Button (Remove / Shift X) */}
        {isFilled && (
          <button
            type="button"
            onClick={onRemove}
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 flex items-center justify-center transition-all"
            title={`Remove Work from Slot #${slotNum}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Card Body */}
      {isFilled && item ? (
        <div className="my-4 space-y-3 flex-1 flex flex-col justify-center">
          {/* Media Thumbnail */}
          <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 group">
            <Image
              src={
                getOptimizedCloudinaryUrl(
                  (item.image ? resolveVideoPlayUrl(item.image) : '') ||
                  getYouTubeThumbnail(item.videoUrl) ||
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="%2322222a"/></svg>',
                  { width: 600 }
                )
              }
              alt={item.description || item.subcategoryLabel}
              fill
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Play className="w-6 h-6 fill-white text-white drop-shadow-md" />
              </div>
            )}

            {/* Type Pill */}
            <div className="absolute top-2.5 left-2.5">
              {item.type === 'video' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-red-300 bg-red-950/80 backdrop-blur-md border border-red-500/30 px-2 py-0.5 rounded-full">
                  <Video className="w-3.5 h-3.5" />
                  VIDEO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-sky-300 bg-sky-950/80 backdrop-blur-md border border-sky-500/30 px-2 py-0.5 rounded-full">
                  <ImageIcon className="w-3.5 h-3.5" />
                  PHOTO
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-0.5">
            <p className="text-xs text-white font-medium line-clamp-2">
              {item.description || 'Untitled Work'}
            </p>
          </div>
        </div>
      ) : (
        <div className="my-6 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wide">
              Auto Slot (FIFO)
            </p>
            <p className="text-[11px] text-neutral-500 font-sans max-w-[200px] leading-relaxed">
              Filled automatically by recent works without gaps.
            </p>
          </div>
        </div>
      )}

      {/* Card Footer Action */}
      <div className="pt-3 border-t border-white/10 space-y-2">
        {isFilled ? (
          <>
            <button
              type="button"
              onClick={onSelect}
              className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all bg-white/5 hover:bg-white/15 text-neutral-200 hover:text-white border border-white/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Change Work</span>
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="w-full py-2 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all bg-amber-400/10 hover:bg-amber-400 hover:text-black text-amber-300 border border-amber-400/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Select Work</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ==========================================================
// SUB-COMPONENT: Locked Editorial Card (Public Description Space)
// ==========================================================
interface LockedEditorialCardProps {
  categoryLabel?: string;
  subcategoryLabel?: string;
  description?: string;
}

function LockedEditorialCard({
  categoryLabel,
  subcategoryLabel,
  description,
}: LockedEditorialCardProps) {
  return (
    <div className="rounded-3xl p-5 sm:p-6 flex flex-col justify-between min-h-[300px] bg-[#121216] border border-amber-400/25 shadow-xl relative overflow-hidden select-none">
      {/* Background glow */}
      <div className="absolute -top-10 -left-10 w-28 h-28 bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-neutral-800 text-amber-300 border border-amber-400/30">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>DESCRIPTION</span>
          </span>
          <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">
            • Row 1 • Col 1 (Top-Left)
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400/80 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
          LOCKED
        </span>
      </div>

      {/* Card Body */}
      <div className="my-4 py-2 space-y-3 flex-1 flex flex-col justify-center relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
              {categoryLabel || 'CATEGORY'} - {subcategoryLabel || 'SUBCATEGORY'}
            </span>
          </div>

          <h3 className="font-heading font-black text-2xl uppercase tracking-tight text-white leading-tight">
            {subcategoryLabel || 'SUBCATEGORY'}
          </h3>

          <p className="text-xs font-sans uppercase tracking-wider text-neutral-400 leading-relaxed max-w-sm line-clamp-4">
            {description ? description : 'No description provided for this subcategory yet.'}
          </p>
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-white/10 relative z-10">
        <div className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-center">
          <p className="text-[10px] font-mono text-neutral-400 leading-normal">
            Permanent Editorial Space in Public Gallery
          </p>
        </div>
      </div>
    </div>
  );
}

