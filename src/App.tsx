import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, XCircle, RefreshCw, Eye, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type ConvolutionType = 'Liniowy' | 'Okresowy';
type AppMode = 'splot' | 'suma' | 'fourier';

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
  fourierX: number[];
  userFourierAnswers: string[];
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

// Complex number parser and formatter
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
    fourierX: [],
    userFourierAnswers: [],
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
      const fourierX = generateArray(4); // Typically N=4

      setState(s => ({
        ...s,
        mode: 'fourier',
        fourierX,
        userFourierAnswers: new Array(4).fill(''),
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
      const parsed = state.userFourierAnswers.map(parseComplex);
      if (parsed.some(p => p === null)) {
        alert('Wprowadź poprawne liczby zespolone (np. 10, -2+2j, -2-2i). Użyj j lub i.');
        return;
      }
      const correct = calculateDFT4(state.fourierX);
      const isMatch = parsed.every((p, i) => p!.re === correct[i].re && p!.im === correct[i].im);
      setState(s => ({ ...s, isCorrect: isMatch }));
    }
  };

  if (state.mode === 'splot' && state.x.length === 0) return null;
  if (state.mode === 'suma' && state.sumaX.length === 0) return null;
  if (state.mode === 'fourier' && state.fourierX.length === 0) return null;

  return (
    <div className="glass-panel">
      <h1 className="title">NinjaCPS</h1>
      <p className="subtitle">"Never put off until tomorrow what can be done today!" ~ Sensei Wu</p>

      <div className="tab-switcher" style={{ flexWrap: 'wrap' }}>
        <button
          className={cn("tab-btn", state.mode === 'splot' && "active")}
          onClick={() => switchMode('splot')}
        >
          Operacje Splotu
        </button>
        <button
          className={cn("tab-btn", state.mode === 'suma' && "active")}
          onClick={() => switchMode('suma')}
        >
          Suma Ważona
        </button>
        <button
          className={cn("tab-btn", state.mode === 'fourier' && "active")}
          onClick={() => switchMode('fourier')}
        >
          Przekształcenie Fouriera
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
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
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

      {state.mode === 'fourier' && (
        <>
          <div className="card">
            <div className="operation-type">
              Dyskretne Przekształcenie Fouriera (N=4)
            </div>
            <div className="array-display">
              <span className="array-label">x[n] =</span>
              <span className="array-values">[{state.fourierX.join(', ')}]</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
              Wpisz liczby zespolone dla prążków widma. Używaj "i" lub "j" (np. -2+2j, 10, -j).
            </p>
          </div>
          <div className="input-group">
            <label className="input-label">Twoje odpowiedzi dla X[k]:</label>
            <div className="answers-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '1rem' }}>
              {state.userFourierAnswers.map((val, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontFamily: 'monospace', color: '#a78bfa', fontSize: '1.25rem', width: '3rem' }}>X[{idx}] = </span>
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

      <div className="btn-group" style={{ marginTop: '1rem' }}>
        <button className="btn btn-primary" onClick={handleCheck}>
          <ArrowRight size={20} />
          Sprawdź
        </button>
        <button className="btn btn-secondary" onClick={() => setState(s => ({ ...s, showSolution: !s.showSolution }))}>
          <Eye size={20} />
          {state.showSolution ? 'Ukryj rozwiązanie' : 'Pokaż rozwiązanie'}
        </button>
        <button className="btn btn-secondary" onClick={() => setState(s => ({ ...s, showHelp: !s.showHelp }))}>
          <HelpCircle size={20} />
          {state.showHelp ? 'Ukryj podpowiedź' : 'Jak to policzyć?'}
        </button>
        <button className="btn btn-secondary" onClick={() => generateProblem()}>
          <RefreshCw size={20} />
          Nowe zadanie
        </button>
      </div>

      {state.showHelp && (
        <div className="help-box">
          <h3>Podręcznik CPS</h3>

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
              <p>Dowolny dyskretny sygnał x(n) można zapisać za pomocą sumy przesuniętych w czasie impulsów jednostkowych δ(n) pomnożonych przez wartości sygnału w tych punktach.</p>
              <p>Zatem dla każdego indeksu n wartość sygnału x(n) staje się współczynnikiem przed δ, a sam indeks wyznacza przesunięcie w nawiasie δ(n - k).</p>
            </div>
          )}

          {state.mode === 'fourier' && (
            <div className="help-section">
              <h4>Dyskretne Przekształcenie Fouriera (N=4)</h4>
              <p>Dla sygnału x[n] o długości N=4, korzystamy ze skróconych wzorów:</p>
              <ul>
                <li><strong>X[0]</strong> = x[0] + x[1] + x[2] + x[3]</li>
                <li><strong>X[1]</strong> = (x[0] - x[2]) + j(x[3] - x[1])</li>
                <li><strong>X[2]</strong> = x[0] - x[1] + x[2] - x[3]</li>
                <li><strong>X[3]</strong> = (x[0] - x[2]) + j(x[1] - x[3])</li>
              </ul>
              <p><i>Pamiętaj, że j (lub i) to jednostka urojona.</i></p>
            </div>
          )}
        </div>
      )}

      {state.isCorrect === true && (
        <div className="result-banner result-success">
          <CheckCircle size={24} />
          <span>Świetnie! Twoja odpowiedź jest w 100% poprawna.</span>
        </div>
      )}

      {state.isCorrect === false && (
        <div className="result-banner result-error">
          <XCircle size={24} />
          <span>Niestety, odpowiedź jest błędna. Spróbuj jeszcze raz!</span>
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
          {state.mode === 'fourier' && (
            <span>
              Prawidłowa odpowiedź: <br />
              {calculateDFT4(state.fourierX).map((c, i) => <div key={i}>X[{i}] = {formatComplex(c)}</div>)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
