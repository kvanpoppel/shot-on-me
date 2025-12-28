/**
 * Utility functions for handling recurring promotions
 */

/**
 * Generate recurring promotion instances based on pattern
 * @param {Object} basePromotion - The base promotion object
 * @param {Object} recurrencePattern - The recurrence pattern
 * @param {Date} startDate - When to start generating instances
 * @returns {Array} Array of promotion instances
 */
function generateRecurringInstances(basePromotion, recurrencePattern, startDate = new Date()) {
  const instances = [];
  const { type, frequency = 1, daysOfWeek = [], dayOfMonth, endDate, maxOccurrences } = recurrencePattern;
  
  let currentDate = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  let occurrenceCount = 0;
  const maxCount = maxOccurrences || 100; // Default limit to prevent infinite loops

  // Extract time from startTime
  const baseStartTime = basePromotion.startTime ? new Date(basePromotion.startTime) : new Date();
  const baseEndTime = basePromotion.endTime ? new Date(basePromotion.endTime) : new Date();
  
  const startHour = baseStartTime.getHours();
  const startMinute = baseStartTime.getMinutes();
  const endHour = baseEndTime.getHours();
  const endMinute = baseEndTime.getMinutes();
  
  // Calculate duration in hours
  const durationMs = baseEndTime.getTime() - baseStartTime.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  while (occurrenceCount < maxCount) {
    let instanceDate = null;
    let isValidDate = false;

    switch (type) {
      case 'daily':
        // Every X days
        instanceDate = new Date(currentDate);
        instanceDate.setDate(instanceDate.getDate() + (frequency * occurrenceCount));
        isValidDate = true;
        break;

      case 'weekly':
        // Every X weeks on specific days
        if (daysOfWeek.length === 0) {
          // If no days specified, use the day of the start date
          daysOfWeek.push(baseStartTime.getDay());
        }
        
        // Find next occurrence of any specified day
        let weekOffset = Math.floor(occurrenceCount / daysOfWeek.length);
        let dayIndex = occurrenceCount % daysOfWeek.length;
        let targetDay = daysOfWeek[dayIndex];
        
        instanceDate = new Date(currentDate);
        const currentDay = instanceDate.getDay();
        let daysToAdd = targetDay - currentDay;
        
        if (daysToAdd < 0 || (daysToAdd === 0 && occurrenceCount > 0)) {
          daysToAdd += 7;
        }
        
        instanceDate.setDate(instanceDate.getDate() + daysToAdd + (weekOffset * 7 * frequency));
        isValidDate = true;
        break;

      case 'monthly':
        // Every X months on specific day
        instanceDate = new Date(currentDate);
        instanceDate.setMonth(instanceDate.getMonth() + (frequency * occurrenceCount));
        
        if (dayOfMonth) {
          // Set to specific day of month
          const daysInMonth = new Date(instanceDate.getFullYear(), instanceDate.getMonth() + 1, 0).getDate();
          instanceDate.setDate(Math.min(dayOfMonth, daysInMonth));
        } else {
          // Use same day of month as start date
          instanceDate.setDate(baseStartTime.getDate());
        }
        isValidDate = true;
        break;

      case 'custom':
        // Custom pattern - for now, treat as weekly
        instanceDate = new Date(currentDate);
        instanceDate.setDate(instanceDate.getDate() + (frequency * occurrenceCount));
        isValidDate = true;
        break;

      default:
        isValidDate = false;
    }

    if (!isValidDate || !instanceDate) {
      break;
    }

    // Check if we've passed the end date
    if (end && instanceDate > end) {
      break;
    }

    // Set the time for this instance
    const instanceStartTime = new Date(instanceDate);
    instanceStartTime.setHours(startHour, startMinute, 0, 0);
    
    const instanceEndTime = new Date(instanceStartTime);
    instanceEndTime.setHours(startHour + durationHours, startMinute, 0, 0);

    // Create promotion instance
    const instance = {
      ...basePromotion,
      startTime: instanceStartTime,
      endTime: instanceEndTime,
      isRecurring: false, // Individual instances are not recurring
      recurrencePattern: {
        ...recurrencePattern,
        parentPromotionId: basePromotion._id || basePromotion.id || 'parent'
      },
      _id: undefined, // Let MongoDB generate new ID
      id: undefined
    };

    instances.push(instance);
    occurrenceCount++;

    // For weekly with multiple days, we need to handle the date progression differently
    if (type === 'weekly' && daysOfWeek.length > 1) {
      // Already handled in the switch case
      continue;
    }

    // Move to next period
    if (type === 'daily') {
      currentDate = new Date(instanceDate);
      currentDate.setDate(currentDate.getDate() + frequency);
    } else if (type === 'weekly') {
      currentDate = new Date(instanceDate);
      currentDate.setDate(currentDate.getDate() + 1); // Move to next day
    } else if (type === 'monthly') {
      currentDate = new Date(instanceDate);
      currentDate.setMonth(currentDate.getMonth() + frequency);
    }
  }

  return instances;
}

/**
 * Generate schedule array from days of week
 * @param {Array} daysOfWeek - Array of day numbers (0-6)
 * @param {String} startTime - Start time string (HH:mm)
 * @param {String} endTime - End time string (HH:mm)
 * @returns {Array} Schedule array
 */
function generateScheduleFromDays(daysOfWeek, startTime, endTime) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return daysOfWeek.map(day => ({
    days: dayNames[day],
    start: startTime,
    end: endTime
  }));
}

module.exports = {
  generateRecurringInstances,
  generateScheduleFromDays
};


