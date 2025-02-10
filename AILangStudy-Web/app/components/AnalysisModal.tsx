'use client';

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

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AnalysisResult | null;
}

export default function AnalysisModal({ isOpen, onClose, analysis }: AnalysisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">テキスト解析</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {analysis?.analysis && (
          <div className="space-y-6">
            {/* Selected Text Context */}
            <div>
              <h4 className="font-bold mb-2">選択したテキスト</h4>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <span className="text-gray-600 dark:text-gray-300">{analysis.context.before}</span>
                <span className="font-bold bg-yellow-100 dark:bg-yellow-900 px-1">{analysis.context.selected}</span>
                <span className="text-gray-600 dark:text-gray-300">{analysis.context.after}</span>
              </div>
            </div>

            {/* Context Analysis */}
            <div>
              <h4 className="font-bold mb-2">文脈の説明</h4>
              <div className="text-gray-600 dark:text-gray-300">
                {analysis.analysis.contextAnalysis}
              </div>
            </div>
            {/* Vocabulary */}
            {analysis.analysis.vocabulary && (
              <div>
                <h4 className="font-bold mb-2">単語</h4>
                <div className="space-y-3">
                  {analysis.analysis.vocabulary.map((item, index) => (
                    <div key={index} className="border-b dark:border-gray-600 pb-2">
                      <div className="font-semibold">{item.word}</div>
                      {item.reading && (
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          読み方: {item.reading}
                        </div>
                      )}
                      <div className="text-gray-600 dark:text-gray-300">{item.meaning}</div>
                      <div className="mt-1 text-sm">
                        <div>{item.example}</div>
                        <div className="text-gray-600 dark:text-gray-300">{item.exampleTranslation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grammar */}
            {analysis.analysis.grammar && (
              <div>
                <h4 className="font-bold mb-2">文法</h4>
                <div className="space-y-3">
                  {analysis.analysis.grammar.map((item, index) => (
                    <div key={index} className="border-b dark:border-gray-600 pb-2">
                      <div className="font-semibold">{item.pattern}</div>
                      <div className="text-gray-600 dark:text-gray-300">{item.explanation}</div>
                      <div className="mt-1 text-sm">
                        <div>{item.example}</div>
                        <div className="text-gray-600 dark:text-gray-300">{item.exampleTranslation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {analysis.analysis.notes && (
              <div>
                <h4 className="font-bold mb-2">補足</h4>
                <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                  {analysis.analysis.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
