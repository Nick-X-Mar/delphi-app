export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  totalItems,
  itemsPerPage
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">
        Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50"
        >
          ←
        </button>
        <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-primary-foreground">
          {currentPage}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50"
        >
          →
        </button>
      </div>
    </div>
  );
} 