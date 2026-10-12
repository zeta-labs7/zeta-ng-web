import {
  Component,
  computed,
  ElementRef,
  HostListener,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

type TicketStatus = 'In progress' | 'Pending' | 'Completed';
type TicketFilter = 'All' | TicketStatus;
type TicketPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

interface Ticket {
  id: string;
  title: string;
  requester: string;
  service: string;
  type: string;
  typeClass: string;
  typeIcon: string;
  status: TicketStatus;
  statusClass: string;
  priority: TicketPriority;
  priorityClass: string;
  priorityIcon: string;
  updated: string;
  assignee: string;
  description?: string;
}

const initialTickets: Ticket[] = [
  {
    id: 'ZLT-2481',
    title: 'Onboard customer-portal to EKS',
    requester: 'Admin',
    service: 'Application onboarding',
    type: 'Application onboarding',
    typeClass: 'type-purple',
    typeIcon: '↗',
    status: 'In progress',
    statusClass: 'status-progress',
    priority: 'High',
    priorityClass: 'priority-high',
    priorityIcon: '↑',
    updated: '12 min ago',
    assignee: 'Jordan Lee',
  },
  {
    id: 'ZLT-2478',
    title: 'Provision S3 bucket for analytics',
    requester: 'Admin',
    service: 'AWS provisioning',
    type: 'AWS provisioning',
    typeClass: 'type-orange',
    typeIcon: '☁',
    status: 'Pending',
    statusClass: 'status-pending',
    priority: 'Normal',
    priorityClass: 'priority-normal',
    priorityIcon: '→',
    updated: '1 hour ago',
    assignee: 'Taylor Chen',
  },
  {
    id: 'ZLT-2472',
    title: 'Set up GitHub Actions pipeline',
    requester: 'Sam Rivera',
    service: 'CI/CD support',
    type: 'CI/CD support',
    typeClass: 'type-blue',
    typeIcon: '⌘',
    status: 'In progress',
    statusClass: 'status-progress',
    priority: 'Normal',
    priorityClass: 'priority-normal',
    priorityIcon: '→',
    updated: '3 hours ago',
    assignee: 'Casey Patel',
  },
  {
    id: 'ZLT-2465',
    title: 'Request access to staging environment',
    requester: 'Admin',
    service: 'Access request',
    type: 'Access request',
    typeClass: 'type-green',
    typeIcon: '⌑',
    status: 'Pending',
    statusClass: 'status-pending',
    priority: 'Low',
    priorityClass: 'priority-low',
    priorityIcon: '↓',
    updated: 'Yesterday',
    assignee: 'Morgan Davis',
  },
  {
    id: 'ZLT-2459',
    title: 'Configure CloudWatch alerts',
    requester: 'Jamie Park',
    service: 'AWS provisioning',
    type: 'AWS provisioning',
    typeClass: 'type-orange',
    typeIcon: '☁',
    status: 'Completed',
    statusClass: 'status-completed',
    priority: 'Normal',
    priorityClass: 'priority-normal',
    priorityIcon: '→',
    updated: 'Yesterday',
    assignee: 'Taylor Chen',
  },
  {
    id: 'ZLT-2453',
    title: 'Register inventory service in Backstage',
    requester: 'Admin',
    service: 'Application onboarding',
    type: 'Application onboarding',
    typeClass: 'type-purple',
    typeIcon: '↗',
    status: 'Completed',
    statusClass: 'status-completed',
    priority: 'High',
    priorityClass: 'priority-high',
    priorityIcon: '↑',
    updated: 'Oct 9, 2026',
    assignee: 'Jordan Lee',
  },
];

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  private readonly clock = signal(Date.now());
  private readonly clockTimer = setInterval(() => this.clock.set(Date.now()), 60_000);
  protected readonly tickets = signal<Ticket[]>(initialTickets);
  protected readonly activeFilter = signal<TicketFilter>('All');
  protected readonly searchQuery = signal('');
  protected readonly isCreateDialogOpen = signal(false);
  protected readonly selectedTicket = signal<Ticket | null>(null);
  protected readonly isDarkMode = signal(false);
  protected readonly greeting = computed(() => {
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' })
        .format(new Date(this.clock())),
    );
    return hour >= 5 && hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  });
  protected readonly currentDate = computed(() =>
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(this.clock())).toUpperCase(),
  );
  @ViewChild('ticketSearch') private ticketSearch?: ElementRef<HTMLInputElement>;

  protected readonly visibleTickets = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return this.tickets().filter((ticket) => {
      const matchesStatus = filter === 'All' || ticket.status === filter;
      const searchableText = `${ticket.id} ${ticket.title} ${ticket.requester} ${ticket.service} ${ticket.type} ${ticket.status} ${ticket.description ?? ''}`.toLowerCase();
      return matchesStatus && (!query || searchableText.includes(query));
    });
  });

  protected readonly openCount = computed(
    () => this.tickets().filter((ticket) => ticket.status !== 'Completed').length,
  );
  protected readonly inProgressCount = computed(
    () => this.tickets().filter((ticket) => ticket.status === 'In progress').length,
  );
  protected readonly needsInputCount = computed(
    () => this.tickets().filter((ticket) => ticket.status === 'Pending').length,
  );
  protected readonly completedCount = computed(
    () => this.tickets().filter((ticket) => ticket.status === 'Completed').length,
  );

  protected setFilter(filter: TicketFilter): void {
    this.activeFilter.set(filter);
  }

  protected toggleDarkMode(): void {
    this.isDarkMode.update((enabled) => !enabled);
  }

  @HostListener('window:keydown', ['$event'])
  protected handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.isCreateDialogOpen()) {
        this.closeCreateDialog();
      } else if (this.selectedTicket()) {
        this.closeTicket();
      }
      return;
    }

    const target = event.target;
    const isEditing = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || (target instanceof HTMLElement && target.isContentEditable);

    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditing) {
      event.preventDefault();
      this.ticketSearch?.nativeElement.focus();
    }
  }

  protected updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected clearFilters(): void {
    this.activeFilter.set('All');
    this.searchQuery.set('');
  }

  protected openCreateDialog(): void {
    this.isCreateDialogOpen.set(true);
  }

  protected closeCreateDialog(): void {
    this.isCreateDialogOpen.set(false);
  }

  protected openTicket(ticket: Ticket): void {
    this.selectedTicket.set(ticket);
  }

  protected closeTicket(): void {
    this.selectedTicket.set(null);
  }

  ngOnDestroy(): void {
    clearInterval(this.clockTimer);
  }

  protected createTicket(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    const value = form.value as {
      title: string;
      type: string;
      priority: TicketPriority;
      service: string;
      description?: string;
    };
    const title = value.title.trim();
    const service = value.service.trim();
    const typeDetails = this.getTypeDetails(value.type);
    const priorityDetails = this.getPriorityDetails(value.priority);
    const nextNumber = Math.max(...this.tickets().map((ticket) => Number(ticket.id.slice(4)))) + 1;

    this.tickets.update((tickets) => [
      {
        id: `ZLT-${nextNumber}`,
        title,
        requester: 'Admin',
        service,
        type: value.type,
        typeClass: typeDetails.className,
        typeIcon: typeDetails.icon,
        status: 'Pending',
        statusClass: 'status-pending',
        priority: value.priority,
        priorityClass: priorityDetails.className,
        priorityIcon: priorityDetails.icon,
        updated: 'Just now',
        assignee: 'DevOps team',
        description: value.description?.trim(),
      },
      ...tickets,
    ]);
    this.clearFilters();
    this.closeCreateDialog();
  }

  private getTypeDetails(type: string): { className: string; icon: string } {
    if (type === 'AWS provisioning') {
      return { className: 'type-orange', icon: '☁' };
    }
    if (type === 'CI/CD support') {
      return { className: 'type-blue', icon: '⌘' };
    }
    if (type === 'Access request') {
      return { className: 'type-green', icon: '⌑' };
    }
    return { className: 'type-purple', icon: '↗' };
  }

  private getPriorityDetails(priority: TicketPriority): { className: string; icon: string } {
    switch (priority) {
      case 'Urgent':
        return { className: 'priority-urgent', icon: '‼' };
      case 'High':
        return { className: 'priority-high', icon: '↑' };
      case 'Low':
        return { className: 'priority-low', icon: '↓' };
      default:
        return { className: 'priority-normal', icon: '→' };
    }
  }
}
