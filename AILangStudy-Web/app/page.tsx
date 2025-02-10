'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

import { useAuth } from './contexts/AuthContext';
import AnalysisModal from './components/AnalysisModal';
import { ThemeToggle } from './components/ThemeToggle';
import { functions } from './lib/firebase';
import { httpsCallable } from 'firebase/functions';

interface AnalysisResult {
  analysis: {
    vocabulary: Array<{
      word: string;
      reading?: string;
      meaning: string;
      example: string;
      exampleTranslation: string;
    }>;
    grammar: Array<{
      pattern: string;
      explanation: string;
      example: string;
      exampleTranslation: string;
    }>;
    contextAnalysis: string;
    notes: string[];
  };
  context: {
    before: string;
    selected: string;
    after: string;
  };
}

interface Article {
  id: string;
  uid: string;
  topic: string;
  sourceLang: string;
  targetLang: string;
  text: string;
  createdAt: Timestamp;
}

const SUPPORTED_LANGUAGES = [
  { code: 'ja', name: '日本語' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'ko', name: '한国語' },
  { code: 'zh', name: '中文' },
];

export default function Home() {
  const [sourceLang, setSourceLang] = useState('ja');
  const [targetLang, setTargetLang] = useState('en');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTextInfo, setSelectedTextInfo] = useState<{
    text: string;
    startIndex: number;
    endIndex: number;
  } | null>(null);

  const { user } = useAuth();

  // テキスト選択時のハンドラー
  const handleTextSelect = () => {
    const selection = window.getSelection();
    if (!selection) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // 選択範囲が本文エリア内にあるか確認
    const contentArea = document.querySelector('[data-content-text="true"]');
    if (!contentArea) return;

    const range = selection.getRangeAt(0);
    const isSelectionInContent = contentArea.contains(range.commonAncestorContainer);
    if (!isSelectionInContent) return;

    setSelectedTextInfo({
      text: selectedText,
      startIndex: selection.anchorOffset,
      endIndex: selection.focusOffset
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    try {
      const createArticle = httpsCallable(functions, 'createArticle');
      const result = await createArticle({
        topic,
        sourceLang,
        targetLang,
        uid: user.uid
      });
      setContent(result.data as Article);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const regenerateContent = httpsCallable(functions, 'regenerateContent');
      const result = await regenerateContent({
        topic,
        sourceLang,
        targetLang,
        uid: user.uid
      });
      setContent(result.data as Article);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSelection = async () => {
    if (!user || !selectedTextInfo) {
      alert('テキストを選択してから解説ボタンを押してください。');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analyzeText = httpsCallable(functions, 'analyzeText');
      const result = await analyzeText({
        articleId: content?.id,
        selectedText: selectedTextInfo.text,
        startIndex: selectedTextInfo.startIndex,
        endIndex: selectedTextInfo.endIndex
      });
      setAnalysisResult(result.data as AnalysisResult);
      setAnalysisModalOpen(true);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">AILangStudy</h1>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-600 dark:text-gray-300 mb-1">母国語</span>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white [&>option]:dark:text-white"
              >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
              </select>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-600 dark:text-gray-300 mb-1">学習したい言語</span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white [&>option]:dark:text-white"
              >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 p-4">
        {/* Topic Input */}
        {!content && (
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mt-8">
            <div className="text-center mb-8">
              <h2 className="text-xl mb-4">あなたの好きなテーマを教えて下さい</h2>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border rounded p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="例：旅行、料理、スポーツなど"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? '生成中...' : '生成する'}
              </button>
            </div>
          </form>
        )}

        {/* Content Display */}
        {content && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl">テーマ：{topic}</h2>
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              >
                {isLoading ? '再生成中...' : '再生成'}
              </button>
            </div>

            <div className="space-y-8" style={{ cursor: isAnalyzing ? 'wait' : 'auto' }}>
              {/* Main Text */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow relative" data-content-area="main">
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow-lg dark:text-white">
                      解説作成中...
                    </div>
                  </div>
                )}
                <h3 className="text-lg font-bold mb-4">本文</h3>
                <div 
                className="prose dark:prose-invert max-w-none" 
                data-content-text="true"
                onMouseUp={handleTextSelect}
                onTouchEnd={handleTextSelect}
              >
                  <ReactMarkdown>{content.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* フローティング解説ボタン */}
      {content && (
        <div className="fixed bottom-8 right-8">
          <button
            onClick={handleTextSelection}
            disabled={isAnalyzing}
            className="bg-blue-500 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-600 disabled:opacity-50 transition-all duration-200 hover:shadow-xl"
          >
            {isAnalyzing ? '解説作成中...' : '選択部分を解説'}
          </button>
        </div>
      )}

      <AnalysisModal
        isOpen={analysisModalOpen}
        onClose={() => setAnalysisModalOpen(false)}
        analysis={analysisResult}
      />
    </div>
  );
}
