# Medical recording transcription

Jahshan, Benchmark and imported English listening recordings use the same local
MLX Whisper medical profile. No hosted recognition service or API key is used.
The model is multilingual; the prompt accepts British, Australian and American
English, with both regional spellings in the vocabulary.

The profile provides a compact clinical vocabulary and prioritises terms present
in the exact recording's matched question-side fields. It never reads printed
answer keys for prompting. Whisper keeps its native window boundaries and emits
word alignment/confidence. The app shows **Check wording** on uncertain medical
words, numbers and negation, or likely medical spelling confusions. This is a
replay cue, not calibrated confidence or an exam mark. No spelling, medicine,
dose, unit or positive/negative finding is replaced by a text correction rule.

The speech weights are also available in the permanent internal transcription
directory (`local-ai/transcription/local-models/whisper-large-v3-turbo`). The
verified download is pinned to model revision
`a4aaeec0636e6fef84abdcbe3544cb2bf7e9f6fb`, SHA-256
`951ed3fc1203e6a62467abb2144a96ce7eafca8fa77e3704fdb8635ff3e7f8a6`.
Existing model files and the external library are preserved.

The normal library sync upgrades older automatic transcripts in batches of ten,
after new recordings. It preserves completed work on failure and does not
automatically overwrite recordings with hand-checked repairs. Collection copies
are refreshed only when their original recording SHA-256 is identical. The
`--refresh-sha` option permits a bounded exact-source refresh; collection-specific
scripts also support explicit refreshes. Only transcripts actually regenerated
receive the new recognition-profile stamp.

Validation used real human recordings with offline model loading: a 65-second
Benchmark cardiology excerpt and two complete Jahshan tracks (71.24 and 71.64
seconds). The medication track recognises *fluoxetine*, where its prior saved
transcript said *floxetine*. This limited check does not establish an overall
medical word-error rate. Other existing recordings remain queued for normal
resumable refreshes. An experimental manual-window approach lost speech and was
rejected before publication.

# Website packaging

The full web build and Mac app retain every original asset. Only the GitHub
Pages artifact omits the declared large audio/image files; the website requests
the identical public repository originals pinned to its source commit. The
artifact preparation verifies source membership and hashes, emits an auditable
`repository-assets.json`, and enforces a 950 MB budget. PDFs and question data
remain on Pages. Saved browser recordings keep their original cache identity
across source commits, and the service worker can serve their byte ranges after
the online URL moves. The Mac continues to use local files without a source
drive or network connection.
