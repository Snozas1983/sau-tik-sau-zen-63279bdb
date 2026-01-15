import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { lt } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useCalendarAvailability } from '@/hooks/useCalendarAvailability';

interface ClientRescheduleDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (date: string, startTime: string, endTime: string) => void;
  isLoading?: boolean;
  currentDate: string;
  currentTime: string;
  serviceDuration: number;
}

export function ClientRescheduleDialog({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  currentDate,
  currentTime,
  serviceDuration,
}: ClientRescheduleDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  const { data: calendarData, isLoading: loadingSlots } = useCalendarAvailability(
    open ? serviceDuration : null
  );
  
  // Get available dates
  const availableDates = useMemo(() => {
    if (!calendarData?.availability) return new Set<string>();
    return new Set(
      calendarData.availability
        .filter(day => day.slots.length > 0)
        .map(day => day.date)
    );
  }, [calendarData]);
  
  // Get available slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate || !calendarData?.availability) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayData = calendarData.availability.find(d => d.date === dateStr);
    return dayData?.slots || [];
  }, [selectedDate, calendarData]);
  
  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(undefined);
      setSelectedTime('');
    }
  }, [open]);
  
  // Reset time when date changes
  useEffect(() => {
    setSelectedTime('');
  }, [selectedDate]);
  
  const handleConfirm = () => {
    if (!selectedDate || !selectedTime) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const slot = availableSlots.find(s => s.startTime === selectedTime);
    if (!slot) return;
    
    onConfirm(dateStr, slot.startTime, slot.endTime);
  };
  
  const isDateDisabled = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return !availableDates.has(dateStr);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perkelti vizitą</DialogTitle>
          <DialogDescription>
            Dabartinis laikas: {format(parseISO(currentDate), 'MMMM d', { locale: lt })} d., {currentTime}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Date picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nauja data</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    <span className="capitalize">
                      {format(selectedDate, 'MMMM d, EEEE', { locale: lt })}
                    </span>
                  ) : (
                    'Pasirinkite datą'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={isDateDisabled}
                  locale={lt}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Time picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Naujas laikas</label>
            <Select
              value={selectedTime}
              onValueChange={setSelectedTime}
              disabled={!selectedDate || availableSlots.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  loadingSlots 
                    ? 'Kraunama...' 
                    : !selectedDate 
                      ? 'Pirma pasirinkite datą' 
                      : availableSlots.length === 0 
                        ? 'Nėra laisvų laikų'
                        : 'Pasirinkite laiką'
                } />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.map((slot) => (
                  <SelectItem key={slot.id} value={slot.startTime}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {slot.startTime} - {slot.endTime}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Atšaukti
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedDate || !selectedTime || isLoading}
          >
            {isLoading ? 'Perkeliama...' : 'Perkelti'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
