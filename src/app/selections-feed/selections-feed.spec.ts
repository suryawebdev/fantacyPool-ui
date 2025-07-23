import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectionsFeed } from './selections-feed';

describe('SelectionsFeed', () => {
  let component: SelectionsFeed;
  let fixture: ComponentFixture<SelectionsFeed>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectionsFeed]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectionsFeed);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
