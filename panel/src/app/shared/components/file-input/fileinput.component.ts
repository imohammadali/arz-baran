import { FileUpload, FileUploadModule } from 'primeng/fileupload'
import { AfterViewInit, Component, EventEmitter, Injector, Input, Output, ViewChild } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'
import { Utility } from '@shared/services/utility'
import { BehaviorSubject, forkJoin } from 'rxjs'
import { DrawerComponent } from '../drawer/drawer.component'
import { selectSettingsLanguage } from '@core/settings/settings.selectors'
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe'
import { AsyncPipe } from '@angular/common'
import { ButtonModule } from 'primeng/button'

@Component({
  selector: 'app-file-input',
  standalone: true,
  imports: [ButtonModule, TranslateModule, FileUploadModule, DrawerComponent, PersianDatePipe, AsyncPipe],
  templateUrl: './fileinput.component.html'
})
export class FileInputComponent extends Utility implements AfterViewInit {
  @Input() uploadFileUrl: string
  @Input() multiple: boolean = true
  @Input() defaultFiles: BehaviorSubject<any[]>

  @Output() patchForm = new EventEmitter<any[] | null>()

  @ViewChild('fileInput') fileInput!: FileUpload
  files = []
  showPreview = false
  selectedFile = null
  totalSize: number = 0

  totalSizePercent: number = 0
  selectedFileUrls = []
  uploadFileResetStat
  uploadFileRemaining
  currentLanguage$ = this.appStore.select(selectSettingsLanguage)

  constructor(injector: Injector) {
    super(injector)
  }

  ngAfterViewInit(): void {
    if (this.defaultFiles) {
      this.defaultFiles.subscribe(res => {
        if (res.length) {
          this.fileInput._files = res.map(item => ({ ...new File([new Blob()], item), objectURL: item }))
          this.fileInput.cd.detectChanges()
          this.cd.detectChanges()
        }
      })
    }
  }

  choose(event, callback) {
    callback()
  }

  onRemoveTemplatingFile(event, file, removeFileCallback, index) {
    removeFileCallback(event, index)
    this.uploadedFileKeys.delete(this.getFileKey(file))
    this.selectedFileUrls = this.selectedFileUrls.filter(item => item.objectURL !== file.objectURL)
    this.patchForm.emit(this.selectedFileUrls)
    this.uploadFileRemaining = null
    this.uploadFileResetStat = null
  }

  onClearTemplatingUpload(clear) {
    clear()
    this.totalSize = 0
    this.totalSizePercent = 0
  }

  onTemplatedUpload() {}
  uploadedFileKeys = new Set<string>()
  onSelectedFiles(event) {
    this.files = event.currentFiles
    const filesToUpload = event.currentFiles.filter(file => {
      const key = this.getFileKey(file)

      if (this.uploadedFileKeys.has(key)) {
        return false
      }

      this.uploadedFileKeys.add(key)
      return true
    })
    const requests = filesToUpload.map(file => {
      const formData = new FormData()
      formData.append('file', file)
      return this.api.set(this.uploadFileUrl, 'POST', { body: formData, observe: 'response' })
    })
    forkJoin(requests).subscribe((responses: any) => {
      responses.forEach((response, index) => {
        const file = filesToUpload[index]

        this.uploadFileRemaining = response?.headers?.get('uploadlimit-remaining')
        this.uploadFileResetStat = response?.headers?.get('uploadlimit-resetat')

        this.notify.success({
          title: 'forms.upload',
          message: response?.body?.message
        })

        const uploadedFile = {
          url: response?.body?.url,
          objectURL: file.objectURL
        }

        if (this.multiple) {
          this.selectedFileUrls.push(uploadedFile)
        } else {
          this.selectedFileUrls = [uploadedFile]
        }
      })

      this.patchForm.emit(this.selectedFileUrls)
    })
  }

  uploadEvent(callback) {
    callback()
  }

  previewFile(file: any) {
    this.selectedFile = file
    this.showPreview = true
  }

  showFileInfo(file: any) {
    alert(`File Name: ${file.name}\nSize: ${this.formatFileSize(file.size)}\nType: ${file.type}`)
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  private getFileKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`
  }
}
