export const calculateBookingStatus = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): 'upcoming' | 'ongoing' | 'completed' => {
  try {
    const now = new Date();

    // Parse dates (format: "21 Oct 2024")
    const parseDate = (dateStr: string, timeStr: string) => {
      const parts = dateStr.trim().split(' ');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monthStr = parts[1];
        const year = parseInt(parts[2]);

        const months: { [key: string]: number } = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };

        const month = months[monthStr];
        if (month !== undefined) {
          const date = new Date(year, month, day);
          
          // Parse time (format: "9:35 PM")
          const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (timeParts) {
            let hours = parseInt(timeParts[1]);
            const minutes = parseInt(timeParts[2]);
            const period = timeParts[3].toUpperCase();

            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            date.setHours(hours, minutes, 0, 0);
          }
          
          return date;
        }
      }
      return new Date(); // ✅ Fallback if parsing fails
    };

    const start = parseDate(startDate, startTime);
    const end = parseDate(endDate, endTime);

    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'completed';
  } catch (error) {
    console.error('Error calculating status:', error);
    return 'upcoming';
  }
};