let nextUnit = null;
let root = null;
let prevRoot = null;
let deletions = [];
let nowFiber = null;
let useStateHookIndex = 0;
let useEffectHookIndex = 0;
let useMemoHookIndex = 0;
let useCallbackHookIndex = 0;

const updateChildren = (fiber, nextChildren, prevChildren, lastPlacedFiber, prevSibling) => {
    /*
    * dom diff
    */
    if (!prevChildren
        || nextChildren.some(
            child => child.props.key === undefined || child.props.key === null
        )) {
        nextChildren.forEach(
            (child, index) => {
                nextChildren[index] = {
                    ...child,
                    dom: null,
                    parent: fiber,
                    alternate: null,
                    tag: 'ADDITION',
                    lastPlacedFiber
                }
                lastPlacedFiber = nextChildren[index];
                if (prevSibling) prevSibling.sibling = nextChildren[index];
                prevSibling = nextChildren[index];
            }
        )
        prevChildren?.forEach(
            child => {
                child.tag = 'DELETION';
                deletions.push(child)
            }
        )
    } else {
        const map = new Map();
        prevChildren.forEach(
            (child) => {
                if (child.props.key) {
                    map.set(child.props.key, child)
                }
            }
        );
        let lastIndex = 0;
        nextChildren.forEach(
            (child, index) => {
                const oldFiber = map.get(child.props.key);
                if (oldFiber) {
                    // 旧集合有节点
                    map.delete(child.props.key);
                    let tag = '';
                    if (oldFiber.mountIndex < lastIndex) {
                        // 需要对旧节点右移
                        tag = 'MOVE';
                    }
                    nextChildren[index] = {
                        ...child,
                        dom: oldFiber.dom,
                        parent: fiber,
                        alternate: oldFiber,
                        tag,
                        mountIndex: index,
                        lastPlacedFiber
                    }
                    lastIndex = Math.max(lastIndex, oldFiber.mountIndex);
                } else {
                    // 旧集合没有节点， 需要新增节点
                    nextChildren[index] = {
                        ...child,
                        dom: null,
                        parent: fiber,
                        alternate: null,
                        tag: 'ADDITION',
                        mountIndex: index,
                        lastPlacedFiber
                    }
                }
                lastPlacedFiber = nextChildren[index];
                if (prevSibling) prevSibling.sibling = nextChildren[index];
                prevSibling = nextChildren[index];
            }
        )
        map.forEach(
            (child) => {
                child.tag = 'DELETION';
                deletions.push(child);
            }
        )
    }
    return {
        _firstPlacedFiber: nextChildren[0],
        _lastPlacedFiber: lastPlacedFiber,
    };
}

// 打标签函数
const reconcileChildren = (fiber, elements) => {
    let prevSibling = null;
    const oldFibers = fiber.alternate?.childFibers ?? [];
    let lastPlacedFiber = null;
    const childFibers = [];
    elements.forEach((childElement, index) => {
        const oldFiber = oldFibers[index];
        const sameType = oldFiber
            && childElement
            && oldFiber.type
            && childElement.type
            && oldFiber.type === childElement.type;
        let newFiber = null;

        if (Array.isArray(childElement)) {
            const { _lastPlacedFiber } = updateChildren(fiber, childElement, oldFiber, lastPlacedFiber, prevSibling);
            lastPlacedFiber = _lastPlacedFiber ?? lastPlacedFiber;
            newFiber = childElement;
        } else if (oldFiber && sameType) {
            newFiber = {
                type: oldFiber.type,
                props: childElement.props,
                dom: oldFiber.dom,
                parent: fiber,
                alternate: oldFiber,
                tag: 'UPDATION',
            }
            lastPlacedFiber = newFiber;
        } else {
            if (childElement) {
                newFiber = {
                    type: childElement.type,
                    props: childElement.props,
                    dom: null,
                    parent: fiber,
                    alternate: null,
                    tag: 'ADDITION',
                    lastPlacedFiber
                }
                lastPlacedFiber = newFiber;
            }
            if (oldFiber) {
                oldFiber.tag = 'DELETION';
                deletions.push(oldFiber);
            }
        }

        if (Array.isArray(newFiber)) {
            const firstFiber = newFiber[0];
            const lastFiber = newFiber[newFiber.length - 1];
            if (index === 0) {
                fiber.child = firstFiber;
            } else {
                prevSibling.sibling = firstFiber;
            }
            if (lastFiber) {
                prevSibling = lastFiber;
            }
        } else {
            if (index === 0) {
                fiber.child = newFiber;
            } else {
                prevSibling.sibling = newFiber;
            }
            if (newFiber) {
                prevSibling = newFiber;
            }
        }

        childFibers.push(newFiber);
        index++;
    });
    fiber.childFibers = childFibers;
}

