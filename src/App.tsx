import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, XCircle, RefreshCw, Eye, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type AppMode = 'splot' | 'suma' | 'fourier' | 'probkowanie' | 'kwantyzacja';

interface Complex {
  re: number;
  im: number;
}

interface AppState {
  mode: AppMode;

  // Splot mode
  isCorrect_splotLiniowy: boolean | null;
  showSolution_splotLiniowy: boolean;
  showHelp_splotLiniowy: boolean;
  x_liniowy: number[];
  y_liniowy: number[];
  userAnswers_liniowy: string[];

  isCorrect_splotOkresowy: boolean | null;
  showSolution_splotOkresowy: boolean;
  showHelp_splotOkresowy: boolean;
  x_okresowy: number[];
  y_okresowy: number[];
  userAnswers_okresowy: string[];

  // Dyskretne mode (Suma Ważona)
  isCorrect_wzor: boolean | null;
  showSolution_wzor: boolean;
  showHelp_wzor: boolean;
  sumaX_wzor: number[];
  userSumaCoeffs: string[];
  userSumaShifts: string[];

  isCorrect_energia: boolean | null;
  showSolution_energia: boolean;
  showHelp_energia: boolean;
  sumaX_energia: number[];
  userSumaEnergyAnswer: string;

  // Fourier mode
  isCorrect_dft: boolean | null;
  showSolution_dft: boolean;
  showHelp_dft: boolean;
  fourierX_dft: number[];
  userFourierAnswers: string[];

  isCorrect_idft: boolean | null;
  showSolution_idft: boolean;
  showHelp_idft: boolean;
  fourierX_idft: number[];
  userFourierAnswersIDFT: string[];

  // Probkowanie mode
  isCorrect_nyquist: boolean | null;
  showSolution_nyquist: boolean;
  showHelp_nyquist: boolean;
  probkowanieF1: number;
  probkowanieF2: number;
  probkowanieA1: number;
  probkowanieA2: number;
  userProbkowanieNyquistAnswer: string;

  isCorrect_aliasing: boolean | null;
  showSolution_aliasing: boolean;
  showHelp_aliasing: boolean;
  probkowanieF_in: number;
  probkowanieF_s: number;
  userProbkowanieAliasingAnswer: string;

  // Kwantyzacja mode
  isCorrect_kwantyzacjaKrok: boolean | null;
  showSolution_kwantyzacjaKrok: boolean;
  showHelp_kwantyzacjaKrok: boolean;
  kwantyzacjaUmin: number;
  kwantyzacjaUmax: number;
  kwantyzacjaBitsKrok: number;
  userKwantyzacjaKrok: string;

  isCorrect_kwantyzacjaSqnr: boolean | null;
  showSolution_kwantyzacjaSqnr: boolean;
  showHelp_kwantyzacjaSqnr: boolean;
  kwantyzacjaSqnrBits: number;
  userKwantyzacjaSqnr: string;

  alertMsg: string | null;
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
const TaskControls = ({
  onCheck, onToggleSolution, showSolution, onToggleHelp, showHelp
}: {
  onCheck: () => void, onToggleSolution: () => void, showSolution: boolean, onToggleHelp: () => void, showHelp: boolean
}) => (
  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
    <button className="btn btn-primary" style={{ flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.9rem' }} onClick={onCheck}>
      <ArrowRight size={16} /> Sprawdź
    </button>
    <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.9rem' }} onClick={onToggleSolution}>
      <Eye size={16} /> {showSolution ? 'Ukryj odp.' : 'Odpowiedź'}
    </button>
    <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem 0.25rem', fontSize: '0.9rem' }} onClick={onToggleHelp}>
      <HelpCircle size={16} /> {showHelp ? 'Ukryj' : 'Podpowiedź'}
    </button>
  </div>
);

const TaskResult = ({ isCorrect }: { isCorrect: boolean | null }) => {
  if (isCorrect === null) return null;
  if (isCorrect) return (
    <div className="result-banner result-success" style={{ marginTop: '1rem', padding: '0.75rem', fontSize: '0.9rem' }}>
      <CheckCircle size={20} /> <span style={{ marginLeft: '0.5rem' }}>Świetnie! Poprawna odpowiedź.</span>
    </div>
  );
  return (
    <div className="result-banner result-error" style={{ marginTop: '1rem', padding: '0.75rem', fontSize: '0.9rem' }}>
      <XCircle size={20} /> <span style={{ marginLeft: '0.5rem' }}>Błąd. Spróbuj jeszcze raz!</span>
    </div>
  );
};

const ModalAlert = ({ msg, onClose }: { msg: string | null, onClose: () => void }) => {
  if (!msg) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="lego-panel" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--theme-primary)' }}>
          <XCircle size={64} />
        </div>
        <h2 style={{ fontFamily: 'Bangers', fontSize: '2.5rem', marginTop: 0, color: 'var(--theme-primary)', textShadow: '2px 2px 0 var(--gold), 3px 3px 0 var(--theme-shadow)', letterSpacing: '1px' }}>Uwaga Ninja!</h2>
        <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '1.5rem' }}>{msg}</p>
        <button className="btn btn-primary" style={{ width: '100%', fontSize: '1.25rem', padding: '1rem' }} onClick={onClose}>
          Zrozumiałem
        </button>
      </div>
    </div>
  );
};

const TaskSection = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    marginBottom: '2rem', padding: '1rem',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  }}>
    {children}
  </div>
);

