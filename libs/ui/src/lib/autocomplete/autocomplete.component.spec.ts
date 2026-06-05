import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LibAutocompleteComponent } from './autocomplete.component';

interface Hotel {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

@Component({
  imports: [LibAutocompleteComponent],
  template: `
    <lib-autocomplete
      [items]="hotels"
      [displayFn]="hotelDisplay"
      [(value)]="selected"
      placeholder="Search hotels"
      dataTestId="hotel-autocomplete"
    />

    <lib-autocomplete
      [items]="cities"
      placeholder="Search cities"
      dataTestId="city-autocomplete"
    >
      <ng-template #autocompleteItem let-item>
        <strong>{{ item }}</strong>
      </ng-template>
    </lib-autocomplete>
  `,
})
class HostComponent {
  hotels: Hotel[] = [
    { name: 'Ocean View', address: '123 Beach Rd', lat: 64.1, lng: -21.9 },
    { name: 'Mountain Lodge', address: '456 Highland Ave', lat: 64.2, lng: -21.8 },
    { name: 'City Inn', address: '789 Main St', lat: 64.15, lng: -21.95 },
  ];

  cities = ['Reykjavik', 'Akureyri', 'Vik'];

  selected: Hotel | null = null;

  hotelDisplay = (h: Hotel) => `${h.name}, ${h.address}`;
}

function getInput(fixture: ComponentFixture<unknown>, testId: string): HTMLInputElement {
  return fixture.debugElement.query(By.css(`[data-testid="${testId}"]`)).nativeElement;
}

function getHost(fixture: ComponentFixture<unknown>, testId: string): HTMLElement {
  const input = getInput(fixture, testId);
  return input.closest('lib-autocomplete') as HTMLElement;
}

describe('LibAutocompleteComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders input with placeholder', () => {
    const input = getInput(fixture, 'hotel-autocomplete');
    expect(input.placeholder).toBe('Search hotels');
  });

  it('opens dropdown on focusin', () => {
    const input = getInput(fixture, 'hotel-autocomplete');

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();

    const dropdown = document.querySelector('.lib-autocomplete__dropdown');
    expect(dropdown).not.toBeNull();
  });

  it('filters items as the user types', () => {
    const input = getInput(fixture, 'hotel-autocomplete');

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    input.value = 'Ocean';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const options = document.querySelectorAll('.lib-autocomplete__option');
    expect(options.length).toBe(1);
    expect(options[0].textContent?.trim()).toContain('Ocean View');
  });

  it('selects an item on click and updates the model', () => {
    const input = getInput(fixture, 'hotel-autocomplete');

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();

    const options = document.querySelectorAll('.lib-autocomplete__option');
    expect(options.length).toBeGreaterThan(0);

    (options[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selected).toEqual(fixture.componentInstance.hotels[0]);
    expect(input.value).toBe('Ocean View, 123 Beach Rd');
  });

  it('shows no results message when filter yields none', () => {
    const input = getInput(fixture, 'hotel-autocomplete');

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    input.value = 'zzzzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    const status = document.querySelector('.lib-autocomplete__status');
    expect(status?.textContent?.trim()).toBe('No results found');
  });

  it('renders custom item template', () => {
    const input = getInput(fixture, 'city-autocomplete');

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();

    const options = document.querySelectorAll('.lib-autocomplete__option');
    expect(options.length).toBe(3);
  });

  it('closes dropdown on Escape key', () => {
    const input = getInput(fixture, 'hotel-autocomplete');

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();

    expect(document.querySelector('.lib-autocomplete__dropdown')).not.toBeNull();

    const host = getHost(fixture, 'hotel-autocomplete');
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(document.querySelector('.lib-autocomplete__dropdown')).toBeNull();
  });
});
