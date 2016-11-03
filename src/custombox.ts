module Custombox {

  const CB: string = 'custombox';
  const O: string = 'open';
  const C: string = 'close';

  interface OverlayConfig {
    overlay: boolean;
    overlaySpeed: number;
    overlayColor: string;
    overlayOpacity: number;
    overlayClose: boolean;
  }

  interface ContentConfig {
    speed: number;
    effect: string;
    width: string;
    fullscreen: boolean;
    animation: {
      from: string;
      to: string;
    };
    open: Function;
    complete: Function;
    close: Function;
  }

  interface Options extends OverlayConfig, ContentConfig {
    target: string;
  }

  class Defaults {
    private defaults: Options;

    constructor(private options: Options) {
      this.defaults = <Options>{};
      this.defaults.target = null;

      // Overlay
      this.defaults.overlay = true;
      this.defaults.overlaySpeed = 300;
      this.defaults.overlayColor = '#000';
      this.defaults.overlayOpacity = .5;
      this.defaults.overlayClose = true;

      // Content
      this.defaults.speed = 500;
      this.defaults.width = null;
      this.defaults.animation = {
        from: 'top',
        to: 'top'
      };
    }

    // Public methods
    assign(): Options {
      return Object.assign(this.defaults, this.options);
    }
  }

  class Wrapper {
    element: HTMLElement;

    constructor(effect: string, fullscreen: boolean) {
      this.element = document.createElement('div');
      this.element.classList.add(CB, effect);

      if (fullscreen) {
        this.element.classList.add(`${CB}-fullscreen`);
      }
    }

    // Public methods
    remove(): void {
      try {
        this.element.parentNode.removeChild(this.element);
      } catch (e) {}
    }
  }


  class Overlay {
    element: HTMLElement;

    private style: HTMLStyleElement;

    constructor(private options: OverlayConfig) {
      this.element = document.createElement('div');
      this.element.style.backgroundColor = this.options.overlayColor;
      this.element.classList.add(`${CB}-overlay`);

      let sheet = this.createSheet();
      sheet.insertRule(`.${CB}-overlay { animation: CloseFade ${this.options.overlaySpeed}ms; }`, 0);
      sheet.insertRule(`.${O}.${CB}-overlay { animation: OpenFade ${this.options.overlaySpeed}ms; opacity: ${this.options.overlayOpacity} }`, 0);
      sheet.insertRule(`@keyframes OpenFade { from {opacity: 0} to {opacity: ${this.options.overlayOpacity}} }`, 0);
      sheet.insertRule(`@keyframes CloseFade { from {opacity: ${this.options.overlayOpacity}} to {opacity: 0} }`, 0);
    }

    // Public methods
    bind(method: string): Promise<Event> {
      let action: string;

      switch (method) {
        case 'close':
          action = 'remove';
          break;
        default:
          action = 'add';
          break
      }

      return new Promise((resolve: Function) => {
        this.element.classList[action](O);
        this.listener().then(()=> resolve());
      });
    }

    remove(): void {
      try {
        this.element.parentNode.removeChild(this.element);
        this.style.parentNode.removeChild(this.style);
      } catch (e) {}
    }

    // Private methods
    private createSheet(): any  {
      this.style = document.createElement('style');
      this.style.setAttribute('id', `${CB}-overlay-${Date.now()}`);
      document.head.appendChild(this.style);

      return this.style.sheet;
    }

    private listener(): Promise<Event> {
      return new Promise((resolve: Function) => this.element.addEventListener('animationend', () => resolve(), true));
    }
  }

  class Content {
    element: HTMLElement;

    private animationDefaults: Array<string>;

    constructor(speed: number, private effect: string, private animation: Object) {
      this.element = document.createElement('div');
      this.element.style.transitionDuration = `${speed}ms`;
      this.element.classList.add(`${CB}-content`);
      this.checkAnimation();
    }

    // Public methods
    fetch(target: string, width: string): Promise<any> {
      return new Promise((resolve: Function, reject: Function) => {
        let selector: Element = document.querySelector(target);

        if (selector) {
          let element: HTMLElement = <HTMLElement>selector.cloneNode(true);
          element.removeAttribute('id');

          if (width) {
            element.style.width = width;
          }

          this.element.appendChild(element);
          resolve();
        } else if (target.charAt(0) !== '#' && target.charAt(0) !== '.') {
          let url: string = target;
          let req: XMLHttpRequest = new XMLHttpRequest();

          req.open('GET', url);
          req.onload = () => {
            if (req.status === 200) {
              this.element.insertAdjacentHTML('beforeend', req.response);

              if (width) {
                let child: any = this.element.firstChild;
                child.style.width = width;
              }
              resolve();
            } else {
              reject(new Error(req.statusText));
            }
          };
          req.onerror = () => reject(new Error('Network error'));
          req.send();
        } else {
          reject(new Error(`The element doesn't exist`));
        }
      });
    }

    bind(method: string): Promise<Event> {
      switch (method) {
        case 'close':
          return new Promise((resolve: Function) => {
            this.element.classList.remove(O);
            this.element.classList.add(C);
            this.checkAnimation('to');
            this.listener().then(()=> resolve());
          });
        default:
          return new Promise((resolve: Function) => {
            this.element.classList.add(O);
            this.listener().then(()=> resolve());
          });
      }
    }

    remove(): void {
      try {
        this.element.parentNode.removeChild(this.element);
      } catch (e) {}
    }

    // Private methods
    private listener(): Promise<Event> {
      return new Promise((resolve: Function) => this.element.addEventListener('transitionend', () => resolve(), true));
    }

    private checkAnimation(action: string = 'from'): void {
      this.animationDefaults = ['slide'];

      if (this.animationDefaults.indexOf(this.effect) > -1) {
        if (this.element.classList.contains('top')) {
          this.element.classList.remove('top');
        }

        if (this.element.classList.contains('bottom')) {
          this.element.classList.remove('bottom');
        }

        this.element.classList.add(this.animation[action]);
      }
    }
  }

  export class modal {
    private options: Options;
    private wrapper: Wrapper;
    private content: Content;
    private overlay: Overlay;

    constructor(options: Options) {
      let defaults: Defaults = new Defaults(options);
      this.options = defaults.assign();

      this.wrapper = new Wrapper(this.options.effect, this.options.fullscreen);
      this.content = new Content(this.options.speed, this.options.effect, this.options.animation);

      if (this.options.overlay) {
        this.overlay = new Overlay(this.options);
        this.wrapper.element.appendChild(this.overlay.element);
      }

      // Create the structure
      this.build();
    }

    // Public methods
    open(): void {
      this.content
        .fetch(this.options.target, this.options.width)
        .then(() => {
          // Append
          document.body.appendChild(this.wrapper.element);

          if (this.options.overlay) {
            this.overlay.bind(O).then(() => this.content.bind(O).then(() => this.dispatchEvent('complete')));
          } else {
            let ready = window.getComputedStyle(this.content.element).transitionDuration;
            if (ready) {
              this.content.bind(O).then(() => this.dispatchEvent('complete'));
            }
          }

          // Dispatch event
          this.dispatchEvent(O);

          // Listeners
          this.listeners();
        })
        .catch((error: Error) => {
          throw error;
        });
    }

    close(): void {
      if (this.options.overlay) {
        Promise
          .all([
            this.content.bind(C).then(() => this.content.remove()),
            this.overlay.bind(C).then(() => this.overlay.remove())
          ])
          .then(() => {
            this.wrapper.remove();
            this.dispatchEvent(C);
          });
      } else {
        this.content.bind(C).then(() => {
          this.content.remove();
          this.wrapper.remove();
          this.dispatchEvent(C);
        });
      }
    }

    // Private methods
    private build(): void {
      this.wrapper.element.appendChild(this.content.element);
    }

    private dispatchEvent(type: string): void {
      let event = new Event(`${CB}:${type}`);
      document.dispatchEvent(event);

      try {
        this.options[type].call();
      } catch (e) {}
    }

    private listeners(): void {
      document.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.keyCode === 27) {
          this.close();
        }
      }, true);

      if (this.options.overlayClose) {
        this.overlay.element.addEventListener('click', () => this.close(), true);
      }
    }
  }
}