import { DispatchAction } from "./DispatchAction";

export interface Update<S, A> {
    lane: number;
    action: A;
    hasEagerState: boolean;
    eagerState: S | null;
    next: Update<S, A>;
}

export interface UpdateQueue<S, A> {
    pending: Update<S, A> | null;
    lanes: number[] | null;
    dispatch: ((action: A) => void) | null;
    lastRenderedReducer: ((state: S, action: A) => S) | null;
    lastRenderedState: S | null;
}

export interface Hook {
    memoizedState: any;
    baseState: any;
    baseQueue: Update<any, any> | null;
    queue: UpdateQueue<any, any> | null;
    next: Hook | null;
}

interface Dispatch<A> {
    A: void;
}

type BasicStateAction<S> = (state: S) => S | S;

export const fiberRoot: any = {};

function basicStateReducer<S>(state: S, action: BasicStateAction<S>): S {
    return typeof action === 'function' ? action(state) : action;
}

let currentlyRenderingFiber: any = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;

let useEffectHookIndex = 0;
let useMemoHookIndex = 0;
let useCallbackHookIndex = 0;

function mountWorkInProgressHook(): Hook {
    const hook: Hook = {
        memoizedState: null,
        baseQueue: null,
        baseState: null,
        queue: null,
        next: null
    }

    if (workInProgressHook === null) {
        // 这是第一个在链表里面的hook
        currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
    } else {
        workInProgressHook = workInProgressHook.next = hook;
    }
    return workInProgressHook;
}

function mountState<S, A>(
    initial: S
): [S, Dispatch<A>] {
    const hook = mountWorkInProgressHook();

    let initialState = initial;
    if (initial instanceof Function) {
        initialState = initial();
    }

    hook.memoizedState = hook.baseState = initialState;

    const queue: UpdateQueue<S, A> = {
        pending: null,
        lanes: null,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: initialState as S
    }
    hook.queue = queue;

    const dispatch: Dispatch<A> = queue.dispatch = DispatchAction.bind(null, currentlyRenderingFiber, hook.queue);

    return [hook.memoizedState, dispatch];
}

function updateWorkInProgressHook(): Hook {

    let nextCurrentHook: Hook | null;
    if (currentHook === null) {
        const currentFiber = currentlyRenderingFiber.alternate;
        if (currentFiber !== null) {
            nextCurrentHook = currentFiber.memoizedState;
        } else {
            nextCurrentHook = null;
        }
    } else {
        nextCurrentHook = currentHook.next;
    }

    currentHook = nextCurrentHook;

    let nextWorkInProgressHook: Hook | null = null;

    if (workInProgressHook === null) {
        nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
    } else {
        nextWorkInProgressHook = workInProgressHook.next;
    }

    if (nextCurrentHook === null) {
        throw new Error('check your code');
    }

    const newHook: Hook = {
        baseQueue: nextCurrentHook.baseQueue,
        baseState: nextCurrentHook.baseState,
        memoizedState: nextCurrentHook.memoizedState,
        queue: nextCurrentHook.queue,
        next: null
    }

    if (workInProgressHook === null) {
        currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
    } else {
        workInProgressHook = workInProgressHook.next = newHook;
    }

    return workInProgressHook;
}

function updateState<S, A>(
    initial: S,
    reducer: (newState: S, action: A) => S
): [S, Dispatch<A>] {

    const hook = updateWorkInProgressHook();
    const queue = hook.queue;

    if (queue === null) {
        throw new Error(
            "这里应该有个queue, 这可能是MyReact的问题"
        )
    }

    const current: Hook = (currentHook as any);

    let baseQueue = current.baseQueue;

    const pendingQueue = queue.pending;
    if (pendingQueue !== null) {
        // 需要合并
        if (baseQueue !== null) {
            const baseFirst = baseQueue.next;
            const pendingFirst = pendingQueue.next;
            baseQueue.next = pendingFirst;
            pendingQueue.next = baseFirst;
        }
        current.baseQueue = baseQueue = pendingQueue;
        queue.pending = null;
    }

    if (baseQueue !== null) {
        // 更新
        const first = baseQueue.next;
        let newState = current.baseState;
        let update = first;
        do {
            const action = update.action;

            newState = reducer(newState, action);
            update = update.next
        } while (update !== null && update !== first);

        hook.memoizedState = newState;
    }

    // 重新在fiber上挂上hook
    currentlyRenderingFiber.memoizedState = hook;
    const dispatch: Dispatch<A> = (queue.dispatch as any);

    return [hook.memoizedState, dispatch];
}

export function useState<S, A>(
    initial: S
): [S, Dispatch<A>] {

    if (currentlyRenderingFiber.alternate?.memoizedState) {
        return updateState(initial, basicStateReducer as any);
    }

    return mountState<S, A>(initial);

}

const updateChildren = (fiber: any, nextChildren: any[], prevChildren: any[], lastPlacedFiber: any, prevSibling: any) => {
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
                fiberRoot.deletions.push(child)
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
                fiberRoot.deletions.push(child);
            }
        )
    }
    return {
        _firstPlacedFiber: nextChildren[0],
        _lastPlacedFiber: lastPlacedFiber,
    };
}

