import { apiRequest } from '../api';

export interface TranscriptionResult {
  text: string;
  confidence: number;
  model: string;
}

export class AudioVoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(): Promise<void> {
    this.audioChunks = [];
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser environment.');
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Choose optimal mimeType supported by browser
    let mimeType = 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      mimeType = 'audio/ogg';
    }

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // Slice chunks every 250ms
  }

  async stopAndTranscribe(): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active audio recording session'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
          
          // Stop media tracks
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }

          // Convert Blob to Base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64Data = reader.result as string;
              const res = await apiRequest('/api/generate/transcribe', {
                method: 'POST',
                body: JSON.stringify({
                  audio: base64Data,
                  mimeType: audioBlob.type,
                }),
              });

              resolve({
                text: res.text || '',
                confidence: res.confidence || 0.98,
                model: res.model || 'gemini-3.5-transcribe',
              });
            } catch (apiErr: any) {
              reject(apiErr);
            }
          };
          reader.onerror = (err) => reject(err);
        } catch (err: any) {
          reject(err);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}
