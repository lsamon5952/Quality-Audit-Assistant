import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, RoleCategory } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSaved }) => {
  const { user, profile } = useAuth();
  const { showToast } = useToast();

  const [department, setDepartment] = useState('');
  const [roleCategory, setRoleCategory] = useState<RoleCategory>('Teaching Faculty');
  const [position, setPosition] = useState('');
  const [jobFunction, setJobFunction] = useState('');
  const [yearsInRole, setYearsInRole] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Section 8.5: Reload fields from saved document every time it opens
  useEffect(() => {
    if (!isOpen || !user) return;

    let active = true;
    const fetchLatest = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && active) {
          const data = snap.data() as UserProfile;
          setDepartment(data.department || '');
          setRoleCategory(data.roleCategory || 'Teaching Faculty');
          setPosition(data.position || '');
          setJobFunction(data.jobFunction || '');
          setYearsInRole(typeof data.yearsInRole === 'number' ? data.yearsInRole : 1);
        } else if (active && profile) {
          setDepartment(profile.department || '');
          setRoleCategory(profile.roleCategory || 'Teaching Faculty');
          setPosition(profile.position || '');
          setJobFunction(profile.jobFunction || '');
          setYearsInRole(typeof profile.yearsInRole === 'number' ? profile.yearsInRole : 1);
        }
      } catch (err) {
        console.error('Error reloading profile document:', err);
      }
    };

    fetchLatest();
    return () => {
      active = false;
    };
  }, [isOpen, user, profile]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!department.trim()) newErrors.department = 'Department or office is required.';
    if (!position.trim()) newErrors.position = 'Position is required.';
    if (!jobFunction.trim()) newErrors.jobFunction = 'Job function is required.';
    if (isNaN(yearsInRole) || yearsInRole < 0 || yearsInRole > 50) {
      newErrors.yearsInRole = 'Years in role must be a whole number between 0 and 50.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !user) return;

    setSaving(true);
    const userDocRef = doc(db, 'users', user.uid);

    // Strict undefined stripping (Directive 6) & No email stored (Section 8.2)
    const profileData: Partial<UserProfile> = {
      department: department.trim(),
      roleCategory,
      position: position.trim(),
      jobFunction: jobFunction.trim(),
      yearsInRole: Math.floor(yearsInRole),
      displayName: (user.displayName || 'Employee').trim(),
      photoURL: user.photoURL || '',
      updatedAt: serverTimestamp(),
    };

    try {
      // 15s timeout check (Section 8.4)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile save timed out')), 15000)
      );

      await Promise.race([
        setDoc(userDocRef, profileData, { merge: true }),
        timeoutPromise,
      ]);

      showToast('Profile updated successfully!', 'success');
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error('Profile save error:', err);
      showToast(
        'Failed to save profile. Please check your connection and retry.',
        'error',
        () => handleSave(e),
        'Retry Save'
      );
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Employee Profile">
      <form onSubmit={handleSave} className="space-y-4">
        <p className="text-xs text-stone-700">
          Your profile helps the Audit Assistant contextualize your work and reference the correct UM Tagum College baseline standards.
        </p>

        {/* Department / Office */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Department or Office <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="e.g. Department of Computer Science / Registrar's Office"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-[#166534] focus:border-[#166534] outline-hidden transition-all bg-white"
          />
          {errors.department && <p className="text-xs text-red-600 mt-1">{errors.department}</p>}
        </div>

        {/* Role Category */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Role Category <span className="text-red-500">*</span>
          </label>
          <select
            value={roleCategory}
            onChange={(e) => setRoleCategory(e.target.value as RoleCategory)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-[#166534] focus:border-[#166534] outline-hidden transition-all bg-white"
          >
            <option value="Teaching Faculty">Teaching Faculty (TL codes apply)</option>
            <option value="Academic Leadership">Academic Leadership (AL & TL codes apply)</option>
            <option value="Office Staff">Office Staff (OS codes apply)</option>
          </select>
          <p className="text-[11px] text-stone-600 mt-1">
            College-wide (CW) codes apply across all categories.
          </p>
        </div>

        {/* Position */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Position / Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="e.g. Assistant Professor II / Records Officer / Program Head"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-[#166534] focus:border-[#166534] outline-hidden transition-all bg-white"
          />
          {errors.position && <p className="text-xs text-red-600 mt-1">{errors.position}</p>}
        </div>

        {/* Job Function */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Primary Job Function <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            value={jobFunction}
            onChange={(e) => setJobFunction(e.target.value)}
            placeholder="Describe your primary responsibilities, e.g., instruction, assessment grading, syllabus compliance, and student consultations."
            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-[#166534] focus:border-[#166534] outline-hidden transition-all bg-white"
          />
          {errors.jobFunction && <p className="text-xs text-red-600 mt-1">{errors.jobFunction}</p>}
        </div>

        {/* Years in Role */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Years in Current Role (0 - 50) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            max={50}
            value={yearsInRole}
            onChange={(e) => setYearsInRole(parseInt(e.target.value, 10) || 0)}
            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-[#166534] focus:border-[#166534] outline-hidden transition-all bg-white"
          />
          {errors.yearsInRole && <p className="text-xs text-red-600 mt-1">{errors.yearsInRole}</p>}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#166534] hover:bg-emerald-800 text-white text-sm font-semibold shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
