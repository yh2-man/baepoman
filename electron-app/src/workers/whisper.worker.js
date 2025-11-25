import { pipeline, env } from '@xenova/transformers';

// Skip local model checks to avoid 404s (returning HTML) from Vite dev server
env.allowLocalModels = false;
env.useBrowserCache = false; // Optional: force fresh fetch if cache is corrupted

// Define model to use. 'Xenova/whisper-tiny' is very fast and small (~40MB).
// 'Xenova/whisper-base' is better accuracy (~150MB).
// Let's start with 'Xenova/whisper-base' for Korean.
const MODEL_NAME = 'Xenova/whisper-base';

let transcriber = null;

self.onmessage = async (event) => {
    const message = event.data;

    if (message.type === 'load') {
        try {
            self.postMessage({ status: 'loading', data: 'Loading model...' });

            // Initialize the pipeline
            transcriber = await pipeline('automatic-speech-recognition', MODEL_NAME, {
                progress_callback: (data) => {
                    // data has { status, file, name, progress, loaded, total }
                    if (data.status === 'progress') {
                        self.postMessage({
                            status: 'downloading',
                            progress: data.progress,
                            file: data.file
                        });
                    }
                }
            });

            self.postMessage({ status: 'ready' });
        } catch (error) {
            self.postMessage({ status: 'error', data: error.message });
        }
    } else if (message.type === 'transcribe') {
        if (!transcriber) return;

        try {
            const audio = message.audio; // Float32Array

            // Run inference
            // language: 'ko' forces Korean. task: 'transcribe'.
            const output = await transcriber(audio, {
                language: 'ko',
                task: 'transcribe',
                chunk_length_s: 30,
                stride_length_s: 5,
            });

            self.postMessage({
                status: 'result',
                text: output.text
            });
        } catch (error) {
            console.error('Transcription error', error);
        }
    }
};
