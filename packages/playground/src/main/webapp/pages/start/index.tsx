import React from 'react';
import ReactDOM from 'react-dom';
import { ThemeProvider } from '../../common';
import { StartPage } from './StartPage';

ReactDOM.render(
  <ThemeProvider>
    <StartPage />
  </ThemeProvider>,
  document.getElementById('root')
);
