## DOM Building

This one may be silly. However there may be some merit when combined with 
Web Components. Web Components can have custom api surface which you can 
expose with chains, in addition you can nest your component architecture with 
namespacing to have opinionated, yet flexibe structure 

```html
<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
  </head>
  <body>
    <script src="./fluent.js"></script>
    <script>
      // Define NavComponent
      class NavComponent extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
          const nav = document.createElement('nav');
          nav.textContent = 'Navigation Bar';
          this.shadowRoot.append(nav);
        }

        setTitle(title) {
          this.shadowRoot.querySelector('nav').textContent = title;
          return this; // Allow chaining
        }

        addItem(item) {
          this.shadowRoot.querySelector('nav').appendChild(item);
          return this; // Allow chaining
        }
      }

      customElements.define('nav-component', NavComponent);

      // Define LinkComponent
      class LinkComponent extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
          const link = document.createElement('a');
          link.textContent = 'Link';
          this.shadowRoot.append(link);
        }

        setHref(href) {
          this.shadowRoot.querySelector('a').setAttribute('href', href);
          return this; // Allow chaining
        }

        setText(text) {
          this.shadowRoot.querySelector('a').textContent = text;
          return this; // Allow chaining
        }
      }

      customElements.define('link-component', LinkComponent);

      const components = {
        nav: {
          component: () => new NavComponent(),
          setTitle: (title) => (ctx) => ctx.setTitle(title),
          addItem: (item) => (ctx) => ctx.addItem(item),
          link: {
            component: () => new LinkComponent(),
            setHref: (href) => (ctx) => ctx.setHref(href),
            setText: (text) => (ctx) => ctx.setText(text),
          }
        }
      };

      const { nav } = fluent(components);

      // Using the fluent API 
      document.body.appendChild(
        nav
          .component
            .setTitle('Main Navigation')
            .addItem(
              link.component.setHref('#home').setText('Home')
            )
            .addItem(
              link.component.setHref('#about').setText('About')
            )
            .addItem(
              link.component.setHref('#contact').setText('Contact')
            )
      );
    </script>
  </body>
</html>
```