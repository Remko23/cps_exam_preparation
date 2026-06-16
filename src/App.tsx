import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, XCircle, RefreshCw, Eye, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type ConvolutionType = 'Liniowy' | 'Okresowy';
type AppMode = 'splot' | 'suma' | 'fourier' | 'probkowanie';
type ProbkowanieType = 'minimalne_fs' | 'aliasing';
type FourierType = 'dft' | 'idft';

interface Complex {
  re: number;
  im: number;
}

interface AppState {
  mode: AppMode;
  isCorrect: boolean | null;
  showSolution: boolean;
  showHelp: boolean;

  // Splot mode
  x: number[];
  y: number[];
  type: ConvolutionType;
  userAnswers: string[];

  // Suma ważona mode
  sumaX: number[];
  userSumaCoeffs: string[];
  userSumaShifts: string[];

  // Fourier mode
  fourierType: FourierType;
  fourierX: number[];
  userFourierAnswers: string[];
  userFourierAnswersIDFT: string[];

  // Probkowanie mode
  probkowanieType: ProbkowanieType;
  probkowanieF1: number;
  probkowanieF2: number;
  probkowanieA1: number;
  probkowanieA2: number;
  probkowanieF_in: number;
  probkowanieF_s: number;
  userProbkowanieAnswer: string;
}

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateArray = (length: number) => {
  return Array.from({ length }, () => getRandomInt(-3, 5));
};

const calculateLinearConvolution = (x: number[], y: number[]) => {
  const result = new Array(x.length + y.length - 1).fill(0);
  for (let i = 0; i < x.length; i++) {
    for (let j = 0; j < y.length; j++) {
      result[i + j] += x[i] * y[j];
    }
  }
  return result;
};

const calculateCircularConvolution = (x: number[], y: number[]) => {
  const N = Math.max(x.length, y.length);
  const padX = [...x, ...new Array(N - x.length).fill(0)];
  const padY = [...y, ...new Array(N - y.length).fill(0)];
  const result = new Array(N).fill(0);

  for (let n = 0; n < N; n++) {
    for (let k = 0; k < N; k++) {
      let idx = (n - k) % N;
      if (idx < 0) idx += N;
      result[n] += padX[k] * padY[idx];
    }
  }
  return result;
};

function parseComplex(s: string): Complex | null {
  s = s.replace(/\s+/g, '').toLowerCase().replace(/i/g, 'j');
  if (!s) return null;

  let re = 0;
  let im = 0;

  if (s === 'j') return { re: 0, im: 1 };
  if (s === '-j') return { re: 0, im: -1 };

  if (!s.includes('j')) {
    const r = parseFloat(s);
    return isNaN(r) ? null : { re: r, im: 0 };
  }

  const terms = s.match(/[+-]?[^+-]+/g);
  if (!terms) return null;

  for (let term of terms) {
    if (term.includes('j')) {
      const valStr = term.replace('j', '');
      if (valStr === '' || valStr === '+') im += 1;
      else if (valStr === '-') im -= 1;
      else im += parseFloat(valStr);
    } else {
      re += parseFloat(term);
    }
  }

  if (isNaN(re) || isNaN(im)) return null;
  return { re, im };
}

function formatComplex(c: Complex): string {
  if (c.im === 0) return `${c.re}`;
  if (c.re === 0) {
    if (c.im === 1) return `j`;
    if (c.im === -1) return `-j`;
    return `${c.im}j`;
  }
  let imStr = '';
  if (c.im === 1) imStr = '+j';
  else if (c.im === -1) imStr = '-j';
  else if (c.im > 0) imStr = `+${c.im}j`;
  else imStr = `${c.im}j`;
  return `${c.re}${imStr}`;
}

function calculateDFT4(x: number[]): Complex[] {
  return [
    { re: x[0] + x[1] + x[2] + x[3], im: 0 },
    { re: x[0] - x[2], im: x[3] - x[1] },
    { re: x[0] - x[1] + x[2] - x[3], im: 0 },
    { re: x[0] - x[2], im: x[1] - x[3] }
  ];
}

