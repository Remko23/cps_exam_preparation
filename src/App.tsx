import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, XCircle, RefreshCw, Eye, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for class merging if needed
export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type ConvolutionType = 'Liniowy' | 'Okresowy';

interface AppState {
  x: number[];
  y: number[];
  type: ConvolutionType;
  userAnswers: string[];
  isCorrect: boolean | null;
  showSolution: boolean;
  showHelp: boolean;
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

function App() {
  const [state, setState] = useState<AppState>({
    x: [],
    y: [],
    type: 'Liniowy',
    userAnswers: [],
    isCorrect: null,
    showSolution: false,
    showHelp: false,
  });

  const generateProblem = () => {
    // Lengths between 3 and 5
    const lenX = getRandomInt(3, 5);
    const lenY = getRandomInt(3, 4);
    const type: ConvolutionType = Math.random() > 0.5 ? 'Liniowy' : 'Okresowy';

    const expectedLen = type === 'Liniowy' ? lenX + lenY - 1 : Math.max(lenX, lenY);

    setState({
      x: generateArray(lenX),
      y: generateArray(lenY),
      type,
      userAnswers: new Array(expectedLen).fill(''),
      isCorrect: null,
      showSolution: false,
      showHelp: false,
    });
  };

  // Generate on first mount
  useEffect(() => {
    generateProblem();
  }, []);

  const getCorrectAnswer = () => {
    if (state.type === 'Liniowy') {
      return calculateLinearConvolution(state.x, state.y);
    } else {
      return calculateCircularConvolution(state.x, state.y);
    }
  };

  const handleCheck = () => {
    // Parse user input from array of strings
    const parsed = state.userAnswers.map((s) => parseInt(s.trim(), 10));

    // Check if valid numbers
    if (parsed.some(isNaN)) {
      alert('Wypełnij wszystkie okienka poprawnymi liczbami całkowitymi.');
      return;
    }

    const correct = getCorrectAnswer();

    // Check lengths and values
    const isMatch = parsed.length === correct.length && parsed.every((val, i) => val === correct[i]);

    setState(s => ({ ...s, isCorrect: isMatch }));
  };

  const handleAnswerChange = (index: number, value: string) => {
    setState(s => {
      const newAnswers = [...s.userAnswers];
      newAnswers[index] = value;
      return { ...s, userAnswers: newAnswers, isCorrect: null };
    });
  };

  if (state.x.length === 0) return null;

  return (
    <div className="glass-panel">
      <h1 className="title">Trening Splotu</h1>
      <p className="subtitle">Cyfrowe Przetwarzanie Sygnałów</p>

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
              onChange={(e) => handleAnswerChange(idx, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCheck();
              }}
            />
          ))}
        </div>
      </div>

      <div className="btn-group">
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
        <button className="btn btn-secondary" onClick={generateProblem}>
          <RefreshCw size={20} />
          Nowe zadanie
        </button>
      </div>

      {state.showHelp && (
        <div className="help-box">
          <h3>Jak policzyć splot na kartce?</h3>

          <div className="help-section">
            <h4>1. Splot Liniowy (długość N + M - 1)</h4>
            <p><strong>Metoda tabelkowa:</strong> Narysuj tabelę. W nagłówkach kolumn zapisz wartości $x(n)$, a w wierszach $y(n)$. W każdej komórce wpisz iloczyn odpowiadających wartości z nagłówków. Wynikiem są <strong>sumy na przekątnych</strong> (od lewego-górnego rogu po skosie w prawo-w-dół).</p>
          </div>

          <div className="help-section">
            <h4>2. Splot Okresowy (długość = max(N, M))</h4>
            <p>Najpierw uzupełnij krótszy ciąg zerami na końcu, tak aby oba miały długość $L$. Następnie użyj <strong>metody macierzowej</strong>:</p>
            <ul>
              <li>Zbuduj macierz $L \times L$ z pierwszego sygnału. Pierwsza kolumna to po prostu sygnał $x(n)$. Kolejne kolumny to cykliczne przesunięcie poprzedniej kolumny <strong>w dół</strong> o 1 pozycję.</li>
              <li>Pomnóż tę macierz przez pionowy wektor drugiego sygnału $y(n)$. Wynikowy wektor to szukany splot Okresowy.</li>
            </ul>
          </div>
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
          Prawidłowa odpowiedź: [{getCorrectAnswer().join(', ')}]
        </div>
      )}
    </div>
  );
}

export default App;
