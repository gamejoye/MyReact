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
	//console.log('App 渲染')
	const [number, setNumber] = useState(0);
	const addNumber = useCallback(() => {
		//console.log(`被点了 number:${number}`)
		setNumber(number+1);
	}, []);
	return (
		<div title='hello'>
			number: <b>{number}</b> <br />
			<SubApp addNumber={addNumber} />
		</div>
	);
}

export default App;
