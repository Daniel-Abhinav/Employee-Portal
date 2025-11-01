import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

/**
 * Custom hook for Supabase real-time subscriptions
 */
export const useRealtimeSubscription = (
  table,
  { onInsert, onUpdate, onDelete },
  filter = null,
  dependencies = []
) => {
  useEffect(() => {
    const channelName = `realtime:${table}${filter ? `:${filter.column}=${filter.value}` : ''}`;
    
    let subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
        },
        (payload) => {
          console.log(`[Realtime] ${payload.eventType} on ${table}:`, payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              if (onInsert) onInsert(payload.new);
              break;
            case 'UPDATE':
              if (onUpdate) onUpdate(payload.new, payload.old);
              break;
            case 'DELETE':
              if (onDelete) onDelete(payload.old);
              break;
            default:
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for ${table}:`, status);
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from ${table}`);
      supabase.removeChannel(subscription);
    };
  }, [table, filter?.value, ...dependencies]);
};

/**
 * Hook for expense updates
 */
export const useExpenseRealtime = (employeeId, onUpdate) => {
  useRealtimeSubscription(
    'expenses',
    {
      onInsert: (expense) => {
        console.log('[Realtime] New expense created:', expense);
        onUpdate({ type: 'INSERT', data: expense });
      },
      onUpdate: (newExpense, oldExpense) => {
        console.log('[Realtime] Expense updated:', newExpense);
        onUpdate({ type: 'UPDATE', data: newExpense, old: oldExpense });
      },
      onDelete: (expense) => {
        console.log('[Realtime] Expense deleted:', expense);
        onUpdate({ type: 'DELETE', data: expense });
      }
    },
    employeeId ? { column: 'employee_id', value: employeeId } : null,
    [employeeId]
  );
};

/**
 * Hook for leave request updates
 */
export const useLeaveRealtime = (employeeId, onUpdate) => {
  useRealtimeSubscription(
    'leave_requests',
    {
      onInsert: (leave) => {
        console.log('[Realtime] New leave request:', leave);
        onUpdate({ type: 'INSERT', data: leave });
      },
      onUpdate: (newLeave, oldLeave) => {
        console.log('[Realtime] Leave request updated:', newLeave);
        onUpdate({ type: 'UPDATE', data: newLeave, old: oldLeave });
      },
      onDelete: (leave) => {
        console.log('[Realtime] Leave request deleted:', leave);
        onUpdate({ type: 'DELETE', data: leave });
      }
    },
    employeeId ? { column: 'employee_id', value: employeeId } : null,
    [employeeId]
  );
};

/**
 * Hook for attendance updates
 */
export const useAttendanceRealtime = (employeeId, onUpdate) => {
  useRealtimeSubscription(
    'attendance',
    {
      onInsert: (attendance) => {
        console.log('[Realtime] New attendance record:', attendance);
        onUpdate({ type: 'INSERT', data: attendance });
      },
      onUpdate: (newAttendance, oldAttendance) => {
        console.log('[Realtime] Attendance updated:', newAttendance);
        onUpdate({ type: 'UPDATE', data: newAttendance, old: oldAttendance });
      }
    },
    employeeId ? { column: 'employee_id', value: employeeId } : null,
    [employeeId]
  );
};

/**
 * Hook for performance review updates
 */
export const usePerformanceRealtime = (employeeId, onUpdate) => {
  useRealtimeSubscription(
    'performance_reviews',
    {
      onInsert: (review) => {
        console.log('[Realtime] New performance review:', review);
        onUpdate({ type: 'INSERT', data: review });
      },
      onUpdate: (newReview, oldReview) => {
        console.log('[Realtime] Performance review updated:', newReview);
        onUpdate({ type: 'UPDATE', data: newReview, old: oldReview });
      }
    },
    employeeId ? { column: 'employee_id', value: employeeId } : null,
    [employeeId]
  );
};

/**
 * Hook for goal updates
 */
export const useGoalRealtime = (employeeId, onUpdate) => {
  useRealtimeSubscription(
    'goals',
    {
      onInsert: (goal) => {
        console.log('[Realtime] New goal created:', goal);
        onUpdate({ type: 'INSERT', data: goal });
      },
      onUpdate: (newGoal, oldGoal) => {
        console.log('[Realtime] Goal updated:', newGoal);
        onUpdate({ type: 'UPDATE', data: newGoal, old: oldGoal });
      },
      onDelete: (goal) => {
        console.log('[Realtime] Goal deleted:', goal);
        onUpdate({ type: 'DELETE', data: goal });
      }
    },
    employeeId ? { column: 'employee_id', value: employeeId } : null,
    [employeeId]
  );
};

export default useRealtimeSubscription;
