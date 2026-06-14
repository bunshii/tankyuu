import React, { useState, useEffect } from "react";

// 型定義（エラーを防ぐためのお守り）
interface Todo { id: number; text: string; completed: boolean; }
interface Friend { id: number; name: string; isDiving: boolean; }

export default function App() {
  // --- 状態管理（ステート） ---
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [newFriend, setNewFriend] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatLog, setChatLog] = useState<{ sender: string; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. 目的地（Todo）の機能 ---
  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now(), text: newTodo, completed: false }]);
    setNewTodo("");
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // --- 2. 仲間（Friends）の機能 ---
  const addFriend = () => {
    if (!newFriend.trim()) return;
    setFriends([...friends, { id: Date.now(), name: newFriend, isDiving: false }]);
    newFriend && setFriends([...friends, { id: Date.now(), name: newFriend, isDiving: false }]);
    setNewFriend("");
  };

  // --- 3. 羅針盤（Cloudflare AIチャット）の機能 ---
  const sendToAI = async () => {
    if (!chatMessage.trim() || isLoading) return;

    const userMsg = chatMessage;
    setChatLog(prev => [...prev, { sender: "あなた", text: userMsg }]);
    setChatMessage("");
    setIsLoading(true);

    try {
      // 💡 さっき開通させた自前のVercel API（/api/chat）に通信を飛ばすぜ！
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await response.json();
      
      setChatLog(prev => [...prev, { sender: "OCEANCOMPASS", text: data.reply }]);
    } catch (error) {
      setChatLog(prev => [...prev, { sender: "システム", text: "通信に失敗したぜ…" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ color: "#0070f3", borderBottom: "2px solid #0070f3", paddingBottom: "10px" }}>
        🧭 OCEANCOMPASS (試作版)
      </h1>

      {/* --- Todoエリア --- */}
      <section style={{ marginBottom: "30px" }}>
        <h3>📍 目的地の管理 (Todos)</h3>
        <input value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="新しい目的地を入力..." />
        <button onClick={addTodo}>追加</button>
        <ul>
          {todos.map(t => (
            <li key={t.id} onClick={() => toggleTodo(t.id)} style={{ textDecoration: t.completed ? "line-through" : "none", cursor: "pointer" }}>
              {t.text} {t.completed ? "✅" : "⏳"}
            </li>
          ))}
        </ul>
      </section>

      {/* --- Friendsエリア --- */}
      <section style={{ marginBottom: "30px" }}>
        <h3>🏴‍☠️ 旅の仲間 (Friends)</h3>
        <input value={newFriend} onChange={(e) => setNewFriend(e.target.value)} placeholder="仲間の名前を入力..." />
        <button onClick={addFriend}>合流</button>
        <ul>
          {friends.map(f => (
            <li key={f.id}>{f.name} {f.isDiving ? "🤿 (潜水中)" : "⛵ (待機中)"}</li>
          ))}
        </ul>
      </section>

      {/* --- AIチャットエリア --- */}
      <section style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "8px" }}>
        <h3>🔮 羅針盤のささやき (AI Chat)</h3>
        <div style={{ height: "20px", overflowY: "auto", border: "1px solid #eee", padding: "10px", marginBottom: "10px", background: "#f9f9f9" }}>
          {chatLog.map((log, index) => (
            <p key={index}><strong>{log.sender}:</strong> {log.text}</p>
          ))}
          {isLoading && <p style={{ color: "gray" }}>羅針盤が思考中...</p>}
        </div>
        <input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendToAI()} placeholder="羅針盤に問いかける..." style={{ width: "70%", marginRight: "5px" }} />
        <button onClick={sendToAI} disabled={isLoading}>送信</button>
      </section>
    </div>
  );
}
