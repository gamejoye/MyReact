import React from "react";
import MyReact from "./MyReact";
import { useMemo, useState, useEffect, useCallback } from "./MyReact/render";

/** @jsxRuntime classic */

/** @jsx MyReact.createElement */

const App = () => {
	const blogs = [{
		id: '0',
		title: 'hello111',
		content: '123'
	}, {
		id: '1',
		title: 'hello2222',
		content: '1234'
	}, {
		id: '2',
		title: 'hello3333',
		content: '12asdf3'
	}]
	const [number, setNumber] = useState(0);
	const [helloVisiable, setHelloVisiable] = useState(true);
	const [blogItems, setBlogsItems] = useState(blogs.map(
		blog => <div key={blog.id}>{blog.title}</div>
	));
	const addNumber = () => {
		setNumber(number + 1);
	};
	const changeBlogItems = () => {
		if(blogItems.length == 3) {
			setBlogsItems([<div key={'3'}>
				gamejoye is sb
			</div>, ...blogItems]);
		} else {
			setBlogsItems(blogs.map(
				blog => <div key={blog.id}>{blog.title}</div>
			));
		}
	}
	return (
		<div title='hello'>
			<button onClick={addNumber}>add</button>
			<br />
			<button onClick={() => setHelloVisiable(!helloVisiable)}>{helloVisiable ? 'hidden' : 'show'}Hello</button>
			<br />
			<button onClick={changeBlogItems}>addBlogItem</button>
			<br />
			{number}
			{helloVisiable
				? <h1>hello</h1>
				: <h2>hello H222</h2>}
			{blogItems}
		</div>
	);
}

export default App;
