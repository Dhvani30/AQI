import {useEffect, useState} from 'react';
function App(){
  const [status, setStatus]= useState('loading');
  useEffect(()=>{
    fetch('http://127.0.0.1:8000/health')
      .then(res=>res.json())
      .then(data=>{
        setStatus(data.status);
      })
      .catch(err=>{
        console.error(err);
        setStatus('error');
      });
  }, []);
  return (
    <div>
      <h1>App Status: {status}</h1>
    </div>
  );  
}
export default App;