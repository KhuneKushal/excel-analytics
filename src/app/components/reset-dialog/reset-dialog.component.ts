
import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-reset-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './reset-dialog.component.html',
  styleUrls: ['./reset-dialog.component.scss']
})
export class ResetDialogComponent {
  constructor(public dialogRef: MatDialogRef<ResetDialogComponent>) { }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}
