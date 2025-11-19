'use client';

import React, { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { formatDateTime } from '@/utils/dateFormatters';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { Input } from '@/components/ui/input';

export default function EmailLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedErrors, setExpandedErrors] = useState({});
  const [pagination, setPagination] = useState({
    page: 1,
    itemsPerPage: 10,
    total: 0,
    totalPages: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    eventId: '',
    notificationType: '',
    status: '',
    startDate: '',
    endDate: '',
    firstName: '',
    lastName: '',
    email: ''
  });
  
  const [debouncedFilters] = useDebounce(filters, 500);
  
  const [events, setEvents] = useState([]);
  const [notificationTypes, setNotificationTypes] = useState([
    'INDIVIDUAL', 'BULK', 'CHANGES'
  ]);
  
  const statusOptions = ['sent', 'failed', 'pending'];

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, pagination.itemsPerPage, debouncedFilters]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.itemsPerPage,
        ...Object.fromEntries(Object.entries(debouncedFilters).filter(([_, v]) => v))
      });
      
      const response = await fetch(`/api/email-notifications/all?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch email logs');
      
      const data = await response.json();
      setLogs(data.notifications || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      }));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPagination(prev => ({
      ...prev,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleTextFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({
      ...prev,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
      page: 1 // Reset to first page when page size changes
    }));
  };

  const clearFilters = () => {
    setFilters({
      eventId: '',
      notificationType: '',
      status: '',
      startDate: '',
      endDate: '',
      firstName: '',
      lastName: '',
      email: ''
    });
  };

  const toggleErrorExpand = (id) => {
    setExpandedErrors(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotificationTypeClass = (type) => {
    switch (type) {
      case 'INDIVIDUAL':
        return 'bg-blue-100 text-blue-800';
      case 'BULK':
        return 'bg-purple-100 text-purple-800';
      case 'CHANGES':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };


  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Email Notification Logs</h1>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
            <select
              name="eventId"
              value={filters.eventId}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Events</option>
              {events.map(event => (
                <option key={event.event_id} value={event.event_id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
            <select
              name="notificationType"
              value={filters.notificationType}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Types</option>
              {notificationTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'INDIVIDUAL' ? 'Individual Email' : 
                   type === 'BULK' ? 'Bulk Email' : 
                   type === 'CHANGES' ? 'Changes Notification' : type}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <Input
              placeholder="Filter by first name..."
              value={filters.firstName}
              onChange={(e) => handleTextFilterChange('firstName', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <Input
              placeholder="Filter by last name..."
              value={filters.lastName}
              onChange={(e) => handleTextFilterChange('lastName', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              placeholder="Filter by email..."
              value={filters.email}
              onChange={(e) => handleTextFilterChange('email', e.target.value)}
            />
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Clear Filters
          </button>
        </div>
      </div>
      
      {/* Results */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading email logs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            <p>No email logs found. Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div className="relative overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <table className="min-w-full divide-y divide-gray-200 relative">
                <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#f9fafb' }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: '#f9fafb' }}>
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: '#f9fafb' }}>
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: '#f9fafb' }}>
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: '#f9fafb' }}>
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: '#f9fafb' }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: '#f9fafb' }}>
                      Status ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: '#f9fafb' }}>
                      Sent At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ backgroundColor: '#f9fafb' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className={log.status === 'failed' ? 'bg-red-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {log.first_name} {log.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{log.recipient_email || log.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {log.subject || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{log.event_name || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getNotificationTypeClass(log.notification_type)}`}>
                            {log.notification_type === 'INDIVIDUAL' ? 'Individual Email' : 
                             log.notification_type === 'BULK' ? 'Bulk Email' : 
                             log.notification_type === 'CHANGES' ? 'Changes Notification' : 
                             log.notification_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(log.status)}`}>
                            {log.status || 'sent'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {log.status_id || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(log.sent_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {log.error_message && (
                            <button
                              onClick={() => toggleErrorExpand(log.id)}
                              className="text-red-600 hover:text-red-900 flex items-center"
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              {expandedErrors[log.id] ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      {log.error_message && expandedErrors[log.id] && (
                        <tr>
                          <td colSpan="8" className="px-6 py-4 bg-red-50">
                            <div className="text-sm text-red-700 whitespace-pre-wrap">
                              <strong>Error:</strong> {log.error_message}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
                totalItems={pagination.total}
                itemsPerPage={pagination.itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
} 