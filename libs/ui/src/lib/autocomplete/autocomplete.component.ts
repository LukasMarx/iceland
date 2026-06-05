import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { LibInputComponent } from '../input/input.component';
import { LucideMapPin } from '@lucide/angular';

@Component({
  selector: 'lib-autocomplete',
  standalone: true,
  imports: [LibInputComponent, LucideMapPin],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown)': 'handleKeydown($event)',
    '(focusin)': 'handleFocusin()',
  },
})
export class LibAutocompleteComponent<T> {
  readonly items = input<T[]>([]);
  readonly displayFn = input<(item: T) => string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => item?.label ?? item?.name ?? String(item),
  );
  readonly value = model<T | null>(null);
  readonly placeholder = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false);
  readonly noResultsText = input('No results found');
  readonly dataTestId = input<string | null>(null);
  readonly filterFn = input<((item: T, query: string) => boolean) | null>(null);

  readonly queryChange = output<string>();

  protected readonly query = signal('');
  protected readonly isOpen = signal(false);
  protected readonly activeIndex = signal(-1);

  protected readonly filteredItems = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.items();
    const customFilter = this.filterFn();
    if (customFilter) return this.items().filter((item) => customFilter(item, q));
    return this.items().filter((item) =>
      this.displayFn()(item).toLowerCase().includes(q),
    );
  });

  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const sub = fromEvent(document, 'click').subscribe((event: Event) => {
      if (!this.elementRef.nativeElement.contains(event.target)) {
        this.isOpen.set(false);
      }
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  protected handleInput(value: string): void {
    this.query.set(value);
    this.isOpen.set(true);
    this.activeIndex.set(-1);
    this.queryChange.emit(value);
  }

  protected handleFocusin(): void {
    this.isOpen.set(this.items().length > 0);
  }

  protected selectItem(item: T): void {
    this.value.set(item);
    this.query.set(this.displayFn()(item));
    this.isOpen.set(false);
    this.activeIndex.set(-1);
  }

  protected handleKeydown(event: KeyboardEvent): void {
    const filtered = this.filteredItems();
    const relevantKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'];

    if (!relevantKeys.includes(event.key)) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.isOpen.set(true);
        }
        this.activeIndex.update((i) => (i < filtered.length - 1 ? i + 1 : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen()) {
          this.isOpen.set(true);
        }
        this.activeIndex.update((i) => (i > 0 ? i - 1 : filtered.length - 1));
        break;
      case 'Enter':
        event.preventDefault();
        if (this.activeIndex() >= 0 && this.activeIndex() < filtered.length) {
          this.selectItem(filtered[this.activeIndex()]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.isOpen.set(false);
        this.activeIndex.set(-1);
        break;
      case 'Tab':
        this.isOpen.set(false);
        this.activeIndex.set(-1);
        break;
    }
  }
}
