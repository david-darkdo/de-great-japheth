import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Check, ChevronDown, Layers, Trash2, X, Sparkles } from "lucide-react";

type FamilyGroupSelectorProps = {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
};

const STORAGE_KEY = "custom_family_groups_list";

function getSavedCustomFamilies(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomFamilies(list: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function FamilyGroupSelector({
  value,
  onChange,
  label = "Family / Collection Series",
  placeholder = "Select or create family series...",
  required = false,
}: FamilyGroupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [families, setFamilies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Inline Create Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newFamilyDesc, setNewFamilyDesc] = useState("");
  const [modalError, setModalError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch unique family groups from Supabase + merge with localStorage
  const loadFamilies = async () => {
    setLoading(true);
    try {
      const customSaved = getSavedCustomFamilies();
      const uniqueSet = new Set<string>(customSaved);

      const { data, error } = await supabase
        .from("products")
        .select("family")
        .not("family", "is", null);

      if (!error && data) {
        data.forEach((p) => {
          if (p.family && p.family.trim()) {
            uniqueSet.add(p.family.trim());
          }
        });
      }

      setFamilies(Array.from(uniqueSet).sort());
    } catch (e) {
      console.error("[FamilyGroupSelector] Error loading families:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredFamilies = families.filter((f) =>
    f.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSelect = (familyName: string) => {
    onChange(familyName);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleCreateSubmit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setModalError("");
    const trimmed = newFamilyName.trim();
    if (!trimmed) {
      setModalError("Please enter a family name.");
      return;
    }

    // Add to local family list & save in localStorage
    let updatedList = families;
    if (!families.includes(trimmed)) {
      updatedList = [...families, trimmed].sort();
      setFamilies(updatedList);

      const savedCustom = getSavedCustomFamilies();
      if (!savedCustom.includes(trimmed)) {
        saveCustomFamilies([...savedCustom, trimmed]);
      }
    }

    // Automatically select the newly created family
    onChange(trimmed);

    // Reset and close inline modal
    setNewFamilyName("");
    setNewFamilyDesc("");
    setShowCreateModal(false);
    setIsOpen(false);
  };

  const handleDeleteFamily = (e: React.MouseEvent, familyToDelete: string) => {
    e.stopPropagation();
    if (confirm(`Remove family "${familyToDelete}" from dropdown list?`)) {
      const updated = families.filter((f) => f !== familyToDelete);
      setFamilies(updated);

      const savedCustom = getSavedCustomFamilies().filter((f) => f !== familyToDelete);
      saveCustomFamilies(savedCustom);

      if (value === familyToDelete) {
        onChange("");
      }
    }
  };

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-foreground">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setNewFamilyName(searchQuery.trim());
            setShowCreateModal(true);
          }}
          className="text-[11px] text-gold hover:underline flex items-center gap-1 font-normal"
        >
          <Plus size={12} /> Inline Create Family
        </button>
      </div>

      {/* Selector Trigger Input Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-md px-3 py-2 text-sm bg-background flex items-center justify-between cursor-pointer transition-colors ${
          isOpen ? "border-gold ring-1 ring-gold/40" : "border-border hover:border-gold/50"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Layers size={15} className="text-gold flex-shrink-0" />
          <span className={value ? "text-foreground font-medium" : "text-muted-foreground"}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180 text-gold" : ""}`} />
      </div>

      {/* Searchable Dropdown Popup */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden space-y-2 p-2 max-h-72 flex flex-col">
          {/* Dropdown Search Input */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              autoFocus
              placeholder="Search family series..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border/80 rounded-md focus:border-gold focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* List of Existing Family Groups */}
          <div className="flex-1 overflow-y-auto space-y-0.5 max-h-48 custom-scrollbar">
            {loading ? (
              <p className="text-[11px] text-muted-foreground p-3 text-center">Loading family series...</p>
            ) : filteredFamilies.length === 0 ? (
              <div className="p-3 text-center space-y-2">
                <p className="text-xs text-muted-foreground">No matching family series found.</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNewFamilyName(searchQuery.trim());
                    setShowCreateModal(true);
                  }}
                  className="w-full py-1.5 bg-gold/10 border border-gold/40 text-gold hover:bg-gold/20 font-medium text-xs rounded-md flex items-center justify-center gap-1.5 transition"
                >
                  <Plus size={14} /> Create "{searchQuery.trim() || "New Family"}"
                </button>
              </div>
            ) : (
              filteredFamilies.map((fam) => {
                const isSelected = value === fam;
                return (
                  <div
                    key={fam}
                    onClick={() => handleSelect(fam)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition ${
                      isSelected ? "bg-gold/15 text-gold font-semibold" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? <Check size={14} className="text-gold flex-shrink-0" /> : <div className="w-3.5" />}
                      <span className="truncate">{fam}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFamily(e, fam)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400 transition"
                      title="Remove from list"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Create New Family Action Button */}
          <div className="pt-1 border-t border-border/60">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNewFamilyName(searchQuery.trim());
                setShowCreateModal(true);
              }}
              className="w-full py-2 bg-gradient-gold text-black font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-gold hover:opacity-90 transition"
            >
              <Plus size={14} /> Create New Family Group
            </button>
          </div>
        </div>
      )}

      {/* Inline Create Family Dialog Modal (Uses DIV instead of nested FORM to prevent outer form submission) */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-card border border-gold/40 max-w-sm w-full rounded-2xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles size={16} className="text-gold" /> Create New Family Group
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Family Group Name *</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Turkish Armored Series, 60x60 Polish Tile"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateSubmit(e);
                    }
                  }}
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Architectural luxury finishing series imported for modern residential builds"
                  value={newFamilyDesc}
                  onChange={(e) => setNewFamilyDesc(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-xs bg-background focus:border-gold focus:outline-none"
                />
              </div>

              {modalError && <p className="text-xs text-red-400 font-medium">{modalError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  className="flex-1 py-2 bg-gradient-gold text-black font-semibold text-xs rounded-lg shadow-gold hover:opacity-90 transition"
                >
                  Save & Select
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
