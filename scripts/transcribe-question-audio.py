import json
import subprocess
import sys

import numpy as np
from transformers import pipeline


def decode_audio(path):
    pcm = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', path,
        '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', '1', '-ar', '16000', '-',
    ])
    return np.frombuffer(pcm, dtype=np.float32)


asr = pipeline('automatic-speech-recognition', model='openai/whisper-tiny.en', device='cpu')
transcriptions = {}

for audio_path in sys.argv[1:]:
    result = asr(
        {'array': decode_audio(audio_path), 'sampling_rate': 16000},
        return_timestamps=True,
    )
    transcriptions[audio_path] = result['text'].strip()

print(json.dumps(transcriptions))
