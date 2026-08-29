/**
 * Proctoring Computer Vision & Identity Verification Engine
 * 
 * Model 1: Presence & Object Detection (no_face, multi_face, device_detected, abnormal_motion)
 * Model 2: Identity Match (Face Landmark / Descriptor Cosine Similarity verification)
 */

export interface ProctorFlagEvent {
  type: 'no_face' | 'multi_face' | 'device_detected' | 'identity_mismatch' | 'gaze_diverted';
  confidence: number;
  timestamp: Date;
  details: string;
}

export interface FaceVerificationResult {
  match: boolean;
  similarity: number; // 0 to 1
  flag?: ProctorFlagEvent;
}

export class ProctoringEngine {
  /**
   * Cosine similarity between two 128-d or 512-d facial embedding vectors (InsightFace / dlib standard)
   */
  public static calculateFaceSimilarity(enrolled: number[], current: number[]): number {
    if (!enrolled || !current || enrolled.length === 0 || current.length === 0) return 0;
    const len = Math.min(enrolled.length, current.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += enrolled[i] * current[i];
      normA += enrolled[i] * enrolled[i];
      normB += current[i] * current[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Process a proctoring frame metadata and detect presence / anomalies
   */
  public static analyzeFrame(
    faceCount: number,
    detectedObjects: string[],
    currentFaceDescriptor?: number[],
    enrolledFaceDescriptor?: number[],
    headPoseAngles?: { pitch: number; yaw: number; roll: number }
  ): { flags: ProctorFlagEvent[]; identitySimilarity: number } {
    const flags: ProctorFlagEvent[] = [];
    let identitySimilarity = 1.0;

    const now = new Date();

    // 1. Presence Detection
    if (faceCount === 0) {
      flags.push({
        type: 'no_face',
        confidence: 0.96,
        timestamp: now,
        details: 'Learner presence lost: No face detected in frame camera field.',
      });
    } else if (faceCount > 1) {
      flags.push({
        type: 'multi_face',
        confidence: 0.94,
        timestamp: now,
        details: `Multiple faces (${faceCount}) detected in candidate proctoring zone.`,
      });
    }

    // 2. Device / Secondary Object Detection (YOLO object class detection)
    const cheatDevices = ['cell phone', 'smartphone', 'tablet', 'laptop', 'book', 'notes', 'earphone'];
    const foundDevices = detectedObjects.filter((obj) => cheatDevices.includes(obj.toLowerCase()));
    if (foundDevices.length > 0) {
      flags.push({
        type: 'device_detected',
        confidence: 0.89,
        timestamp: now,
        details: `Unauthorized device detected in view: ${foundDevices.join(', ')}`,
      });
    }

    // 3. Gaze & Head Pose Deviation
    if (headPoseAngles) {
      const { yaw, pitch } = headPoseAngles;
      if (Math.abs(yaw) > 32 || Math.abs(pitch) > 28) {
        flags.push({
          type: 'gaze_diverted',
          confidence: 0.82,
          timestamp: now,
          details: `Significant head/gaze deviation (Yaw: ${yaw.toFixed(1)}°, Pitch: ${pitch.toFixed(1)}°)`,
        });
      }
    }

    // 4. Identity Match against Enrolled Facial Vector
    if (enrolledFaceDescriptor && enrolledFaceDescriptor.length > 0 && currentFaceDescriptor && currentFaceDescriptor.length > 0) {
      identitySimilarity = this.calculateFaceSimilarity(enrolledFaceDescriptor, currentFaceDescriptor);
      // Cosine similarity threshold for identity match is typically 0.68 - 0.75
      if (identitySimilarity < 0.65 && faceCount > 0) {
        flags.push({
          type: 'identity_mismatch',
          confidence: Number((1 - identitySimilarity).toFixed(2)),
          timestamp: now,
          details: `Candidate identity verification failed (Face similarity: ${(identitySimilarity * 100).toFixed(1)}% < 65.0% threshold).`,
        });
      }
    }

    return {
      flags,
      identitySimilarity: Number(identitySimilarity.toFixed(3)),
    };
  }
}
