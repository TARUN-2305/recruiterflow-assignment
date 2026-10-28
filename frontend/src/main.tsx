import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router';
import { App } from './app/App';
import { browserStorage, createAppStore } from './services/persistence';
import './styles/app.css';

const container = document.getElementById('root');
if (container === null) throw new Error('index.html is missing the #root element');

const store = createAppStore(browserStorage());

createRoot(container).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