export const useState = initial => {
    const oldHook = nowFiber?.alternate?.useStateHooks?.[useStateHookIndex];
    const hook = {
        state: oldHook ? oldHook.state : initial,
        queue: []
    };
    if (oldHook && oldHook.queue.length !== 0) {
        // 直接拿之前最新的数据
        hook.state = oldHook.queue[oldHook.queue.length - 1];
    }
    hook.queue.push(hook.state)
    const setState = (action) => {
        const lastIndex = hook.queue.length - 1;
        if (action === hook.queue[lastIndex]) return; // 相同则数据跳过渲染
        hook.queue.push(action);
        root = {
            dom: prevRoot.dom,
            props: prevRoot.props,
            alternate: prevRoot
        }
        nextUnit = root;
        deletions = [];
    }
    nowFiber.useStateHooks.push(hook);
    useStateHookIndex++;

    return [hook.state, setState];
}

const areEqual = (prevDependentDatas, nextDependentDatas, oldHook) => {
    if (!oldHook) return false; // 第一次渲染
    if (prevDependentDatas.length !== nextDependentDatas.length) return false;
    return prevDependentDatas.every((val, index) => val === nextDependentDatas[index]);
}


export const useEffect = (callback, dependentDatas) => {
    if (!(callback instanceof Function)) {
        throw new Error('useEffect第一个参数必须为函数');
    }
    const oldHook = nowFiber?.alternate?.useEffectHooks[useEffectHookIndex];
    const hook = {
        dependentDatas: oldHook?.dependentDatas ? oldHook.dependentDatas : [],
        unMountAction: oldHook?.unMountAction
    };
    if (dependentDatas === undefined) {
        if (hook.unMountAction instanceof Function) {
            hook.unMountAction();
        }
        hook.unMountAction = callback();
    } else {
        if (!Array.isArray(dependentDatas)) {
            throw new Error('useEffect第二个参数必须为数组');
        } else {
            const equal = areEqual(hook.dependentDatas, dependentDatas, oldHook);
            if (!equal) {
                if (hook.unMountAction instanceof Function) {
                    hook.unMountAction();
                }
                hook.dependentDatas = [...dependentDatas]; // shadow copy
                hook.unMountAction = callback();
            }
        }
    }
    nowFiber.useEffectHooks.push(hook);
    useEffectHookIndex++;
}
export const useMemo = (componentFactory, dependentDatas) => {

    /*
     * 先别用
    */
    if (!(componentFactory instanceof Function)) {
        throw new Error('useMemo第一个参数必须为函数');
    }
    const oldHook = nowFiber?.alternate?.useMemoHooks[useMemoHookIndex];
    const hook = {
        dependentDatas: oldHook?.dependentDatas ? oldHook.dependentDatas : [],
        component: oldHook?.component,
    };
    const component = componentFactory();
    let validated = false;
    if (dependentDatas === undefined) {
        hook.component = component;
    } else {
        if (!Array.isArray(dependentDatas)) {
            throw new Error('useMemo第二个参数必须为数组');
        } else {
            const equal = areEqual(hook.dependentDatas, dependentDatas, oldHook);
            if (!equal) {
                hook.component = component
                hook.dependentDatas = [...dependentDatas];
            } else {
                validated = true;
            }
        }
    }
    hook.component._store = {
        validated,
    }
    nowFiber.useMemoHooks.push(hook);
    useMemoHookIndex++;
    return hook.component;
}

export const useCallback = (newCallback, dependentDatas) => {
    if (!(newCallback instanceof Function)) {
        throw new Error('useCallback第一个参数必须为函数');
    }
    const oldHook = nowFiber?.alternate?.useCallbackHooks[useCallbackHookIndex];
    const hook = {
        dependentDatas: oldHook?.dependentDatas ? oldHook.dependentDatas : [],
        callback: oldHook?.callback
    };
    if (dependentDatas === undefined) {
        hook.callback = newCallback;
    } else {
        if (!Array.isArray(dependentDatas)) {
            throw new Error('useCallBack第二个参数必须为数组');
        } else {
            const equal = areEqual(hook.dependentDatas, dependentDatas, oldHook);
            if (!equal) {
                hook.callback = newCallback;
                hook.dependentDatas = [...dependentDatas];
            }
        }
    }
    nowFiber.useCallbackHooks.push(hook);
    useCallbackHookIndex++;
    return hook.callback;
}

const initialUseStateHooks = () => {
    nowFiber.useStateHooks = [];
    useStateHookIndex = 0;
}

const initialUseEffectHooks = () => {
    nowFiber.useEffectHooks = [];
    useEffectHookIndex = 0;
}

const initialUseMemoHooks = () => {
    nowFiber.useMemoHooks = [];
    useMemoHookIndex = 0;
}

