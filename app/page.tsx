"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, X, CheckCircle, AlertCircle, Loader2, List } from 'lucide-react';

const N8N_WEBHOOK_URL = "https://booking1985.app.n8n.cloud/webhook-test/bookings";

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 9; i < 17; i++) {
    const startHour = i.toString().padStart(2, '0');
    const nextHour = (i + 1).toString().padStart(2, '0');
    slots.push(`${startHour}:00-${nextHour}:00`);
  }
  return slots;
};

const DEFAULT_SLOTS = generateTimeSlots();

const parseExcelDate = (dateVal: any) => {
  if (!dateVal) return null;
  const strVal = String(dateVal).trim();
  if (/^\d+$/.test(strVal)) {
    const excelDays = parseInt(strVal, 10);
    const date = new Date((excelDays - (25567 + 2)) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return strVal; 
};

export default function VisitationBooking() {
  const [isMounted, setIsMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [minDate, setMinDate] = useState('');
  
  const [bookedData, setBookedData] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  
  // States for Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setMinDate(today);
    setIsMounted(true);
    fetchBookedSlots();
  }, []);

  useEffect(() => {
    setSelectedSlots([]);
  }, [selectedDate]);

  const fetchBookedSlots = async () => {
    setIsFetching(true);
    try {
      const response = await fetch(N8N_WEBHOOK_URL, { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (response.ok) {
        const data = await response.json();
        setBookedData(Array.isArray(data?.bookings) ? data.bookings : []);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleToggleSlot = (slot: string) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot]);
    }
  };

  const handleOpenModal = () => {
    if (selectedSlots.length === 0) return;
    setFullName('');
    setMessage({ text: '', type: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setMessage({ text: 'Please enter your full name.', type: 'error' });
      return;
    }
    if (trimmedName.length > 100) {
      setMessage({ text: 'Name cannot exceed 100 characters.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    let successCount = 0;
    let conflictSlots: string[] = [];
    let hasError = false;

    for (const slot of selectedSlots) {
      try {
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            timeSlot: slot,
            fullName: trimmedName
          })
        });

        if (response.status === 201) {
          successCount++;
        } else if (response.status === 409) {
          conflictSlots.push(slot);
        } else {
          hasError = true;
        }
      } catch (error) {
        hasError = true;
      }
    }

    if (successCount === selectedSlots.length) {
      setMessage({ text: 'Booking confirmed successfully!', type: 'success' });
      setTimeout(() => {
        setIsModalOpen(false);
        setSelectedSlots([]);
        fetchBookedSlots();
      }, 1500);
    } else if (conflictSlots.length > 0) {
      setMessage({ 
        text: `Some slots were already taken: ${conflictSlots.join(', ')}. Successful bookings were saved.`, 
        type: 'error' 
      });
      setSelectedSlots(conflictSlots);
      fetchBookedSlots();
    } else if (hasError) {
      setMessage({ text: 'System error occurred. Please try again later.', type: 'error' });
      fetchBookedSlots();
    }

    setIsSubmitting(false);
  };

  // Sắp xếp danh sách lịch đã book từ gần nhất trở đi (Chronological sort)
  const sortedBookings = [...bookedData].sort((a, b) => {
    const dateA = new Date(`${parseExcelDate(a.date)}T${a.timeSlot.split('-')[0]}:00`).getTime();
    const dateB = new Date(`${parseExcelDate(b.date)}T${b.timeSlot.split('-')[0]}:00`).getTime();
    return dateA - dateB;
  });

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4 font-sans text-gray-800">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
        
        {/* Nút View Schedule */}
        <button 
          onClick={() => setIsScheduleModalOpen(true)}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100"
          title="View all booked schedules"
        >
          <List className="w-5 h-5" />
        </button>

        {isFetching && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
            <Loader2 className="w-8 h-8 text-gray-900 animate-spin mb-2" />
            <p className="text-sm text-gray-600 font-medium">Updating schedule...</p>
          </div>
        )}

        <div className="text-center mb-6 border-b border-gray-100 pb-6 pr-8">
          <h1 className="text-2xl font-serif text-gray-900 mb-2">Visitation Registration</h1>
          <p className="text-sm text-gray-500">Please select a date and one or more time slots</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center">
            <Calendar className="w-4 h-4 mr-2" /> Select Date
          </label>
          <input 
            type="date" 
            value={selectedDate}
            min={minDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 bg-white"
          />
        </div>

        <div className="mb-20">
          <div className="flex items-center justify-between mb-3">
             <label className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center">
              <Clock className="w-4 h-4 mr-2" /> Time Slots (1 Hour)
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEFAULT_SLOTS.map((slot) => {
              // Tìm xem slot này có ai book chưa
              const bookedItem = bookedData.find(
                b => parseExcelDate(b.date) === selectedDate && b.timeSlot === slot
              );
              const isBooked = !!bookedItem;
              const isSelected = selectedSlots.includes(slot);
              
              return (
                <div key={slot} className="relative group">
                  <button
                    disabled={isBooked}
                    onClick={() => handleToggleSlot(slot)}
                    className={`
                      w-full py-3 px-2 rounded border text-sm transition-all duration-200 text-center
                      ${isBooked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 
                        isSelected ? 'bg-gray-900 border-gray-900 text-white shadow-md' : 
                        'bg-white border-gray-300 text-gray-700 hover:border-gray-900 hover:shadow-sm'}
                    `}
                  >
                    {slot.replace('-', ' - ')}
                    {isBooked && <div className="text-xs mt-1 text-gray-400">Booked</div>}
                  </button>

                  {/* Tooltip hiển thị tên người đã book khi Hover */}
                  {isBooked && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs font-medium py-1.5 px-3 rounded shadow-lg whitespace-nowrap z-30 pointer-events-none">
                      Booked by: {bookedItem.fullName}
                      {/* Mũi tên trỏ xuống của Tooltip */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Nút Book nổi bên dưới */}
      {selectedSlots.length > 0 && !isModalOpen && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 flex justify-center animate-in slide-in-from-bottom-5">
          <div className="w-full max-w-md flex items-center justify-between">
            <div className="text-sm">
              <span className="font-bold text-gray-900">{selectedSlots.length}</span> slot(s) selected
            </div>
            <button
              onClick={handleOpenModal}
              className="bg-gray-900 text-white px-6 py-2.5 rounded font-medium hover:bg-gray-800 transition-colors"
            >
              Proceed to Book
            </button>
          </div>
        </div>
      )}

      {/* Modal Đăng ký (Confirm Booking) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-sm shadow-xl overflow-hidden relative">
            
            {isSubmitting && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-900 animate-spin mb-2" />
                <p className="text-sm font-medium text-gray-700">Processing booking...</p>
              </div>
            )}

            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-800">Confirm Booking</h3>
              <button onClick={handleCloseModal} disabled={isSubmitting} className="text-gray-400 hover:text-gray-700 disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5">
              <div className="mb-4 bg-gray-50 p-3 rounded text-sm text-gray-600 border border-gray-100 max-h-32 overflow-y-auto">
                <p className="mb-1">Date: <strong>{selectedDate ? selectedDate.split('-').reverse().join('/') : ''}</strong></p>
                <p>Selected Time(s):</p>
                <ul className="list-disc pl-5 mt-1 font-medium">
                  {selectedSlots.map(s => <li key={s}>{s.replace('-', ' - ')}</li>)}
                </ul>
              </div>

              {message.text && (
                <div className={`p-3 rounded mb-4 flex items-start text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {message.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
                  <span>{message.text}</span>
                </div>
              )}

              <div className="mb-5">
                <label className="block text-sm text-gray-700 mb-2 flex items-center">
                  <User className="w-4 h-4 mr-1" /> Full Name / Group Name
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name..."
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium disabled:opacity-70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors font-medium disabled:opacity-70"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem lịch trình (View Schedule) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <List className="w-4 h-4 mr-2" /> Booked Schedules
              </h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 flex-1 bg-gray-50">
              {sortedBookings.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                  <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p>No bookings have been made yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedBookings.map((booking, index) => {
                    const dateStr = parseExcelDate(booking.date);
                    const formattedDate = dateStr ? dateStr.split('-').reverse().join('/') : 'Unknown Date';
                    
                    return (
                      <div key={index} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-start">
                        <div className="bg-gray-100 rounded p-2 text-center mr-3 min-w-[70px]">
                          <div className="text-xs text-gray-500 font-semibold uppercase">{formattedDate.substring(3)}</div>
                          <div className="text-lg font-bold text-gray-800">{formattedDate.substring(0, 2)}</div>
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="text-sm font-semibold text-gray-800 mb-1 flex items-center">
                            <Clock className="w-3 h-3 mr-1.5 text-gray-500" />
                            {booking.timeSlot.replace('-', ' - ')}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center">
                            <User className="w-3 h-3 mr-1.5 text-gray-400" />
                            {booking.fullName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white">
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}