function App() {
  const [state, setState] = useState<AppState>({
    mode: 'splot',

    isCorrect_splotLiniowy: null, showSolution_splotLiniowy: false, showHelp_splotLiniowy: false,
    x_liniowy: [], y_liniowy: [], userAnswers_liniowy: [],

    isCorrect_splotOkresowy: null, showSolution_splotOkresowy: false, showHelp_splotOkresowy: false,
    x_okresowy: [], y_okresowy: [], userAnswers_okresowy: [],

    isCorrect_wzor: null, showSolution_wzor: false, showHelp_wzor: false,
    sumaX_wzor: [], userSumaCoeffs: [], userSumaShifts: [],

    isCorrect_energia: null, showSolution_energia: false, showHelp_energia: false,
    sumaX_energia: [], userSumaEnergyAnswer: '',

    isCorrect_dft: null, showSolution_dft: false, showHelp_dft: false,
    fourierX_dft: [], userFourierAnswers: [],

    isCorrect_idft: null, showSolution_idft: false, showHelp_idft: false,
    fourierX_idft: [], userFourierAnswersIDFT: [],

    isCorrect_nyquist: null, showSolution_nyquist: false, showHelp_nyquist: false,
    probkowanieF1: 0, probkowanieF2: 0, probkowanieA1: 0, probkowanieA2: 0, userProbkowanieNyquistAnswer: '',

    isCorrect_aliasing: null, showSolution_aliasing: false, showHelp_aliasing: false,
    probkowanieF_in: 0, probkowanieF_s: 0, userProbkowanieAliasingAnswer: '',

    isCorrect_kwantyzacjaKrok: null, showSolution_kwantyzacjaKrok: false, showHelp_kwantyzacjaKrok: false,
    kwantyzacjaUmin: 0, kwantyzacjaUmax: 0, kwantyzacjaBitsKrok: 0, userKwantyzacjaKrok: '',

    isCorrect_kwantyzacjaSqnr: null, showSolution_kwantyzacjaSqnr: false, showHelp_kwantyzacjaSqnr: false,
    kwantyzacjaSqnrBits: 0, userKwantyzacjaSqnr: '',

    alertMsg: null,
  });

  const generateProblem = (modeOverride?: AppMode) => {
    const currentMode = modeOverride || state.mode;

    if (currentMode === 'splot') {
      const lenXL = getRandomInt(3, 5); const lenYL = getRandomInt(3, 4);
      const lenXO = getRandomInt(3, 5); const lenYO = getRandomInt(3, 4);

      setState(s => ({
        ...s,
        mode: 'splot',
        x_liniowy: generateArray(lenXL),
        y_liniowy: generateArray(lenYL),
        userAnswers_liniowy: new Array(lenXL + lenYL - 1).fill(''),
        isCorrect_splotLiniowy: null, showSolution_splotLiniowy: false, showHelp_splotLiniowy: false,

        x_okresowy: generateArray(lenXO),
        y_okresowy: generateArray(lenYO),
        userAnswers_okresowy: new Array(Math.max(lenXO, lenYO)).fill(''),
        isCorrect_splotOkresowy: null, showSolution_splotOkresowy: false, showHelp_splotOkresowy: false,
      }));
    } else if (currentMode === 'suma') {
      const lenXWzor = getRandomInt(4, 5);
      const lenXEnergia = getRandomInt(3, 5);

      setState(s => ({
        ...s,
        mode: 'suma',
        sumaX_wzor: generateArray(lenXWzor),
        userSumaCoeffs: new Array(lenXWzor).fill(''),
        userSumaShifts: new Array(lenXWzor - 1).fill(''),
        isCorrect_wzor: null, showSolution_wzor: false, showHelp_wzor: false,

        sumaX_energia: generateArray(lenXEnergia),
        userSumaEnergyAnswer: '',
        isCorrect_energia: null, showSolution_energia: false, showHelp_energia: false,
      }));
    } else if (currentMode === 'fourier') {
      setState(s => ({
        ...s,
        mode: 'fourier',
        fourierX_dft: generateArray(4),
        userFourierAnswers: new Array(4).fill(''),
        isCorrect_dft: null, showSolution_dft: false, showHelp_dft: false,

        fourierX_idft: generateArray(4),
        userFourierAnswersIDFT: new Array(4).fill(''),
        isCorrect_idft: null, showSolution_idft: false, showHelp_idft: false,
      }));
    } else if (currentMode === 'probkowanie') {
      setState(s => ({
        ...s,
        mode: 'probkowanie',
        probkowanieF1: getRandomInt(1, 15) * 10,
        probkowanieF2: getRandomInt(1, 15) * 10,
        probkowanieA1: getRandomInt(2, 9),
        probkowanieA2: getRandomInt(2, 9),
        userProbkowanieNyquistAnswer: '',
        isCorrect_nyquist: null, showSolution_nyquist: false, showHelp_nyquist: false,

        probkowanieF_in: getRandomInt(10, 30) * 10,
        probkowanieF_s: getRandomInt(4, 9) * 10,
        userProbkowanieAliasingAnswer: '',
        isCorrect_aliasing: null, showSolution_aliasing: false, showHelp_aliasing: false,
      }));
    } else if (currentMode === 'kwantyzacja') {
      setState(s => ({
        ...s,
        mode: 'kwantyzacja',
        kwantyzacjaUmin: getRandomInt(-10, -1),
        kwantyzacjaUmax: getRandomInt(1, 10),
        kwantyzacjaBitsKrok: getRandomInt(3, 10),
        userKwantyzacjaKrok: '',
        isCorrect_kwantyzacjaKrok: null, showSolution_kwantyzacjaKrok: false, showHelp_kwantyzacjaKrok: false,

        kwantyzacjaSqnrBits: getRandomInt(6, 16),
        userKwantyzacjaSqnr: '',
        isCorrect_kwantyzacjaSqnr: null, showSolution_kwantyzacjaSqnr: false, showHelp_kwantyzacjaSqnr: false,
      }));
    }
  };

  useEffect(() => {
    generateProblem('splot');
  }, []);

  const switchMode = (mode: AppMode) => {
    generateProblem(mode);
  };

  const handleCheck = (taskType: string) => {
    if (taskType === 'splotLiniowy') {
      const parsed = state.userAnswers_liniowy.map((s) => parseInt(s.trim(), 10));
      if (parsed.some(isNaN)) {
        setState(s => ({ ...s, alertMsg: 'Wypełnij wszystkie okienka poprawnymi liczbami całkowitymi.' }));
        return;
      }
      const correct = calculateLinearConvolution(state.x_liniowy, state.y_liniowy);
      const isMatch = parsed.length === correct.length && parsed.every((val, i) => val === correct[i]);
      setState(s => ({ ...s, isCorrect_splotLiniowy: isMatch }));
    } else if (taskType === 'splotOkresowy') {
      const parsed = state.userAnswers_okresowy.map((s) => parseInt(s.trim(), 10));
      if (parsed.some(isNaN)) {
        setState(s => ({ ...s, alertMsg: 'Wypełnij wszystkie okienka poprawnymi liczbami całkowitymi.' }));
        return;
      }
      const correct = calculateCircularConvolution(state.x_okresowy, state.y_okresowy);
      const isMatch = parsed.length === correct.length && parsed.every((val, i) => val === correct[i]);
      setState(s => ({ ...s, isCorrect_splotOkresowy: isMatch }));
    } else if (taskType === 'wzor') {
      const coeffs = state.userSumaCoeffs.map(s => parseInt(s.trim(), 10));
      const shifts = state.userSumaShifts.map(s => parseInt(s.trim(), 10));

      if (coeffs.some(isNaN) || shifts.some(isNaN)) {
        setState(s => ({ ...s, alertMsg: 'Wypełnij wszystkie okienka poprawnymi liczbami całkowitymi.' }));
        return;
      }
      const coeffsMatch = coeffs.every((val, i) => val === state.sumaX_wzor[i]);
      const shiftsMatch = shifts.every((val, i) => val === i + 1);
      setState(s => ({ ...s, isCorrect_wzor: coeffsMatch && shiftsMatch }));
    } else if (taskType === 'energia') {
      const parsed = parseInt(state.userSumaEnergyAnswer.trim(), 10);
      if (isNaN(parsed)) {
        setState(s => ({ ...s, alertMsg: 'Wpisz poprawną liczbę całkowitą.' }));
        return;
      }
      const correctEnergy = state.sumaX_energia.reduce((acc, val) => acc + val * val, 0);
      setState(s => ({ ...s, isCorrect_energia: parsed === correctEnergy }));
    } else if (taskType === 'dft') {
      const parsed = state.userFourierAnswers.map(parseComplex);
      if (parsed.some(p => p === null)) {
        setState(s => ({ ...s, alertMsg: 'Wprowadź poprawne liczby zespolone (np. 10, -2+2j, -2-2i). Użyj j lub i.' }));
        return;
      }
      const correct = calculateDFT4(state.fourierX_dft);
      const isMatch = parsed.every((p, i) => p!.re === correct[i].re && p!.im === correct[i].im);
      setState(s => ({ ...s, isCorrect_dft: isMatch }));
    } else if (taskType === 'idft') {
      const parsed = state.userFourierAnswersIDFT.map(s => parseInt(s.trim(), 10));
      if (parsed.some(isNaN)) {
        setState(s => ({ ...s, alertMsg: 'Wypełnij wszystkie okienka poprawnymi liczbami całkowitymi.' }));
        return;
      }
      const isMatch = parsed.every((val, i) => val === state.fourierX_idft[i]);
      setState(s => ({ ...s, isCorrect_idft: isMatch }));
    } else if (taskType === 'nyquist') {
      const parsed = parseInt(state.userProbkowanieNyquistAnswer.trim(), 10);
      if (isNaN(parsed)) {
        setState(s => ({ ...s, alertMsg: 'Wpisz poprawną liczbę całkowitą (w Hz).' }));
        return;
      }
      const maxF = Math.max(state.probkowanieF1, state.probkowanieF2);
      const correct = 2 * maxF;
      setState(s => ({ ...s, isCorrect_nyquist: parsed === correct }));
    } else if (taskType === 'aliasing') {
      const parsed = parseInt(state.userProbkowanieAliasingAnswer.trim(), 10);
      if (isNaN(parsed)) {
        setState(s => ({ ...s, alertMsg: 'Wpisz poprawną liczbę całkowitą (w Hz).' }));
        return;
      }
      const correct = Math.abs(state.probkowanieF_in - state.probkowanieF_s * Math.round(state.probkowanieF_in / state.probkowanieF_s));
      setState(s => ({ ...s, isCorrect_aliasing: parsed === correct }));
    } else if (taskType === 'kwantyzacjaKrok') {
      const parsed = parseFloat(state.userKwantyzacjaKrok.trim().replace(',', '.'));
      if (isNaN(parsed)) {
        setState(s => ({ ...s, alertMsg: 'Wpisz poprawną liczbę.' }));
        return;
      }
      const correct = (state.kwantyzacjaUmax - state.kwantyzacjaUmin) / Math.pow(2, state.kwantyzacjaBitsKrok);
      const isMatch = Math.abs(parsed - correct) < 0.05;
      setState(s => ({ ...s, isCorrect_kwantyzacjaKrok: isMatch }));
    } else if (taskType === 'kwantyzacjaSqnr') {
      const parsed = parseFloat(state.userKwantyzacjaSqnr.trim().replace(',', '.'));
      if (isNaN(parsed)) {
        setState(s => ({ ...s, alertMsg: 'Wpisz poprawną liczbę.' }));
        return;
      }
      const correct = 6.02 * state.kwantyzacjaSqnrBits + 1.76;
      const isMatch = Math.abs(parsed - correct) < 0.5; // tolerancja na przyblizenia np x6 zamiast x6.02
      setState(s => ({ ...s, isCorrect_kwantyzacjaSqnr: isMatch }));
    }
  };
  let themeClass = 'theme-kai';
  if (state.mode === 'suma') themeClass = 'theme-jay';
  if (state.mode === 'fourier') themeClass = 'theme-lloyd';
  if (state.mode === 'probkowanie') themeClass = 'theme-cole';
  if (state.mode === 'kwantyzacja') themeClass = 'theme-zane';

  useEffect(() => {
    document.body.className = themeClass;
  }, [themeClass]);

  // Loading safety
  if (state.mode === 'splot' && state.x_liniowy.length === 0) return null;
  if (state.mode === 'suma' && state.sumaX_wzor.length === 0) return null;
  if (state.mode === 'fourier' && state.fourierX_dft.length === 0) return null;
  if (state.mode === 'probkowanie' && state.probkowanieF1 === 0) return null;
  if (state.mode === 'kwantyzacja' && state.kwantyzacjaBitsKrok === 0) return null;

  return (
    <div className={cn("theme-container", themeClass)}>
      <div className="lego-panel">
        <h1 className="title">NinjaCPS</h1>
        <p className="subtitle">"Never put off until tomorrow what can be done today!" ~ Sensei Wu</p>

        <div className="tab-switcher" style={{ marginBottom: '2rem' }}>
          <button className={cn("tab-btn", state.mode === 'splot' && "active")} onClick={() => switchMode('splot')}>
            <NinjaIcon color="#ef4444" darkColor="#991b1b" /> Splot
          </button>
          <button className={cn("tab-btn", state.mode === 'suma' && "active")} onClick={() => switchMode('suma')}>
            <NinjaIcon color="#3b82f6" darkColor="#1e3a8a" /> Dyskretne
          </button>
          <button className={cn("tab-btn", state.mode === 'fourier' && "active")} onClick={() => switchMode('fourier')}>
            <NinjaIcon color="#22c55e" darkColor="#15803d" /> Fourier
          </button>
          <button className={cn("tab-btn", state.mode === 'probkowanie' && "active")} onClick={() => switchMode('probkowanie')}>
            <NinjaIcon color="#334155" darkColor="#0f172a" /> Próbkowanie
          </button>
          <button className={cn("tab-btn", state.mode === 'kwantyzacja' && "active")} onClick={() => switchMode('kwantyzacja')}>
            <NinjaIcon color="#e2e8f0" darkColor="#64748b" /> Kwantyzacja
          </button>
        </div>

        {/* ----------------- SPLOT ----------------- */}
        {state.mode === 'splot' && (
          <>
            {/* Liniowy */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">1. Splot Liniowy</div>
                <div className="array-display">
                  <span className="array-label">x(n) =</span>
                  <span className="array-values">[{state.x_liniowy.join(', ')}]</span>
                </div>
                <div className="array-display">
                  <span className="array-label">y(n) =</span>
                  <span className="array-values">[{state.y_liniowy.join(', ')}]</span>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Twoja odpowiedź (wpisz po jednej liczbie):</label>
                <div className="answers-row">
                  {state.userAnswers_liniowy.map((val, idx) => (
                    <input
                      key={idx} type="text" className="answer-box" value={val}
                      onChange={(e) => {
                        const newAns = [...state.userAnswers_liniowy]; newAns[idx] = e.target.value;
                        setState(s => ({ ...s, userAnswers_liniowy: newAns, isCorrect_splotLiniowy: null }));
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCheck('splotLiniowy'); }}
                    />
                  ))}
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('splotLiniowy')}
                showSolution={state.showSolution_splotLiniowy} onToggleSolution={() => setState(s => ({ ...s, showSolution_splotLiniowy: !s.showSolution_splotLiniowy }))}
                showHelp={state.showHelp_splotLiniowy} onToggleHelp={() => setState(s => ({ ...s, showHelp_splotLiniowy: !s.showHelp_splotLiniowy }))}
              />
              <TaskResult isCorrect={state.isCorrect_splotLiniowy} />

              {state.showHelp_splotLiniowy && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <p><strong>Metoda tabelkowa:</strong> Narysuj tabelę. W nagłówkach kolumn zapisz wartości x(n), a w wierszach y(n). W każdej komórce wpisz iloczyn odpowiadających wartości z nagłówków. Wynikiem są <strong>sumy na przekątnych</strong> (od lewego-górnego rogu po skosie w prawo-w-dół).</p>
                    <p><i>Splot liniowy ma długość N + M - 1.</i></p>
                  </div>
                </div>
              )}

              {state.showSolution_splotLiniowy && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  <span>Odpowiedź: [{calculateLinearConvolution(state.x_liniowy, state.y_liniowy).join(', ')}]</span>
                </div>
              )}
            </TaskSection>

            {/* Okresowy */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">2. Splot Okresowy</div>
                <div className="array-display">
                  <span className="array-label">x(n) =</span>
                  <span className="array-values">[{state.x_okresowy.join(', ')}]</span>
                </div>
                <div className="array-display">
                  <span className="array-label">y(n) =</span>
                  <span className="array-values">[{state.y_okresowy.join(', ')}]</span>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Twoja odpowiedź (wpisz po jednej liczbie):</label>
                <div className="answers-row">
                  {state.userAnswers_okresowy.map((val, idx) => (
                    <input
                      key={idx} type="text" className="answer-box" value={val}
                      onChange={(e) => {
                        const newAns = [...state.userAnswers_okresowy]; newAns[idx] = e.target.value;
                        setState(s => ({ ...s, userAnswers_okresowy: newAns, isCorrect_splotOkresowy: null }));
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCheck('splotOkresowy'); }}
                    />
                  ))}
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('splotOkresowy')}
                showSolution={state.showSolution_splotOkresowy} onToggleSolution={() => setState(s => ({ ...s, showSolution_splotOkresowy: !s.showSolution_splotOkresowy }))}
                showHelp={state.showHelp_splotOkresowy} onToggleHelp={() => setState(s => ({ ...s, showHelp_splotOkresowy: !s.showHelp_splotOkresowy }))}
              />
              <TaskResult isCorrect={state.isCorrect_splotOkresowy} />

              {state.showHelp_splotOkresowy && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <p>Najpierw uzupełnij krótszy ciąg zerami na końcu, tak aby oba miały równą długość L (czyli max(N, M)). Następnie użyj <strong>metody macierzowej</strong>:</p>
                    <ul>
                      <li>Zbuduj macierz z pierwszego sygnału. Pierwsza kolumna to po prostu sygnał x(n). Kolejne kolumny to cykliczne przesunięcie poprzedniej kolumny <strong>w dół</strong> o 1 pozycję.</li>
                      <li>Pomnóż tę macierz przez pionowy wektor drugiego sygnału y(n). Wynikowy wektor to szukany splot Okresowy.</li>
                    </ul>
                  </div>
                </div>
              )}

              {state.showSolution_splotOkresowy && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  <span>Odpowiedź: [{calculateCircularConvolution(state.x_okresowy, state.y_okresowy).join(', ')}]</span>
                </div>
              )}
            </TaskSection>
          </>
        )}

        {/* ----------------- DYSKRETNE (SUMA) ----------------- */}
        {state.mode === 'suma' && (
          <>
            {/* Wzor Task */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">1. Suma Ważona Impulsów Kroneckera</div>
                <div className="array-display">
                  <span className="array-label">x(n) =</span>
                  <span className="array-values">[{state.sumaX_wzor.join(', ')}]</span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Załóż, że początek sygnału zaczyna się od n = 0.</p>
              </div>
              <div className="input-group">
                <label className="input-label">Uzupełnij wzór odpowiednimi liczbami:</label>
                <div className="formula-row" style={{ flexWrap: 'wrap' }}>
                  <span>x(n) = </span>
                  <input type="text" className="formula-input" value={state.userSumaCoeffs[0] || ''}
                    onChange={(e) => { const newC = [...state.userSumaCoeffs]; newC[0] = e.target.value; setState(s => ({ ...s, userSumaCoeffs: newC, isCorrect_wzor: null })); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck('wzor')} />
                  <span>δ(n)</span>
                  {state.sumaX_wzor.slice(1).map((_, idx) => (
                    <React.Fragment key={idx + 1}>
                      <span>+</span>
                      <input type="text" className="formula-input" value={state.userSumaCoeffs[idx + 1] || ''}
                        onChange={(e) => { const newC = [...state.userSumaCoeffs]; newC[idx + 1] = e.target.value; setState(s => ({ ...s, userSumaCoeffs: newC, isCorrect_wzor: null })); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleCheck('wzor')} />
                      <span>δ(n - </span>
                      <input type="text" className="formula-input shift" value={state.userSumaShifts[idx] || ''}
                        onChange={(e) => { const newS = [...state.userSumaShifts]; newS[idx] = e.target.value; setState(s => ({ ...s, userSumaShifts: newS, isCorrect_wzor: null })); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleCheck('wzor')} />
                      <span>)</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('wzor')}
                showSolution={state.showSolution_wzor} onToggleSolution={() => setState(s => ({ ...s, showSolution_wzor: !s.showSolution_wzor }))}
                showHelp={state.showHelp_wzor} onToggleHelp={() => setState(s => ({ ...s, showHelp_wzor: !s.showHelp_wzor }))}
              />
              <TaskResult isCorrect={state.isCorrect_wzor} />

              {state.showHelp_wzor && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <p>Każdy dyskretny sygnał x(n) można zapisać jako sumę przesuniętych impulsów jednostkowych δ(n). Indeks odpowiada przesunięciu w nawiasie δ(n - k), a wartość z tablicy staje się współczynnikiem z przodu.</p>
                  </div>
                </div>
              )}
              {state.showSolution_wzor && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  <span>Odpowiedź: x(n) = {state.sumaX_wzor[0]}δ(n) {state.sumaX_wzor.slice(1).map((val, idx) => `+ ${val}δ(n - ${idx + 1})`).join(' ')}</span>
                </div>
              )}
            </TaskSection>

            {/* Energia Task */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">2. Całkowita Energia Sygnału</div>
                <div className="array-display">
                  <span className="array-label">x(n) =</span>
                  <span className="array-values">[{state.sumaX_energia.join(', ')}]</span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Oblicz całkowitą energię E podanego sygnału.</p>
              </div>
              <div className="input-group">
                <div className="answers-row">
                  <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-dark)' }}>E = </span>
                  <input type="text" className="answer-box" style={{ width: '6rem' }} value={state.userSumaEnergyAnswer || ''}
                    onChange={(e) => setState(s => ({ ...s, userSumaEnergyAnswer: e.target.value, isCorrect_energia: null }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck('energia')} />
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('energia')}
                showSolution={state.showSolution_energia} onToggleSolution={() => setState(s => ({ ...s, showSolution_energia: !s.showSolution_energia }))}
                showHelp={state.showHelp_energia} onToggleHelp={() => setState(s => ({ ...s, showHelp_energia: !s.showHelp_energia }))}
              />
              <TaskResult isCorrect={state.isCorrect_energia} />

              {state.showHelp_energia && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <p>Całkowita energia to po prostu suma kwadratów wszystkich próbek. Podnieś każdą liczbę ze zbioru x(n) do kwadratu (minus zniknie) i dodaj je do siebie.</p>
                  </div>
                </div>
              )}
              {state.showSolution_energia && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  <span>Odpowiedź: E = {state.sumaX_energia.reduce((acc, val) => acc + val * val, 0)}</span>
                </div>
              )}
            </TaskSection>
          </>
        )}

        {/* ----------------- FOURIER ----------------- */}
        {state.mode === 'fourier' && (
          <>
            {/* DFT Task */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">1. Dyskretne Przekształcenie Fouriera (DFT, N=4)</div>
                <div className="array-display">
                  <span className="array-label">x[n] =</span>
                  <span className="array-values">[{state.fourierX_dft.join(', ')}]</span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Wpisz liczby zespolone dla prążków widma (np. -2+2j, 10, -j).</p>
              </div>
              <div className="input-group">
                <div className="answers-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                  {state.userFourierAnswers.map((val, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontFamily: 'Fira Code', fontSize: '1.25rem', width: '4.5rem', fontWeight: 800, whiteSpace: 'nowrap' }}>X[{idx}] = </span>
                      <input type="text" style={{ width: '8rem' }} className="answer-box" value={val}
                        onChange={(e) => { const newAns = [...state.userFourierAnswers]; newAns[idx] = e.target.value; setState(s => ({ ...s, userFourierAnswers: newAns, isCorrect_dft: null })); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCheck('dft'); }} />
                    </div>
                  ))}
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('dft')}
                showSolution={state.showSolution_dft} onToggleSolution={() => setState(s => ({ ...s, showSolution_dft: !s.showSolution_dft }))}
                showHelp={state.showHelp_dft} onToggleHelp={() => setState(s => ({ ...s, showHelp_dft: !s.showHelp_dft }))}
              />
              <TaskResult isCorrect={state.isCorrect_dft} />

              {state.showHelp_dft && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <ul>
                      <li><strong>X[0]</strong> = x[0] + x[1] + x[2] + x[3]</li>
                      <li><strong>X[1]</strong> = (x[0] - x[2]) + j(x[3] - x[1])</li>
                      <li><strong>X[2]</strong> = x[0] - x[1] + x[2] - x[3]</li>
                      <li><strong>X[3]</strong> = (x[0] - x[2]) + j(x[1] - x[3])</li>
                    </ul>
                  </div>
                </div>
              )}
              {state.showSolution_dft && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  {calculateDFT4(state.fourierX_dft).map((c, i) => <div key={i}>X[{i}] = {formatComplex(c)}</div>)}
                </div>
              )}
            </TaskSection>

            {/* IDFT Task */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">2. Odwrotne Dyskretne Przekształcenie Fouriera (IDFT)</div>
                <div className="array-display">
                  <span className="array-label">X[k] =</span>
                  <span className="array-values" style={{ fontSize: '1rem', padding: '0.75rem' }}>
                    [{calculateDFT4(state.fourierX_idft).map(c => formatComplex(c)).join(', ')}]
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Wyznacz oryginalny ciąg x[n] (dla N=4) na podstawie X[k]. Wynik to zwykłe liczby całkowite!</p>
              </div>
              <div className="input-group">
                <div className="answers-row">
                  {state.userFourierAnswersIDFT.map((val, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontFamily: 'Fira Code', fontSize: '1.15rem', fontWeight: 800, whiteSpace: 'nowrap' }}>x[{idx}]=</span>
                      <input type="text" className="answer-box" style={{ width: '4rem', height: '3.5rem', fontSize: '1.25rem' }} value={val}
                        onChange={(e) => { const newAns = [...state.userFourierAnswersIDFT]; newAns[idx] = e.target.value; setState(s => ({ ...s, userFourierAnswersIDFT: newAns, isCorrect_idft: null })); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCheck('idft'); }} />
                    </div>
                  ))}
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('idft')}
                showSolution={state.showSolution_idft} onToggleSolution={() => setState(s => ({ ...s, showSolution_idft: !s.showSolution_idft }))}
                showHelp={state.showHelp_idft} onToggleHelp={() => setState(s => ({ ...s, showHelp_idft: !s.showHelp_idft }))}
              />
              <TaskResult isCorrect={state.isCorrect_idft} />

              {state.showHelp_idft && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <p>Wzory są podobne do DFT, ale zmieniamy znak przed j i dzielimy wszystko przez 4:</p>
                    <ul>
                      <li><strong>x[0]</strong> = 1/4 · (X[0] + X[1] + X[2] + X[3])</li>
                      <li><strong>x[1]</strong> = 1/4 · (X[0] + jX[1] - X[2] - jX[3])</li>
                      <li><strong>x[2]</strong> = 1/4 · (X[0] - X[1] + X[2] - X[3])</li>
                      <li><strong>x[3]</strong> = 1/4 · (X[0] - jX[1] - X[2] + jX[3])</li>
                    </ul>
                  </div>
                </div>
              )}
              {state.showSolution_idft && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  <span>Odpowiedź: x[n] = [{state.fourierX_idft.join(', ')}]</span>
                </div>
              )}
            </TaskSection>
          </>
        )}

        {/* ----------------- PRÓBKOWANIE ----------------- */}
        {state.mode === 'probkowanie' && (
          <>
            {/* Nyquist Task */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">1. Twierdzenie o próbkowaniu (Nyquista)</div>
                <div className="array-display">
                  <span className="array-label" style={{ fontSize: '1.15rem' }}>
                    x(t) = {state.probkowanieA1}sin({state.probkowanieF1 * 2}πt) + {state.probkowanieA2}cos({state.probkowanieF2 * 2}πt)
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Podaj minimalną częstotliwość próbkowania f<sub>s</sub>, aby uniknąć zjawiska aliasingu.</p>
              </div>
              <div className="input-group">
                <div className="answers-row">
                  <input type="text" className="answer-box" style={{ width: '8rem' }} value={state.userProbkowanieNyquistAnswer || ''}
                    onChange={(e) => setState(s => ({ ...s, userProbkowanieNyquistAnswer: e.target.value, isCorrect_nyquist: null }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck('nyquist')} />
                  <span style={{ alignSelf: 'center', fontWeight: 800, fontSize: '1.25rem' }}>Hz</span>
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('nyquist')}
                showSolution={state.showSolution_nyquist} onToggleSolution={() => setState(s => ({ ...s, showSolution_nyquist: !s.showSolution_nyquist }))}
                showHelp={state.showHelp_nyquist} onToggleHelp={() => setState(s => ({ ...s, showHelp_nyquist: !s.showHelp_nyquist }))}
              />
              <TaskResult isCorrect={state.isCorrect_nyquist} />

              {state.showHelp_nyquist && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <p>Minimalne f<sub>s</sub> musi być co najmniej 2x większe niż najwyższa częstotliwość w sygnale (f<sub>max</sub>).</p>
                    <p>Podziel wartość widoczną przed "πt" przez 2, aby uzyskać f dla każdego składnika. Wybierz największe f, a potem pomnóż przez 2. (Zauważ: odpowiedź to po prostu największa liczba przed πt!)</p>
                  </div>
                </div>
              )}
              {state.showSolution_nyquist && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  <span>Odpowiedź: f<sub>s</sub> = {2 * Math.max(state.probkowanieF1, state.probkowanieF2)} Hz</span>
                </div>
              )}
            </TaskSection>

            {/* Aliasing Task */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">2. Zjawisko Aliasingu</div>
                <div className="array-display">
                  <span className="array-label" style={{ fontSize: '1.15rem' }}>
                    f<sub>in</sub> = {state.probkowanieF_in} Hz, f<sub>s</sub> = {state.probkowanieF_s} Hz
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Sygnał próbkowany ze zbyt niską f<sub>s</sub>. Oblicz częstotliwość pozorną (alias).</p>
              </div>
              <div className="input-group">
                <div className="answers-row">
                  <input type="text" className="answer-box" style={{ width: '8rem' }} value={state.userProbkowanieAliasingAnswer || ''}
                    onChange={(e) => setState(s => ({ ...s, userProbkowanieAliasingAnswer: e.target.value, isCorrect_aliasing: null }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck('aliasing')} />
                  <span style={{ alignSelf: 'center', fontWeight: 800, fontSize: '1.25rem' }}>Hz</span>
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('aliasing')}
                showSolution={state.showSolution_aliasing} onToggleSolution={() => setState(s => ({ ...s, showSolution_aliasing: !s.showSolution_aliasing }))}
                showHelp={state.showHelp_aliasing} onToggleHelp={() => setState(s => ({ ...s, showHelp_aliasing: !s.showHelp_aliasing }))}
              />
              <TaskResult isCorrect={state.isCorrect_aliasing} />

              {state.showHelp_aliasing && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <p>Wzór: <strong>f<sub>alias</sub> = | f<sub>in</sub> - N · f<sub>s</sub> |</strong></p>
                    <p>Odejmuj (lub dodawaj) f<sub>s</sub> od f<sub>in</sub> dopóki wynik (bez znaku minus) nie znajdzie się w przedziale od 0 do f<sub>s</sub> / 2.</p>
                  </div>
                </div>
              )}
              {state.showSolution_aliasing && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  <span>Odpowiedź: f<sub>alias</sub> = {Math.abs(state.probkowanieF_in - state.probkowanieF_s * Math.round(state.probkowanieF_in / state.probkowanieF_s))} Hz</span>
                </div>
              )}
            </TaskSection>
          </>
        )}

        {/* ----------------- KWANTYZACJA ----------------- */}
        {state.mode === 'kwantyzacja' && (
          <>
            {/* Krok Task */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">1. Krok Kwantyzacji (Rozdzielczość)</div>
                <div className="array-display">
                  <span className="array-label" style={{ fontSize: '1.15rem' }}>
                    Zakres Napięć: [{state.kwantyzacjaUmin} V, {state.kwantyzacjaUmax} V], Liczba bitów b = {state.kwantyzacjaBitsKrok}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Oblicz krok kwantyzacji Δ.</p>
              </div>
              <div className="input-group">
                <div className="answers-row">
                  <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-dark)' }}>Δ ≈ </span>
                  <input type="text" className="answer-box" style={{ width: '8rem' }} value={state.userKwantyzacjaKrok || ''}
                    onChange={(e) => setState(s => ({ ...s, userKwantyzacjaKrok: e.target.value, isCorrect_kwantyzacjaKrok: null }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck('kwantyzacjaKrok')} />
                  <span style={{ alignSelf: 'center', fontWeight: 800, fontSize: '1.25rem' }}>V</span>
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('kwantyzacjaKrok')}
                showSolution={state.showSolution_kwantyzacjaKrok} onToggleSolution={() => setState(s => ({ ...s, showSolution_kwantyzacjaKrok: !s.showSolution_kwantyzacjaKrok }))}
                showHelp={state.showHelp_kwantyzacjaKrok} onToggleHelp={() => setState(s => ({ ...s, showHelp_kwantyzacjaKrok: !s.showHelp_kwantyzacjaKrok }))}
              />
              <TaskResult isCorrect={state.isCorrect_kwantyzacjaKrok} />

              {state.showHelp_kwantyzacjaKrok && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <p>Aby obliczyć krok kwantyzacji, użyj wzoru: <strong>Δ = (U<sub>max</sub> - U<sub>min</sub>) / 2<sup>b</sup></strong>.</p>
                    <p>Oblicz różnicę między najwyższym i najniższym napięciem, a następnie podziel przez liczbę stanów (2 do potęgi liczby bitów). Aplikacja uzna wynik za poprawny, jeśli pomylisz się o drobną część dziesiętną.</p>
                  </div>
                </div>
              )}
              {state.showSolution_kwantyzacjaKrok && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  <span>Odpowiedź: Δ ≈ {((state.kwantyzacjaUmax - state.kwantyzacjaUmin) / Math.pow(2, state.kwantyzacjaBitsKrok)).toFixed(4)} V</span>
                </div>
              )}
            </TaskSection>

            {/* SQNR Task */}
            <TaskSection>
              <div className="card">
                <div className="operation-type">2. Stosunek Sygnału do Szumu Kwantyzacji (SQNR)</div>
                <div className="array-display">
                  <span className="array-label" style={{ fontSize: '1.15rem' }}>
                    Liczba bitów b = {state.kwantyzacjaSqnrBits}
                  </span>
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Wyznacz teoretyczny SQNR w decybelach (dB) dla przetwornika.</p>
              </div>
              <div className="input-group">
                <div className="answers-row">
                  <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--text-dark)' }}>SQNR ≈ </span>
                  <input type="text" className="answer-box" style={{ width: '8rem' }} value={state.userKwantyzacjaSqnr || ''}
                    onChange={(e) => setState(s => ({ ...s, userKwantyzacjaSqnr: e.target.value, isCorrect_kwantyzacjaSqnr: null }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck('kwantyzacjaSqnr')} />
                  <span style={{ alignSelf: 'center', fontWeight: 800, fontSize: '1.25rem' }}>dB</span>
                </div>
              </div>

              <TaskControls
                onCheck={() => handleCheck('kwantyzacjaSqnr')}
                showSolution={state.showSolution_kwantyzacjaSqnr} onToggleSolution={() => setState(s => ({ ...s, showSolution_kwantyzacjaSqnr: !s.showSolution_kwantyzacjaSqnr }))}
                showHelp={state.showHelp_kwantyzacjaSqnr} onToggleHelp={() => setState(s => ({ ...s, showHelp_kwantyzacjaSqnr: !s.showHelp_kwantyzacjaSqnr }))}
              />
              <TaskResult isCorrect={state.isCorrect_kwantyzacjaSqnr} />

              {state.showHelp_kwantyzacjaSqnr && (
                <div className="sensei-container" style={{ marginTop: '1rem' }}>
                  <SenseiWuIcon className="sensei-avatar" />
                  <div className="help-box">
                    <p>Wzór dla pełnego obciążenia to w przybliżeniu: <strong>SQNR ≈ 6.02 · b + 1.76 [dB]</strong>.</p>
                    <p>Pomnóż liczbę bitów przez 6.02 i dodaj 1.76. Możesz też dla prostoty pomnożyć przez 6. Aplikacja zaakceptuje niewielkie przybliżenia (odchylenie o +- 0.5).</p>
                  </div>
                </div>
              )}
              {state.showSolution_kwantyzacjaSqnr && (
                <div className="solution-box" style={{ marginTop: '1rem' }}>
                  <span>Odpowiedź: SQNR ≈ {(6.02 * state.kwantyzacjaSqnrBits + 1.76).toFixed(2)} dB</span>
                </div>
              )}
            </TaskSection>
          </>
        )}

        <button className="btn btn-secondary" style={{ width: '100%', padding: '1rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }} onClick={() => generateProblem()}>
          <RefreshCw size={24} style={{ marginRight: '0.75rem' }} />
          Wylosuj Nowe Zadania
        </button>
      </div>

      <ModalAlert msg={state.alertMsg} onClose={() => setState(s => ({ ...s, alertMsg: null }))} />
    </div>
  );
}

export default App;
