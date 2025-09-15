import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { UploadExcelComponent } from './upload-excel.component';
import { DashboardService } from '../services/dashboard.service';

describe('UploadExcelComponent', () => {
  let component: UploadExcelComponent;
  let fixture: ComponentFixture<UploadExcelComponent>;
  let dashboardService: DashboardService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ 
        UploadExcelComponent,
        NoopAnimationsModule,
        MatSnackBarModule
      ],
      providers: [ DashboardService ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadExcelComponent);
    component = fixture.componentInstance;
    dashboardService = TestBed.inject(DashboardService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept .xlsx and .csv files', () => {
    spyOn(component, 'parseFile');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([''], 'test.xlsx'));
    const input = fixture.nativeElement.querySelector('input[type=file]');
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.parseFile).toHaveBeenCalled();
  });

  it('should call the parseFile method when a file is selected', () => {
    spyOn(component, 'parseFile');
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([''], 'test.xlsx'));
    const input = fixture.nativeElement.querySelector('input[type=file]');
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.parseFile).toHaveBeenCalled();
  });

  it('should call DashboardService.setData on successful parse', () => {
    spyOn(dashboardService, 'setData');
    const sampleData = [
      ['Name', 'Age', 'City'],
      ['John Doe', 30, 'New York']
    ];
    component.processParsedData(sampleData);
    expect(dashboardService.setData).toHaveBeenCalled();
  });
});
