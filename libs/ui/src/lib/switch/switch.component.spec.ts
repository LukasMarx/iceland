import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LibSwitchComponent, LibSwitchValue } from './switch.component';

@Component({
  imports: [LibSwitchComponent],
  template: `
    <lib-switch [(value)]="value" [disabled]="disabled">
      <span libSwitchLeft>I know my dates</span>
      <span libSwitchRight>I'm flexible</span>
    </lib-switch>
  `,
})
class HostComponent {
  value: LibSwitchValue = 'left';
  disabled = false;
}

describe('LibSwitchComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders projected labels and the default selection', () => {
    const root: HTMLElement = fixture.debugElement.query(By.css('[data-testid="lib-switch"]')).nativeElement;
    const leftButton: HTMLButtonElement = fixture.debugElement.query(By.css('[data-testid="lib-switch-left"]')).nativeElement;
    const rightButton: HTMLButtonElement = fixture.debugElement.query(By.css('[data-testid="lib-switch-right"]')).nativeElement;

    expect(root.getAttribute('data-selected')).toBe('left');
    expect(leftButton.textContent?.trim()).toBe('I know my dates');
    expect(rightButton.textContent?.trim()).toBe("I'm flexible");
    expect(leftButton.getAttribute('aria-pressed')).toBe('true');
    expect(rightButton.getAttribute('aria-pressed')).toBe('false');
  });

  it('updates the selected side when the other option is clicked', () => {
    const rightButton: HTMLButtonElement = fixture.debugElement.query(By.css('[data-testid="lib-switch-right"]')).nativeElement;

    rightButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value).toBe('right');
    expect(rightButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('does not emit changes while disabled', () => {
    const disabledFixture = TestBed.createComponent(LibSwitchComponent);

    disabledFixture.componentRef.setInput('disabled', true);
    disabledFixture.detectChanges();

    const leftButton: HTMLButtonElement = disabledFixture.debugElement.query(By.css('[data-testid="lib-switch-left"]')).nativeElement;
    const rightButton: HTMLButtonElement = disabledFixture.debugElement.query(By.css('[data-testid="lib-switch-right"]')).nativeElement;

    rightButton.click();
    disabledFixture.detectChanges();

    expect(disabledFixture.componentInstance.value()).toBe('left');
    expect(leftButton.disabled).toBe(true);
    expect(rightButton.disabled).toBe(true);
  });
});