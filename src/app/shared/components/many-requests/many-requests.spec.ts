import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManyRequests } from './many-requests';

describe('ManyRequests', () => {
  let component: ManyRequests;
  let fixture: ComponentFixture<ManyRequests>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManyRequests]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManyRequests);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
