import base64
import io
import json
import os
import tempfile

import ffmpeg
import google.cloud.texttospeech as tts
import openai
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

OPENAI_AI_KEY = os.environ["OPENAI_KEY"]
CHATGPT_MODEL = "gpt-3.5-turbo"

STARTING_PROMPT = """
you are a teacher aimed to answer questions to a 6 year old kid. the kid has limited vocabulary,
so you should use simple words and short sentences. 
Also the kid does not have a good understanding of the world, science or math.
"""

VOICE_NAME = {
    "en": "en-US-Neural2-C",
    "he": "he-IL-Standard-A",
    "ru": "ru-RU-Standard-A",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO YONIGO change to specific origin?
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_text_from_audio(audio: UploadFile, language: str):
    if audio.content_type == "audio/webm;codecs=opus":
        data = await audio.read()
        f = io.BytesIO(data)
        f.name = "audio.webm"
        whisper_output = await openai.Audio.atranscribe("whisper-1", f, api_key=OPENAI_AI_KEY, language=language)
    else:
        with tempfile.TemporaryDirectory() as tmpdir:
            mp4_input = os.path.join(tmpdir, audio.filename)
            with open(mp4_input, "wb") as f:
                f.write(await audio.read())
            webm_output = os.path.join(tmpdir, "audio.webm")
            ffmpeg.input(mp4_input).output(
                webm_output,
                **{"lossless": 1, "vcodec": "libvpx-vp9", "acodec": "libopus", "crf": 30, "b:v": 0, "b:a": "192k"},
            ).run()

            with open(webm_output, "rb") as f:
                whisper_output = await openai.Audio.atranscribe(
                    "whisper-1", f, api_key=OPENAI_AI_KEY, language=language
                )

    print(f"whisper output: {whisper_output['text'][:100]}")
    return whisper_output


async def text_to_wav(text: str, language: str) -> str:
    language_code = "-".join(VOICE_NAME[language].split("-")[:2])
    text_input = tts.SynthesisInput(text=text)
    voice_params = tts.VoiceSelectionParams(language_code=language_code, name=VOICE_NAME[language])
    audio_config = tts.AudioConfig(audio_encoding=tts.AudioEncoding.LINEAR16)

    client = tts.TextToSpeechAsyncClient()
    response = await client.synthesize_speech(
        input=text_input,
        voice=voice_params,
        audio_config=audio_config,
    )
    return base64.b64encode(response.audio_content).decode("utf-8")


async def query_chatgpt(whisper_output, previous_responses):
    messages = [
        {"role": "system", "content": STARTING_PROMPT},
    ]
    for res in json.loads(previous_responses):
        messages.append({"role": "user", "content": res["question"]})
        messages.append({"role": "system", "content": res["answer"]})
    messages.append({"role": "user", "content": whisper_output["text"]})
    chatgpt_output = await openai.ChatCompletion.acreate(
        model=CHATGPT_MODEL,
        messages=messages,
        temperature=0,
        api_key=OPENAI_AI_KEY,
    )
    print(f"chatgpt output: {chatgpt_output['choices'][0]['message']['content'][:100]}")
    return chatgpt_output


@app.post("/ask")
async def ask(audio: UploadFile = File(...), previous_responses: str = Form(...), language: str = Form(...)):
    whisper_output = await get_text_from_audio(audio, language)
    # whisper_output = {"text": "why is the sky blue?"}
    chatgpt_output = await query_chatgpt(whisper_output, previous_responses)
    # chatgpt_output = {
    #     "choices": [{"message": {"content": "The sky is the big blue space above us where we see the sun"}}]
    # }

    audio_base64 = await text_to_wav(chatgpt_output["choices"][0]["message"]["content"], language)

    # audio_base64 = open("/tmp/yoni.csv", "r").read()
    response_dict = {
        "question": whisper_output["text"],
        "answer": chatgpt_output["choices"][0]["message"]["content"],
        "audio_base64": audio_base64,
    }

    return response_dict


@app.get("/")
async def index():
    return {"Hello": "World"}
