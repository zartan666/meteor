import { WebAppInternals } from "meteor/webapp";
import MagicString from "magic-string";
import { SAXParser } from "parse5";
import combine from "combine-streams";
import { ServerSink, isReadable } from "./server-sink.js";
import { onPageLoad } from "./server.js";


WebAppInternals.registerBoilerplateDataCallback(
  "meteor/server-render",
  (request, data, arch) => {
    const sink = new ServerSink(request, arch);

    return onPageLoad.chain(
      callback => callback(sink, request)
    ).then(() => {
      if (! sink.maybeMadeChanges) {
        return false;
      }

      let reallyMadeChanges = false;

      function rewrite(property) {
        const html = data[property];
        if (typeof html !== "string") {
          return;
        }

        const magic = new MagicString(html);
        const parser = new SAXParser({
          locationInfo: true
        });

        data[property] = parser;

        if (Object.keys(sink.htmlById).length) {
          // create an empty stream;
          const stream = combine();

          let lastStart = magic.start;
          parser.on("startTag", (name, attrs, selfClosing, loc) => {
            attrs.some(attr => {
              if (attr.name === "id") {
                let html = sink.htmlById[attr.value];
                if (html) {
                  reallyMadeChanges = true;
                  const start = magic.slice(lastStart, loc.endOffset);
                  stream
                    .append(start)
                    .append(html)
                  lastStart = loc.endOffset;
                }
                return true;
              }
            });
          });
          parser.on("endTag", (name, location) => {
            if (location.endOffset === html.length) {
              // reached the end of the template
              const end = magic.slice(lastStart);
              stream.append(end).append(null);
            }
          })

          data[property] = stream;
        }

        parser.write(html, parser.end.bind(parser));
      }

      if (sink.head) {
        data.dynamicHead = (data.dynamicHead || "") + sink.head;
        reallyMadeChanges = true;
      }

      if (Object.keys(sink.htmlById).length > 0) {
        // We don't currently allow injecting HTML into the <head> except
        // by calling sink.appendHead(html).
        rewrite("body");
        rewrite("dynamicBody");
      }

      if (sink.body) {
        data.dynamicBody = (data.dynamicBody || "") + sink.body;
        reallyMadeChanges = true;
      }

      if (sink.statusCode) {
        data.statusCode = sink.statusCode;
        reallyMadeChanges = true;
      }

      if (Object.keys(sink.responseHeaders)){
        data.headers = sink.responseHeaders;
        reallyMadeChanges = true;
      }

      return reallyMadeChanges;
    });
  }
);
