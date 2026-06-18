import { db } from '../database/dexie'
import type { VoiceInputStatus } from '../database/models'

const SPEECH_LANGUAGE = 'vi-VN'

type SpeechRecognitionAlternativeLike = {
  confidence: number
  transcript: string
}

type SpeechRecognitionResultLike = {
  0?: SpeechRecognitionAlternativeLike
  isFinal: boolean
}

type SpeechRecognitionResultListLike = {
  [index: number]: SpeechRecognitionResultLike
  length: number
}

type SpeechRecognitionEventLike = Event & {
  resultIndex?: number
  results: SpeechRecognitionResultListLike
}

type SpeechRecognitionErrorEventLike = Event & {
  error: string
}

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }

type SpeechRecognitionResult = {
  confidence: number | null
  transcript: string
}

type SpeechTranscriptUpdate = SpeechRecognitionResult & {
  isFinal: boolean
}

function getSpeechRecognitionConstructor() {
  const speechWindow = window as SpeechRecognitionWindow

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
}

async function requestMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt này chưa hỗ trợ micro.')
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  stream.getTracks().forEach((track) => track.stop())
}

export function isVietnameseSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor())
}

export async function listenVietnameseCategoryName({
  onTranscript,
}: {
  onTranscript?: (update: SpeechTranscriptUpdate) => void
} = {}): Promise<SpeechRecognitionResult> {
  await requestMicrophonePermission()

  const RecognitionConstructor = getSpeechRecognitionConstructor()

  if (!RecognitionConstructor) {
    throw new Error('Trình duyệt này chưa hỗ trợ nhận diện giọng nói.')
  }

  return new Promise((resolve, reject) => {
    const recognition = new RecognitionConstructor()
    let finalTranscript = ''
    let hasResult = false
    let isSettled = false

    recognition.lang = SPEECH_LANGUAGE
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interimTranscript = ''
      let latestConfidence: number | null = null
      const startIndex = event.resultIndex ?? 0

      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const alternative = result?.[0]
        const transcript = alternative?.transcript.trim() ?? ''

        if (!transcript) {
          continue
        }

        latestConfidence = alternative?.confidence ?? null

        if (result.isFinal) {
          finalTranscript = `${finalTranscript} ${transcript}`.trim()
        } else {
          interimTranscript = `${interimTranscript} ${transcript}`.trim()
        }
      }

      const currentTranscript = (finalTranscript || interimTranscript).trim()

      if (!currentTranscript) {
        return
      }

      onTranscript?.({
        confidence: latestConfidence,
        isFinal: Boolean(finalTranscript),
        transcript: currentTranscript,
      })

      if (finalTranscript && !isSettled) {
        hasResult = true
        isSettled = true
        recognition.stop()
        resolve({
          confidence: latestConfidence,
          transcript: finalTranscript,
        })
      }
    }

    recognition.onerror = (event) => {
      if (!isSettled) {
        isSettled = true
        reject(new Error(`Không thể nhận diện giọng nói: ${event.error}.`))
      }
    }

    recognition.onend = () => {
      if (!hasResult && !isSettled) {
        isSettled = true
        reject(new Error('Chưa nhận diện được nội dung giọng nói.'))
      }
    }

    recognition.start()
  })
}

export async function logCategoryVoiceInput({
  confidence = null,
  errorMessage = null,
  status,
  transcript,
  transactionId = null,
}: {
  confidence?: number | null
  errorMessage?: string | null
  status: VoiceInputStatus
  transcript: string
  transactionId?: number | null
}) {
  return db.voice_inputs.add({
    confidence,
    createdAt: new Date().toISOString(),
    errorMessage,
    fieldName: 'categoryName',
    language: SPEECH_LANGUAGE,
    status,
    transactionId,
    transcript,
  })
}
