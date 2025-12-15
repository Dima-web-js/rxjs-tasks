import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Clicks } from './clicks';

describe('Clicks', () => {
  let component: Clicks;
  let fixture: ComponentFixture<Clicks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clicks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Clicks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
