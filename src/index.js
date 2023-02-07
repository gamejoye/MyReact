import React, { useEffect, useMemo, useState } from 'react';
import MyReact from './MyReact';
import ReactDom from 'react-dom'
import App from './App';
/** @jsxRuntime classic */

/** @jsx MyReact.createElement */



const container = document.getElementById('root');
MyReact.render(
	<App />,
	container
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals