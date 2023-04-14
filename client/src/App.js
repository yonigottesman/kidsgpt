import './App.css';

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { MoonLoader } from 'react-spinners';
import { css } from '@emotion/react';
import ReactGA from "react-ga4";

ReactGA.initialize("G-V444GYWSE1");

function ResponseBox({ question, answer, audio_base64 }) {
  const style = {
    backgroundColor: '#F0F8FF',
    padding: '1em',
    borderRadius: '0.5em',
    marginBottom: '1em',
    width: '70%',
    textAlign: 'center',
    maxWidth: '100em', // Set a max width to limit the size of the box
  };
  const handlePlayAudio = () => {

    const audioData = atob(audio_base64);
    const audioArrayBuffer = new ArrayBuffer(audioData.length);
    const audioArray = new Uint8Array(audioArrayBuffer);
    for (let i = 0; i < audioData.length; i++) {
      audioArray[i] = audioData.charCodeAt(i);
    }
    // create a new blob from the audio data
    const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/wav' });
    // create a new URL for the audio blob
    const audioUrl = URL.createObjectURL(audioBlob);
    // create a new audio object and set its source to the audio URL
    const audio = new Audio(audioUrl);
    // play the audio immediately
    audio.volume = 1.0;
    audio.play();
  };
  return (
    <div style={style}>
      <p style={{ fontWeight: 'bold' }}>{question}</p>
      <p>{answer}</p>
      {audio_base64 && (
        <button onClick={handlePlayAudio}>Play Audio</button>
      )}
    </div>
  );
}

function App() {
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const startTimeRef = useRef(null);
  // const apiUrl = `${process.env.REACT_APP_BACKEND_IP}/ask`;
  // const apiUrl = "http://127.0.0.1:8000/ask"

  const apiUrl = "https://api-dot-personal-ai-264306.oa.r.appspot.com/ask" //TODO YONIGO: pass through env variable


  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
  };

  const startRecording = () => {
    console.log("start recording")
    startTimeRef.current = Date.now();
    try {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
        let mediaRecorder;
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/mp4;codecs:opus' });
          console.log("mp4");
        }
        catch (err1) {
          console.log("failed to create mp4. trying webm");
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
          console.log("webm");
        }
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorderRef.current.addEventListener('dataavailable', onRecordingReady);
        mediaRecorderRef.current.start();
      });
    } catch (err1) {
      console.log(err1)
    }
  };

  const stopRecording = () => {
    console.log("stop recording")
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const onRecordingReady = (e) => {
    const duration = Date.now() - startTimeRef.current;
    if (duration < 1000) {
      console.log(`Recording duration ${duration}ms is less than 2 seconds, not sending recording.`);
      return;
    }

    const formData = new FormData();

    const audioData = new Blob([e.data], { type: mediaRecorderRef.current.mimeType });
    const fileExtension = mediaRecorderRef.current.mimeType.includes('webm') ? 'webm' : 'mp4';
    formData.append('audio', audioData, `audio.${fileExtension}`);

    const strippedResponses = responses.map(({ question, answer, audio }) => ({ question, answer }));
    formData.append('previous_responses', JSON.stringify(strippedResponses));

    formData.append('language', selectedLanguage);
    setIsLoading(true);
    axios.post(apiUrl, formData)
      .then((response) => {
        const newResponseData = response.data;
        setResponses([newResponseData]); // keep only 1 response, change this if you want more context
        setIsLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setIsLoading(false);
      });
  };


  const handlePointerDown = (event) => {
    console.log("pointer down")
    startRecording();
  };

  const handlePointerUp = (event) => {
    console.log("pointer up")
    stopRecording();
  };
  const handlePointerCancel = (event) => {
    console.log("cancel")
  };

  const override = css`
    display: block;
    margin: 0 auto;
    border-color: red;
  `;

  return (

    <div className="app-container">

      <div className="language-dropdown">
        <label htmlFor="language-select"></label>
        <select id="language-select" value={selectedLanguage} onChange={handleLanguageChange}>
          <option value="en">English</option>
          <option value="he">Hebrew</option>
          <option value="ru">Russian</option>
        </select>
      </div>
      <header className="app-header">KidsGPT</header>
      <br />

      <div className="content-container">

        {responses.map((response, index) => (
          <ResponseBox key={index} question={response.question} answer={response.answer} audio_base64={response.audio_base64} />
        ))}

        <button className="record-button" onContextMenu={(e) => e.preventDefault()}
          onTouchCancel={handlePointerCancel} onTouchStart={handlePointerDown} onTouchEnd={handlePointerUp}
          onMouseDown={handlePointerDown} onMouseUp={handlePointerUp}>
        </button>
        <br />
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <MoonLoader color={'#FF5252'} loading={true} css={override} size={20} />
          </div>
        )}

        <div className="footer">
          <a href="https://github.com/yonigottesman/kidsgpt" target="_blank" rel="noreferrer">Code</a> {" | "}
          Made for my kids.{" "}
          <a href="https://yonigottesman.github.io/" target="_blank" rel="noreferrer"> Yoni Gottesman </a>
        </div>
      </div>
    </div>

  );
}

export default App;