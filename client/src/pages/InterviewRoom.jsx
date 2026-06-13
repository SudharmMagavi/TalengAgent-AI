// client/src/pages/InterviewRoom.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getAssessment } from '../services/api';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const InterviewRoom = () => {
    const { token } = useParams(); 
    
    // Core State
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(45 * 60);

    // --- PROCTORING STATE ---
    const [hasStarted, setHasStarted] = useState(false);
    const [violations, setViolations] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [warningMessage, setWarningMessage] = useState(""); 
    
    // --- WEBCAM, AUDIO & AI STATE ---
    const [photo, setPhoto] = useState(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const webcamRef = useRef(null);
    
    // Violation Counters
    const [faceMissingSeconds, setFaceMissingSeconds] = useState(0);
    const [lookingDownSeconds, setLookingDownSeconds] = useState(0);
    const [audioSpikeSeconds, setAudioSpikeSeconds] = useState(0);

    // Audio API Refs
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const microphoneRef = useRef(null);

    // 1. Fetch the test & Load AI Models
    useEffect(() => {
        const fetchTest = async () => {
            try {
                const response = await getAssessment(token);
                setAssessment(response.data);
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.message || 'Invalid or expired test link.');
                setLoading(false);
            }
        };

        const loadModels = async () => {
            const MODEL_URL = '/models'; // Keeping your working path!
            
            // Load BOTH basic detection and landmark detection
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ]);
            
            setModelsLoaded(true);
        };

        fetchTest();
        loadModels();
    }, [token]);

    // Cleanup Audio on Unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

    // 2. The Countdown Timer
    useEffect(() => {
        if (!hasStarted || isComplete || isSubmitting) return;

        const timer = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(timer);
                    return 0; 
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [hasStarted, isComplete, isSubmitting]);

    // 3. Auto-Submit on Time Up
    useEffect(() => {
        if (timeLeft === 0 && !isComplete && !isSubmitting && hasStarted) {
            handleForceSubmit("Time expired.");
        }
    }, [timeLeft]);

    // --- PROCTORING 1: TAB VISIBILITY & FULLSCREEN TRACKING ---
    const handleViolation = (reason) => {
        setViolations((prev) => {
            const newCount = prev + 1;
            if (newCount >= 3) {
                handleForceSubmit(`SYSTEM FLAG: Terminated (Strike 3) - ${reason}`);
            } else {
                setWarningMessage(reason);
                setShowWarning(true);
            }
            return newCount;
        });
    };

    useEffect(() => {
        if (!hasStarted || isComplete || isSubmitting) return;

        const handleVisibilityChange = () => {
            if (document.hidden) handleViolation("Switched browser tabs.");
        };

        const handleFullScreenChange = () => {
            if (!document.fullscreenElement) handleViolation("Exited full-screen mode.");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.addEventListener("fullscreenchange", handleFullScreenChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            document.removeEventListener("fullscreenchange", handleFullScreenChange);
        };
    }, [hasStarted, isComplete, isSubmitting]);

    // --- PROCTORING 2: CONTINUOUS AUDIO & FACE TRACKING ENGINE ---
    useEffect(() => {
        if (!hasStarted || isComplete || isSubmitting || !modelsLoaded) return;

        const interval = setInterval(async () => {
            
            // --- A: AUDIO TRACKING ---
            if (analyserRef.current) {
                const array = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(array);
                
                let values = 0;
                for (let i = 0; i < array.length; i++) values += array[i];
                const averageVolume = values / array.length;

                // Threshold (35): Adjust this if it's too sensitive or not sensitive enough
                if (averageVolume > 35) {
                    setAudioSpikeSeconds(prev => {
                        const next = prev + 1;
                        if (next >= 5) { // 5 continuous seconds of noise
                            handleViolation("Continuous talking/background noise detected.");
                            return 0; 
                        }
                        return next;
                    });
                } else {
                    setAudioSpikeSeconds(0);
                }
            }

            // --- B: VIDEO & GAZE TRACKING ---
            if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
                const video = webcamRef.current.video;
                
                // Detect faces AND landmarks
                const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
                
                if (detections.length > 1) {
                    handleViolation("Multiple faces detected in frame.");
                    setFaceMissingSeconds(0); 
                    setLookingDownSeconds(0);
                } else if (detections.length === 0) {
                    setLookingDownSeconds(0);
                    setFaceMissingSeconds(prev => {
                        const next = prev + 1;
                        if (next >= 10) { 
                            handleViolation("Face not visible for 10 consecutive seconds.");
                            return 0; 
                        }
                        return next;
                    });
                } else {
                    // Exactly 1 face is present
                    setFaceMissingSeconds(0);
                    
                    // GAZE MATH: Check if looking down
                    const landmarks = detections[0].landmarks;
                    const nose = landmarks.getNose();
                    const jaw = landmarks.getJawOutline();
                    
                    const noseTip = nose[3]; 
                    const chin = jaw[8];     

                    const verticalDistance = chin.y - noseTip.y;
                    const faceHeight = jaw[8].y - jaw[0].y; 
                    const tiltRatio = verticalDistance / faceHeight;

                    // If ratio is very small, head is tilted down
                    if (tiltRatio < 0.20) { 
                        setLookingDownSeconds(prev => {
                            const next = prev + 1;
                            if (next >= 10) { // Looking down for 10 seconds
                                handleViolation("Prolonged downward gaze detected (Phone suspicion).");
                                return 0;
                            }
                            return next;
                        });
                    } else {
                        setLookingDownSeconds(0);
                    }
                }
            }
        }, 1000); 

        return () => clearInterval(interval);
    }, [hasStarted, isComplete, isSubmitting, modelsLoaded]);


    // Handlers
    const handleCaptureAndStart = async () => {
        const imageSrc = webcamRef.current.getScreenshot();
        setPhoto(imageSrc);

        try {
            // Fullscreen Request
            if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
            }

            // Audio API Request
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
            
            analyserRef.current.smoothingTimeConstant = 0.8;
            analyserRef.current.fftSize = 1024;
            microphoneRef.current.connect(analyserRef.current);

        } catch (err) {
            alert("Microphone and Fullscreen permissions are required to take this assessment.");
            return; // Don't start if they deny permissions
        }
        
        setHasStarted(true);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (e) => setAnswers({ ...answers, [currentIndex]: e.target.value });
    
    const handleNext = () => { if (currentIndex < assessment.questions.length - 1) { setCurrentIndex(currentIndex + 1); setError(''); } };
    const handlePrevious = () => { if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setError(''); } };

    const handleSubmit = async () => {
        setError('');
        const answersArray = assessment.questions.map((_, idx) => answers[idx] || '');
        if (answersArray.some(ans => ans.trim() === '')) return setError('Please provide a response for all questions before submitting.');
        executeSubmission(answersArray);
    };

    const handleForceSubmit = async (reason) => {
        const answersArray = assessment.questions.map((_, idx) => answers[idx] || `[SYSTEM FLAG]: ${reason}`);
        executeSubmission(answersArray);
    };

    const executeSubmission = async (answersArray) => {
        setIsSubmitting(true);
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            await axios.post(`http://localhost:5000/api/interview/grade/${token}`, {
                answers: answersArray,
                photo: photo
            });
            setIsComplete(true); 
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit the assessment.');
            setIsSubmitting(false);
        }
    };

    // --- RENDER SCREENS ---

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading your assessment...</div>;
    if (error && !assessment) return ( <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4"> <div className="bg-slate-800 p-8 rounded-xl text-center text-red-500">{error}</div> </div> );
    if (isComplete) return ( <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-3xl font-bold">Assessment Submitted! You may close this tab.</div> );

    // Pre-Test Landing Page
    if (!hasStarted) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 py-10">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Proctored Assessment</h1>
                    <p className="text-slate-300 mb-6 text-lg">Welcome, <strong>{assessment.candidateName}</strong>.</p>
                    
                    <div className="mb-8">
                        {modelsLoaded ? (
                            <>
                                <h3 className="text-white font-bold mb-2">Identity & Environment Check</h3>
                                <div className="w-64 h-48 mx-auto rounded-xl overflow-hidden border-2 border-emerald-500 relative shadow-lg">
                                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                                </div>
                                <p className="text-slate-400 text-sm mt-4">This test uses AI tracking for identity, gaze, and audio monitoring.</p>
                                <button onClick={handleCaptureAndStart} className="mt-6 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-500 w-full">📸 Grant Permissions & Start</button>
                            </>
                        ) : (
                            <div className="w-full h-48 flex items-center justify-center text-slate-400 border border-slate-700 rounded-xl">Loading AI Security Models...</div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const currentQuestion = assessment.questions[currentIndex];
    const progressPercentage = ((currentIndex + 1) / assessment.questions.length) * 100;

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 pt-10 px-4 pb-20 relative">
            
            {/* --- UPDATED: FLOATING PICTURE-IN-PICTURE WEBCAM --- */}
            <div className={`fixed bottom-6 right-6 w-56 aspect-video rounded-xl overflow-hidden border-2 shadow-2xl z-40 transition-colors duration-300 ${faceMissingSeconds >= 5 || lookingDownSeconds >= 5 || audioSpikeSeconds >= 3 ? 'border-red-500' : 'border-slate-600'}`}>
                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1.5 rounded text-[10px] font-bold flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${faceMissingSeconds > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        {faceMissingSeconds > 0 ? `Face Lost (${faceMissingSeconds}s)` : 'Visually Secured'}
                    </div>
                    {lookingDownSeconds > 0 && (
                        <div className="flex items-center gap-2 text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                            Looking Down ({lookingDownSeconds}s)
                        </div>
                    )}
                    {audioSpikeSeconds > 0 && (
                        <div className="flex items-center gap-2 text-red-400">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            Audio Spike ({audioSpikeSeconds}s)
                        </div>
                    )}
                </div>
            </div>

            {/* PROCTORING WARNING MODAL */}
            {showWarning && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
                    <div className="bg-slate-800 p-8 rounded-2xl border-2 border-red-500 max-w-md w-full text-center shadow-2xl">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-white mb-2">Proctoring Warning</h2>
                        <p className="text-red-400 font-bold mb-4">{warningMessage}</p>
                        <p className="text-slate-300 mb-6">This is strike <strong>{violations} of 3</strong>. Reaching 3 strikes will immediately terminate your test.</p>
                        <button 
                            onClick={async () => {
                                setShowWarning(false);
                                if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
                            }}
                            className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-500 w-full"
                        >
                            Return to Assessment
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-1">Technical Assessment</h2>
                            <p className="text-slate-400">Question {currentIndex + 1} of {assessment.questions.length}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-lg font-mono text-xl font-bold border ${timeLeft < 300 ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                            ⏱ {formatTime(timeLeft)}
                        </div>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 mt-2"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div></div>
                </div>

                <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
                    <div className="p-8 border-b border-slate-700 bg-slate-800/50">
                        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider">{currentQuestion.category || "Technical"}</span>
                        <h3 className="text-2xl text-white font-medium leading-relaxed mt-4">{currentQuestion.question}</h3>
                    </div>
                    <div className="p-8 bg-slate-900/50">
                        <textarea 
                            value={answers[currentIndex] || ''}
                            onChange={handleAnswerChange}
                            onPaste={(e) => { e.preventDefault(); alert("Pasting disabled."); }}
                            onCopy={(e) => { e.preventDefault(); alert("Copying disabled."); }}
                            disabled={isSubmitting || timeLeft === 0}
                            placeholder="Type your detailed answer here..."
                            className="w-full h-48 p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-600 focus:outline-none focus:border-blue-500 transition resize-none disabled:opacity-50"
                        ></textarea>
                    </div>
                </div>
                
                <div className="mt-8 flex justify-between items-center">
                    <button onClick={handlePrevious} disabled={currentIndex === 0 || isSubmitting} className="px-6 py-3 rounded-lg font-semibold text-slate-300 hover:bg-slate-700">← Previous</button>
                    {currentIndex === assessment.questions.length - 1 ? (
                        <button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-emerald-500 disabled:opacity-50">Submit Assessment</button>
                    ) : (
                        <button onClick={handleNext} disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50">Next Question →</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InterviewRoom;