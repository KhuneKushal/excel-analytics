import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-drill-down-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogContent,
    MatDialogActions
  ],
  templateUrl: './drill-down-modal.component.html',
  styleUrls: ['./drill-down-modal.component.scss']
})
export class DrillDownModalComponent {
  displayedColumns: string[] = [];
  dataSource: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<DrillDownModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { filteredData: any[], clickedLabel: string, clickedValue: any }
  ) {
    this.dataSource = data.filteredData;
    if (this.dataSource.length > 0) {
      this.displayedColumns = Object.keys(this.dataSource[0]);
    }
  }

  // Closes the dialog.
  onClose(): void {
    this.dialogRef.close();
  }
}