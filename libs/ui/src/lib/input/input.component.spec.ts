import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LibInputComponent } from './input.component';

@Component({
  imports: [LibInputComponent],
  template: `
    <lib-input [(value)]="email" placeholder="Email" dataTestId="email-input">
      <span libInputPrefix>@</span>
    </lib-input>

    <lib-input
      [(value)]="password"
      type="password"
      placeholder="Password"
      autocomplete="current-password"
      [showPasswordToggle]="true"
      dataTestId="password-input"
      toggleTestId="password-toggle"
    >
      <span libInputPrefix>key</span>
    </lib-input>
  `,
})
class HostComponent {
  email = 'traveller@example.com';
  password = 's3cr3t';
}

describe('LibInputComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders projected prefix content and the bound value', () => {
    const field: HTMLElement = fixture.debugElement.query(By.css('[data-testid="email-input"]')).nativeElement;
    const prefix = field.closest('.lib-input')?.querySelector('.lib-input__prefix');

    expect((field as HTMLInputElement).value).toBe('traveller@example.com');
    expect(prefix?.textContent?.trim()).toBe('@');
  });

  it('updates the bound model when the user types', () => {
    const field: HTMLInputElement = fixture.debugElement.query(By.css('[data-testid="email-input"]')).nativeElement;

    field.value = 'guide@islandhub.app';
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(fixture.componentInstance.email).toBe('guide@islandhub.app');
  });

  it('toggles password visibility without dropping password styling', () => {
    const passwordField: HTMLInputElement = fixture.debugElement.query(By.css('[data-testid="password-input"]')).nativeElement;
    const toggle: HTMLButtonElement = fixture.debugElement.query(By.css('[data-testid="password-toggle"]')).nativeElement;
    const root = passwordField.closest('.lib-input');

    expect(passwordField.type).toBe('password');
    expect(root?.classList.contains('lib-input--password')).toBe(true);

    toggle.click();
    fixture.detectChanges();

    expect(passwordField.type).toBe('text');
    expect(toggle.textContent?.trim()).toBe('HIDE');
    expect(root?.classList.contains('lib-input--password')).toBe(true);
  });
});