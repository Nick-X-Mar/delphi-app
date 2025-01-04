export default function PersonForm({ person, onSubmit, onCancel }) {
  // ... other form fields ...

  return (
    <form onSubmit={handleSubmit}>
      {/* ... other form fields ... */}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="checkin_date">Checkin Date</Label>
          <Input
            type="date"
            id="checkin_date"
            name="checkin_date"
            value={formData.checkin_date || ''}
            onChange={handleChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="checkout_date">Checkout Date</Label>
          <Input
            type="date"
            id="checkout_date"
            name="checkout_date"
            value={formData.checkout_date || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* ... rest of the form ... */}
    </form>
  );
} 