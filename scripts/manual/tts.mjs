// Text-to-speech for the video manual. Providers:
//   edge        (default) Microsoft Edge read-aloud voices — free, no key, Thai voices. Unofficial endpoint: may break.
//   elevenlabs  used automatically when ELEVENLABS_API_KEY is set (paid, higher quality).
//   none        no narration (subtitles only).
// Override with MANUAL_TTS=edge|elevenlabs|none.
import { execFileSync } from 'node:child_process'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

export const provider = process.env.MANUAL_TTS || (process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'edge')

const edge = async (text, file) => {
  const tts = new MsEdgeTTS()

  try {
    await tts.setMetadata(process.env.MANUAL_TTS_VOICE || 'th-TH-PremwadeeNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const dir = `${file}.d`

    await mkdir(dir, { recursive: true })
    const { audioFilePath } = await tts.toFile(dir, text)

    await rename(audioFilePath, file)
  } finally {
    tts.close()
  }
}

const elevenlabs = async (text, file) => {
  // Default voice works with the multilingual model (Thai); pick another with ELEVENLABS_VOICE_ID.
  const voice = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY ?? '', 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2' })
  })

  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`)
  await writeFile(file, Buffer.from(await res.arrayBuffer()))
}

export const duration = file =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString())

/** Speak `text` into `file` (mp3). Returns its length in seconds, or 0 when narration is off. */
export const speak = async (text, file) => {
  if (provider === 'none') return 0
  await mkdir(path.dirname(file), { recursive: true })
  if (provider === 'elevenlabs') await elevenlabs(text, file)
  else if (provider === 'edge') await edge(text, file)
  else throw new Error(`unknown MANUAL_TTS provider: ${provider}`)

  return duration(file)
}
