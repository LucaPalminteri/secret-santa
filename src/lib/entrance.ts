import type { AnimationEvent, FocusEvent } from "react";

const entranceTargets =
  ".reveal, .stagger-fields > *, .welcome-enter > :not(.action-dock):not(form)";

function settle(element: Element) {
  if (element.matches(entranceTargets)) {
    element.setAttribute("data-entrance-complete", "true");
  }
}

/** Keep focused controls visible after blur, without restarting their entrance. */
export function settleEntranceOnFocus(event: FocusEvent<HTMLElement>) {
  let element = event.target instanceof Element ? event.target : null;
  while (element && element !== event.currentTarget) {
    settle(element);
    element = element.parentElement;
  }
}

export function settleEntranceOnEnd(event: AnimationEvent<HTMLElement>) {
  if (
    (event.animationName === "stepEnter" ||
      event.animationName === "appEnter") &&
    event.target instanceof Element
  ) {
    settle(event.target);
  }
}
