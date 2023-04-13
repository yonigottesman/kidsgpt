import asyncio

import google.cloud.texttospeech as tts


def list_voices(language_code=None):
    client = tts.TextToSpeechClient()
    response = client.list_voices(language_code=language_code)
    voices = sorted(response.voices, key=lambda voice: voice.name)

    print(f" Voices: {len(voices)} ".center(60, "-"))
    for voice in voices:
        languages = ", ".join(voice.language_codes)
        name = voice.name
        gender = tts.SsmlVoiceGender(voice.ssml_gender).name
        rate = voice.natural_sample_rate_hertz
        print(f"{languages:<8} | {name:<24} | {gender:<8} | {rate:,} Hz")


async def text_to_wav(voice_name: str, text: str):
    language_code = "-".join(voice_name.split("-")[:2])
    text_input = tts.SynthesisInput(text=text)
    voice_params = tts.VoiceSelectionParams(language_code=language_code, name=voice_name)
    audio_config = tts.AudioConfig(audio_encoding=tts.AudioEncoding.LINEAR16)

    client = tts.TextToSpeechAsyncClient()
    response = await client.synthesize_speech(
        input=text_input,
        voice=voice_params,
        audio_config=audio_config,
    )

    filename = f"{voice_name}.wav"
    with open(filename, "wb") as out:
        out.write(response.audio_content)
        print(f'Generated speech saved to "{filename}"')


# asyncio.run(
#     text_to_wav(
#         "en-US-Neural2-C",
#         "In this example, I'm using axios to make a POST request to the FastAPI endpoint with the audio file and text data. When the response is received, I'm extracting the response dictionary from the response headers using the x-response-dictionary key (which was added in the server-side code). I'm then creating an audio element and setting the WAV file as the source using a Blob object created from the response data. Finally, I'm playing the audio file.",
#     )
# )

# asyncio.run(
#     text_to_wav(
#         "he-IL-Standard-A",
#         """הצבע הכחול של השמיים נוצר עקב הפיזור של האור הטבעי מהשמש באטמוספירה שלנו. כאשר האור של השמש מתפזר באטמוספירה, חלק מהקרנים הכחולות נפזרות בצורה יותר אפקטיבית מאשר הקרנים האחרות, ולכן הצבע הכחול יותר בולט מבין כל הצבעים האחרים. ככל שהקרנים הלבנות של השמש עוברות באטמוספירה, הן מתפזרות בצורה יותר ויותר, ולכן הצבע של השמיים משתנה מכחול בהשקעה עמוקה בזמן הקרוב לזריחה ולשקיעה לצהוב או אדום.""",
#     )
# )


list_voices("ru")
