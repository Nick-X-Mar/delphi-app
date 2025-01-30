import { useState, useEffect } from 'react';
import { Label } from "@radix-ui/react-label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { X, Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PersonForm({ person, formData, setFormData, onSubmit, onCancel }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [existingGroups, setExistingGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);

  // Initialize formData with person's data when component mounts
  useEffect(() => {
    if (person) {
      setFormData({
        company: person.company || '',
        job_title: person.job_title || '',
        room_size: person.room_size || '',
        group_id: person.group_id || '',
        notes: person.notes || '',
        category: person.category || 'Regular'
      });
    }
  }, [person, setFormData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(''); // Clear any previous submit error
    setErrors({}); // Clear previous field errors

    // Validate required fields
    const newErrors = {};
    if (!formData.room_size) {
      newErrors.room_size = 'Room size is required';
    }

    // If there are validation errors, display them and stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const response = await fetch(`/api/people-details/${person.person_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.field) {
          setErrors({ [data.field]: data.error });
        } else {
          setSubmitError(data.error || 'Failed to update details');
        }
        return;
      }

      onSubmit(e);
    } catch (error) {
      console.error('Update error:', error);
      setSubmitError(error.message || 'Failed to update details');
    }
  };

  // Fetch existing group IDs
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/groups');
        if (response.ok) {
          const data = await response.json();
          setExistingGroups(data);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };
    fetchGroups();
  }, []);

  const handleGroupSelect = (selectedGroup) => {
    if (selectedGroup === 'new') {
      setIsNewGroup(true);
      setFormData(prev => ({ ...prev, group_id: '' }));
    } else {
      setIsNewGroup(false);
      setFormData(prev => ({ ...prev, group_id: selectedGroup }));
    }
    setOpen(false);
  };

  const handleRemoveGroup = () => {
    setFormData(prev => ({ ...prev, group_id: null }));
    setIsNewGroup(false);
  };

  const handleNewGroupSubmit = () => {
    if (newGroupName.trim()) {
      setFormData(prev => ({ ...prev, group_id: newGroupName.trim() }));
      setExistingGroups(prev => [...prev, newGroupName.trim()]);
      setIsNewGroup(false);
      setNewGroupName('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Source fields section */}
      <div className="bg-gray-50/80 p-6 rounded-xl border border-gray-100 shadow-sm">
        <button
          type="button"
          onClick={() => setIsSourceExpanded(!isSourceExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Source Information</h3>
          <ChevronsUpDown 
            className={cn(
              "h-4 w-4 text-gray-500 transition-transform duration-200",
              isSourceExpanded ? "transform rotate-180" : ""
            )}
          />
        </button>
        
        {isSourceExpanded && (
          <div className="grid grid-cols-3 gap-6 mt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Salutation</Label>
              <input 
                type="text"
                value={person?.salutation || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">First Name</Label>
              <input 
                type="text"
                value={person?.first_name || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Last Name</Label>
              <input 
                type="text"
                value={person?.last_name || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Full Name</Label>
              <input 
                type="text"
                value={person?.full_name || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Email</Label>
              <input 
                type="email"
                value={person?.email || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Nationality</Label>
              <input 
                type="text"
                value={person?.nationality || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Mobile Phone</Label>
              <input 
                type="text"
                value={person?.mobile_phone || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Room Type</Label>
              <input 
                type="text"
                value={person?.room_type || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Guest Type</Label>
              <input 
                type="text"
                value={person?.guest_type || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Companion Email</Label>
              <input 
                type="email"
                value={person?.companion_email || ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Check In</Label>
              <input 
                type="date"
                value={person?.checkin_date ? person.checkin_date.split('T')[0] : ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Check Out</Label>
              <input 
                type="date"
                value={person?.checkout_date ? person.checkout_date.split('T')[0] : ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="col-span-3 space-y-2">
              <Label className="text-sm font-medium text-gray-700">Comments</Label>
              <textarea 
                value={person?.comments || ''} 
                disabled
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">App Synced</Label>
              <input 
                type="text"
                value={person?.app_synced ? 'Yes' : 'No'} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">App Synced Date</Label>
              <input 
                type="date"
                value={person?.app_synced_date ? person.app_synced_date.split('T')[0] : ''} 
                disabled
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Custom fields section */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Additional Information</h3>
        
        {/* Grid layout for form fields */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="company" className="text-sm font-medium text-gray-700">Company</Label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_title" className="text-sm font-medium text-gray-700">Job Title</Label>
            <input
              type="text"
              id="job_title"
              name="job_title"
              value={formData.job_title || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_size" className="text-sm font-medium text-gray-700">
              Room Size <span className="text-red-500">*</span>
            </Label>
            <input
              type="number"
              id="room_size"
              name="room_size"
              value={formData.room_size || ''}
              onChange={handleChange}
              min="1"
              className={cn(
                "w-full px-3 py-2 bg-white border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                errors.room_size ? "border-red-500" : "border-gray-200"
              )}
            />
            {errors.room_size && (
              <p className="text-sm text-red-500 mt-1">{errors.room_size}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Updated At</Label>
            <input 
              type="text"
              value={person?.updated_at ? new Date(person.updated_at).toLocaleString() : 'Never'} 
              disabled
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Category</Label>
            <select
              id="category"
              name="category"
              value={formData.category || 'Regular'}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="VVIP">VVIP</option>
              <option value="VIP">VIP</option>
              <option value="Regular">Regular</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Stay Together Section - Simplified */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-gray-700">Stay Together Group</Label>
            
            <div className="flex gap-3">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="flex-1"
                  >
                    {formData.group_id || "Select existing group"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search groups..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <CommandList>
                      {existingGroups
                        .filter(group => 
                          group.toLowerCase().includes(searchTerm.toLowerCase())
                        ).length === 0 ? (
                        <CommandEmpty>No groups found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {existingGroups
                            .filter(group => 
                              group.toLowerCase().includes(searchTerm.toLowerCase())
                            )
                            .map((group) => (
                              <CommandItem
                                key={group}
                                onSelect={() => handleGroupSelect(group)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.group_id === group ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {group}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {formData.group_id ? (
                <Button
                  type="button"
                  onClick={handleRemoveGroup}
                  className="bg-red-600 hover:bg-red-700"
                  title="Remove group"
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => handleGroupSelect('new')}
                  className="bg-green-600 hover:bg-green-700"
                  title="Add new group"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isNewGroup && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter new group name..."
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button
                  type="button"
                  onClick={handleNewGroupSubmit}
                  disabled={!newGroupName.trim()}
                >
                  Add Group
                </Button>
              </div>
            )}

            {formData.group_id && (
              <div className="bg-blue-50 px-4 py-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  Current Group: <span className="font-medium">{formData.group_id}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Notes field - full width */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-6 border-t border-gray-200">
        {submitError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {submitError}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </form>
  );
} 