const createElement = (type, props, ...children) => {
    // create ReactVitualDom
    return {
        type,
        props: {
            ...props,
            children: children.map(
                child => typeof child === 'object'
                    ? child
                    : createTextElement(child)
            )
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