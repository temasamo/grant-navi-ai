"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: number;
  type: 'ai' | 'user';
  text: string;
  options?: string[];
  timestamp: Date;
}

export default function DiagnosePage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const questions = [
    {
      text: "こんにちは！助成金診断を始めますね。いくつかお伺いします。",
      options: null
    },
    {
      text: "まず、事業形態を教えてください。",
      options: ["個人事業主", "法人（株式会社・合同会社など）"]
    },
    {
      text: "従業員数はどのくらいですか？",
      options: ["1〜5人", "6〜20人", "21人以上"]
    },
    {
      text: "今後の取組予定はありますか？",
      options: ["新規採用を予定", "パートを正社員化", "社員研修を予定", "テレワーク・DX導入"]
    },
    {
      text: "助成金申請のサポート希望はありますか？",
      options: ["自分で申請したい", "専門家に相談したい"]
    },
    {
      text: "ありがとうございます！診断結果を準備しますね。",
      options: null
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 初回メッセージ
    const initialMessage: Message = {
      id: 1,
      type: 'ai',
      text: questions[0].text,
      timestamp: new Date()
    };
    setMessages([initialMessage]);
    setCurrentQuestion(1);
  }, []);

  const handleOptionSelect = async (option: string) => {
    // ユーザーの回答を追加
    const userMessage: Message = {
      id: messages.length + 1,
      type: 'user',
      text: option,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setAnswers(prev => ({ ...prev, [currentQuestion]: option }));

    // 次の質問を準備
    if (currentQuestion < questions.length - 1) {
      setIsTyping(true);
      
      setTimeout(() => {
        setIsTyping(false);
        const nextQuestion = currentQuestion + 1;
        const aiMessage: Message = {
          id: messages.length + 2,
          type: 'ai',
          text: questions[nextQuestion].text,
          options: questions[nextQuestion].options || undefined,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setCurrentQuestion(nextQuestion);

        // 最後の質問の場合、AI診断を実行
        if (nextQuestion === questions.length - 1) {
          setTimeout(() => {
            handleAIDiagnosis();
          }, 2000);
        }
      }, 1500);
    }
  };

  const handleAIDiagnosis = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const data = await res.json();
      localStorage.setItem("grantResult", JSON.stringify(data.results));
      router.push("/diagnose/results");
    } catch (error) {
      console.error("AI診断エラー:", error);
      alert("AI診断でエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <h1 className="text-lg font-semibold text-center text-gray-900">助成金診断AI</h1>
      </div>

      {/* チャットエリア */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">AIが診断中です...</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white rounded-br-md'
                      : 'bg-white text-gray-800 rounded-bl-md shadow-sm border'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
              </div>
            ))}

            {/* 入力中表示 */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* 選択肢 */}
            {messages.length > 0 && 
             messages[messages.length - 1].type === 'ai' && 
             questions[currentQuestion]?.options && 
             !isTyping && (
              <div className="space-y-2">
                {questions[currentQuestion].options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(option)}
                    className="w-full text-left bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 hover:border-blue-300 transition-colors text-gray-800 font-medium"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>
    </main>
  );
}
