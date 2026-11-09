import Navbar from './Navbar';
import Sidebar from './Sidebar';

function App() {
  return (
    <div>
      <Navbar />
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ padding: '2rem', flex: 1 }}>
          <h1>Welcome to your Dashboard</h1>
          <p>Current Location: Loading...</p>
          <p>Current AQI: Loading...</p>
        </main>
      </div>
    </div>
  );
}
export default App;