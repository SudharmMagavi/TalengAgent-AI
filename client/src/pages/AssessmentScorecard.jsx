// client/src/components/AssessmentScorecard.jsx
import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';

const AssessmentScorecard = ({ assessment, onClose }) => {
    const reportRef = useRef();
    const [isClosing, setIsClosing] = useState(false);

    if (!assessment || !assessment.scorecard) return null;

    // --- UPDATED: Destructure candidatePhoto ---
    const { scorecard, candidateName, jobRole, status, answers, questions, candidatePhoto } = assessment;

    const handleClose = () => {
        setIsClosing(true); 
        setTimeout(() => {
            onClose(); 
        }, 350); 
    };

    const handleExportPDF = useReactToPrint({
        contentRef: reportRef, 
        documentTitle: `${candidateName.replace(/\s+/g, '_')}_Interview_Report`,
    });

    return (
        <>
            <style>
                {`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                    @keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }

                    .animate-backdrop-in { animation: fadeIn 0.3s ease-out forwards; }
                    .animate-panel-in { animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    .animate-backdrop-out { animation: fadeOut 0.3s ease-out forwards; }
                    .animate-panel-out { animation: slideOutRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                `}
            </style>

            <div className={`fixed inset-0 bg-black/70 flex justify-end z-50 ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`}>
                
                <div className={`bg-slate-900 w-full max-w-4xl h-full flex flex-col shadow-2xl border-l border-slate-700 ${isClosing ? 'animate-panel-out' : 'animate-panel-in'}`}>
                    
                    <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0 print:hidden">
                        <button onClick={handleClose} className="text-slate-400 hover:text-white transition flex items-center gap-2">
                            <span className="text-xl">×</span> Close Panel
                        </button>
                        
                        <button onClick={handleExportPDF} className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-500 shadow-md transition flex items-center gap-2">
                            🖨️ Print / Save as PDF
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 bg-slate-900">
                        <div ref={reportRef} className="space-y-8 text-slate-100 p-2" id="pdf-content">
                            
                            <div className="border-b border-slate-700 pb-6 flex justify-between items-start">
                                {/* --- UPDATED: Identity Header with Photo --- */}
                                <div className="flex gap-6 items-center">
                                    {candidatePhoto ? (
                                        <img src={candidatePhoto} alt="Candidate ID" className="w-24 h-24 rounded-lg object-cover border-2 border-slate-600 shadow-md" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-lg bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-slate-500 text-xs text-center p-2">No Photo Provided</div>
                                    )}
                                    <div>
                                        <h1 className="text-3xl font-bold text-white mb-2">{candidateName}</h1>
                                        <p className="text-slate-400 text-lg">Role Assessment: <span className="text-blue-400 font-medium">{jobRole}</span></p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-400 uppercase tracking-wider mb-1">Overall AI Score</div>
                                    <div className="text-4xl font-black text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                                        {scorecard.overallScore}/100
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                                    <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Test Status</span>
                                    <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase ${
                                        status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                    }`}>{status}</span>
                                </div>
                                <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl">
                                    <span className="text-xs text-slate-400 uppercase font-bold block mb-1">Proctoring Metrics</span>
                                    <span className="text-sm font-medium text-slate-200">
                                        {answers.some(ans => typeof ans === 'string' && ans.includes('SYSTEM FLAG')) 
                                            ? '⚠️ Integrity Alert: Cheating Limits Triggered' 
                                            : '✅ Integrity Verified: Standard Submission'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-blue-400 mb-3 uppercase tracking-wider text-xs">AI Executive Summary</h3>
                                <p className="text-slate-200 leading-relaxed text-base">{scorecard.summary}</p>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-white uppercase tracking-wider text-xs mb-4 border-b border-slate-700 pb-2">
                                    Detailed Question Breakdown
                                </h3>

                                {questions.map((q, index) => {
                                    const feedbackItem = scorecard.detailedFeedback?.[index] || {};
                                    const candidateAnswer = answers[index] || "No answer recorded.";

                                    return (
                                        <div key={index} className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden" style={{ pageBreakInside: 'avoid' }}>
                                            <div className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center gap-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-blue-600 text-white font-mono font-bold w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0">
                                                        {index + 1}
                                                    </span>
                                                    <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs uppercase font-semibold">
                                                        {q.category || "Technical"}
                                                    </span>
                                                    <h4 className="text-white font-medium line-clamp-1">{q.question}</h4>
                                                </div>
                                                <span className={`text-sm font-bold whitespace-nowrap px-2 py-1 rounded ${
                                                    (feedbackItem.score || 0) >= 7 ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                                                }`}>
                                                    Score: {feedbackItem.score || 0}/10
                                                </span>
                                            </div>

                                            <div className="p-5 space-y-4">
                                                <p className="text-sm text-slate-400 italic mb-2">Question Context: "{q.question}"</p>

                                                <div className="space-y-1.5">
                                                    <span className="text-xs uppercase tracking-wider font-bold text-slate-400 block">Candidate's Response:</span>
                                                    <div className="w-full bg-slate-900 border border-slate-700 p-4 rounded-lg font-mono text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                                                        {candidateAnswer}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 pt-2">
                                                    <span className="text-xs uppercase tracking-wider font-bold text-blue-400 block">AI Evaluation Feedback:</span>
                                                    <div className="w-full bg-blue-950/20 border border-blue-900/30 p-4 rounded-lg text-sm text-slate-300 leading-relaxed">
                                                        {feedbackItem.feedback || "Evaluation unavailable for this item."}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AssessmentScorecard;