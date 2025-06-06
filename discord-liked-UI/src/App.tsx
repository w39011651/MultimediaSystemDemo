import { useState, useRef, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App()
{
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  

  return (
      <div style = {{display: 'flex', height: '100vh', width: '100vw'}}>
        {/*左側頻道區*/}
        <div style = {{width: '33%', background: '#1d1d1e', color: '#fff', padding: '16px'}}>
          <h3>Text Channel</h3>
          <ul>
            <li>Chat 1</li>
            <li>Chat 1</li>
            <li>Chat 1</li>
          </ul>
          <h3>Audio Channel</h3>
          <ul>
            <li>Channel 1</li>
            <li>Channel 2</li>
            <li>Channel 3</li>
          </ul>
        </div>
        {/* 右側聊天區 */}
        <div style={{flex: 1,display: 'flex', flexDirection: 'column', background:'#1a1a1e'}}>
          <div style = {{flex: 8, overflowY:'auto', padding:'16px', color:'#fff', }}>
            {messages.map((msg, idx) => (
              <div key={idx}>{msg}</div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          {/* 輸入區 */}
          <div style={{ padding: '16px', background: '#222327', display: 'flex' }}>
            <input
              style={{ 
                flex: 1, 
                padding: '8px',
                backgroundColor: '#222327',
                border: 'none',
                color: '#fff',
                outline: 'none'
              }}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type a message..."
              autoComplete="off"
              onKeyDown={e => {
                if (e.key === 'Enter' && input.trim()) {
                  setMessages([...messages, input]);
                  setInput('');
                }
              }}
            />
            <button
              style={{ padding: '8px 16px', marginLeft: '8px' }}
              onClick={() => {
                if (input.trim()) {
                  setMessages([...messages, input]);
                  setInput('');
                }
              }}
            >
              Send
            </button>
          </div>
        </div>
        
        
      </div>
  );
}
export default App;

function myDefault() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

