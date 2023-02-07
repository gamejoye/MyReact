import React from "react";
import MyReact from "./MyReact";
import { useMemo, useState, useEffect, useCallback } from "./MyReact/render";
/** @jsxRuntime classic */

/** @jsx MyReact.createElement */

const SubApp =
	({ addNumber }) => {
		console.log('SubApp 渲染');
		return (
			<button onClick={addNumber}>AddNumber</button>
		)
	}

const App = () => {
	const [number, setNumber] = useState(0);
	const [helloVisiable, setHelloVisiable] = useState(true);
	const addNumber = () => {
		setNumber(number+1);
	};
	return (
		<div title='hello'>
			number: <b>{number}</b>
			<button onClick={addNumber}>AddNumber</button>
			<button onClick={() => setHelloVisiable(!helloVisiable)}>{helloVisiable ? 'hidden' : 'show'}</button>
			{helloVisiable ? <p>hello</p> : null}
			<div>
				<div>
					divdiv
				</div>
			</div>
		</div>
	);
}

export default App;
