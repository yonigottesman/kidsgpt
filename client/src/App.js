import './App.css';

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { MoonLoader } from 'react-spinners';
import { css } from '@emotion/react';



function ResponseBox({ question, answer }) {
  const style = {
    backgroundColor: '#F0F8FF',
    padding: '1em',
    borderRadius: '0.5em',
    marginBottom: '1em',
    width: '70%',
    textAlign: 'center',
    maxWidth: '100em', // Set a max width to limit the size of the box
  };

  return (
    <div style={style}>
      <p style={{ fontWeight: 'bold' }}>{question}</p>
      <p>{answer}</p>
    </div>
  );
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [responses, setResponses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [selectedLanguage, setSelectedLanguage] = useState('he');

  // const apiUrl = `${process.env.REACT_APP_BACKEND_IP}/ask`;
  // const apiUrl = "http://127.0.0.1:8000/ask"
  const apiUrl = "https://api-dot-personal-ai-264306.oa.r.appspot.com/ask"


  const handleLanguageChange = (event) => {
    setSelectedLanguage(event.target.value);
  };

  const startRecording = () => {
    console.log("start recording")
    try {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
        console.log("start recording2")
        let mediaRecorder;
        try {
          console.log("start recording3")
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/mp4' });
          console.log("mp4");
        }
        catch (err1) {
          console.log("failed to create mp4. trying webm");
          mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
          console.log("webm");
        }
        console.log("yoni0");
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorderRef.current.addEventListener('dataavailable', onRecordingReady);
        mediaRecorderRef.current.start();
        console.log("yoni1");
        setIsRecording(true);
      });
    } catch (err1) {
      console.log("failed")
      console.log(err1)
    }

  };

  const stopRecording = () => {
    console.log("stop recording")

    if (mediaRecorderRef.current) {
      console.log("yoni2");
      mediaRecorderRef.current.stop();
    }
    console.log("yoni3");
    setIsRecording(false);
  };

  const onRecordingReady = (e) => {
    const mt = mediaRecorderRef.current.mimeType
    console.log("mt", mt)
    const audioData = new Blob([e.data], { type: mt });
    const formData = new FormData();
    const fileExtension = mediaRecorderRef.current.mimeType.includes('webm') ? 'webm' : 'mp4';
    formData.append('audio', audioData, `audio.${fileExtension}`);
    const strippedResponses = responses.map(({ question, answer, audio }) => ({ question, answer }));
    formData.append('previous_responses', JSON.stringify(strippedResponses));
    formData.append('language', selectedLanguage);
    setIsLoading(true);
    axios.post(apiUrl, formData)
      .then((response) => {
        const newText = response.data;
        setResponses([...responses.slice(-1), newText]); // keep only the latest 3 responses


        // decode the base64-encoded audio data
        const audioData = atob(newText.audio_base64);
        const audioArrayBuffer = new ArrayBuffer(audioData.length);
        const audioArray = new Uint8Array(audioArrayBuffer);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }

        // create a new blob from the audio data
        const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/wav' });

        // create a new URL for the audio blob
        const audioUrl = URL.createObjectURL(audioBlob);

        // create a new audio element and set the source to the URL
        const audio = new Audio(audioUrl);

        // play the audio

        audio.play();
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
          <ResponseBox key={index} question={response.question} answer={response.answer} />
        ))}

        <button className="record-button" onContextMenu={(e) => e.preventDefault()}
          onTouchCancel={handlePointerCancel} onTouchStart={handlePointerDown} onTouchEnd={handlePointerUp}
          onMouseDown={handlePointerDown} onMouseUp={handlePointerUp}>
          {/* {isRecording ? 'Recording...' : 'Record'} */}
        </button>
        <br />
        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <MoonLoader color={'#FF5252'} loading={true} css={override} size={20} />
          </div>
        )}

        <div className="footer">
          Made for my kids.{" "}
          <a href="https://yonigottesman.github.io/" target="_blank" rel="noreferrer"> Yoni Gottesman </a>
        </div>
      </div>


    </div>

  );
}

export default App;