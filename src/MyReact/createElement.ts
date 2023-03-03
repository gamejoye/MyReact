const createElement = (type: string, props: any, ...children: any[]) => {
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
const createTextElement = (text: string) => {
    return {
        type: '#text',
        props: {
            nodeValue: text,
            children: []
        }
    }
}
export default createElement;