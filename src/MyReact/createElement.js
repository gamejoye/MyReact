const createElement = (type, props, ...children) => {
    // create ReactVitualDom
    return {
        type,
        props: {
            ...props,
            children: children.map(dom => typeof dom === 'object'
            ? dom
            : createTextElement(dom))
        }
    }
}
const createTextElement = (text) => {
    return {
        type: '#text',
        props: {
            nodeValue: text,
            children: []
        }
    }
}
export default createElement;