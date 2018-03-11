const path = require('path');
const Router = require('koa-router');

module.exports = class router {
  static setup(app) {
    const koaRouter = new Router();
    app.router = koaRouter;

    app.handle = async (ctx, next, endpoint, endpointString) => {
      const Endpoint = new endpoint();
      Endpoint.ctx = ctx;
      Endpoint.next = next;
      Endpoint.ctx.route = endpointString;

      Object.keys(app.mixins).forEach((key) => {
        Endpoint[key] = (...args) => {
          args.push(ctx);
          args.push(app);
          return app.mixins[key](...args);
        };
      });

      const response = await Endpoint.handler();
      if (!Endpoint.ctx.body) {
        Endpoint.ctx.body = response;
      }
      await next();
    };

    ['get', 'post', 'put', 'patch', 'delete'].forEach((method) => {
      app[method] = (url, endpointString, beforeMiddleware, afterMiddleware) => {
        let endpoint;
        try {
          endpoint = require(path.join(process.cwd(), endpointString));
        } catch (err) {
          throw new Error(`unable to load endpoint '${endpointString}'\n${err.stack.toString()}`);
        }
        const before = beforeMiddleware || [];
        const after = afterMiddleware || [];
        app.router[method](
          url,
          ...before,
          async (ctx, next) => app.handle(ctx, next, endpoint, endpointString),
          ...after,
        );
      };
    });

    app.use(app.router.routes());
    app.use(app.router.allowedMethods());
  }
};
