import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom";
import "./index.css";
//import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "./react-i18next-config";

const App = lazy(() => import("./App"));
const CropTopLevel = lazy(() => import("./layout/CropTopLevel"));

let url = new URL(window.location.href);
let params = new URLSearchParams(url.search);

ReactDOM.render(
  <React.StrictMode>
    {params.get("type") === "crop" ? (
      <Suspense fallback={<div></div>}>
        <CropTopLevel />
      </Suspense>
    ) : (
      <Suspense fallback={<div></div>}>
        <App />
      </Suspense>
    )}
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
