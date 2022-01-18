import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider } from "@material-ui/core/styles";
import  CssBaseline from '@material-ui/core/CssBaseline'
import Layout from './layout';
import theme from './theme';
import { OBSLoadingScreen2 } from './components/OBSLoadingScreen';
import UserGuide from './components/UserGuide';
import { GUIDE } from './helpers/const/storage.const';
function App() {
  const [isGuide, setGuide] = useState(true);
  useEffect(() => {
    if (localStorage.getItem(GUIDE)) {
      setGuide(false);
    }
    return () => {

    }
  }, [])
  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <OBSLoadingScreen2>
          {isGuide ? <UserGuide /> : ''}
          <Layout />
        </OBSLoadingScreen2>
      </ThemeProvider>
    </React.StrictMode>
  );
}

export default App;