// 打标签函数
const reconcileChildren = (fiber: any, elements: any[]) => {
    let prevSibling: any = null;
    const oldFibers: any[] = fiber.alternate?.childFibers ?? [];
    let lastPlacedFiber: any = null;
    const childFibers: any[] = [];
    elements.forEach((childElement, index) => {
        let oldFiber = oldFibers[index];
        const sameType = oldFiber
            && childElement
            && oldFiber.type
            && childElement.type
            && oldFiber.type === childElement.type;
        let newFiber: any | any[] | null = null;

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
                fiberRoot.deletions.push(oldFiber);
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

const areEqual = (prevDependentDatas: any[], nextDependentDatas: any[], oldHook: any) => {
    if (!oldHook) return false; // 第一次渲染
    if (prevDependentDatas.length !== nextDependentDatas.length) return false;
    return prevDependentDatas.every((val, index) => val === nextDependentDatas[index]);
}


export const useEffect = (callback: any, dependentDatas: any) => {
    if (!(callback instanceof Function)) {
        throw new Error('useEffect第一个参数必须为函数');
    }
    const oldHook = currentlyRenderingFiber?.alternate?.useEffectHooks[useEffectHookIndex];
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
    currentlyRenderingFiber.useEffectHooks.push(hook);
    useEffectHookIndex++;
}
export const useMemo = (componentFactory: any, dependentDatas: any) => {

    /*
     * 先别用
    */
    if (!(componentFactory instanceof Function)) {
        throw new Error('useMemo第一个参数必须为函数');
    }
    const oldHook = currentlyRenderingFiber?.alternate?.useMemoHooks[useMemoHookIndex];
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
    currentlyRenderingFiber.useMemoHooks.push(hook);
    useMemoHookIndex++;
    return hook.component;
}

export const useCallback = (newCallback: any, dependentDatas: any) => {
    if (!(newCallback instanceof Function)) {
        throw new Error('useCallback第一个参数必须为函数');
    }
    const oldHook = currentlyRenderingFiber?.alternate?.useCallbackHooks[useCallbackHookIndex];
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
    currentlyRenderingFiber.useCallbackHooks.push(hook);
    useCallbackHookIndex++;
    return hook.callback;
}

const initialUseEffectHooks = () => {
    currentlyRenderingFiber.useEffectHooks = [];
    useEffectHookIndex = 0;
}

const initialUseMemoHooks = () => {
    currentlyRenderingFiber.useMemoHooks = [];
    useMemoHookIndex = 0;
}

const initialUseCallBack = () => {
    currentlyRenderingFiber.useCallbackHooks = [];
    useCallbackHookIndex = 0;
}

const updateFunctionComponent = (fiber: any) => {
    currentlyRenderingFiber = fiber;
    initialUseEffectHooks();
    initialUseMemoHooks();
    initialUseCallBack();
    const children = [fiber.type(fiber.props)];
    reconcileChildren(fiber, children);
}
const updateHostComponent = (fiber: any) => {

    if (!fiber.dom) {
        fiber.dom = createDom(fiber);
    }

    const elements = fiber?.props?.children;
    reconcileChildren(fiber, elements);
}


// 执行当前工作单元获取下一个工作单元
const worKUnitAndGetNext = (fiber: any) => {
    console.log('fiber: ', fiber)
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
const isEvent = (key: string) => key.startsWith('on');
const isProperty = (key: string) => key !== 'children' && !isEvent(key);
const isGone = (prev: any, next: any) => (key: string) => !(key in next);
const isNew = (prev: any, next: any) => (key: string) => prev[key] !== next[key];
const updateDom = (dom: any, prevProps: any, nextProps: any) => {

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

const commitDeletion = (fiber: any, parentDom: any) => {
    if (fiber.dom) {
        if (fiber.lastPlacedFiber) fiber.lastPlacedFiber = fiber.sibling
        parentDom.removeChild(fiber.dom);
    } else {
        commitDeletion(fiber.child, parentDom);
    }
}

const moveDom = (parentDom: any, dom: any, node: any) => {
    commitDeletion(dom, parentDom);
    parentDom.insertBefore(dom, node);
}

const commitWork = (fiber: any) => {
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
    commitWork(fiberRoot.root.child);
    fiberRoot.deletions.forEach(commitWork)

    fiberRoot.prevRoot = fiberRoot.root;
    fiberRoot.root = null;
}



const workLoop = (idleDeadLine: any) => {
    let shouldYield = true;

    while (fiberRoot.nextUnit && shouldYield) {
        fiberRoot.nextUnit = worKUnitAndGetNext(fiberRoot.nextUnit);
        shouldYield = idleDeadLine.timeRemaining() > 1;
    }
    if (!fiberRoot.nextUnit && fiberRoot.root) {
        // 一次性提交
        commitRoot();
    }
    requestIdleCallback(workLoop);
}


requestIdleCallback(workLoop);

const createDom = (fiber: any) => {
    const { type, props } = fiber;
    const dom = type === '#text'
        ? document.createTextNode('')
        : document.createElement(type);

    updateDom(dom, {}, props);
    return dom;
}

const render = (element: any, container: any) => {
    fiberRoot.root = {
        dom: container,
        props: {
            children: [element]
        },
        alternate: fiberRoot.prevRoot
    }
    fiberRoot.nextUnit = fiberRoot.root;
    fiberRoot.deletions = [];
}
export default render;