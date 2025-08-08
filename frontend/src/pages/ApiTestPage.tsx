import React, { useState } from 'react';
import { API_CONFIG } from '../config/api';

const ApiTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    const baseUrl = API_CONFIG.BASE_URL;
    console.log('🔍 Начинаем тестирование API...');
    console.log('🌐 Base URL:', baseUrl);
    
    const tests = [
      {
        name: 'Test endpoint (fetch)',
        url: `${baseUrl}test/`,
        method: 'GET',
        useFetch: true
      },
      {
        name: 'Menu endpoint (fetch)',
        url: `${baseUrl}menu/`,
        method: 'GET',
        useFetch: true
      },
      {
        name: 'Test endpoint (XMLHttpRequest)',
        url: `${baseUrl}test/`,
        method: 'GET',
        useFetch: false
      }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        console.log(`📋 Тестируем: ${test.name}`);
        
        if (test.useFetch) {
          const response = await fetch(test.url, {
            method: test.method,
            headers: {
              'ngrok-skip-browser-warning': 'true',
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const data = await response.text();
            console.log(`✅ ${test.name}: УСПЕХ (${response.status})`);
            console.log(`📄 Ответ: ${data.substring(0, 100)}...`);
            results.push({ 
              test: test.name, 
              success: true, 
              status: response.status,
              data: data.substring(0, 200)
            });
          } else {
            console.log(`❌ ${test.name}: ОШИБКА (${response.status})`);
            results.push({ test: test.name, success: false, status: response.status });
          }
        } else {
          // Тест с XMLHttpRequest
          const xhr = new XMLHttpRequest();
          xhr.open(test.method, test.url, true);
          xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
          xhr.setRequestHeader('Content-Type', 'application/json');
          
          const result = await new Promise((resolve) => {
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log(`✅ ${test.name}: УСПЕХ (${xhr.status})`);
                resolve({ 
                  test: test.name, 
                  success: true, 
                  status: xhr.status,
                  data: xhr.responseText.substring(0, 200)
                });
              } else {
                console.log(`❌ ${test.name}: ОШИБКА (${xhr.status})`);
                resolve({ test: test.name, success: false, status: xhr.status });
              }
            };
            
            xhr.onerror = () => {
              console.log(`❌ ${test.name}: СЕТЕВАЯ ОШИБКА`);
              resolve({ test: test.name, success: false, error: 'Network Error' });
            };
            
            xhr.send();
          });
          
          results.push(result);
        }
      } catch (error: any) {
        console.log(`❌ ${test.name}: ИСКЛЮЧЕНИЕ - ${error.message}`);
        results.push({ test: test.name, success: false, error: error.message });
      }
    }
    
    console.log('📊 Результаты тестирования:', results);
    setTestResults(results);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>🔍 Тестирование API</h1>
        <button 
          onClick={() => window.location.href = window.location.pathname}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ← Вернуться к приложению
        </button>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Конфигурация:</h3>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
          {JSON.stringify({
            BASE_URL: API_CONFIG.BASE_URL,
            ENV: API_CONFIG.ENV,
            TIMEOUT: API_CONFIG.TIMEOUT
          }, null, 2)}
        </pre>
      </div>
      
      <button 
        onClick={runTests}
        disabled={loading}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Тестируем...' : 'Запустить тесты'}
      </button>
      
      {testResults.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Результаты тестирования:</h3>
          {testResults.map((result, index) => (
            <div 
              key={index}
              style={{
                padding: '10px',
                margin: '5px 0',
                border: '1px solid #ddd',
                borderRadius: '5px',
                backgroundColor: result.success ? '#d4edda' : '#f8d7da'
              }}
            >
              <strong>{result.test}</strong>
              <br />
              Статус: {result.success ? '✅ УСПЕХ' : '❌ ОШИБКА'}
              {result.status && <span> (HTTP {result.status})</span>}
              {result.error && <span> - {result.error}</span>}
              {result.data && (
                <div style={{ marginTop: '5px', fontSize: '12px' }}>
                  <strong>Ответ:</strong> {result.data}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApiTestPage; 