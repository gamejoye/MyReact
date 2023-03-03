import { Update, UpdateQueue } from "./render";
import { fiberRoot } from "./render";

export function DispatchAction<S, A>(
    fiber: any,
    queue: UpdateQueue<S, A>,
    action: A
): void {
    let update: Update<S, A> = {
        lane: 0,
        action: action,
        hasEagerState: false,
        eagerState: null,
        next: null as any
    }
    let pending = queue.pending;
    if(pending === null) {
        update.next = update;
    } else {
        update.next = pending.next;
        pending.next = update;
    }
    queue.pending = update;

    // update fiber root
    fiberRoot.root = {
        dom: fiberRoot.prevRoot.dom,
        props: fiberRoot.prevRoot.props,
        alternate: fiberRoot.prevRoot,
    }

    // set root as the unit of work
    fiberRoot.nextUnit = fiberRoot.root;
    fiberRoot.deletions = [];
}