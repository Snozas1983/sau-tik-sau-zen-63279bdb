import { Service } from './types';
import { cn } from '@/lib/utils';

interface ServiceSelectorProps {
  services: Service[];
  selectedService: Service | null;
  onSelectService: (service: Service) => void;
}

export const ServiceSelector = ({
  services,
  selectedService,
  onSelectService,
}: ServiceSelectorProps) => {
  return (
    <div className="space-y-6 md:space-y-12">
      {services.map((service, index) => (
        <button
          key={service.id}
          onClick={() => onSelectService(service)}
          className={cn(
            'w-full text-left pb-6 md:pb-12 transition-all duration-200 group',
            index < services.length - 1 && 'border-b border-booking-border',
            'focus:outline-none'
          )}
        >
          <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 md:gap-4">
            <h3 className="text-base md:text-2xl font-light text-booking-foreground transition-all duration-200 group-hover:font-semibold leading-relaxed break-words flex-1 max-w-[60%] md:max-w-[50%]">
              {service.name}
            </h3>
            <div className="flex items-baseline gap-4 md:gap-8">
              <span className="text-booking-muted font-light text-sm md:text-base w-[60px] md:w-[80px] text-right">
                {service.duration} min
              </span>
              <span className="text-base md:text-2xl font-light text-booking-foreground w-[70px] md:w-[100px] text-right whitespace-nowrap">
                {service.price} €
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};