import type { Category } from './wardrobe'

export interface PosePoint {
  x: number
  y: number
  visibility?: number
}

export interface FitAdjustments {
  x: number
  y: number
  scale: number
  rotation: number
  opacity: number
}

export async function createPoseLandmarker(runningMode: 'IMAGE' | 'VIDEO') {
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm',
  )
  const modelAssetPath =
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath, delegate: 'GPU' },
      runningMode,
      numPoses: 1,
    })
  } catch (gpuError) {
    const message = gpuError instanceof Error ? gpuError.message : String(gpuError)
    if (!/gpu|webgl|gl context|delegate/i.test(message)) throw gpuError
    try {
      return await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath, delegate: 'CPU' },
        runningMode,
        numPoses: 1,
      })
    } catch (cpuError) {
      const cpuMessage = cpuError instanceof Error ? cpuError.message : String(cpuError)
      throw new Error(`Pose detection could not start on GPU (${message}) or CPU (${cpuMessage}).`, {
        cause: cpuError,
      })
    }
  }
}

export function drawGarment(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  landmarks: PosePoint[] | null,
  category: Category,
  adjustments: FitAdjustments,
  canvasWidth: number,
  canvasHeight: number,
): void {
  const point = (index: number) => landmarks?.[index]
  const visible = (index: number) => {
    const candidate = point(index)
    return candidate && (candidate.visibility === undefined || candidate.visibility > 0.3)
      ? candidate
      : null
  }
  const leftShoulder = visible(11)
  const rightShoulder = visible(12)
  const leftHip = visible(23)
  const rightHip = visible(24)
  const isLowerBody = category === 'Trousers' || category === 'Skirts'
  const isDress = category === 'Dresses'
  const shoulderSpan =
    leftShoulder && rightShoulder
      ? Math.hypot(
          (rightShoulder.x - leftShoulder.x) * canvasWidth,
          (rightShoulder.y - leftShoulder.y) * canvasHeight,
        )
      : canvasWidth * 0.24
  const hipMid = leftHip && rightHip
    ? { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 }
    : null
  const shoulderMid = leftShoulder && rightShoulder
    ? { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 }
    : null
  const angle =
    leftShoulder && rightShoulder
      ? Math.atan2(
          (rightShoulder.y - leftShoulder.y) * canvasHeight,
          (rightShoulder.x - leftShoulder.x) * canvasWidth,
        )
      : 0

  let centerX: number
  let centerY: number
  let width: number
  let height: number
  let garmentAngle = angle

  if (isLowerBody && hipMid) {
    const leftKnee = visible(25)
    const rightKnee = visible(26)
    const kneeY = leftKnee && rightKnee
      ? ((leftKnee.y + rightKnee.y) / 2) * canvasHeight
      : hipMid.y * canvasHeight + canvasHeight * 0.25
    centerX = hipMid.x * canvasWidth
    centerY = (hipMid.y * canvasHeight + kneeY) / 2
    width = Math.max(shoulderSpan * 0.9, canvasWidth * 0.2)
    height = Math.max(kneeY - hipMid.y * canvasHeight, width / (image.naturalWidth / image.naturalHeight))
    garmentAngle = 0
  } else if (isDress && shoulderMid && hipMid) {
    const lowerY = Math.max(hipMid.y, 0.58) * canvasHeight + canvasHeight * 0.2
    centerX = (shoulderMid.x + hipMid.x) * canvasWidth / 2
    centerY = (shoulderMid.y * canvasHeight + lowerY) / 2
    width = shoulderSpan * 1.65
    height = Math.max(lowerY - shoulderMid.y * canvasHeight, width / (image.naturalWidth / image.naturalHeight))
  } else if (shoulderMid) {
    const torsoLength = hipMid
      ? (hipMid.y - shoulderMid.y) * canvasHeight
      : canvasHeight * 0.28
    width = shoulderSpan * 1.8
    height = width / (image.naturalWidth / image.naturalHeight)
    height = Math.min(height, Math.max(torsoLength * 1.2, width * 0.7))
    centerX = shoulderMid.x * canvasWidth
    centerY = shoulderMid.y * canvasHeight + torsoLength * 0.42
  } else {
    width = canvasWidth * 0.38
    height = width / (image.naturalWidth / image.naturalHeight)
    centerX = canvasWidth * 0.5
    centerY = canvasHeight * 0.42
    garmentAngle = 0
  }

  width *= adjustments.scale
  height *= adjustments.scale
  centerX += adjustments.x * Math.max(shoulderSpan, canvasWidth * 0.2)
  centerY += adjustments.y * Math.max(shoulderSpan, canvasWidth * 0.2)
  garmentAngle += adjustments.rotation * (Math.PI / 180)

  context.save()
  context.globalAlpha = adjustments.opacity
  context.translate(centerX, centerY)
  context.rotate(garmentAngle)
  context.drawImage(image, -width / 2, -height / 2, width, height)
  context.restore()
}
