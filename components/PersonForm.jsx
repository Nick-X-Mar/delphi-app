import { Label } from "@radix-ui/react-label";

export default function PersonForm({ person, formData, setFormData, onSubmit, onCancel }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Source fields in first row */}
      <div className="bg-gray-50/80 p-6 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">Source Information</h3>
        <div className="grid grid-cols-3 gap-6">
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
            <Label className="text-sm font-medium text-gray-700">Email</Label>
            <input 
              type="email"
              value={person?.email || ''} 
              disabled
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-500 disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Custom fields section */}
      <div className="space-y-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Additional Information</h3>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="department" className="text-sm font-medium text-gray-700">Department</Label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position" className="text-sm font-medium text-gray-700">Position</Label>
            <input
              type="text"
              id="position"
              name="position"
              value={formData.position || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="checkin_date" className="text-sm font-medium text-gray-700">Checkin Date</Label>
            <input
              type="date"
              id="checkin_date"
              name="checkin_date"
              value={formData.checkin_date || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="checkout_date" className="text-sm font-medium text-gray-700">Checkout Date</Label>
            <input
              type="date"
              id="checkout_date"
              name="checkout_date"
              value={formData.checkout_date || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

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
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
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
    </form>
  );
} 