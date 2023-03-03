import MyReact from "./MyReact";
import { useMemo, useState, useEffect, useCallback } from "./MyReact/render";

/** @jsxRuntime classic */

/** @jsx MyReact.createElement */

const App = () => {
	const [number, setNumber] = useState(0);
	const addNumber = () => {
		setNumber(number + 1);
	}
	return (
		<div title='hello'>
			<button onClick={addNumber}>AddNumber</button>
			<br />
			<span>{number}</span>
		</div>
	);
}

export default App;
