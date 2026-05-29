import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LibButtonDirective } from './button.directive';

@Component({
  imports: [LibButtonDirective],
  template: `
    <button id="primary" libButton="primary">Primary</button>
    <button id="secondary" libButton="secondary" [libButtonBlock]="false">Secondary</button>
    <button id="text" libButton="text">Text</button>
  `,
})
class HostComponent {}

describe('LibButtonDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('applies primary button defaults', () => {
    const button: HTMLButtonElement = fixture.debugElement.query(By.css('#primary')).nativeElement;

    expect(button.style.width).toBe('100%');
    expect(button.style.minHeight).toBe('56px');
    expect(button.style.background).toContain('var(--lib-button-primary-bg');
  });

  it('supports secondary inline sizing', () => {
    const button: HTMLButtonElement = fixture.debugElement.query(By.css('#secondary')).nativeElement;

    expect(button.style.width).toBe('');
    expect(button.style.border).toContain('var(--lib-button-secondary-border');
    expect(button.style.color).toContain('var(--lib-button-secondary-color');
  });

  it('uses the compact text treatment', () => {
    const button: HTMLButtonElement = fixture.debugElement.query(By.css('#text')).nativeElement;

    expect(button.style.minHeight).toBe('40px');
    expect(button.style.fontWeight).toBe('700');
    expect(button.style.background).toBe('transparent');
  });
});