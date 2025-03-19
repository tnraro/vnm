export type Transition<State, Input> = (state: State, input: Input) => State;
export class Machine<State extends string, Input extends string> {
  #state: State;
  get state() {
    return this.#state;
  }
  #transition;
  constructor(start: State, transition: Transition<State, Input>) {
    this.#state = start;
    this.#transition = transition;
  }
  emit(input: Input) {
    this.#state = this.#transition(this.#state, input);
  }
  #subscriptions = new Set();
  subscribe(subscription: (value: State) => void) {
    this.#subscriptions.add(subscription);
    return () => {
      this.#subscriptions.delete(subscription);
    };
  }
}
