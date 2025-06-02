declare type Attributes<T> = { [P in keyof T]: T[P] };
export declare function createElement<T extends keyof HTMLElementTagNameMap>(n: T, target: HTMLElement, attr?: Attributes<HTMLElementTagNameMap[T]>): HTMLElementTagNameMap[T];
export declare function appendStyle(s: string): void;