// Custom Ninja Icons
const SenseiWuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" {...props}>
    <path d="M 20 50 Q 50 100 80 50 Z" fill="#f8fafc" />
    <ellipse cx="50" cy="45" rx="25" ry="18" fill="#fcd34d" />
    <circle cx="42" cy="45" r="3" fill="#1e293b" />
    <circle cx="58" cy="45" r="3" fill="#1e293b" />
    <path d="M 36 40 Q 42 38 48 40" fill="none" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
    <path d="M 64 40 Q 58 38 52 40" fill="none" stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
    <path d="M 40 52 Q 50 45 60 52" fill="none" stroke="#f8fafc" strokeWidth="5" strokeLinecap="round" />
    <path d="M 15 35 Q 50 10 85 35 Q 50 42 15 35 Z" fill="#d97706" />
    <path d="M 15 35 Q 50 25 85 35" fill="none" stroke="#b45309" strokeWidth="2" />
  </svg>
);

const NinjaIcon = ({ color, darkColor, className }: { color: string, darkColor: string, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className={className} width="24" height="24">
    <circle cx="32" cy="32" r="28" fill={color} />
    <ellipse cx="32" cy="30" rx="20" ry="12" fill="#fef08a" />
    <path d="M 12 30 Q 32 45 52 30" fill="none" stroke={darkColor} strokeWidth="4" strokeLinecap="round" />
    <path d="M 16 20 Q 32 25 48 20" fill="none" stroke={darkColor} strokeWidth="4" strokeLinecap="round" />
    <circle cx="24" cy="28" r="3" fill="#1e293b" />
    <circle cx="40" cy="28" r="3" fill="#1e293b" />
    <path d="M 20 24 L 26 26" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
    <path d="M 44 24 L 38 26" fill="none" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
    <path d="M 56 32 Q 62 40 58 48" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
    <path d="M 56 32 Q 64 36 62 42" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
  </svg>
);


function App() {
  const [state, setState] = useState<AppState>({
    mode: 'splot',
    isCorrect: null,
    showSolution: false,
    showHelp: false,
    x: [],
    y: [],
    type: 'Liniowy',
    userAnswers: [],
    sumaX: [],
    userSumaCoeffs: [],
    userSumaShifts: [],
    fourierType: 'dft',
    fourierX: [],
    userFourierAnswers: [],
    userFourierAnswersIDFT: [],
    probkowanieType: 'minimalne_fs',
    probkowanieF1: 0,
    probkowanieF2: 0,
    probkowanieA1: 0,
    probkowanieA2: 0,
    probkowanieF_in: 0,
    probkowanieF_s: 0,
    userProbkowanieAnswer: '',
  });

  const generateProblem = (modeOverride?: AppMode) => {
    const currentMode = modeOverride || state.mode;

    if (currentMode === 'splot') {
      const lenX = getRandomInt(3, 5);
      const lenY = getRandomInt(3, 4);
      const type: ConvolutionType = Math.random() > 0.5 ? 'Liniowy' : 'Okresowy';
      const expectedLen = type === 'Liniowy' ? lenX + lenY - 1 : Math.max(lenX, lenY);

      setState(s => ({
        ...s,
        mode: 'splot',
        x: generateArray(lenX),
        y: generateArray(lenY),
        type,
        userAnswers: new Array(expectedLen).fill(''),
        isCorrect: null,
        showSolution: false,
        showHelp: false,
      }));
    } else if (currentMode === 'suma') {
      const lenX = getRandomInt(4, 5);
      const sumaX = generateArray(lenX);

      setState(s => ({
        ...s,
        mode: 'suma',
        sumaX,
        userSumaCoeffs: new Array(lenX).fill(''),
        userSumaShifts: new Array(lenX - 1).fill(''),
        isCorrect: null,
        showSolution: false,
        showHelp: false,
      }));
    } else if (currentMode === 'fourier') {
      const fType = Math.random() > 0.5 ? 'dft' : 'idft';
      const fourierX = generateArray(4);

      setState(s => ({
        ...s,
        mode: 'fourier',
        fourierType: fType,
        fourierX,
        userFourierAnswers: new Array(4).fill(''),
        userFourierAnswersIDFT: new Array(4).fill(''),
        isCorrect: null,
        showSolution: false,
        showHelp: false,
      }));
    } else if (currentMode === 'probkowanie') {
      const pType = Math.random() > 0.5 ? 'minimalne_fs' : 'aliasing';
      
      setState(s => ({
        ...s,
        mode: 'probkowanie',
        probkowanieType: pType,
        probkowanieF1: getRandomInt(1, 15) * 10,
        probkowanieF2: getRandomInt(1, 15) * 10,
        probkowanieA1: getRandomInt(2, 9),
        probkowanieA2: getRandomInt(2, 9),
        probkowanieF_in: getRandomInt(10, 30) * 10,
        probkowanieF_s: getRandomInt(4, 9) * 10,
        userProbkowanieAnswer: '',
        isCorrect: null,
        showSolution: false,
        showHelp: false,
      }));
    }
  };

  useEffect(() => {
    generateProblem('splot');
  }, []);

  const switchMode = (mode: AppMode) => {
    generateProblem(mode);
  };

  const getCorrectAnswer = () => {
    if (state.type === 'Liniowy') {
      return calculateLinearConvolution(state.x, state.y);
    } else {
      return calculateCircularConvolution(state.x, state.y);
    }
  };

  const handleCheck = () => {
    if (state.mode === 'splot') {
      const parsed = state.userAnswers.map((s) => parseInt(s.trim(), 10));
      if (parsed.some(isNaN)) {
        alert('Wypełnij wszystkie okienka poprawnymi liczbami całkowitymi.');
        return;
      }
      const correct = state.type === 'Liniowy'
        ? calculateLinearConvolution(state.x, state.y)
        : calculateCircularConvolution(state.x, state.y);
      const isMatch = parsed.length === correct.length && parsed.every((val, i) => val === correct[i]);
      setState(s => ({ ...s, isCorrect: isMatch }));
    } else if (state.mode === 'suma') {
      const coeffs = state.userSumaCoeffs.map(s => parseInt(s.trim(), 10));
      const shifts = state.userSumaShifts.map(s => parseInt(s.trim(), 10));

      if (coeffs.some(isNaN) || shifts.some(isNaN)) {
        alert('Wypełnij wszystkie okienka poprawnymi liczbami całkowitymi.');
        return;
      }
      const coeffsMatch = coeffs.every((val, i) => val === state.sumaX[i]);
      const shiftsMatch = shifts.every((val, i) => val === i + 1);
      setState(s => ({ ...s, isCorrect: coeffsMatch && shiftsMatch }));
    } else if (state.mode === 'fourier') {
      if (state.fourierType === 'dft') {
        const parsed = state.userFourierAnswers.map(parseComplex);
        if (parsed.some(p => p === null)) {
          alert('Wprowadź poprawne liczby zespolone (np. 10, -2+2j, -2-2i). Użyj j lub i.');
          return;
        }
        const correct = calculateDFT4(state.fourierX);
        const isMatch = parsed.every((p, i) => p!.re === correct[i].re && p!.im === correct[i].im);
        setState(s => ({ ...s, isCorrect: isMatch }));
      } else {
        const parsed = state.userFourierAnswersIDFT.map(s => parseInt(s.trim(), 10));
        if (parsed.some(isNaN)) {
          alert('Wypełnij wszystkie okienka poprawnymi liczbami całkowitymi.');
          return;
        }
        const isMatch = parsed.every((val, i) => val === state.fourierX[i]);
        setState(s => ({ ...s, isCorrect: isMatch }));
      }
    } else if (state.mode === 'probkowanie') {
      const parsed = parseInt(state.userProbkowanieAnswer.trim(), 10);
      if (isNaN(parsed)) {
        alert('Wpisz poprawną liczbę całkowitą (w Hz).');
        return;
      }
      let correct = 0;
      if (state.probkowanieType === 'minimalne_fs') {
        const maxF = Math.max(state.probkowanieF1, state.probkowanieF2);
        correct = 2 * maxF;
      } else {
        correct = Math.abs(state.probkowanieF_in - state.probkowanieF_s * Math.round(state.probkowanieF_in / state.probkowanieF_s));
      }
      setState(s => ({ ...s, isCorrect: parsed === correct }));
    }
  };

  // Map mode to theme class
  let themeClass = 'theme-kai';
  if (state.mode === 'suma') themeClass = 'theme-jay';
  if (state.mode === 'fourier') themeClass = 'theme-lloyd';
  if (state.mode === 'probkowanie') themeClass = 'theme-cole';

  useEffect(() => {
    document.body.className = themeClass;
  }, [themeClass]);

  if (state.mode === 'splot' && state.x.length === 0) return null;
  if (state.mode === 'suma' && state.sumaX.length === 0) return null;
  if (state.mode === 'fourier' && state.fourierX.length === 0) return null;
  if (state.mode === 'probkowanie' && state.probkowanieF1 === 0) return null;

  return (
    <div className={cn("theme-container", themeClass)}>
      <div className="lego-panel">
        <h1 className="title">NinjaCPS</h1>
        <p className="subtitle">"Never put off until tomorrow what can be done today!" ~ Sensei Wu</p>

        <div className="tab-switcher">
          <button
            className={cn("tab-btn", state.mode === 'splot' && "active")}
            onClick={() => switchMode('splot')}
          >
            <NinjaIcon color="#ef4444" darkColor="#991b1b" /> Splot
          </button>
          <button
            className={cn("tab-btn", state.mode === 'suma' && "active")}
            onClick={() => switchMode('suma')}
          >
            <NinjaIcon color="#3b82f6" darkColor="#1e3a8a" /> Suma Ważona
          </button>
          <button
            className={cn("tab-btn", state.mode === 'fourier' && "active")}
            onClick={() => switchMode('fourier')}
          >
            <NinjaIcon color="#22c55e" darkColor="#15803d" /> Fourier
          </button>
          <button
            className={cn("tab-btn", state.mode === 'probkowanie' && "active")}
            onClick={() => switchMode('probkowanie')}
          >
            <NinjaIcon color="#334155" darkColor="#0f172a" /> Próbkowanie
          </button>
        </div>

        {state.mode === 'splot' && (
          <>
            <div className="card">
              <div className="operation-type">
                Splot {state.type}
              </div>
              <div className="array-display">
                <span className="array-label">x(n) =</span>
                <span className="array-values">[{state.x.join(', ')}]</span>
              </div>
              <div className="array-display">
                <span className="array-label">y(n) =</span>
                <span className="array-values">[{state.y.join(', ')}]</span>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Twoja odpowiedź (wpisz po jednej liczbie):</label>
              <div className="answers-row">
                {state.userAnswers.map((val, idx) => (
                  <input
                    key={idx}
                    type="text"
                    className="answer-box"
                    value={val}
                    onChange={(e) => {
                      const newAns = [...state.userAnswers];
                      newAns[idx] = e.target.value;
                      setState(s => ({ ...s, userAnswers: newAns, isCorrect: null }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCheck();
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {state.mode === 'suma' && (
          <>
            <div className="card">
              <div className="operation-type">
                Suma Ważona Impulsów Kroneckera
              </div>
              <div className="array-display">
                <span className="array-label">x(n) =</span>
                <span className="array-values">[{state.sumaX.join(', ')}]</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0', fontWeight: 600 }}>
                Załóż, że początek sygnału zaczyna się od n = 0.
              </p>
            </div>
            <div className="input-group">
              <label className="input-label">Uzupełnij wzór odpowiednimi liczbami:</label>
              <div className="formula-row">
                <span>x(n) = </span>
                <input
                  type="text"
                  className="formula-input"
                  value={state.userSumaCoeffs[0] || ''}
                  onChange={(e) => {
                    const newC = [...state.userSumaCoeffs];
                    newC[0] = e.target.value;
                    setState(s => ({ ...s, userSumaCoeffs: newC, isCorrect: null }));
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                />
                <span>δ(n)</span>

                {state.sumaX.slice(1).map((_, idx) => {
                  const globalIdx = idx + 1;
                  return (
                    <React.Fragment key={globalIdx}>
                      <span>+</span>
                      <input
                        type="text"
                        className="formula-input"
                        value={state.userSumaCoeffs[globalIdx] || ''}
                        onChange={(e) => {
                          const newC = [...state.userSumaCoeffs];
                          newC[globalIdx] = e.target.value;
                          setState(s => ({ ...s, userSumaCoeffs: newC, isCorrect: null }));
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                      />
                      <span>δ(n - </span>
                      <input
                        type="text"
                        className="formula-input shift"
                        value={state.userSumaShifts[idx] || ''}
                        onChange={(e) => {
                          const newS = [...state.userSumaShifts];
                          newS[idx] = e.target.value;
                          setState(s => ({ ...s, userSumaShifts: newS, isCorrect: null }));
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                      />
                      <span>)</span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {state.mode === 'fourier' && state.fourierType === 'dft' && (
          <>
            <div className="card">
              <div className="operation-type">
                Dyskretne Przekształcenie Fouriera (N=4)
              </div>
              <div className="array-display">
                <span className="array-label">x[n] =</span>
                <span className="array-values">[{state.fourierX.join(', ')}]</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0', fontWeight: 600 }}>
                Wpisz liczby zespolone dla prążków widma. Używaj "i" lub "j" (np. -2+2j, 10, -j).
              </p>
            </div>
            <div className="input-group">
              <label className="input-label">Twoje odpowiedzi dla X[k]:</label>
              <div className="answers-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
                {state.userFourierAnswers.map((val, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontFamily: 'Fira Code', color: 'var(--text-dark)', fontSize: '1.25rem', width: '3rem', fontWeight: 800 }}>X[{idx}] = </span>
                    <input
                      type="text"
                      style={{ width: '8rem' }}
                      className="answer-box"
                      value={val}
                      onChange={(e) => {
                        const newAns = [...state.userFourierAnswers];
                        newAns[idx] = e.target.value;
                        setState(s => ({ ...s, userFourierAnswers: newAns, isCorrect: null }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCheck();
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {state.mode === 'fourier' && state.fourierType === 'idft' && (
          <>
            <div className="card">
              <div className="operation-type">
                Odwrotne Dyskretne Przekształcenie Fouriera (IDFT)
              </div>
              <div className="array-display">
                <span className="array-label">X[k] =</span>
                <span className="array-values" style={{ fontSize: '1rem', padding: '0.75rem' }}>
                  [{calculateDFT4(state.fourierX).map(c => formatComplex(c)).join(', ')}]
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0', fontWeight: 600 }}>
                Wyznacz oryginalny ciąg x[n] (dla N=4) na podstawie jego widma X[k]. Wynik to zwykłe liczby całkowite!
              </p>
            </div>
            <div className="input-group">
              <label className="input-label">Twoje odpowiedzi dla x[n]:</label>
              <div className="answers-row">
                {state.userFourierAnswersIDFT.map((val, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: 'Fira Code', color: 'var(--text-dark)', fontSize: '1.15rem', fontWeight: 800 }}>x[{idx}]=</span>
                    <input
                      type="text"
                      className="answer-box"
                      style={{ width: '4rem', height: '3.5rem', fontSize: '1.25rem' }}
                      value={val}
                      onChange={(e) => {
                        const newAns = [...state.userFourierAnswersIDFT];
                        newAns[idx] = e.target.value;
                        setState(s => ({ ...s, userFourierAnswersIDFT: newAns, isCorrect: null }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCheck();
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {state.mode === 'probkowanie' && state.probkowanieType === 'minimalne_fs' && (
          <>
            <div className="card">
              <div className="operation-type">
                Twierdzenie o próbkowaniu (Nyquista)
              </div>
              <div className="array-display">
                <span className="array-label" style={{ fontSize: '1.15rem' }}>
                  x(t) = {state.probkowanieA1}sin({state.probkowanieF1 * 2}πt) + {state.probkowanieA2}cos({state.probkowanieF2 * 2}πt)
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0', fontWeight: 600 }}>
                Podaj minimalną częstotliwość próbkowania f<sub>s</sub>, aby uniknąć zjawiska aliasingu.
              </p>
            </div>
            <div className="input-group">
              <label className="input-label">Minimalne f<sub>s</sub>:</label>
              <div className="answers-row">
                <input
                  type="text"
                  className="answer-box"
                  style={{ width: '8rem' }}
                  value={state.userProbkowanieAnswer || ''}
                  onChange={(e) => setState(s => ({ ...s, userProbkowanieAnswer: e.target.value, isCorrect: null }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                />
                <span style={{ alignSelf: 'center', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)' }}>Hz</span>
              </div>
            </div>
          </>
        )}

        {state.mode === 'probkowanie' && state.probkowanieType === 'aliasing' && (
          <>
            <div className="card">
              <div className="operation-type">
                Zjawisko Aliasingu
              </div>
              <div className="array-display">
                <span className="array-label" style={{ fontSize: '1.15rem' }}>
                  f<sub>in</sub> = {state.probkowanieF_in} Hz, f<sub>s</sub> = {state.probkowanieF_s} Hz
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0', fontWeight: 600 }}>
                Sygnał wejściowy o częstotliwości f<sub>in</sub> jest próbkowany ze zbyt niską częstotliwością f<sub>s</sub>. Oblicz częstotliwość pozorną (alias) tego sygnału po rekonstrukcji.
              </p>
            </div>
            <div className="input-group">
              <label className="input-label">Częstotliwość fałszywa (alias):</label>
              <div className="answers-row">
                <input
                  type="text"
                  className="answer-box"
                  style={{ width: '8rem' }}
                  value={state.userProbkowanieAnswer || ''}
                  onChange={(e) => setState(s => ({ ...s, userProbkowanieAnswer: e.target.value, isCorrect: null }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                />
                <span style={{ alignSelf: 'center', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-dark)' }}>Hz</span>
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCheck}>
              <ArrowRight size={20} />
              Sprawdź
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setState(s => ({ ...s, showSolution: !s.showSolution }))}>
              <Eye size={20} />
              {state.showSolution ? 'Ukryj odpowiedź' : 'Odpowiedź'}
            </button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => generateProblem()}>
              <RefreshCw size={20} />
              Nowe zadanie
            </button>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setState(s => ({ ...s, showHelp: !s.showHelp }))}>
            <HelpCircle size={20} style={{ marginRight: '0.5rem' }} />
            {state.showHelp ? 'Ukryj' : 'Jak to rozwiązać?'}
          </button>
        </div>

        {state.showHelp && (
          <div className="sensei-container">
            <SenseiWuIcon className="sensei-avatar" />
            <div className="help-box">
              <h3>Sensei Wu radzi:</h3>

              {state.mode === 'splot' && (
                <>
                  <div className="help-section">
                    <h4>1. Splot Liniowy (długość N + M - 1)</h4>
                    <p><strong>Metoda tabelkowa:</strong> Narysuj tabelę. W nagłówkach kolumn zapisz wartości x(n), a w wierszach y(n). W każdej komórce wpisz iloczyn odpowiadających wartości z nagłówków. Wynikiem są <strong>sumy na przekątnych</strong> (od lewego-górnego rogu po skosie w prawo-w-dół).</p>
                  </div>
                  <div className="help-section">
                    <h4>2. Splot Okresowy (długość = max(N, M))</h4>
                    <p>Najpierw uzupełnij krótszy ciąg zerami na końcu, tak aby oba miały długość L. Następnie użyj <strong>metody macierzowej</strong>:</p>
                    <ul>
                      <li>Zbuduj macierz z pierwszego sygnału. Pierwsza kolumna to po prostu sygnał x(n). Kolejne kolumny to cykliczne przesunięcie poprzedniej kolumny <strong>w dół</strong> o 1 pozycję.</li>
                      <li>Pomnóż tę macierz przez pionowy wektor drugiego sygnału y(n). Wynikowy wektor to szukany splot Okresowy.</li>
                    </ul>
                  </div>
                </>
              )}

              {state.mode === 'suma' && (
                <div className="help-section">
                  <h4>Suma Ważona Impulsów Kroneckera</h4>
                  <p>Młody uczniu, każdy dyskretny sygnał x(n) można zapisać za pomocą sumy przesuniętych w czasie impulsów jednostkowych δ(n) pomnożonych przez wartości sygnału w tych punktach.</p>
                  <p>Zatem dla każdego indeksu n wartość sygnału x(n) staje się współczynnikiem przed δ, a sam indeks wyznacza przesunięcie w nawiasie δ(n - k).</p>
                </div>
              )}

              {state.mode === 'fourier' && state.fourierType === 'dft' && (
                <div className="help-section">
                  <h4>Dyskretne Przekształcenie Fouriera (N=4)</h4>
                  <p>Dla sygnału x[n] o długości N=4, korzystamy ze skróconych wzorów, niczym ze specjalnych technik walki:</p>
                  <ul>
                    <li><strong>X[0]</strong> = x[0] + x[1] + x[2] + x[3]</li>
                    <li><strong>X[1]</strong> = (x[0] - x[2]) + j(x[3] - x[1])</li>
                    <li><strong>X[2]</strong> = x[0] - x[1] + x[2] - x[3]</li>
                    <li><strong>X[3]</strong> = (x[0] - x[2]) + j(x[1] - x[3])</li>
                  </ul>
                  <p><i>Pamiętaj, że j (lub i) to jednostka urojona. Trzymaj umysł jasny jak lód Zane'a!</i></p>
                </div>
              )}

              {state.mode === 'fourier' && state.fourierType === 'idft' && (
                <div className="help-section">
                  <h4>Odwrotne Dyskretne Przekształcenie Fouriera (IDFT, N=4)</h4>
                  <p>Aby odzyskać sygnał x[n] na podstawie X[k], korzystamy ze skróconych wzorów, ale zmieniamy znak przed <strong>j</strong> na przeciwny i <strong>dzielimy wszystko przez N (czyli 4)</strong>:</p>
                  <ul>
                    <li><strong>x[0]</strong> = 1/4 · (X[0] + X[1] + X[2] + X[3])</li>
                    <li><strong>x[1]</strong> = 1/4 · (X[0] + jX[1] - X[2] - jX[3])</li>
                    <li><strong>x[2]</strong> = 1/4 · (X[0] - X[1] + X[2] - X[3])</li>
                    <li><strong>x[3]</strong> = 1/4 · (X[0] - jX[1] - X[2] + jX[3])</li>
                  </ul>
                  <p><i>Pamiętaj: gdy przemnożysz część urojoną przez 'j', stanie się ona rzeczywista, bo j² = -1. Twój końcowy wynik to będą po prostu zwykłe liczby całkowite!</i></p>
                </div>
              )}

              {state.mode === 'probkowanie' && state.probkowanieType === 'minimalne_fs' && (
                <div className="help-section">
                  <h4>Twierdzenie Shannona-Kotielnikowa (Nyquista)</h4>
                  <p>Aby sygnał analogowy mógł zostać odtworzony z próbek bez zniekształceń (aliasingu), musi być próbkowany z częstotliwością co najmniej dwukrotnie większą niż jego najwyższa składowa częstotliwościowa.</p>
                  <ul>
                    <li>Częstotliwość maksymalna <strong>f<sub>max</sub></strong> kryje się we wzorach funkcji: sin(2πft).</li>
                    <li>Podziel wartość widoczną przed "πt" przez 2, aby uzyskać częstotliwość <strong>f</strong> dla każdego składnika.</li>
                    <li>Wybierz największe z obliczonych <strong>f</strong>. To Twój f<sub>max</sub>.</li>
                    <li>Użyj niezłomnej techniki Mistrza Ziemi: <strong>f<sub>s</sub> ≥ 2 · f<sub>max</sub></strong>.</li>
                  </ul>
                </div>
              )}

              {state.mode === 'probkowanie' && state.probkowanieType === 'aliasing' && (
                <div className="help-section">
                  <h4>Zjawisko Aliasingu</h4>
                  <p>Jeśli częstotliwość próbkowania f<sub>s</sub> jest mniejsza niż 2·f<sub>in</sub>, pojawia się częstotliwość fałszywa (alias).</p>
                  <ul>
                    <li>Mistrz Ziemi radzi użyć niezawodnego wzoru: <strong>f<sub>alias</sub> = | f<sub>in</sub> - N · f<sub>s</sub> |</strong></li>
                    <li>Gdzie N to taka liczba całkowita (1, 2, 3...), która sprowadzi wynik do przedziału <strong>od 0 do f<sub>s</sub> / 2</strong>.</li>
                    <li>W praktyce: odejmuj (lub dodawaj) f<sub>s</sub> od f<sub>in</sub> dopóki wynik (bez znaku minus) nie znajdzie się w podanym przedziale!</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {state.isCorrect === true && (
          <div className="result-banner result-success">
            <CheckCircle size={28} />
            <span>Świetnie! Twoja odpowiedź jest w 100% poprawna. Niezły cios!</span>
          </div>
        )}

        {state.isCorrect === false && (
          <div className="result-banner result-error">
            <XCircle size={28} />
            <span>Niestety, odpowiedź jest błędna. Podnieś się i spróbuj jeszcze raz!</span>
          </div>
        )}

        {state.showSolution && (
          <div className="solution-box">
            {state.mode === 'splot' && (
              <span>Prawidłowa odpowiedź: [{getCorrectAnswer().join(', ')}]</span>
            )}
            {state.mode === 'suma' && (
              <span>
                Prawidłowa odpowiedź: x(n) = {state.sumaX[0]}δ(n)
                {state.sumaX.slice(1).map((val, idx) => ` + ${val}δ(n - ${idx + 1})`).join('')}
              </span>
            )}
            {state.mode === 'fourier' && state.fourierType === 'dft' && (
              <span>
                Prawidłowa odpowiedź: <br />
                {calculateDFT4(state.fourierX).map((c, i) => <div key={i}>X[{i}] = {formatComplex(c)}</div>)}
              </span>
            )}
            {state.mode === 'fourier' && state.fourierType === 'idft' && (
              <span>
                Prawidłowa odpowiedź: x[n] = [{state.fourierX.join(', ')}]
              </span>
            )}
            {state.mode === 'probkowanie' && state.probkowanieType === 'minimalne_fs' && (
              <span>
                Prawidłowa odpowiedź: f<sub>s</sub> = {2 * Math.max(state.probkowanieF1, state.probkowanieF2)} Hz
              </span>
            )}
            {state.mode === 'probkowanie' && state.probkowanieType === 'aliasing' && (
              <span>
                Prawidłowa odpowiedź: f<sub>alias</sub> = {Math.abs(state.probkowanieF_in - state.probkowanieF_s * Math.round(state.probkowanieF_in / state.probkowanieF_s))} Hz
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