const initialUseCallBack = () => {
    nowFiber.useCallbackHooks = [];
    useCallbackHookIndex = 0;
}

const updateFunctionComponent = (fiber) => {
    nowFiber = fiber;
    initialUseStateHooks();
    initialUseEffectHooks();
    initialUseMemoHooks();
    initialUseCallBack();
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children);
}
const updateHostComponent = (fiber) => {

    if (!fiber.dom) {
        fiber.dom = createDom(fiber);
    }

    const elements = fiber?.props?.children;
    reconcileChildren(fiber, elements);
}


// 执行当前工作单元获取下一个工作单元
const worKUnitAndGetNext = (fiber) => {

    const isFunctionComponent = fiber.type instanceof Function;
    if (isFunctionComponent) {
        updateFunctionComponent(fiber);
    } else {
        updateHostComponent(fiber);
    }

    if (fiber.child) {
        return fiber.child;
    }
    let nextFiber = fiber;
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling;
        } else {
            nextFiber = nextFiber.parent;
        }
    }
}




// 更新真实dom
// 一些箭头函数方便减少码量
const isEvent = key => key.startsWith('on');
const isProperty = key => key !== 'children' && !isEvent(key);
const isGone = (prev, next) => key => !(key in next);
const isNew = (prev, next) => key => prev[key] !== next[key];
const updateDom = (dom, prevProps, nextProps) => {

    // 移除不存在新props里的事件
    Object.keys(prevProps)
        .filter(isEvent)
        .filter(key => isGone(prevProps, nextProps)(key) || isNew(prevProps, nextProps)(key))
        .forEach(name => dom.removeEventListener(
            name.toLocaleLowerCase().substring(2),
            prevProps[name]
        ));

    // 移除不存在新props里的属性
    Object.keys(prevProps)
        .filter(isProperty)
        .filter(isGone(prevProps, nextProps))
        .forEach(name => dom[name] = '');

    // 新增属性
    Object.keys(nextProps)
        .filter(isProperty)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => dom[name] = nextProps[name]);

    // 新增事件
    Object.keys(nextProps)
        .filter(isEvent)
        .filter(isNew(prevProps, nextProps))
        .forEach(name => dom.addEventListener(
            name.toLocaleLowerCase().substring(2),
            nextProps[name]
        ));
}


/*
 * commitXXX 函数用于一次性完整提交dom元素
*/

const commitDeletion = (fiber, parentDom) => {
    if (fiber.dom) {
        if(fiber.lastPlacedFiber) fiber.lastPlacedFiber = fiber.sibling
        parentDom.removeChild(fiber.dom);
    } else {
        commitDeletion(fiber.child, parentDom);
    }
}

const moveDom = (parentDom, dom, node) => {
    commitDeletion(dom, parentDom);
    parentDom.insertBefore(dom, node);
}

const commitWork = (fiber) => {
    if (!fiber) return;
    let parentDomFiber = fiber.parent;
    while (!parentDomFiber.dom) {
        parentDomFiber = parentDomFiber.parent;
    }
    const parentDom = parentDomFiber.dom;
    if (!!fiber.dom) {
        if (fiber.tag === 'ADDITION') {
            parentDom.insertBefore(fiber.dom, fiber.lastPlacedFiber?.dom?.nextSibling);
        } else if (fiber.tag === 'DELETION') {
            commitDeletion(fiber, parentDom);
            return;
        } else if (fiber.tag === 'UPDATION') {
            updateDom(fiber.dom, fiber.alternate.props, fiber.props);
        } else if (fiber.tag === 'MOVE') {
            moveDom(parentDom, fiber.dom, fiber.lastPlacedFiber.dom.nextSibling);
        }
    }

    commitWork(fiber.sibling);
    commitWork(fiber.child);
}

const commitRoot = () => {
    commitWork(root.child);
    deletions.forEach(commitWork)

    prevRoot = root;
    root = null;
}



const workLoop = (idleDeadLine) => {
    let shouldYield = true;

    while (nextUnit && shouldYield) {
        nextUnit = worKUnitAndGetNext(nextUnit);
        shouldYield = idleDeadLine.timeRemaining() > 1;
    }
    if (!nextUnit && root) {
        // 一次性提交
        commitRoot();
    }
    requestIdleCallback(workLoop);
}


requestIdleCallback(workLoop);

const createDom = (fiber) => {
    const { type, props } = fiber;
    const dom = type === '#text'
        ? document.createTextNode('')
        : document.createElement(type);

    updateDom(dom, {}, props);
    return dom;
}

const render = (element, container) => {
    root = {
        dom: container,
        props: {
            children: [element]
        },
        alternate: prevRoot
    }
    nextUnit = root;
    deletions = [];
}
export default render;