import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import OffBeat from "./OffBeat";
import Playlist from "./Playlist";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OffBeat />} />
        <Route path="/playlists" element={<Playlist />} />
      </Routes>
    </Router>
  );
}

export default App;